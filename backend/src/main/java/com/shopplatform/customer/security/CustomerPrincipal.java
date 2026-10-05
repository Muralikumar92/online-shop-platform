package com.shopplatform.customer.security;

/**
 * Authenticated principal for ROLE_CUSTOMER requests. Carries both the
 * customer id and the shop id the customer's token was issued for, so
 * callers can verify the token's shop matches the current request's
 * subdomain-resolved tenant (preventing a customer token for one shop
 * being replayed against a different shop's storefront).
 */
public record CustomerPrincipal(Long customerId, Long shopId) {
}
