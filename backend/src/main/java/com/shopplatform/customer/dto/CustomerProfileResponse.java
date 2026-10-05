package com.shopplatform.customer.dto;

public record CustomerProfileResponse(Long customerId, Long shopId, String email, String fullName) {
}
