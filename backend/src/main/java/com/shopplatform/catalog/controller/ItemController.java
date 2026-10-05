package com.shopplatform.catalog.controller;

import com.shopplatform.catalog.dto.ItemRequest;
import com.shopplatform.catalog.dto.ItemResponse;
import com.shopplatform.catalog.service.ItemService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/owner/shops/{shopId}/items")
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public List<ItemResponse> list(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId) {
        return itemService.list(ownerId, shopId);
    }

    @PostMapping
    public ResponseEntity<ItemResponse> create(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                @Valid @RequestBody ItemRequest request) {
        return ResponseEntity.ok(itemService.create(ownerId, shopId, request));
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<ItemResponse> update(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                @PathVariable Long itemId, @Valid @RequestBody ItemRequest request) {
        return ResponseEntity.ok(itemService.update(ownerId, shopId, itemId, request));
    }

    @PostMapping(value = "/{itemId}/media", consumes = "multipart/form-data")
    public ResponseEntity<ItemResponse> addMedia(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                                  @PathVariable Long itemId, @RequestParam("files") List<MultipartFile> files) {
        return ResponseEntity.ok(itemService.addMedia(ownerId, shopId, itemId, files));
    }

    @DeleteMapping("/{itemId}/media/{mediaId}")
    public ResponseEntity<Void> removeMedia(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                             @PathVariable Long itemId, @PathVariable Long mediaId) {
        itemService.removeMedia(ownerId, shopId, itemId, mediaId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId, @PathVariable Long itemId) {
        itemService.delete(ownerId, shopId, itemId);
        return ResponseEntity.noContent().build();
    }
}
