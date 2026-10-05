package com.shopplatform.shop.dto;

import jakarta.validation.constraints.NotBlank;

public record BankDetailsRequest(
    @NotBlank String accountHolderName,
    @NotBlank String accountNumber,
    @NotBlank String ifscCode
) {
}
