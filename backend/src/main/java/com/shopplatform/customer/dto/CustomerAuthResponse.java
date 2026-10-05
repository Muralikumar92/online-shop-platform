package com.shopplatform.customer.dto;

public record CustomerAuthResponse(String token, Long customerId, Long shopId, String email, String fullName) {
}
