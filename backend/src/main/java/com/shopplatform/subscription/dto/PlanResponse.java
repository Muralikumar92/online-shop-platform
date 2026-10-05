package com.shopplatform.subscription.dto;

import com.shopplatform.subscription.entity.SubscriptionPlan;

public record PlanResponse(Long id, String name, long priceInPaise, int durationDays) {
    public static PlanResponse from(SubscriptionPlan plan) {
        return new PlanResponse(plan.getId(), plan.getName(), plan.getPriceInPaise(), plan.getDurationDays());
    }
}
