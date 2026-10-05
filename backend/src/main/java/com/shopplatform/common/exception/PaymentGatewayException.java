package com.shopplatform.common.exception;

/** Thrown when the payment gateway (Razorpay) rejects or fails a request; mapped to HTTP 502. */
public class PaymentGatewayException extends RuntimeException {
    public PaymentGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
