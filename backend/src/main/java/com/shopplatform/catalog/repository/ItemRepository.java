package com.shopplatform.catalog.repository;

import com.shopplatform.catalog.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findAllByShopId(Long shopId);
    List<Item> findAllByCategoryIdAndActiveTrueAndStockQuantityGreaterThan(Long categoryId, int minStock);
    List<Item> findAllByCategoryIdAndActiveTrueOrderByIdAsc(Long categoryId);

    /**
     * Atomically decrements stock only if enough is available, in a single
     * conditional UPDATE guarded by the database's own row-level locking -
     * this is what guarantees that with {@code n} units in stock, at most
     * {@code n} concurrent checkouts can ever succeed. Returns the number of
     * rows updated: 0 means insufficient stock (someone else already
     * bought it, or not enough units left).
     */
    @Modifying
    @Query("UPDATE Item i SET i.stockQuantity = i.stockQuantity - :qty, i.version = i.version + 1 " +
        "WHERE i.id = :id AND i.stockQuantity >= :qty")
    int decrementStock(@Param("id") Long id, @Param("qty") int qty);

    /** Restores stock for a cancelled/expired/failed order. */
    @Modifying
    @Query("UPDATE Item i SET i.stockQuantity = i.stockQuantity + :qty, i.version = i.version + 1 WHERE i.id = :id")
    int incrementStock(@Param("id") Long id, @Param("qty") int qty);
}
