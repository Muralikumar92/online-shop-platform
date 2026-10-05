package com.shopplatform.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ItemRequest(
    @NotBlank String name,
    String description,
    @NotNull Long categoryId,
    @NotNull @Min(0) Long priceInPaise,
    @Min(0) @Max(100) Integer discountPercentage,
    @NotNull @Min(0) Integer stockQuantity
) {
}
