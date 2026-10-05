package com.shopplatform.customer.service;

import com.shopplatform.auth.dto.*;
import com.shopplatform.common.exception.AuthenticationFailedException;
import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.EmailNotVerifiedException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.EmailService;
import com.shopplatform.config.JwtService;
import com.shopplatform.customer.dto.CustomerAuthResponse;
import com.shopplatform.customer.dto.SignupResponse;
import com.shopplatform.customer.entity.Customer;
import com.shopplatform.customer.entity.CustomerLoginOtp;
import com.shopplatform.customer.entity.CustomerPasswordResetToken;
import com.shopplatform.customer.repository.CustomerLoginOtpRepository;
import com.shopplatform.customer.repository.CustomerPasswordResetTokenRepository;
import com.shopplatform.customer.repository.CustomerRepository;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import com.shopplatform.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * Customer signup, password login, email-OTP login, and forgot/reset
 * password - all scoped to the shop resolved from the request subdomain
 * (a customer account belongs to exactly one shop). Mirrors AuthService's
 * mechanics for shop owners.
 */
@Service
public class CustomerAuthService {

    private static final String ROLE_CUSTOMER = "CUSTOMER";
    private static final int OTP_VALIDITY_MINUTES = 10;
    private static final int RESET_TOKEN_VALIDITY_MINUTES = 30;

    private final CustomerRepository customerRepository;
    private final CustomerPasswordResetTokenRepository resetTokenRepository;
    private final CustomerLoginOtpRepository otpRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final String frontendBaseUrl;
    private final SecureRandom random = new SecureRandom();

    public CustomerAuthService(CustomerRepository customerRepository,
                                CustomerPasswordResetTokenRepository resetTokenRepository,
                                CustomerLoginOtpRepository otpRepository,
                                ShopRepository shopRepository,
                                PasswordEncoder passwordEncoder,
                                JwtService jwtService,
                                EmailService emailService,
                                @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.customerRepository = customerRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.otpRepository = otpRepository;
        this.shopRepository = shopRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        Shop shop = currentShop();
        if (customerRepository.existsByShopIdAndEmailIgnoreCase(shop.getId(), request.email())) {
            throw new BusinessException("An account with this email already exists for this shop");
        }
        Customer customer = new Customer();
        customer.setShop(shop);
        customer.setEmail(request.email().toLowerCase());
        customer.setPasswordHash(passwordEncoder.encode(request.password()));
        customer.setFullName(request.fullName());
        customer.setEmailVerified(false);
        customer = customerRepository.save(customer);

        sendVerificationOtp(customer, shop);

        return new SignupResponse(customer.getId(), shop.getId(), customer.getEmail(), true,
            "We've emailed you a 6-digit code. Enter it to verify your email and finish creating your account.");
    }

