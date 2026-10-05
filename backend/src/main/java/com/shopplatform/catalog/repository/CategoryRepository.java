package com.shopplatform.catalog.repository;

import com.shopplatform.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByShopIdOrderByDisplayOrderAsc(Long shopId);
    List<Category> findAllByShopIdAndActiveTrueOrderByDisplayOrderAsc(Long shopId);
}
