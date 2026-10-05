package com.shopplatform.shop.dto;

import jakarta.validation.constraints.NotBlank;

public record UpiDetailsRequest(@NotBlank String upiId) {
}
