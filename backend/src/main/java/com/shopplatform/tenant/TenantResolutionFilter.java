package com.shopplatform.tenant;

import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Resolves the tenant (shop) for every request from its subdomain, e.g.
 * "acme.myshops.com" -> slug "acme". Platform-level hosts (root domain,
 * "www", "api", "admin") are treated as non-tenant requests.
 *
 * The resolved shop id/slug is made available for the duration of the
 * request via {@link TenantContext} and cleared afterwards so thread-pooled
 * request threads never leak tenant state across requests.
 */
@Component
public class TenantResolutionFilter extends OncePerRequestFilter {

    private static final List<String> RESERVED_SUBDOMAINS = List.of("www", "api", "admin");

    private final ShopRepository shopRepository;

    public TenantResolutionFilter(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String slug = extractSubdomain(resolveHost(request));
            if (slug != null) {
                // Only resolve as a tenant if the storefront is actually meant to be
                // reachable right now (active + TRIAL/ACTIVE subscription); an expired
                // or cancelled shop is treated the same as "no such shop" for customers,
                // gating storefront access on a paid-up subscription.
                shopRepository.findBySlugAndActiveTrue(slug)
                    .filter(Shop::isStorefrontAccessible)
                    .ifPresent(shop -> {
                        TenantContext.setShopId(shop.getId());
                        TenantContext.setShopSlug(shop.getSlug());
                    });
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Prefers X-Forwarded-Host over getServerName(): the Next.js server-side
     * fetch helper calls this backend directly (bypassing nginx) to render
     * storefront pages, and browser "fetch" implementations forbid overriding
     * the real Host header on outgoing requests - so it forwards the original
     * tenant host via X-Forwarded-Host instead. nginx-fronted requests (prod
     * browser traffic, and the /api/ location) already set Host correctly via
     * proxy_set_header, so getServerName() remains the fallback for those.
     */
    private String resolveHost(HttpServletRequest request) {
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            return forwardedHost.split(":")[0];
        }
        return request.getServerName();
    }

    /**
     * Extracts the leftmost label of the host as the tenant slug, e.g.
     * "acme.myshops.com" -> "acme". Returns null for bare/reserved hosts
     * (e.g. "myshops.com", "www.myshops.com", "localhost").
     */
    private String extractSubdomain(String serverName) {
        if (serverName == null) {
            return null;
        }
        String[] parts = serverName.split("\\.");
        if (parts.length < 3) {
            return null;
        }
        String candidate = parts[0];
        if (RESERVED_SUBDOMAINS.contains(candidate)) {
            return null;
        }
        return candidate;
    }
}
