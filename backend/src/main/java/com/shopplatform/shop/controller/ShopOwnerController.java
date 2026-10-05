package com.shopplatform.shop.controller;

import com.shopplatform.shop.dto.BankDetailsRequest;
import com.shopplatform.shop.dto.ContactDetailsRequest;
import com.shopplatform.shop.dto.CreateShopRequest;
import com.shopplatform.shop.dto.ShopResponse;
import com.shopplatform.shop.dto.UpiDetailsRequest;
import com.shopplatform.shop.service.ShopService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Shop-owner-facing shop management, authenticated via the JWT issued at
 * login (principal = owner id, see JwtAuthenticationFilter).
 */
@RestController
@RequestMapping("/api/owner/shops")
public class ShopOwnerController {

    private final ShopService shopService;

    public ShopOwnerController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping
    public List<ShopResponse> listMyShops(@AuthenticationPrincipal Long ownerId) {
        return shopService.listShopsForOwner(ownerId).stream().map(ShopResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<ShopResponse> createShop(@AuthenticationPrincipal Long ownerId,
                                                    @Valid @RequestBody CreateShopRequest request) {
        var shop = shopService.createShop(ownerId, request);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }

    @PostMapping(value = "/{shopId}/logo", consumes = "multipart/form-data")
    public ResponseEntity<ShopResponse> uploadLogo(@AuthenticationPrincipal Long ownerId,
                                                    @PathVariable Long shopId,
                                                    @RequestParam("file") MultipartFile file) {
        var shop = shopService.uploadLogo(ownerId, shopId, file);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }

    @PutMapping("/{shopId}/bank-details")
    public ResponseEntity<ShopResponse> updateBankDetails(@AuthenticationPrincipal Long ownerId,
                                                           @PathVariable Long shopId,
                                                           @Valid @RequestBody BankDetailsRequest request) {
        var shop = shopService.updateBankDetails(ownerId, shopId, request);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }

    @PutMapping("/{shopId}/contact-details")
    public ResponseEntity<ShopResponse> updateContactDetails(@AuthenticationPrincipal Long ownerId,
                                                              @PathVariable Long shopId,
                                                              @Valid @RequestBody ContactDetailsRequest request) {
        var shop = shopService.updateContactDetails(ownerId, shopId, request);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }

    @PutMapping("/{shopId}/upi-details")
    public ResponseEntity<ShopResponse> updateUpiDetails(@AuthenticationPrincipal Long ownerId,
                                                          @PathVariable Long shopId,
                                                          @Valid @RequestBody UpiDetailsRequest request) {
        var shop = shopService.updateUpiDetails(ownerId, shopId, request);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }
}
