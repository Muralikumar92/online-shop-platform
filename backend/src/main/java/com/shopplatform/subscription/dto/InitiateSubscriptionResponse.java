package com.shopplatform.subscription.dto;

public record InitiateSubscriptionResponse(String razorpayOrderId, long amountInPaise, String currency, String razorpayKeyId) {
}
