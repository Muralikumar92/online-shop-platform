package com.shopplatform.catalog.dto;

import com.shopplatform.catalog.entity.Category;

public record CategoryResponse(Long id, String name, String thumbnailUrl, int displayOrder, boolean active) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getThumbnailUrl(),
            category.getDisplayOrder(), category.isActive());
    }
}
