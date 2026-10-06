package com.shopplatform.auth.controller;

import com.shopplatform.auth.dto.*;
import com.shopplatform.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/owner")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<OwnerSignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/signup/verify")
    public ResponseEntity<AuthResponse> verifySignup(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifySignupOtp(request));
    }

    @PostMapping("/signup/resend")
    public ResponseEntity<Map<String, String>> resendSignupCode(@Valid @RequestBody EmailOnlyRequest request) {
        authService.resendSignupOtp(request);
        return ResponseEntity.ok(Map.of("message", "A new verification code has been emailed."));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/login/otp/request")
    public ResponseEntity<Map<String, String>> requestOtp(@Valid @RequestBody EmailOnlyRequest request) {
        authService.requestLoginOtp(request);
        return ResponseEntity.ok(Map.of("message", "If the account exists, a login code has been emailed."));
    }

    @PostMapping("/login/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyLoginOtp(request));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody EmailOnlyRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "If the account exists, a reset link has been emailed."));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }
}
