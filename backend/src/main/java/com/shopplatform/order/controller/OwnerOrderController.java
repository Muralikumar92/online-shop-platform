package com.shopplatform.order.controller;

import com.shopplatform.order.dto.OrderResponse;
import com.shopplatform.order.dto.OrderStatusUpdateRequest;
import com.shopplatform.order.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/owner/shops/{shopId}/orders")
public class OwnerOrderController {

    private final OrderService orderService;

    public OwnerOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderResponse> list(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId) {
        return orderService.listShopOrders(ownerId, shopId);
    }

    @GetMapping("/{orderId}")
    public OrderResponse get(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId, @PathVariable Long orderId) {
        return orderService.getShopOrder(ownerId, shopId, orderId);
    }

    @PatchMapping("/{orderId}/status")
    public OrderResponse updateStatus(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId,
                                       @PathVariable Long orderId, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(ownerId, shopId, orderId, request);
    }

    /** Accepts a guest order request and locks stock for it (see OrderService#reserveGuestOrder). */
    @PostMapping("/{orderId}/reserve")
    public OrderResponse reserve(@AuthenticationPrincipal Long ownerId, @PathVariable Long shopId, @PathVariable Long orderId) {
        return orderService.reserveGuestOrder(ownerId, shopId, orderId);
    }
}