    @Transactional(readOnly = true)
    public CustomerAuthResponse login(LoginRequest request) {
        Shop shop = currentShop();
        Customer customer = customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), customer.getPasswordHash())) {
            throw new AuthenticationFailedException("Invalid email or password");
        }
        if (!customer.isEmailVerified()) {
            throw new EmailNotVerifiedException(
                "Please verify your email before logging in. Check your inbox for the code, or request a new one.");
        }
        return toAuthResponse(customer, shop);
    }

    @Transactional
    public CustomerAuthResponse verifySignupOtp(OtpVerifyRequest request) {
        Shop shop = currentShop();
        Customer customer = customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid code"));
        CustomerLoginOtp otp = otpRepository
            .findFirstByCustomerAndCodeAndUsedFalseOrderByCreatedAtDesc(customer, request.code())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid or expired code"));
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new AuthenticationFailedException("Invalid or expired code");
        }
        otp.setUsed(true);
        customer.setEmailVerified(true);
        return toAuthResponse(customer, shop);
    }

    @Transactional
    public void resendSignupOtp(EmailOnlyRequest request) {
        Shop shop = currentShop();
        Customer customer = customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email())
            .orElseThrow(() -> new ResourceNotFoundException("No account found for this email"));
        if (customer.isEmailVerified()) {
            throw new BusinessException("This email is already verified - please log in.");
        }
        sendVerificationOtp(customer, shop);
    }

    @Transactional
    public void requestLoginOtp(EmailOnlyRequest request) {
        Shop shop = currentShop();
        Customer customer = customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email())
            .orElseThrow(() -> new ResourceNotFoundException("No account found for this email"));

        String code = String.format("%06d", random.nextInt(1_000_000));
        CustomerLoginOtp otp = new CustomerLoginOtp();
        otp.setCustomer(customer);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(OTP_VALIDITY_MINUTES * 60L));
        otpRepository.save(otp);

        emailService.send(customer.getEmail(), "Your login code",
            "Your one-time login code is: " + code + "\nIt expires in " + OTP_VALIDITY_MINUTES + " minutes.");
    }

    @Transactional
    public CustomerAuthResponse verifyLoginOtp(OtpVerifyRequest request) {
        Shop shop = currentShop();
        Customer customer = customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid code"));
        CustomerLoginOtp otp = otpRepository
            .findFirstByCustomerAndCodeAndUsedFalseOrderByCreatedAtDesc(customer, request.code())
            .orElseThrow(() -> new AuthenticationFailedException("Invalid or expired code"));
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new AuthenticationFailedException("Invalid or expired code");
        }
        otp.setUsed(true);
        // Successfully receiving and entering the code also proves the customer
        // owns this inbox, so a passwordless OTP login doubles as email verification.
        customer.setEmailVerified(true);
        return toAuthResponse(customer, shop);
    }

    @Transactional
    public void requestPasswordReset(EmailOnlyRequest request) {
        Shop shop = currentShop();
        customerRepository.findByShopIdAndEmailIgnoreCase(shop.getId(), request.email()).ifPresent(customer -> {
            String token = generateOpaqueToken();
            CustomerPasswordResetToken resetToken = new CustomerPasswordResetToken();
            resetToken.setCustomer(customer);
            resetToken.setToken(token);
            resetToken.setExpiresAt(Instant.now().plusSeconds(RESET_TOKEN_VALIDITY_MINUTES * 60L));
            resetTokenRepository.save(resetToken);

            String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
            emailService.send(customer.getEmail(), "Reset your password",
                "Click the link to reset your password (valid for " + RESET_TOKEN_VALIDITY_MINUTES + " minutes):\n"
                    + resetLink);
        });
        // Intentionally no error when the email is unknown, to avoid leaking account existence.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        CustomerPasswordResetToken resetToken = resetTokenRepository.findByToken(request.token())
            .orElseThrow(() -> new BusinessException("Invalid or expired reset token"));
        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Invalid or expired reset token");
        }
        Customer customer = resetToken.getCustomer();
        customer.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        resetToken.setUsed(true);
    }

    private void sendVerificationOtp(Customer customer, Shop shop) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        CustomerLoginOtp otp = new CustomerLoginOtp();
        otp.setCustomer(customer);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(OTP_VALIDITY_MINUTES * 60L));
        otpRepository.save(otp);

        emailService.send(customer.getEmail(), "Verify your email for " + shop.getName(),
            "Hi " + nullToEmpty(customer.getFullName()) + ",\n\nYour email verification code is: " + code
                + "\nIt expires in " + OTP_VALIDITY_MINUTES + " minutes.\n\nEnter this code in the app to finish"
                + " creating your account at " + shop.getName() + ".");
    }

    private CustomerAuthResponse toAuthResponse(Customer customer, Shop shop) {
        String token = jwtService.generateToken(customer.getId(), ROLE_CUSTOMER, Map.of("shopId", shop.getId()));
        return new CustomerAuthResponse(token, customer.getId(), shop.getId(), customer.getEmail(), customer.getFullName());
    }

    private Shop currentShop() {
        Long shopId = TenantContext.getShopId();
        if (shopId == null) {
            throw new ResourceNotFoundException("Shop not found");
        }
        return shopRepository.findById(shopId).orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
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
