package com.shopplatform.order.service;

import com.shopplatform.catalog.entity.Coupon;
import com.shopplatform.catalog.entity.Item;
import com.shopplatform.catalog.repository.CouponRepository;
import com.shopplatform.catalog.repository.ItemRepository;
import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.EmailService;
import com.shopplatform.common.service.PaymentGatewayService;
import com.shopplatform.customer.entity.Customer;
import com.shopplatform.customer.repository.CustomerRepository;
import com.shopplatform.order.dto.CheckoutConfirmRequest;
import com.shopplatform.order.dto.CheckoutInitiateRequest;
import com.shopplatform.order.dto.CheckoutInitiateResponse;
import com.shopplatform.order.dto.GuestCheckoutRequest;
import com.shopplatform.order.dto.GuestCheckoutResponse;
import com.shopplatform.order.dto.ManualPaymentInstructions;
import com.shopplatform.order.dto.OrderResponse;
import com.shopplatform.order.dto.OrderStatusUpdateRequest;
import com.shopplatform.order.dto.SubmitManualPaymentRequest;
import com.shopplatform.order.entity.Order;
import com.shopplatform.order.entity.OrderItem;
import com.shopplatform.order.repository.OrderRepository;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import com.shopplatform.shop.service.ShopAccessService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Cart contents are managed client-side (frontend state); checkout is a
 * single atomic server operation: validate current price/stock, reserve
 * stock immediately with a conditional UPDATE (so at most {@code n}
 * concurrent customers can ever claim {@code n} units - anyone past that
 * is rejected and told someone else already booked it), create the order,
 * and hand back a Razorpay order to pay for. Orders left unpaid are
 * swept and their stock released automatically.
 */
@Service
public class OrderService {

    private static final int PAYMENT_WINDOW_MINUTES = 20;
    private static final int MANUAL_PAYMENT_WINDOW_MINUTES = 24 * 60;

    /** Valid forward-only owner-driven status transitions; CANCELLED is only allowed before the order leaves the shop's hands. */
    private static final Map<Order.Status, Set<Order.Status>> ALLOWED_TRANSITIONS = new EnumMap<>(Order.Status.class);
    static {
        // Rejecting a REQUESTED guest order just cancels it - no stock was ever reserved (stockReserved=false),
        // so releaseStock() below is a no-op for this path. Moving to PENDING_PAYMENT only happens via
        // reserveGuestOrder(), never this generic status update, because that transition must also lock stock.
        ALLOWED_TRANSITIONS.put(Order.Status.REQUESTED, EnumSet.of(Order.Status.CANCELLED));
        ALLOWED_TRANSITIONS.put(Order.Status.PENDING_PAYMENT, EnumSet.of(Order.Status.CANCELLED));
        ALLOWED_TRANSITIONS.put(Order.Status.PAYMENT_SUBMITTED, EnumSet.of(Order.Status.PAID, Order.Status.CANCELLED));
        ALLOWED_TRANSITIONS.put(Order.Status.PAID, EnumSet.of(Order.Status.PACKED, Order.Status.CANCELLED));
        ALLOWED_TRANSITIONS.put(Order.Status.PACKED, EnumSet.of(Order.Status.DISPATCHED, Order.Status.CANCELLED));
        ALLOWED_TRANSITIONS.put(Order.Status.DISPATCHED, EnumSet.of(Order.Status.IN_TRANSIT));
        ALLOWED_TRANSITIONS.put(Order.Status.IN_TRANSIT, EnumSet.of(Order.Status.DELIVERED));
    }

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final CouponRepository couponRepository;
    private final CustomerRepository customerRepository;
    private final ShopRepository shopRepository;
    private final ShopAccessService shopAccessService;
    private final PaymentGatewayService paymentGatewayService;
    private final EmailService emailService;
    private final String razorpayKeyId;

