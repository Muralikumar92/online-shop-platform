package com.shopplatform.order.dto;

/**
 * Returned after a guest places an order request. {@code shareMessage} is a
 * ready-to-send text summary (item list + total + name/phone/address +
 * tracking link) the customer can hand off via the native share sheet
 * (WhatsApp/Instagram DM) to the shop owner, who confirms the order and
 * payment manually - no customer login/email required anywhere in the flow.
 */
public record GuestCheckoutResponse(
    Long orderId,
    String trackingToken,
    String trackingUrl,
    long totalInPaise,
    String shareMessage
) {
}
