package com.shopplatform.customer.repository;

import com.shopplatform.customer.entity.Customer;
import com.shopplatform.customer.entity.CustomerLoginOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerLoginOtpRepository extends JpaRepository<CustomerLoginOtp, Long> {
    Optional<CustomerLoginOtp> findFirstByCustomerAndCodeAndUsedFalseOrderByCreatedAtDesc(Customer customer, String code);
}
