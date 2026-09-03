package com.smepos.repository;

import com.smepos.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByKhqrRef(String khqrRef);
    Optional<Payment> findByOrderId(UUID orderId);

    // Pessimistic row lock (SELECT ... FOR UPDATE), same pattern as
    // InventoryRepository.findByProductIdForUpdate — PaymentWebhookController
    // needs this specifically: a plain findByKhqrRef there let concurrent
    // replays of the same webhook all read PENDING before any of them wrote
    // CONFIRMED, so all of them proceeded (proven by
    // CheckoutAndBootstrapConcurrencyIT's webhook-race test — every one of
    // 10 concurrent replays returned "confirmed", not the intended
    // "first wins, rest see already confirmed"). Locking here makes the
    // second-and-later requests block until the first commits, then read
    // the now-CONFIRMED row and correctly no-op.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.khqrRef = :khqrRef")
    Optional<Payment> findByKhqrRefForUpdate(@Param("khqrRef") String khqrRef);
}
