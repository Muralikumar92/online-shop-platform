package com.shopplatform.subscription.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmSubscriptionRequest(
    @NotBlank String razorpayOrderId,
    @NotBlank String razorpayPaymentId,
    @NotBlank String razorpaySignature
) {
}
