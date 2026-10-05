package com.shopplatform.order.repository;

import com.shopplatform.order.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findAllByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Order> findAllByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);
    List<Order> findAllByStatusAndCreatedAtBefore(Order.Status status, Instant cutoff);

    List<Order> findAllByStatusAndPaymentMethodAndCreatedAtBefore(Order.Status status, Order.PaymentMethod paymentMethod, Instant cutoff);
}
