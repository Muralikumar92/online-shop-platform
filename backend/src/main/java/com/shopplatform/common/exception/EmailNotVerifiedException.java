package com.shopplatform.common.exception;

/**
 * Thrown when a customer's credentials are correct but their email address
 * hasn't been confirmed yet (signup OTP not verified); mapped to HTTP 403
 * with a machine-readable flag so the frontend can show a "verify your
 * email" / resend-code screen instead of a generic auth error.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
