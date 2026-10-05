package com.shopplatform.auth.repository;

import com.shopplatform.auth.entity.ShopOwner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShopOwnerRepository extends JpaRepository<ShopOwner, Long> {
    Optional<ShopOwner> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
