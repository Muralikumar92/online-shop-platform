package com.shopplatform.catalog.dto;

import com.shopplatform.catalog.entity.Coupon;

public record CouponResponse(
    Long id, String code, String discountType, long discountValue, long minOrderAmount,
    Integer maxUses, int usedCount, boolean active, boolean currentlyValid
) {
    public static CouponResponse from(Coupon coupon) {
        return new CouponResponse(
            coupon.getId(), coupon.getCode(), coupon.getDiscountType().name(), coupon.getDiscountValue(),
            coupon.getMinOrderAmount(), coupon.getMaxUses(), coupon.getUsedCount(), coupon.isActive(),
            coupon.isCurrentlyValid()
        );
    }
}
