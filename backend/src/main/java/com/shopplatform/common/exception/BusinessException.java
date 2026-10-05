package com.shopplatform.common.exception;

/** Thrown for client-correctable errors (e.g. duplicate email, bad OTP); mapped to HTTP 400/409 by the global handler. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
