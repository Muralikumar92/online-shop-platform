package com.shopplatform.shop.controller;

import com.shopplatform.tenant.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Temporary diagnostic endpoint to verify subdomain-based tenant resolution
 * end-to-end. Will be superseded by the real public storefront endpoint in
 * the storefront epic.
 */
@RestController
public class TenantDiagnosticController {

    @GetMapping("/api/public/whoami")
    public Map<String, Object> whoAmI() {
        return Map.of(
            "resolvedShopId", TenantContext.getShopId() == null ? "" : TenantContext.getShopId(),
            "resolvedShopSlug", TenantContext.getShopSlug() == null ? "" : TenantContext.getShopSlug()
        );
    }
}
