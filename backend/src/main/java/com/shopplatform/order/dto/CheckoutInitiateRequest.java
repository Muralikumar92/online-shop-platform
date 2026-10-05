package com.shopplatform.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CheckoutInitiateRequest(
    @NotEmpty List<@Valid CheckoutItemRequest> items,
    String couponCode,
    @NotNull @Valid ShippingAddressRequest shippingAddress,
    /** "RAZORPAY" (default) or "MANUAL" - pay the shop owner directly (bank transfer/UPI/cash). */
    String paymentMethod
) {
    public record CheckoutItemRequest(
        @NotNull Long itemId,
        @jakarta.validation.constraints.Min(1) int quantity
    ) {
    }

    public record ShippingAddressRequest(
        @NotNull @jakarta.validation.constraints.NotBlank String fullName,
        @NotNull @jakarta.validation.constraints.NotBlank String phone,
        @NotNull @jakarta.validation.constraints.NotBlank String addressLine1,
        String addressLine2,
        @NotNull @jakarta.validation.constraints.NotBlank String city,
        @NotNull @jakarta.validation.constraints.NotBlank String state,
        @NotNull @jakarta.validation.constraints.NotBlank String pincode
    ) {
    }
}
