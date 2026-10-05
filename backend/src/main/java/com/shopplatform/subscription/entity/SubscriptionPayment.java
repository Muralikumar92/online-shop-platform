package com.shopplatform.subscription.entity;

import com.shopplatform.shop.entity.Shop;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A record of a single subscription payment attempt for a shop. Created in
 * PENDING state when a Razorpay order is opened, moved to PAID once the
 * payment signature is verified (which also extends the shop's
 * subscriptionExpiresOn), or FAILED if verification fails.
 */
@Entity
@Table(name = "subscription_payments")
@Getter
@Setter
public class SubscriptionPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Column(nullable = false, unique = true)
    private String razorpayOrderId;

    private String razorpayPaymentId;

    @Column(nullable = false)
    private long amountInPaise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum Status {
        PENDING, PAID, FAILED
    }
}
