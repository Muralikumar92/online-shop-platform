package com.shopplatform.catalog.controller;

import com.shopplatform.catalog.dto.CategoryRequest;
import com.shopplatform.catalog.dto.CategoryResponse;
import com.shopplatform.catalog.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/owner/shops/{shopId}/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryResponse> list(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId) {
        return categoryService.list(ownerId, shopId).stream().map(CategoryResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                    @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(CategoryResponse.from(categoryService.create(ownerId, shopId, request)));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<CategoryResponse> update(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                    @PathVariable Long categoryId, @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(CategoryResponse.from(categoryService.update(ownerId, shopId, categoryId, request)));
    }

    @PostMapping(value = "/{categoryId}/thumbnail", consumes = "multipart/form-data")
    public ResponseEntity<CategoryResponse> uploadThumbnail(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                              @PathVariable Long categoryId, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(CategoryResponse.from(categoryService.uploadThumbnail(ownerId, shopId, categoryId, file)));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId, @PathVariable Long categoryId) {
        categoryService.delete(ownerId, shopId, categoryId);
        return ResponseEntity.noContent().build();
    }
}
