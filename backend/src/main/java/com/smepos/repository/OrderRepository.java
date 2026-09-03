package com.smepos.repository;

import com.smepos.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    // status passed as a bound parameter rather than a JPQL enum literal —
    // fully-qualified nested-enum literals in JPQL are finicky across
    // Hibernate versions, so binding Order.Status.PAID from the caller
    // is the more portable choice.
    @Query("select coalesce(sum(o.total), 0) from Order o " +
           "where o.shopId = :shopId and o.status = :status " +
           "and o.createdAt >= :start and o.createdAt < :end")
    BigDecimal sumTotalByStatus(@Param("shopId") UUID shopId, @Param("status") Order.Status status,
                                 @Param("start") Instant start, @Param("end") Instant end);

    // Unpaged: DashboardService needs every one of today's orders to count
    // paid ones and sum totals, not a single page of them.
    List<Order> findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(UUID shopId, Instant start, Instant end);

    // Paged: OrderController's list endpoint, for display.
    Page<Order> findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(UUID shopId, Instant start, Instant end, Pageable pageable);
}
