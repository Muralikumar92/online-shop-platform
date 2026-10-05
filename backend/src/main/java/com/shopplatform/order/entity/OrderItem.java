package com.shopplatform.order.entity;

import com.shopplatform.catalog.entity.Item;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "order_items")
@Getter
@Setter
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /** Snapshots: preserved even if the catalog item is later edited or soft-deleted. */
    @Column(nullable = false)
    private String itemNameSnapshot;

    @Column(nullable = false)
    private long unitPriceInPaiseSnapshot;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private long lineTotalInPaise;
}
