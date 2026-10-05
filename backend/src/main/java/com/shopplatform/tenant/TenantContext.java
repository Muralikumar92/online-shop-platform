package com.shopplatform.tenant;

/**
 * Holds the current request's resolved tenant (shop) id in a thread-local,
 * populated by {@link TenantResolutionFilter} from the request subdomain.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_SHOP_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_SHOP_SLUG = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setShopId(Long shopId) {
        CURRENT_SHOP_ID.set(shopId);
    }

    public static Long getShopId() {
        return CURRENT_SHOP_ID.get();
    }

    public static void setShopSlug(String slug) {
        CURRENT_SHOP_SLUG.set(slug);
    }

    public static String getShopSlug() {
        return CURRENT_SHOP_SLUG.get();
    }

    public static void clear() {
        CURRENT_SHOP_ID.remove();
        CURRENT_SHOP_SLUG.remove();
    }
}
