package com.shopplatform.common.exception;

/** Thrown when an authentication attempt (password/OTP) is invalid; mapped to HTTP 401. */
public class AuthenticationFailedException extends RuntimeException {
    public AuthenticationFailedException(String message) {
        super(message);
    }
}
