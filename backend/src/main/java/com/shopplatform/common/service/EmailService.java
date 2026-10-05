package com.shopplatform.common.service;

/**
 * Sends the plain-text transactional emails this platform relies on
 * (password reset, login OTP, order confirmation/status updates).
 * Implementations are swapped by Spring profile (see {@link SmtpEmailService}
 * and {@link SesEmailService}) so callers never need to know or care which
 * provider is actually delivering the message.
 */
public interface EmailService {

    void send(String to, String subject, String body);
}
