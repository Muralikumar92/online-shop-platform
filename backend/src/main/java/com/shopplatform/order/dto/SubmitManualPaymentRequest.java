package com.shopplatform.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Customer self-reports that they've paid the owner directly (MANUAL payment method). */
public record SubmitManualPaymentRequest(
    @NotNull Long orderId,
    @NotBlank String paymentReference
) {
}
