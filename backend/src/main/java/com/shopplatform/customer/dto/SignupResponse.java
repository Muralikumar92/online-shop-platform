package com.shopplatform.customer.dto;

/**
 * Returned by signup instead of {@link CustomerAuthResponse} - no JWT is
 * issued until the emailed OTP is confirmed via /api/public/auth/signup/verify,
 * so customers can't log in before proving they own the email address.
 */
public record SignupResponse(Long customerId, Long shopId, String email, boolean needsVerification, String message) {
}
