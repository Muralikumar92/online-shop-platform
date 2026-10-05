package com.shopplatform.storefront.dto;

import com.shopplatform.shop.entity.Shop;

/** Branding info shown to customers browsing a shop's storefront. */
public record ShopPublicResponse(Long id, String name, String slug, String logoUrl) {
    public static ShopPublicResponse from(Shop shop) {
        return new ShopPublicResponse(shop.getId(), shop.getName(), shop.getSlug(), shop.getLogoUrl());
    }
}
