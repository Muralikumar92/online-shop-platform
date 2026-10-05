package com.shopplatform.shop.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateShopRequest(
    @NotBlank String name,
    /** Optional; if blank, derived from name. Must end up unique. */
    String slug
) {
}
