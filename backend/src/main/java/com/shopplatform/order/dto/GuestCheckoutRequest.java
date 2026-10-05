package com.shopplatform.order.dto;

import com.shopplatform.order.dto.CheckoutInitiateRequest.CheckoutItemRequest;
import com.shopplatform.order.dto.CheckoutInitiateRequest.ShippingAddressRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Guest checkout request: no account/login, just cart + delivery address
 * (phone is mandatory - it's how the shop owner matches the WhatsApp/
 * Instagram DM to this order). No payment method is chosen here - a guest
 * order always starts as a manual, owner-mediated payment.
 */
public record GuestCheckoutRequest(
    @NotEmpty List<@Valid CheckoutItemRequest> items,
    String couponCode,
    @NotNull @Valid ShippingAddressRequest shippingAddress
) {
}
