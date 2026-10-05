package com.shopplatform.catalog.service;

import com.shopplatform.catalog.dto.CouponRequest;
import com.shopplatform.catalog.entity.Coupon;
import com.shopplatform.catalog.repository.CouponRepository;
import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.service.ShopAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final ShopAccessService shopAccessService;

    public CouponService(CouponRepository couponRepository, ShopAccessService shopAccessService) {
        this.couponRepository = couponRepository;
        this.shopAccessService = shopAccessService;
    }

    @Transactional(readOnly = true)
    public List<Coupon> list(Long ownerId, Long shopId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        return couponRepository.findAllByShopId(shopId);
    }

    @Transactional
    public Coupon create(Long ownerId, Long shopId, CouponRequest request) {
        Shop shop = shopAccessService.getOwnedShop(ownerId, shopId);
        if (couponRepository.existsByShopIdAndCodeIgnoreCase(shopId, request.code())) {
            throw new BusinessException("A coupon with this code already exists");
        }
        Coupon coupon = new Coupon();
        coupon.setShop(shop);
        applyRequest(coupon, request);
        return couponRepository.save(coupon);
    }

    @Transactional
    public Coupon update(Long ownerId, Long shopId, Long couponId, CouponRequest request) {
        Coupon coupon = getOwnedCoupon(ownerId, shopId, couponId);
        applyRequest(coupon, request);
        return coupon;
    }

    @Transactional
    public void delete(Long ownerId, Long shopId, Long couponId) {
        Coupon coupon = getOwnedCoupon(ownerId, shopId, couponId);
        coupon.setActive(false);
    }

    private void applyRequest(Coupon coupon, CouponRequest request) {
        coupon.setCode(request.code().toUpperCase());
        coupon.setDiscountType(Coupon.DiscountType.valueOf(request.discountType().toUpperCase()));
        coupon.setDiscountValue(request.discountValue());
        coupon.setMinOrderAmount(request.minOrderAmount() != null ? request.minOrderAmount() : 0);
        coupon.setMaxUses(request.maxUses());
        coupon.setValidFrom(request.validFrom() != null ? Instant.parse(request.validFrom()) : null);
        coupon.setValidTo(request.validTo() != null ? Instant.parse(request.validTo()) : null);
    }

    private Coupon getOwnedCoupon(Long ownerId, Long shopId, Long couponId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        Coupon coupon = couponRepository.findById(couponId)
            .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));
        if (!coupon.getShop().getId().equals(shopId)) {
            throw new ResourceNotFoundException("Coupon not found");
        }
        return coupon;
    }
}
