package com.shopplatform.catalog.service;

import com.shopplatform.catalog.dto.ItemRequest;
import com.shopplatform.catalog.dto.ItemResponse;
import com.shopplatform.catalog.entity.Category;
import com.shopplatform.catalog.entity.Item;
import com.shopplatform.catalog.entity.ItemMedia;
import com.shopplatform.catalog.repository.CategoryRepository;
import com.shopplatform.catalog.repository.ItemRepository;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.S3Service;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.service.ShopAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class ItemService {

    private final ItemRepository itemRepository;
    private final CategoryRepository categoryRepository;
    private final ShopAccessService shopAccessService;
    private final S3Service s3Service;

    public ItemService(ItemRepository itemRepository, CategoryRepository categoryRepository,
                        ShopAccessService shopAccessService, S3Service s3Service) {
        this.itemRepository = itemRepository;
        this.categoryRepository = categoryRepository;
        this.shopAccessService = shopAccessService;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> list(Long ownerId, Long shopId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        return itemRepository.findAllByShopId(shopId).stream().map(ItemResponse::from).toList();
    }

    @Transactional
    public ItemResponse create(Long ownerId, Long shopId, ItemRequest request) {
        Shop shop = shopAccessService.getOwnedShop(ownerId, shopId);
        Category category = getOwnedCategory(shopId, request.categoryId());

        Item item = new Item();
        item.setShop(shop);
        item.setCategory(category);
        applyRequest(item, request);
        return ItemResponse.from(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse update(Long ownerId, Long shopId, Long itemId, ItemRequest request) {
        Item item = getOwnedItem(ownerId, shopId, itemId);
        if (!item.getCategory().getId().equals(request.categoryId())) {
            item.setCategory(getOwnedCategory(shopId, request.categoryId()));
        }
        applyRequest(item, request);
        return ItemResponse.from(item);
    }

    @Transactional
    public ItemResponse addMedia(Long ownerId, Long shopId, Long itemId, List<MultipartFile> files) {
        Item item = getOwnedItem(ownerId, shopId, itemId);
        int nextOrder = item.getMedia().size();
        for (MultipartFile file : files) {
            String url = s3Service.upload("shops/" + shopId + "/items/" + itemId + "/media", file);
            ItemMedia media = new ItemMedia();
            media.setItem(item);
            media.setMediaUrl(url);
            media.setMediaType(ItemResponse.parseMediaType(file.getContentType()));
            media.setDisplayOrder(nextOrder++);
            item.getMedia().add(media);
        }
        return ItemResponse.from(item);
    }

    @Transactional
    public void removeMedia(Long ownerId, Long shopId, Long itemId, Long mediaId) {
        Item item = getOwnedItem(ownerId, shopId, itemId);
        item.getMedia().removeIf(m -> m.getId().equals(mediaId));
    }

    @Transactional
    public void delete(Long ownerId, Long shopId, Long itemId) {
        Item item = getOwnedItem(ownerId, shopId, itemId);
        // Soft delete: historical orders keep referring to this item's snapshot.
        item.setActive(false);
    }

    private void applyRequest(Item item, ItemRequest request) {
        item.setName(request.name());
        item.setDescription(request.description());
        item.setPriceInPaise(request.priceInPaise());
        item.setDiscountPercentage(request.discountPercentage() != null ? request.discountPercentage() : 0);
        item.setStockQuantity(request.stockQuantity());
    }

    private Category getOwnedCategory(Long shopId, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getShop().getId().equals(shopId)) {
            throw new ResourceNotFoundException("Category not found");
        }
        return category;
    }

    private Item getOwnedItem(Long ownerId, Long shopId, Long itemId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        Item item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Item not found"));
        if (!item.getShop().getId().equals(shopId)) {
            throw new ResourceNotFoundException("Item not found");
        }
        return item;
    }
}
