package com.shopplatform.order.dto;

public record CheckoutInitiateResponse(
    Long orderId,
    String paymentMethod,
    /** Present only for paymentMethod=RAZORPAY. */
    String razorpayOrderId,
    long amountInPaise,
    /** Present only for paymentMethod=RAZORPAY. */
    String razorpayKeyId,
    /** Present only for paymentMethod=MANUAL. */
    ManualPaymentInstructions manualPaymentInstructions
) {
}
