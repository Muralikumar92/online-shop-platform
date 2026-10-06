package com.shopplatform.auth.dto;

/**
 * Returned by owner signup instead of {@link AuthResponse} - no JWT is
 * issued until the emailed OTP is confirmed via /api/auth/owner/signup/verify,
 * so owners can't log in before proving they own the email address. Mirrors
 * the customer-facing {@code SignupResponse}.
 */
public record OwnerSignupResponse(Long ownerId, String email, boolean needsVerification, String message) {
}
