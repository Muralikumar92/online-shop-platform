package com.shopplatform.customer.repository;

import com.shopplatform.customer.entity.CustomerPasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerPasswordResetTokenRepository extends JpaRepository<CustomerPasswordResetToken, Long> {
    Optional<CustomerPasswordResetToken> findByToken(String token);
}
