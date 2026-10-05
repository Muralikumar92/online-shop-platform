package com.shopplatform.order.controller;

import com.shopplatform.customer.security.CustomerPrincipal;
import com.shopplatform.customer.security.CustomerTenantGuard;
import com.shopplatform.order.dto.CheckoutConfirmRequest;
import com.shopplatform.order.dto.CheckoutInitiateRequest;
import com.shopplatform.order.dto.CheckoutInitiateResponse;
import com.shopplatform.order.dto.OrderResponse;
import com.shopplatform.order.dto.SubmitManualPaymentRequest;
import com.shopplatform.order.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class CheckoutController {

    private final OrderService orderService;
    private final CustomerTenantGuard customerTenantGuard;

    public CheckoutController(OrderService orderService, CustomerTenantGuard customerTenantGuard) {
        this.orderService = orderService;
        this.customerTenantGuard = customerTenantGuard;
    }

    @PostMapping("/checkout/initiate")
    public ResponseEntity<CheckoutInitiateResponse> initiate(@AuthenticationPrincipal CustomerPrincipal principal,
                                                               @Valid @RequestBody CheckoutInitiateRequest request) {
        customerTenantGuard.verify(principal);
        return ResponseEntity.ok(orderService.initiateCheckout(principal.customerId(), principal.shopId(), request));
    }

    @PostMapping("/checkout/confirm")
    public ResponseEntity<OrderResponse> confirm(@AuthenticationPrincipal CustomerPrincipal principal,
                                                  @Valid @RequestBody CheckoutConfirmRequest request) {
        customerTenantGuard.verify(principal);
        return ResponseEntity.ok(orderService.confirmPayment(principal.customerId(), principal.shopId(), request));
    }

    @PostMapping("/checkout/submit-payment")
    public ResponseEntity<OrderResponse> submitManualPayment(@AuthenticationPrincipal CustomerPrincipal principal,
                                                              @Valid @RequestBody SubmitManualPaymentRequest request) {
        customerTenantGuard.verify(principal);
        return ResponseEntity.ok(orderService.submitManualPayment(principal.customerId(), principal.shopId(), request));
    }

    @GetMapping("/orders")
    public List<OrderResponse> listOrders(@AuthenticationPrincipal CustomerPrincipal principal) {
        customerTenantGuard.verify(principal);
        return orderService.listMyOrders(principal.customerId(), principal.shopId());
    }

    @GetMapping("/orders/{orderId}")
    public OrderResponse getOrder(@AuthenticationPrincipal CustomerPrincipal principal, @PathVariable Long orderId) {
        customerTenantGuard.verify(principal);
        return orderService.getMyOrder(principal.customerId(), principal.shopId(), orderId);
    }

    @PostMapping("/orders/{orderId}/cancel")
    public OrderResponse cancelOrder(@AuthenticationPrincipal CustomerPrincipal principal, @PathVariable Long orderId) {
        customerTenantGuard.verify(principal);
        return orderService.cancelMyOrder(principal.customerId(), principal.shopId(), orderId);
    }
}
