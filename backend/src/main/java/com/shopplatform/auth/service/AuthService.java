package com.shopplatform.auth.service;

import com.shopplatform.auth.dto.*;
import com.shopplatform.auth.entity.LoginOtp;
import com.shopplatform.auth.entity.PasswordResetToken;
import com.shopplatform.auth.entity.ShopOwner;
import com.shopplatform.auth.repository.LoginOtpRepository;
import com.shopplatform.auth.repository.PasswordResetTokenRepository;
import com.shopplatform.auth.repository.ShopOwnerRepository;
import com.shopplatform.common.exception.AuthenticationFailedException;
import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.EmailNotVerifiedException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.EmailService;
import com.shopplatform.config.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/**
 * Shop-owner signup, password login, email-OTP login, and forgot/reset
 * password. Customer auth (epic-customer-auth) will reuse the OTP/reset
 * mechanics against the Customer entity once that lands.
 */
@Service
public class AuthService {

    private static final String ROLE_SHOP_OWNER = "SHOP_OWNER";
    private static final int OTP_VALIDITY_MINUTES = 10;
    private static final int RESET_TOKEN_VALIDITY_MINUTES = 30;

    private final ShopOwnerRepository ownerRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final LoginOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final String frontendBaseUrl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(ShopOwnerRepository ownerRepository,
                        PasswordResetTokenRepository resetTokenRepository,
                        LoginOtpRepository otpRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        EmailService emailService,
                        @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.ownerRepository = ownerRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public OwnerSignupResponse signup(SignupRequest request) {
        if (ownerRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BusinessException("An account with this email already exists");
        }
        ShopOwner owner = new ShopOwner();
        owner.setEmail(request.email().toLowerCase());
        owner.setPasswordHash(passwordEncoder.encode(request.password()));
        owner.setFullName(request.fullName());
        owner.setEmailVerified(false);
        owner = ownerRepository.save(owner);

        sendVerificationOtp(owner);

        return new OwnerSignupResponse(owner.getId(), owner.getEmail(), true,
            "We've emailed you a 6-digit code. Enter it to verify your email and finish creating your account.");
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        ShopOwner owner = ownerRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), owner.getPasswordHash())) {
            throw new AuthenticationFailedException("Invalid email or password");
        }
        if (!owner.isEmailVerified()) {
            throw new EmailNotVerifiedException(
                "Please verify your email before logging in. Check your inbox for the code, or request a new one.");
        }
        return toAuthResponse(owner);
    }

    @Transactional
    public AuthResponse verifySignupOtp(OtpVerifyRequest request) {
        ShopOwner owner = ownerRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid code"));
        LoginOtp otp = otpRepository
            .findFirstByOwnerAndCodeAndUsedFalseOrderByCreatedAtDesc(owner, request.code())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid or expired code"));
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new AuthenticationFailedException("Invalid or expired code");
        }
        otp.setUsed(true);
        owner.setEmailVerified(true);
        return toAuthResponse(owner);
    }

    @Transactional
    public void resendSignupOtp(EmailOnlyRequest request) {
        ShopOwner owner = ownerRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new ResourceNotFoundException("No account found for this email"));
        if (owner.isEmailVerified()) {
            throw new BusinessException("This email is already verified - please log in.");
        }
        sendVerificationOtp(owner);
    }

    @Transactional
    public void requestLoginOtp(EmailOnlyRequest request) {
        ShopOwner owner = ownerRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new ResourceNotFoundException("No account found for this email"));

        String code = String.format("%06d", random.nextInt(1_000_000));
        LoginOtp otp = new LoginOtp();
        otp.setOwner(owner);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(OTP_VALIDITY_MINUTES * 60L));
        otpRepository.save(otp);

        emailService.send(owner.getEmail(), "Your login code",
            "Your one-time login code is: " + code + "\nIt expires in " + OTP_VALIDITY_MINUTES + " minutes.");
    }

    @Transactional
    public AuthResponse verifyLoginOtp(OtpVerifyRequest request) {
        ShopOwner owner = ownerRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid code"));
        LoginOtp otp = otpRepository
            .findFirstByOwnerAndCodeAndUsedFalseOrderByCreatedAtDesc(owner, request.code())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid or expired code"));
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new AuthenticationFailedException("Invalid or expired code");
        }
        otp.setUsed(true);
        return toAuthResponse(owner);
    }

    @Transactional
    public void requestPasswordReset(EmailOnlyRequest request) {
        ownerRepository.findByEmailIgnoreCase(request.email()).ifPresent(owner -> {
            String token = generateOpaqueToken();
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setOwner(owner);
            resetToken.setToken(token);
            resetToken.setExpiresAt(Instant.now().plusSeconds(RESET_TOKEN_VALIDITY_MINUTES * 60L));
            resetTokenRepository.save(resetToken);

            String resetLink = frontendBaseUrl + "/owner/reset-password?token=" + token;
            emailService.send(owner.getEmail(), "Reset your password",
                "Click the link to reset your password (valid for " + RESET_TOKEN_VALIDITY_MINUTES + " minutes):\n"
                    + resetLink);
        });
        // Intentionally no error when the email is unknown, to avoid leaking account existence.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = resetTokenRepository.findByToken(request.token())
            .orElseThrow(() -> new BusinessException("Invalid or expired reset token"));
        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Invalid or expired reset token");
        }
        ShopOwner owner = resetToken.getOwner();
        owner.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        resetToken.setUsed(true);
    }

    private void sendVerificationOtp(ShopOwner owner) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        LoginOtp otp = new LoginOtp();
        otp.setOwner(owner);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(OTP_VALIDITY_MINUTES * 60L));
        otpRepository.save(otp);

        emailService.send(owner.getEmail(), "Verify your email for Online Shop Platform",
            "Hi " + nullToEmpty(owner.getFullName()) + ",\n\nYour email verification code is: " + code
                + "\nIt expires in " + OTP_VALIDITY_MINUTES + " minutes.\n\nEnter this code in the app to finish"
                + " creating your shop owner account.");
    }

    private AuthResponse toAuthResponse(ShopOwner owner) {
        String token = jwtService.generateToken(owner.getId(), ROLE_SHOP_OWNER);
        return new AuthResponse(token, owner.getId(), owner.getEmail(), owner.getFullName());
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
