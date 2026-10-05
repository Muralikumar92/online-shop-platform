package com.shopplatform.subscription.repository;

import com.shopplatform.subscription.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {
    Optional<SubscriptionPayment> findByRazorpayOrderId(String razorpayOrderId);
}
