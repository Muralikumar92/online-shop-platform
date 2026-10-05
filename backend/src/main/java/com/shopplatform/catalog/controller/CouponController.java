package com.shopplatform.catalog.controller;

import com.shopplatform.catalog.dto.CouponRequest;
import com.shopplatform.catalog.dto.CouponResponse;
import com.shopplatform.catalog.service.CouponService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/owner/shops/{shopId}/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping
    public List<CouponResponse> list(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId) {
        return couponService.list(ownerId, shopId).stream().map(CouponResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<CouponResponse> create(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                  @Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(CouponResponse.from(couponService.create(ownerId, shopId, request)));
    }

    @PutMapping("/{couponId}")
    public ResponseEntity<CouponResponse> update(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                  @PathVariable Long couponId, @Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(CouponResponse.from(couponService.update(ownerId, shopId, couponId, request)));
    }

    @DeleteMapping("/{couponId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId, @PathVariable Long couponId) {
        couponService.delete(ownerId, shopId, couponId);
        return ResponseEntity.noContent().build();
    }
}
