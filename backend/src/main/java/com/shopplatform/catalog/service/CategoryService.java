package com.shopplatform.catalog.service;

import com.shopplatform.catalog.dto.CategoryRequest;
import com.shopplatform.catalog.entity.Category;
import com.shopplatform.catalog.repository.CategoryRepository;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.S3Service;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.service.ShopAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ShopAccessService shopAccessService;
    private final S3Service s3Service;

    public CategoryService(CategoryRepository categoryRepository, ShopAccessService shopAccessService, S3Service s3Service) {
        this.categoryRepository = categoryRepository;
        this.shopAccessService = shopAccessService;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<Category> list(Long ownerId, Long shopId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        return categoryRepository.findAllByShopIdOrderByDisplayOrderAsc(shopId);
    }

    @Transactional
    public Category create(Long ownerId, Long shopId, CategoryRequest request) {
        Shop shop = shopAccessService.getOwnedShop(ownerId, shopId);
        Category category = new Category();
        category.setShop(shop);
        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 0);
        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(Long ownerId, Long shopId, Long categoryId, CategoryRequest request) {
        Category category = getOwnedCategory(ownerId, shopId, categoryId);
        category.setName(request.name());
        if (request.displayOrder() != null) {
            category.setDisplayOrder(request.displayOrder());
        }
        return category;
    }

    @Transactional
    public Category uploadThumbnail(Long ownerId, Long shopId, Long categoryId, MultipartFile file) {
        Category category = getOwnedCategory(ownerId, shopId, categoryId);
        String url = s3Service.upload("shops/" + shopId + "/categories/" + categoryId + "/thumbnail", file);
        category.setThumbnailUrl(url);
        return category;
    }

    @Transactional
    public void delete(Long ownerId, Long shopId, Long categoryId) {
        Category category = getOwnedCategory(ownerId, shopId, categoryId);
        // Soft delete: keeps historical orders referencing items in this category intact.
        category.setActive(false);
    }

    private Category getOwnedCategory(Long ownerId, Long shopId, Long categoryId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        Category category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getShop().getId().equals(shopId)) {
            throw new ResourceNotFoundException("Category not found");
        }
        return category;
    }
}
