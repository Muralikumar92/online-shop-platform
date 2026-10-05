package com.shopplatform.order.controller;

import com.shopplatform.order.dto.GuestCheckoutRequest;
import com.shopplatform.order.dto.GuestCheckoutResponse;
import com.shopplatform.order.dto.OrderResponse;
import com.shopplatform.order.service.OrderService;
import com.shopplatform.tenant.TenantContext;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Guest checkout: no account, login, email or OTP anywhere in this path.
 * A customer checks out, gets a shareable text summary to hand to the shop
 * owner via WhatsApp/Instagram DM, and can track/cancel the order later
 * using only the unguessable tracking link - see OrderService for the full
 * flow and why stock isn't reserved until the owner explicitly accepts it.
 */
@RestController
@RequestMapping("/api/public/guest")
public class GuestCheckoutController {

    private static final String DEVICE_COOKIE = "guest_device";
    private static final int DEVICE_COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

    private final OrderService orderService;

    public GuestCheckoutController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/checkout")
    public GuestCheckoutResponse checkout(@Valid @RequestBody GuestCheckoutRequest request,
                                           HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String deviceToken = resolveOrIssueDeviceToken(httpRequest, httpResponse);
        String trackingUrlBase = baseUrl(httpRequest) + "/orders/track";
        return orderService.requestGuestOrder(TenantContext.getShopId(), request, deviceToken, trackingUrlBase);
    }

    @GetMapping("/orders/{token}")
    public OrderResponse track(@PathVariable String token) {
        return orderService.getOrderByTrackingToken(token);
    }

    @PostMapping("/orders/{token}/cancel")
    public OrderResponse cancel(@PathVariable String token) {
        return orderService.cancelOrderByTrackingToken(token);
    }

    /** One open order per browser is enforced in OrderService using this cookie, not by login. */
    private String resolveOrIssueDeviceToken(HttpServletRequest request, HttpServletResponse response) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (DEVICE_COOKIE.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        String token = UUID.randomUUID().toString();
        Cookie cookie = new Cookie(DEVICE_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(DEVICE_COOKIE_MAX_AGE_SECONDS);
        response.addCookie(cookie);
        return token;
    }

    private String baseUrl(HttpServletRequest request) {
        // Mirrors TenantResolutionFilter.resolveHost(): prefer X-Forwarded-Host
        // (set by the local-dev Next.js proxy, which can't override the real
        // Host header) so tracking links are correct in both dev and prod.
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String host = (forwardedHost != null && !forwardedHost.isBlank()) ? forwardedHost : request.getHeader("Host");
        return request.getScheme() + "://" + host;
    }
}
