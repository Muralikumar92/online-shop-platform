package com.shopplatform.auth.repository;

import com.shopplatform.auth.entity.LoginOtp;
import com.shopplatform.auth.entity.ShopOwner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoginOtpRepository extends JpaRepository<LoginOtp, Long> {
    Optional<LoginOtp> findFirstByOwnerAndCodeAndUsedFalseOrderByCreatedAtDesc(ShopOwner owner, String code);
}
