package com.shopplatform.shop.service;

import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import org.springframework.stereotype.Service;

/**
 * Shared "does this shop belong to this owner" lookup, used by every
 * owner-facing feature service (catalog, subscription, future order
 * management) to enforce per-tenant isolation consistently.
 */
@Service
public class ShopAccessService {

    private final ShopRepository shopRepository;

    public ShopAccessService(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    public Shop getOwnedShop(Long ownerId, Long shopId) {
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        if (!shop.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Shop not found");
        }
        return shop;
    }
}
