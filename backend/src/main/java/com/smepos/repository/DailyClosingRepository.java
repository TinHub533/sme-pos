package com.smepos.repository;

import com.smepos.entity.DailyClosing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyClosingRepository extends JpaRepository<DailyClosing, UUID> {
    Optional<DailyClosing> findByShopIdAndClosingDate(UUID shopId, LocalDate closingDate);

    List<DailyClosing> findByShopIdAndClosingDateBetweenOrderByClosingDateDesc(
            UUID shopId, LocalDate from, LocalDate to);
}
