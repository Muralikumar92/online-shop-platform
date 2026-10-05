package com.shopplatform.auth.dto;

public record AuthResponse(String token, Long ownerId, String email, String fullName) {
}
