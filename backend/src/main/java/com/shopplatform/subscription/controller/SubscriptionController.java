package com.shopplatform.subscription.controller;

import com.shopplatform.shop.dto.ShopResponse;
import com.shopplatform.subscription.dto.*;
import com.shopplatform.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    /** Public so the signup/pricing page can display plans before the owner logs in. */
    @GetMapping("/api/public/subscription-plans")
    public List<PlanResponse> listPlans() {
        return subscriptionService.listActivePlans().stream().map(PlanResponse::from).toList();
    }

    @PostMapping("/api/owner/shops/{shopId}/subscription/initiate")
    public ResponseEntity<InitiateSubscriptionResponse> initiate(@AuthenticationPrincipal Long ownerId,
                                                                   @PathVariable Long shopId,
                                                                   @Valid @RequestBody InitiateSubscriptionRequest request) {
        var result = subscriptionService.initiate(ownerId, shopId, request.planId());
        return ResponseEntity.ok(new InitiateSubscriptionResponse(
            result.razorpayOrderId(), result.amountInPaise(), "INR", result.razorpayKeyId()));
    }

    @PostMapping("/api/owner/shops/{shopId}/subscription/confirm")
    public ResponseEntity<ShopResponse> confirm(@AuthenticationPrincipal Long ownerId,
                                                 @PathVariable Long shopId,
                                                 @Valid @RequestBody ConfirmSubscriptionRequest request) {
        var shop = subscriptionService.confirm(ownerId, shopId, request);
        return ResponseEntity.ok(ShopResponse.from(shop));
    }
}
