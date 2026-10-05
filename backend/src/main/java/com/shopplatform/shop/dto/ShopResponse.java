package com.shopplatform.shop.dto;

import com.shopplatform.shop.entity.Shop;

import java.time.LocalDate;

public record ShopResponse(
    Long id,
    String slug,
    String name,
    String logoUrl,
    String subscriptionStatus,
    LocalDate subscriptionExpiresOn,
    boolean bankDetailsConfigured,
    String bankAccountName,
    String bankAccountNumber,
    String bankIfscCode,
    String upiId,
    String contactPhone
) {
    public static ShopResponse from(Shop shop) {
        return new ShopResponse(
            shop.getId(),
            shop.getSlug(),
            shop.getName(),
            shop.getLogoUrl(),
            shop.getSubscriptionStatus().name(),
            shop.getSubscriptionExpiresOn(),
            shop.getBankAccountNumber() != null && !shop.getBankAccountNumber().isBlank(),
            shop.getBankAccountName(),
            shop.getBankAccountNumber(),
            shop.getBankIfscCode(),
            shop.getUpiId(),
            shop.getContactPhone()
        );
    }
}
