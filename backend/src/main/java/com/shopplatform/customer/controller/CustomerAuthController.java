package com.shopplatform.customer.controller;

import com.shopplatform.auth.dto.*;
import com.shopplatform.customer.dto.CustomerAuthResponse;
import com.shopplatform.customer.dto.CustomerProfileResponse;
import com.shopplatform.customer.dto.SignupResponse;
import com.shopplatform.customer.entity.Customer;
import com.shopplatform.customer.repository.CustomerRepository;
import com.shopplatform.customer.security.CustomerPrincipal;
import com.shopplatform.customer.security.CustomerTenantGuard;
import com.shopplatform.customer.service.CustomerAuthService;
import com.shopplatform.common.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;
    private final CustomerTenantGuard customerTenantGuard;
    private final CustomerRepository customerRepository;

    public CustomerAuthController(CustomerAuthService customerAuthService, CustomerTenantGuard customerTenantGuard,
                                   CustomerRepository customerRepository) {
        this.customerAuthService = customerAuthService;
        this.customerTenantGuard = customerTenantGuard;
        this.customerRepository = customerRepository;
    }

    @PostMapping("/api/public/auth/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(customerAuthService.signup(request));
    }

    @PostMapping("/api/public/auth/signup/verify")
    public ResponseEntity<CustomerAuthResponse> verifySignup(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(customerAuthService.verifySignupOtp(request));
    }

    @PostMapping("/api/public/auth/signup/resend")
    public ResponseEntity<Map<String, String>> resendSignupCode(@Valid @RequestBody EmailOnlyRequest request) {
        customerAuthService.resendSignupOtp(request);
        return ResponseEntity.ok(Map.of("message", "A new verification code has been emailed."));
    }

    @PostMapping("/api/public/auth/login")
    public ResponseEntity<CustomerAuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(customerAuthService.login(request));
    }

    @PostMapping("/api/public/auth/login/otp/request")
    public ResponseEntity<Map<String, String>> requestOtp(@Valid @RequestBody EmailOnlyRequest request) {
        customerAuthService.requestLoginOtp(request);
        return ResponseEntity.ok(Map.of("message", "If the account exists, a login code has been emailed."));
    }

    @PostMapping("/api/public/auth/login/otp/verify")
    public ResponseEntity<CustomerAuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(customerAuthService.verifyLoginOtp(request));
    }

    @PostMapping("/api/public/auth/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody EmailOnlyRequest request) {
        customerAuthService.requestPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "If the account exists, a reset link has been emailed."));
    }

    @PostMapping("/api/public/auth/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        customerAuthService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    @GetMapping("/api/me")
    public ResponseEntity<CustomerProfileResponse> me(@AuthenticationPrincipal CustomerPrincipal principal) {
        customerTenantGuard.verify(principal);
        Customer customer = customerRepository.findById(principal.customerId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return ResponseEntity.ok(new CustomerProfileResponse(customer.getId(), principal.shopId(),
            customer.getEmail(), customer.getFullName()));
    }
}
