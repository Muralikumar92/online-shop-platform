package com.shopplatform.storefront.controller;

import com.shopplatform.catalog.dto.CategoryResponse;
import com.shopplatform.catalog.dto.ItemResponse;
import com.shopplatform.storefront.dto.ShopPublicResponse;
import com.shopplatform.storefront.service.StorefrontService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public, unauthenticated storefront browsing API for customers: shop
 * branding -> category grid -> item grid -> item detail. Resolved entirely
 * from the request subdomain via TenantContext.
 */
@RestController
@RequestMapping("/api/public")
public class StorefrontController {

    private final StorefrontService storefrontService;

    public StorefrontController(StorefrontService storefrontService) {
        this.storefrontService = storefrontService;
    }

    @GetMapping("/shop")
    public ShopPublicResponse getShop() {
        return storefrontService.getShop();
    }

    @GetMapping("/categories")
    public List<CategoryResponse> listCategories() {
        return storefrontService.listCategories();
    }

    @GetMapping("/categories/{categoryId}/items")
    public List<ItemResponse> listItems(@PathVariable Long categoryId) {
        return storefrontService.listItems(categoryId);
    }

    @GetMapping("/items/{itemId}")
    public ItemResponse getItem(@PathVariable Long itemId) {
        return storefrontService.getItem(itemId);
    }
}
