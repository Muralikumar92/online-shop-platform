package com.shopplatform.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;

public record CouponRequest(
    @NotBlank String code,
    @NotBlank String discountType,
    @NotNull @Min(0) Long discountValue,
    @Min(0) Long minOrderAmount,
    Integer maxUses,
    String validFrom,
    String validTo
) {
}
