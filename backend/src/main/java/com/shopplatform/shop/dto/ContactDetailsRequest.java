package com.shopplatform.shop.dto;

import jakarta.validation.constraints.NotBlank;

public record ContactDetailsRequest(@NotBlank String contactPhone) {
}
