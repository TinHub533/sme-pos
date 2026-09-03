package com.smepos.repository;

import com.smepos.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Optional<Inventory> findByProductId(UUID productId);

    // No FK/association between Inventory and Product (Inventory just
    // stores productId), so this is an implicit join via a shared WHERE
    // clause rather than a JPQL "join" keyword — standard pattern for two
    // independently-mapped entities related only by a raw id column.
    @Query("select i from Inventory i, Product p " +
           "where p.id = i.productId and p.shopId = :shopId " +
           "and i.qtyOnHand <= i.reorderThreshold and p.active = true")
    List<Inventory> findLowStockByShop(@Param("shopId") UUID shopId);

    // Pessimistic row lock: SELECT ... FOR UPDATE under the hood.
    // Use this specifically for the checkout hot path where you know
    // multiple cashiers may race on the same SKU (e.g. last unit of a
    // promo item) — it blocks the second transaction until the first
    // commits, rather than letting it fail and retry.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.productId = :productId")
    Optional<Inventory> findByProductIdForUpdate(@Param("productId") UUID productId);
}
