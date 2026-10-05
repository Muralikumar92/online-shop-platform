package com.shopplatform.shop.entity;

import com.shopplatform.auth.entity.ShopOwner;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A tenant storefront. One row per subscribed shop owner's shop, resolved
 * per-request from the subdomain (slug) by TenantResolutionFilter.
 */
@Entity
@Table(name = "shops")
@Getter
@Setter
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Subdomain label, e.g. "acme" for acme.myshops.com. Globally unique. */
    @Column(nullable = false, unique = true, length = 63)
    private String slug;

    @Column(nullable = false)
    private String name;

    private String logoUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private ShopOwner owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus subscriptionStatus = SubscriptionStatus.TRIAL;

    private LocalDate subscriptionExpiresOn;

    /** Bank account to which future payouts for this shop's sales are settled. */
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankIfscCode;

    /** UPI ID (or GPay-linked phone number) customers can pay directly for manual/offline orders. */
    private String upiId;

    /** Public contact number shown to customers paying manually (not needed for Razorpay checkout). */
    private String contactPhone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum SubscriptionStatus {
        TRIAL, ACTIVE, EXPIRED, CANCELLED
    }

    /** Whether this shop's storefront should be reachable by customers right now. */
    public boolean isStorefrontAccessible() {
        return active && (subscriptionStatus == SubscriptionStatus.TRIAL || subscriptionStatus == SubscriptionStatus.ACTIVE);
    }
}
