package com.shopplatform.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(@NotBlank String name, Integer displayOrder) {
}
