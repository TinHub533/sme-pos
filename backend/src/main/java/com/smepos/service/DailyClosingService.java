package com.smepos.service;

import com.smepos.entity.DailyClosing;
import com.smepos.repository.DailyClosingRepository;
import com.smepos.repository.OrderRepository;
import com.smepos.util.Csv;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class DailyClosingService {

    // Same fixed zone DashboardService and OrderController use for "today" —
    // a Cambodia-market POS's day boundary is always Asia/Phnom_Penh
    // midnight, not the app server's local zone.
    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private final DailyClosingRepository dailyClosingRepository;
    private final OrderRepository orderRepository;

    public DailyClosingService(DailyClosingRepository dailyClosingRepository, OrderRepository orderRepository) {
        this.dailyClosingRepository = dailyClosingRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Idempotent: re-running for the same shop/date updates the existing
     * row's totalSales rather than creating a duplicate — the UNIQUE
     * (shop_id, closing_date) constraint backs this up at the DB level too.
     */
    @Transactional
    public DailyClosing openOrUpdateClosing(UUID shopId, LocalDate date, BigDecimal totalSales) {
        return dailyClosingRepository.findByShopIdAndClosingDate(shopId, date)
                .map(existing -> {
                    existing.updateTotalSales(totalSales);
                    return dailyClosingRepository.save(existing);
                })
                .orElseGet(() -> dailyClosingRepository.save(new DailyClosing(shopId, date, totalSales)));
    }

    /**
     * Opens (or refreshes) the closing for a date by recomputing totalSales
     * from paid orders, then returns it. This is what the reconcile screen
     * calls before showing the drawer-count form — until now nothing ever
     * called openOrUpdateClosing, so reconcile() always 404'd with "no
     * closing opened".
     */
    @Transactional
    public DailyClosing getOrOpenClosing(UUID shopId, LocalDate date) {
        Instant start = date.atStartOfDay(ZONE).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(ZONE).toInstant();
        BigDecimal totalSales = orderRepository.sumTotalByStatus(shopId, com.smepos.entity.Order.Status.PAID, start, end);
        return openOrUpdateClosing(shopId, date, totalSales);
    }

    @Transactional
    public DailyClosing reconcile(UUID shopId, LocalDate date, BigDecimal cashCounted) {
        DailyClosing closing = dailyClosingRepository.findByShopIdAndClosingDate(shopId, date)
                .orElseThrow(() -> new IllegalStateException("No closing opened for " + shopId + " on " + date));
        closing.reconcile(cashCounted);
        return dailyClosingRepository.save(closing);
    }

    public byte[] exportCsv(UUID shopId, LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        sb.append(Csv.row("Closing date", "Total sales", "Cash counted", "Variance"));
        for (DailyClosing c : dailyClosingRepository.findByShopIdAndClosingDateBetweenOrderByClosingDateDesc(shopId, from, to)) {
            sb.append(Csv.row(c.getClosingDate(), c.getTotalSales(), c.getCashCounted(), c.getVariance()));
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }
}
