package com.shopplatform.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailOnlyRequest(@Email @NotBlank String email) {
}
