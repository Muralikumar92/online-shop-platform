package com.shopplatform.order.entity;

import com.shopplatform.customer.entity.Customer;
import com.shopplatform.shop.entity.Shop;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A placed order: snapshots every line item's name/price at the moment of
 * purchase (see OrderItem) so what the customer sees in their order
 * history never changes even if the shop owner later edits/deletes the
 * underlying catalog item - the integrity guarantee that "the customer
 * receives the same order they placed".
 */
@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING_PAYMENT;

    @Column(nullable = false)
    private long subtotalInPaise;

    @Column(nullable = false)
    private long discountInPaise = 0;

    @Column(nullable = false)
    private long totalInPaise;

    private String couponCode;

    private String razorpayOrderId;
    private String razorpayPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.RAZORPAY;

    /** Self-reported UTR/UPI reference or note the customer supplies after paying the owner directly (MANUAL method only). */
    private String paymentReference;

    @Column(nullable = false)
    private String shippingFullName;
    @Column(nullable = false)
    private String shippingPhone;
    @Column(nullable = false)
    private String shippingAddressLine1;
    private String shippingAddressLine2;
    @Column(nullable = false)
    private String shippingCity;
    @Column(nullable = false)
    private String shippingState;
    @Column(nullable = false)
    private String shippingPincode;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public enum Status {
        PENDING_PAYMENT, PAYMENT_SUBMITTED, PAID, PAYMENT_FAILED, CANCELLED,
        PACKED, DISPATCHED, IN_TRANSIT, DELIVERED
    }

    /** RAZORPAY: paid instantly online via the gateway. MANUAL: customer pays the
     * owner directly (bank transfer/UPI/cash) and self-reports a reference,
     * which the owner then verifies before marking the order PAID. */
    public enum PaymentMethod {
        RAZORPAY, MANUAL
    }
}
