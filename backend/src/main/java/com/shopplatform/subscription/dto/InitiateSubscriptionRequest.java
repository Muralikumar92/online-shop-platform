package com.shopplatform.subscription.dto;

import jakarta.validation.constraints.NotNull;

public record InitiateSubscriptionRequest(@NotNull Long planId) {
}
