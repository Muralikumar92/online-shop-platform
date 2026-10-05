package com.shopplatform.customer.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerAddressRequest(
    String label,
    @NotBlank String fullName,
    @NotBlank String phone,
    @NotBlank String addressLine1,
    String addressLine2,
    @NotBlank String city,
    @NotBlank String state,
    @NotBlank String pincode,
    boolean makeDefault
) {
}
