package com.shopplatform.customer.security;

import com.shopplatform.common.exception.AuthenticationFailedException;
import com.shopplatform.tenant.TenantContext;
import org.springframework.stereotype.Component;

/**
 * Guards customer-authenticated endpoints against a token issued for one
 * shop being replayed against a different shop's subdomain: a customer's
 * JWT embeds the shopId it was issued for, which must match the shop
 * resolved from the current request's subdomain.
 */
@Component
public class CustomerTenantGuard {

    public void verify(CustomerPrincipal principal) {
        Long currentShopId = TenantContext.getShopId();
        if (currentShopId == null || principal == null || !currentShopId.equals(principal.shopId())) {
            throw new AuthenticationFailedException("This session is not valid for this shop");
        }
    }
}
