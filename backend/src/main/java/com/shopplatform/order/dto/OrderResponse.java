package com.shopplatform.order.dto;

import com.shopplatform.order.entity.Order;
import com.shopplatform.order.entity.OrderItem;
import com.shopplatform.shop.entity.Shop;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record OrderResponse(
    Long id,
    String status,
    long subtotalInPaise,
    long discountInPaise,
    long totalInPaise,
    String couponCode,
    String customerEmail,
    String shippingFullName,
    String shippingPhone,
    String shippingAddressLine1,
    String shippingAddressLine2,
    String shippingCity,
    String shippingState,
    String shippingPincode,
    String paymentMethod,
    String paymentReference,
    Instant createdAt,
    Instant updatedAt,
    List<LineItem> items,
    ManualPaymentInstructions manualPaymentInstructions
) {
    /** Statuses where the customer may still need to pay/resume a manual payment. */
    private static final Set<Order.Status> AWAITING_MANUAL_PAYMENT =
        Set.of(Order.Status.PENDING_PAYMENT, Order.Status.PAYMENT_SUBMITTED);

    public static OrderResponse from(Order order) {
        List<LineItem> items = order.getItems().stream()
            .map(OrderResponse::toLineItem)
            .toList();
        return new OrderResponse(
            order.getId(), order.getStatus().name(), order.getSubtotalInPaise(), order.getDiscountInPaise(),
            order.getTotalInPaise(), order.getCouponCode(), order.getCustomer().getEmail(),
            order.getShippingFullName(), order.getShippingPhone(), order.getShippingAddressLine1(),
            order.getShippingAddressLine2(), order.getShippingCity(), order.getShippingState(), order.getShippingPincode(),
            order.getPaymentMethod().name(), order.getPaymentReference(),
            order.getCreatedAt(), order.getUpdatedAt(), items, buildManualInstructions(order)
        );
    }

    private static ManualPaymentInstructions buildManualInstructions(Order order) {
        if (order.getPaymentMethod() != Order.PaymentMethod.MANUAL || !AWAITING_MANUAL_PAYMENT.contains(order.getStatus())) {
            return null;
        }
        Shop shop = order.getShop();
        return new ManualPaymentInstructions(
            shop.getContactPhone(), shop.getUpiId(),
            ManualPaymentInstructions.buildDeepLink(shop.getUpiId(), shop.getName(), order.getTotalInPaise(), order.getId()),
            shop.getBankAccountName(), shop.getBankAccountNumber(), shop.getBankIfscCode());
    }

    private static LineItem toLineItem(OrderItem oi) {
        return new LineItem(oi.getItem().getId(), oi.getItemNameSnapshot(), oi.getUnitPriceInPaiseSnapshot(),
            oi.getQuantity(), oi.getLineTotalInPaise());
    }

    public record LineItem(Long itemId, String name, long unitPriceInPaise, int quantity, long lineTotalInPaise) {
    }
}
