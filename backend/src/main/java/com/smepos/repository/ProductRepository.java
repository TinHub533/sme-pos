package com.smepos.repository;

import com.smepos.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    Page<Product> findByShopIdAndActiveTrue(UUID shopId, Pageable pageable);
    Optional<Product> findByShopIdAndSku(UUID shopId, String sku);
    long countByShopIdAndActiveTrue(UUID shopId);
}
