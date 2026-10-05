package com.shopplatform.catalog.entity;

import com.shopplatform.shop.entity.Shop;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A sellable product. Price/discount/stock live here; {@link ItemMedia}
 * holds its gallery of images/short video reels. {@code version} is a
 * JPA optimistic-lock column: the cart/checkout epic decrements
 * stockQuantity through this version so that with {@code n} units in
 * stock, at most {@code n} concurrent orders can succeed.
 */
@Entity
@Table(name = "items")
@Getter
@Setter
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private long priceInPaise;

    @Column(nullable = false)
    private int discountPercentage = 0;

    @Column(nullable = false)
    private int stockQuantity = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<ItemMedia> media = new ArrayList<>();

    /** Final price after applying discountPercentage, in paise. */
    public long getEffectivePriceInPaise() {
        return priceInPaise - (priceInPaise * discountPercentage / 100);
    }
}
