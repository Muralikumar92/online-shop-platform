package com.shopplatform.customer.repository;

import com.shopplatform.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    boolean existsByShopIdAndEmailIgnoreCase(Long shopId, String email);
    Optional<Customer> findByShopIdAndEmailIgnoreCase(Long shopId, String email);
    Optional<Customer> findByShopIdAndGuestDeviceTokenAndGuestTrue(Long shopId, String guestDeviceToken);
}
