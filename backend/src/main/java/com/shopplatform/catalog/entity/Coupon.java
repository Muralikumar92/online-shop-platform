package com.shopplatform.catalog.entity;

import com.shopplatform.shop.entity.Shop;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A shop-owner-defined discount code, redeemable by customers at checkout
 * (cart/checkout epic validates & applies it, and increments usedCount).
 */
@Entity
@Table(name = "coupons")
@Getter
@Setter
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(nullable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DiscountType discountType;

    /** Percent (0-100) when PERCENTAGE, or paise when FIXED. */
    @Column(nullable = false)
    private long discountValue;

    @Column(nullable = false)
    private long minOrderAmount = 0;

    private Integer maxUses;

    @Column(nullable = false)
    private int usedCount = 0;

    private Instant validFrom;
    private Instant validTo;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum DiscountType {
        PERCENTAGE, FIXED
    }

    public boolean isCurrentlyValid() {
        Instant now = Instant.now();
        if (!active) return false;
        if (validFrom != null && now.isBefore(validFrom)) return false;
        if (validTo != null && now.isAfter(validTo)) return false;
        return maxUses == null || usedCount < maxUses;
    }
}
