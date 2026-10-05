package com.shopplatform.catalog.repository;

import com.shopplatform.catalog.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    List<Coupon> findAllByShopId(Long shopId);
    Optional<Coupon> findByShopIdAndCodeIgnoreCase(Long shopId, String code);
    boolean existsByShopIdAndCodeIgnoreCase(Long shopId, String code);
}
