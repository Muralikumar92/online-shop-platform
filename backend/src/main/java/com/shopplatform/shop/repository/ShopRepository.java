package com.shopplatform.shop.repository;

import com.shopplatform.shop.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findBySlugAndActiveTrue(String slug);

    boolean existsBySlug(String slug);

    java.util.List<Shop> findAllByOwnerId(Long ownerId);
}
