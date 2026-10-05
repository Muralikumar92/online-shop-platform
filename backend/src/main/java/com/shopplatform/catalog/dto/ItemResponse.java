package com.shopplatform.catalog.dto;

import com.shopplatform.catalog.entity.Item;
import com.shopplatform.catalog.entity.ItemMedia;

import java.util.List;

public record ItemResponse(
    Long id,
    String name,
    String description,
    Long categoryId,
    long priceInPaise,
    int discountPercentage,
    long effectivePriceInPaise,
    int stockQuantity,
    boolean active,
    List<MediaItem> media
) {
    public static ItemResponse from(Item item) {
        List<MediaItem> media = item.getMedia().stream()
            .map(m -> new MediaItem(m.getId(), m.getMediaUrl(), m.getMediaType().name(), m.getDisplayOrder()))
            .toList();
        return new ItemResponse(
            item.getId(), item.getName(), item.getDescription(), item.getCategory().getId(),
            item.getPriceInPaise(), item.getDiscountPercentage(), item.getEffectivePriceInPaise(),
            item.getStockQuantity(), item.isActive(), media
        );
    }

    public record MediaItem(Long id, String url, String type, int displayOrder) {
    }

    public static ItemMedia.MediaType parseMediaType(String contentType) {
        return contentType != null && contentType.startsWith("video") ? ItemMedia.MediaType.VIDEO : ItemMedia.MediaType.IMAGE;
    }
}
