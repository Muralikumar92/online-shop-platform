package com.shopplatform.order.dto;

import jakarta.validation.constraints.NotNull;

public record OrderStatusUpdateRequest(@NotNull String status) {
}
