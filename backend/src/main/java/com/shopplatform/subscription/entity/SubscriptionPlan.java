package com.shopplatform.subscription.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * A platform-defined subscription tier (e.g. Monthly, Yearly) that shop
 * owners pay to keep their storefront active. Managed by the platform
 * operator, not by individual shop owners.
 */
@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Price in the smallest currency unit (paise for INR), matching Razorpay's amount convention. */
    @Column(nullable = false)
    private long priceInPaise;

    @Column(nullable = false)
    private int durationDays;

    @Column(nullable = false)
    private boolean active = true;
}
