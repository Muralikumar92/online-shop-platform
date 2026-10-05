package com.shopplatform.customer.repository;

import com.shopplatform.customer.entity.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findAllByCustomerIdOrderByIsDefaultDescCreatedAtDesc(Long customerId);
}