    public OrderService(OrderRepository orderRepository,
                         ItemRepository itemRepository,
                         CouponRepository couponRepository,
                         CustomerRepository customerRepository,
                         ShopRepository shopRepository,
                         ShopAccessService shopAccessService,
                         PaymentGatewayService paymentGatewayService,
                         EmailService emailService,
                         @Value("${app.razorpay.key-id}") String razorpayKeyId) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.couponRepository = couponRepository;
        this.customerRepository = customerRepository;
        this.shopRepository = shopRepository;
        this.shopAccessService = shopAccessService;
        this.paymentGatewayService = paymentGatewayService;
        this.emailService = emailService;
        this.razorpayKeyId = razorpayKeyId;
    }

    @Transactional
    public CheckoutInitiateResponse initiateCheckout(Long customerId, Long shopId, CheckoutInitiateRequest request) {
        Shop shop = shopRepository.findById(shopId).orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        Customer customer = customerRepository.findById(customerId)
            .filter(c -> c.getShop().getId().equals(shopId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Order.PaymentMethod paymentMethod = parsePaymentMethod(request.paymentMethod());

        Order order = new Order();
        order.setShop(shop);
        order.setCustomer(customer);
        order.setPaymentMethod(paymentMethod);
        applyShipping(order, request.shippingAddress());

        long subtotal = 0;
        List<OrderItem> orderItems = new ArrayList<>();
        for (CheckoutInitiateRequest.CheckoutItemRequest line : request.items()) {
            Item item = itemRepository.findById(line.itemId())
                .filter(i -> i.getShop().getId().equals(shopId) && i.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + line.itemId()));

            // Reserve stock now, atomically; a 0-row update means someone else
            // already took the remaining units between browse and checkout.
            int updated = itemRepository.decrementStock(item.getId(), line.quantity());
            if (updated == 0) {
                throw new BusinessException("\"" + item.getName() + "\" no longer has enough stock available "
                    + "- someone else may have just purchased it. Please update your cart.");
            }

            long unitPrice = item.getEffectivePriceInPaise();
            long lineTotal = unitPrice * line.quantity();
            subtotal += lineTotal;

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setItem(item);
            orderItem.setItemNameSnapshot(item.getName());
            orderItem.setUnitPriceInPaiseSnapshot(unitPrice);
            orderItem.setQuantity(line.quantity());
            orderItem.setLineTotalInPaise(lineTotal);
            orderItems.add(orderItem);
        }

        long discount = 0;
        String appliedCouponCode = null;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            Coupon coupon = couponRepository.findByShopIdAndCodeIgnoreCase(shopId, request.couponCode())
                .filter(Coupon::isCurrentlyValid)
                .orElseThrow(() -> new BusinessException("Coupon is invalid or expired"));
            if (subtotal < coupon.getMinOrderAmount()) {
                throw new BusinessException("Order does not meet the minimum amount for this coupon");
            }
            discount = coupon.getDiscountType() == Coupon.DiscountType.PERCENTAGE
                ? subtotal * coupon.getDiscountValue() / 100
                : Math.min(coupon.getDiscountValue(), subtotal);
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            appliedCouponCode = coupon.getCode();
        }

        order.setSubtotalInPaise(subtotal);
        order.setDiscountInPaise(discount);
        order.setTotalInPaise(subtotal - discount);
        order.setCouponCode(appliedCouponCode);
        order.getItems().addAll(orderItems);

        if (paymentMethod == Order.PaymentMethod.MANUAL) {
            order = orderRepository.save(order);
            ManualPaymentInstructions instructions = new ManualPaymentInstructions(
                shop.getContactPhone(), shop.getUpiId(),
                ManualPaymentInstructions.buildDeepLink(shop.getUpiId(), shop.getName(), order.getTotalInPaise(), order.getId()),
                shop.getBankAccountName(), shop.getBankAccountNumber(), shop.getBankIfscCode());
            return new CheckoutInitiateResponse(order.getId(), paymentMethod.name(), null, order.getTotalInPaise(), null, instructions);
        }

        String receipt = "order-" + System.currentTimeMillis();
        String razorpayOrderId = paymentGatewayService.createOrder(order.getTotalInPaise(), receipt);
        order.setRazorpayOrderId(razorpayOrderId);

        order = orderRepository.save(order);
        return new CheckoutInitiateResponse(order.getId(), paymentMethod.name(), razorpayOrderId, order.getTotalInPaise(), razorpayKeyId, null);
    }

    /** Guest orders considered "still active" for the purposes of the one-open-order-per-device limit. */
    private static final Set<Order.Status> OPEN_GUEST_STATUSES =
        EnumSet.of(Order.Status.REQUESTED, Order.Status.PENDING_PAYMENT, Order.Status.PAYMENT_SUBMITTED);

    /**
     * Guest checkout: no account/login/email anywhere in this path. A
     * lightweight "guest" {@link Customer} row is created/reused (identified
     * by a device cookie, not email/password) purely so the order model
     * doesn't need a parallel schema. Stock is deliberately NOT reserved
     * here - unlike {@link #initiateCheckout}, this just records the
     * request; see {@link #reserveGuestOrder} for why. The returned
     * {@code shareMessage} is a ready-to-send text summary the customer
     * hands to the shop owner via WhatsApp/Instagram DM.
     */
    @Transactional
    public GuestCheckoutResponse requestGuestOrder(Long shopId, GuestCheckoutRequest request, String deviceToken, String trackingUrlBase) {
        Shop shop = shopRepository.findById(shopId).orElseThrow(() -> new ResourceNotFoundException("Shop not found"));

        Customer guest = customerRepository.findByShopIdAndGuestDeviceTokenAndGuestTrue(shopId, deviceToken)
            .orElseGet(() -> {
                Customer c = new Customer();
                c.setShop(shop);
                c.setGuest(true);
                c.setGuestDeviceToken(deviceToken);
                return customerRepository.save(c);
            });

        boolean hasOpenOrder = !orderRepository.findAllByCustomerIdAndStatusIn(guest.getId(), OPEN_GUEST_STATUSES).isEmpty();
        if (hasOpenOrder) {
            throw new BusinessException("You already have a pending order with this shop. "
                + "Please wait for the shop owner to respond, or cancel it before placing a new one.");
        }

        Order order = new Order();
        order.setShop(shop);
        order.setCustomer(guest);
        order.setStatus(Order.Status.REQUESTED);
        order.setPaymentMethod(Order.PaymentMethod.MANUAL);
        order.setStockReserved(false);
        order.setGuestAccessToken(UUID.randomUUID().toString());
        applyShipping(order, request.shippingAddress());
        guest.setFullName(request.shippingAddress().fullName());
        guest.setPhone(request.shippingAddress().phone());

        long subtotal = 0;
        List<OrderItem> orderItems = new ArrayList<>();
        StringBuilder itemLines = new StringBuilder();
        for (CheckoutInitiateRequest.CheckoutItemRequest line : request.items()) {
            Item item = itemRepository.findById(line.itemId())
                .filter(i -> i.getShop().getId().equals(shopId) && i.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + line.itemId()));
            // No atomic decrement/lock here - nothing is reserved until the owner accepts the request.
            if (item.getStockQuantity() < line.quantity()) {
                throw new BusinessException("\"" + item.getName() + "\" doesn't have enough stock available right now.");
            }

            long unitPrice = item.getEffectivePriceInPaise();
            long lineTotal = unitPrice * line.quantity();
            subtotal += lineTotal;

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setItem(item);
            orderItem.setItemNameSnapshot(item.getName());
            orderItem.setUnitPriceInPaiseSnapshot(unitPrice);
            orderItem.setQuantity(line.quantity());
            orderItem.setLineTotalInPaise(lineTotal);
            orderItems.add(orderItem);

            itemLines.append(line.quantity()).append("x ").append(item.getName())
                .append(" - ").append(formatRupees(lineTotal)).append('\n');
        }

        long discount = 0;
        String appliedCouponCode = null;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            Coupon coupon = couponRepository.findByShopIdAndCodeIgnoreCase(shopId, request.couponCode())
                .filter(Coupon::isCurrentlyValid)
                .orElseThrow(() -> new BusinessException("Coupon is invalid or expired"));
            if (subtotal < coupon.getMinOrderAmount()) {
                throw new BusinessException("Order does not meet the minimum amount for this coupon");
            }
            discount = coupon.getDiscountType() == Coupon.DiscountType.PERCENTAGE
                ? subtotal * coupon.getDiscountValue() / 100
                : Math.min(coupon.getDiscountValue(), subtotal);
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            appliedCouponCode = coupon.getCode();
        }

        order.setSubtotalInPaise(subtotal);
        order.setDiscountInPaise(discount);
        order.setTotalInPaise(subtotal - discount);
        order.setCouponCode(appliedCouponCode);
        order.getItems().addAll(orderItems);

        order = orderRepository.save(order);

        String trackingUrl = trackingUrlBase + "/" + order.getGuestAccessToken();
        String shareMessage = "Hi! I'd like to order from " + shop.getName() + ":\n\n" + itemLines
            + "\nTotal: " + formatRupees(order.getTotalInPaise())
            + "\n\nName: " + request.shippingAddress().fullName()
            + "\nPhone: " + request.shippingAddress().phone()
            + "\nAddress: " + formatAddress(request.shippingAddress())
            + "\n\nOrder ref #" + order.getId()
            + "\nTrack: " + trackingUrl;

        return new GuestCheckoutResponse(order.getId(), order.getGuestAccessToken(), trackingUrl, order.getTotalInPaise(), shareMessage);
    }

    /**
     * Owner accepts a guest order request: this is the moment stock is
     * actually locked (atomic conditional decrement, same guarantee as the
     * signed-in checkout flow). Deliberately a manual, explicit owner action
     * rather than automatic - so a stranger who requests an only-1-in-stock
     * item and then vanishes can't make it unavailable forever; the owner
     * only locks it once they've actually heard back from the customer.
     */
    @Transactional
    public OrderResponse reserveGuestOrder(Long ownerId, Long shopId, Long orderId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        Order order = getShopScopedOrder(shopId, orderId);
        if (order.getStatus() != Order.Status.REQUESTED) {
            throw new BusinessException("Only a requested order can be reserved");
        }

        for (OrderItem oi : order.getItems()) {
            int updated = itemRepository.decrementStock(oi.getItem().getId(), oi.getQuantity());
            if (updated == 0) {
                throw new BusinessException("\"" + oi.getItemNameSnapshot() + "\" no longer has enough stock to reserve this order.");
            }
        }

        order.setStockReserved(true);
        order.setStatus(Order.Status.PENDING_PAYMENT);
        order.setUpdatedAt(Instant.now());
        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByTrackingToken(String token) {
        return OrderResponse.from(orderRepository.findByGuestAccessToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found")));
    }

    @Transactional
    public OrderResponse cancelOrderByTrackingToken(String token) {
        Order order = orderRepository.findByGuestAccessToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!CUSTOMER_CANCELLABLE.contains(order.getStatus())) {
            throw new BusinessException("This order can no longer be cancelled - it's already being prepared by the shop.");
        }
        order.setStatus(Order.Status.CANCELLED);
        order.setUpdatedAt(Instant.now());
        releaseStock(order);
        return OrderResponse.from(order);
    }

    private String formatRupees(long amountInPaise) {
        return String.format("\u20b9%.2f", amountInPaise / 100.0);
    }

    private String formatAddress(CheckoutInitiateRequest.ShippingAddressRequest address) {
        StringBuilder sb = new StringBuilder(address.addressLine1());
        if (address.addressLine2() != null && !address.addressLine2().isBlank()) {
            sb.append(", ").append(address.addressLine2());
        }
        sb.append(", ").append(address.city()).append(", ").append(address.state()).append(" - ").append(address.pincode());
        return sb.toString();
    }

    private Order.PaymentMethod parsePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) {
            return Order.PaymentMethod.RAZORPAY;
        }
        try {
            return Order.PaymentMethod.valueOf(raw);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Unknown payment method: " + raw);
        }
    }

    /**
     * Customer self-reports having paid the shop owner directly (bank
     * transfer/UPI/cash). Doesn't mark the order PAID by itself - the owner
     * still has to verify the money actually arrived and confirm via
     * {@link #updateStatus}, keeping a clear order<->payment link without
     * blindly trusting the customer's word.
     */
    @Transactional
    public OrderResponse submitManualPayment(Long customerId, Long shopId, SubmitManualPaymentRequest request) {
        Order order = getOwnedOrder(customerId, shopId, request.orderId());
        if (order.getPaymentMethod() != Order.PaymentMethod.MANUAL) {
            throw new BusinessException("This order was not set up for manual payment");
        }
        if (order.getStatus() != Order.Status.PENDING_PAYMENT) {
            throw new BusinessException("This order is not awaiting payment");
        }
        order.setPaymentReference(request.paymentReference());
        order.setStatus(Order.Status.PAYMENT_SUBMITTED);
        order.setUpdatedAt(Instant.now());
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse confirmPayment(Long customerId, Long shopId, CheckoutConfirmRequest request) {
        Order order = getOwnedOrder(customerId, shopId, request.orderId());
        if (order.getStatus() != Order.Status.PENDING_PAYMENT) {
            throw new BusinessException("This order is not awaiting payment");
        }
        if (!order.getRazorpayOrderId().equals(request.razorpayOrderId())) {
            throw new BusinessException("Order/payment mismatch");
        }

        boolean valid = paymentGatewayService.verifySignature(
            request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature());
        if (!valid) {
            order.setStatus(Order.Status.PAYMENT_FAILED);
            order.setUpdatedAt(Instant.now());
            releaseStock(order);
            throw new BusinessException("Payment verification failed");
        }

        order.setRazorpayPaymentId(request.razorpayPaymentId());
        order.setStatus(Order.Status.PAID);
        order.setUpdatedAt(Instant.now());
        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listMyOrders(Long customerId, Long shopId) {
        customerRepository.findById(customerId)
            .filter(c -> c.getShop().getId().equals(shopId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        return orderRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId).stream()
            .filter(o -> o.getShop().getId().equals(shopId))
            .map(OrderResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getMyOrder(Long customerId, Long shopId, Long orderId) {
        return OrderResponse.from(getOwnedOrder(customerId, shopId, orderId));
    }

    /** Customers may cancel their own order only while it's still unpaid/unconfirmed by the owner. */
    private static final Set<Order.Status> CUSTOMER_CANCELLABLE =
        EnumSet.of(Order.Status.REQUESTED, Order.Status.PENDING_PAYMENT, Order.Status.PAYMENT_SUBMITTED);

    @Transactional
    public OrderResponse cancelMyOrder(Long customerId, Long shopId, Long orderId) {
        Order order = getOwnedOrder(customerId, shopId, orderId);
        if (!CUSTOMER_CANCELLABLE.contains(order.getStatus())) {
            throw new BusinessException("This order can no longer be cancelled - it's already being prepared by the shop.");
        }
        order.setStatus(Order.Status.CANCELLED);
        order.setUpdatedAt(Instant.now());
        releaseStock(order);
        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listShopOrders(Long ownerId, Long shopId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        return orderRepository.findAllByShopIdOrderByCreatedAtDesc(shopId).stream()
            .map(OrderResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getShopOrder(Long ownerId, Long shopId, Long orderId) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        return OrderResponse.from(getShopScopedOrder(shopId, orderId));
    }

    @Transactional
    public OrderResponse updateStatus(Long ownerId, Long shopId, Long orderId, OrderStatusUpdateRequest request) {
        shopAccessService.getOwnedShop(ownerId, shopId);
        Order order = getShopScopedOrder(shopId, orderId);

        Order.Status newStatus;
        try {
            newStatus = Order.Status.valueOf(request.status());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Unknown order status: " + request.status());
        }

        Set<Order.Status> allowed = ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of());
        if (!allowed.contains(newStatus)) {
            throw new BusinessException("Cannot move order from " + order.getStatus() + " to " + newStatus);
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(Instant.now());
        if (newStatus == Order.Status.CANCELLED) {
            releaseStock(order);
        }

        String customerEmail = order.getCustomer().getEmail();
        if (customerEmail != null) {
            emailService.send(customerEmail, "Your order #" + order.getId() + " is now " + newStatus,
                "Hi " + order.getShippingFullName() + ",\n\nYour order #" + order.getId()
                    + " status has been updated to: " + newStatus + ".\n\nYou can track it anytime in your order history.");
        }

        return OrderResponse.from(order);
    }

    /**
     * Sweeps orders stuck in PENDING_PAYMENT past the payment window and
     * cancels them, releasing their reserved stock so it isn't lost forever
     * to a checkout nobody paid for. Razorpay orders get a short window
     * (abandoned/failed checkout widget); manual orders get a much longer
     * window since the customer needs real time to arrange a bank transfer.
     * PAYMENT_SUBMITTED orders are never auto-swept - they require explicit
     * owner confirmation or rejection.
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void releaseExpiredReservations() {
        Instant razorpayCutoff = Instant.now().minusSeconds(PAYMENT_WINDOW_MINUTES * 60L);
        orderRepository.findAllByStatusAndPaymentMethodAndCreatedAtBefore(
                Order.Status.PENDING_PAYMENT, Order.PaymentMethod.RAZORPAY, razorpayCutoff)
            .forEach(this::cancelAndReleaseStock);

        Instant manualCutoff = Instant.now().minusSeconds(MANUAL_PAYMENT_WINDOW_MINUTES * 60L);
        orderRepository.findAllByStatusAndPaymentMethodAndCreatedAtBefore(
                Order.Status.PENDING_PAYMENT, Order.PaymentMethod.MANUAL, manualCutoff)
            .forEach(this::cancelAndReleaseStock);
    }

    private void cancelAndReleaseStock(Order order) {
        order.setStatus(Order.Status.CANCELLED);
        order.setUpdatedAt(Instant.now());
        releaseStock(order);
    }

    private void releaseStock(Order order) {
        if (!order.isStockReserved()) {
            // Guest order was only ever REQUESTED and never reserved by the owner - nothing to give back.
            return;
        }
        order.getItems().forEach(oi -> itemRepository.incrementStock(oi.getItem().getId(), oi.getQuantity()));
        order.setStockReserved(false);
    }

    private Order getOwnedOrder(Long customerId, Long shopId, Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getShop().getId().equals(shopId) || !order.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Order not found");
        }
        return order;
    }

    private Order getShopScopedOrder(Long shopId, Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getShop().getId().equals(shopId)) {
            throw new ResourceNotFoundException("Order not found");
        }
        return order;
    }

    private void applyShipping(Order order, CheckoutInitiateRequest.ShippingAddressRequest address) {
        order.setShippingFullName(address.fullName());
        order.setShippingPhone(address.phone());
        order.setShippingAddressLine1(address.addressLine1());
        order.setShippingAddressLine2(address.addressLine2());
        order.setShippingCity(address.city());
        order.setShippingState(address.state());
        order.setShippingPincode(address.pincode());
    }
}
