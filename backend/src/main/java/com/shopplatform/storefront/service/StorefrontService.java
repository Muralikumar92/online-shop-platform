package com.shopplatform.storefront.service;

import com.shopplatform.catalog.dto.CategoryResponse;
import com.shopplatform.catalog.dto.ItemResponse;
import com.shopplatform.catalog.entity.Category;
import com.shopplatform.catalog.entity.Item;
import com.shopplatform.catalog.repository.CategoryRepository;
import com.shopplatform.catalog.repository.ItemRepository;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import com.shopplatform.storefront.dto.ShopPublicResponse;
import com.shopplatform.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only, public-facing catalog browsing for the shop resolved from the
 * request subdomain (see tenant resolution filter). Only active
 * categories/items are ever exposed here; soft-deleted (inactive) rows are
 * owner-management-only and never visible to customers.
 */
@Service
public class StorefrontService {

    private final ShopRepository shopRepository;
    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;

    public StorefrontService(ShopRepository shopRepository, CategoryRepository categoryRepository, ItemRepository itemRepository) {
        this.shopRepository = shopRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public ShopPublicResponse getShop() {
        return ShopPublicResponse.from(currentShop());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        Shop shop = currentShop();
        return categoryRepository.findAllByShopIdAndActiveTrueOrderByDisplayOrderAsc(shop.getId()).stream()
            .map(CategoryResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> listItems(Long categoryId) {
        Shop shop = currentShop();
        Category category = categoryRepository.findById(categoryId)
            .filter(c -> c.getShop().getId().equals(shop.getId()) && c.isActive())
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return itemRepository.findAllByCategoryIdAndActiveTrueOrderByIdAsc(category.getId()).stream()
            .map(ItemResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public ItemResponse getItem(Long itemId) {
        Shop shop = currentShop();
        Item item = itemRepository.findById(itemId)
            .filter(i -> i.getShop().getId().equals(shop.getId()) && i.isActive())
            .orElseThrow(() -> new ResourceNotFoundException("Item not found"));
        return ItemResponse.from(item);
    }

    private Shop currentShop() {
        Long shopId = TenantContext.getShopId();
        if (shopId == null) {
            throw new ResourceNotFoundException("Shop not found");
        }
        return shopRepository.findById(shopId)
            .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
    }
}
