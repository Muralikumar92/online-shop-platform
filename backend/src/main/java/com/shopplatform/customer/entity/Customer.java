package com.shopplatform.customer.entity;

import com.shopplatform.shop.entity.Shop;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A customer account, scoped to a single shop (a customer signs up
 * separately per shop/subdomain they shop at - email uniqueness is
 * enforced per-shop, not platform-wide).
 */
@Entity
@Table(name = "customers", uniqueConstraints = @UniqueConstraint(columnNames = {"shop_id", "email"}))
@Getter
@Setter
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    /** Null for guest checkouts (no account/signup). */
    private String email;

    /** Null for guest checkouts - there's no password since there's no login. */
    private String passwordHash;

    private String fullName;

    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean emailVerified = false;

    /** True for a customer created automatically during guest checkout (no signup/login/email). */
    @Column(name = "is_guest", nullable = false)
    private boolean guest = false;

    /** Opaque per-browser cookie value, used to detect "you already have an open guest order" without an account. */
    private String guestDeviceToken;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
