package com.smepos.controller;

import com.smepos.entity.DailyClosing;
import com.smepos.security.CurrentUser;
import com.smepos.service.DailyClosingService;
import com.smepos.util.Csv;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/daily-closings")
public class DailyClosingController {

    private final DailyClosingService dailyClosingService;

    public DailyClosingController(DailyClosingService dailyClosingService) {
        this.dailyClosingService = dailyClosingService;
    }

    public record ReconcileRequest(BigDecimal cashCounted) {}

    // Opens (or refreshes) the closing for a date with the current
    // totalSales, so the reconcile form always shows an up-to-date figure
    // to count the drawer against.
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/{date}")
    public DailyClosing get(@PathVariable("date") String date) {
        return dailyClosingService.getOrOpenClosing(CurrentUser.shopId(), LocalDate.parse(date));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/{date}/reconcile")
    public DailyClosing reconcile(@PathVariable("date") String date, @RequestBody ReconcileRequest req) {
        return dailyClosingService.reconcile(CurrentUser.shopId(), LocalDate.parse(date), req.cashCounted());
    }

    // A literal segment, not another {date} — Spring MVC prefers the more
    // specific pattern, so GET /daily-closings/export routes here rather
    // than being swallowed by get({date}) above (verified live, not just
    // assumed). Defaults to the trailing 30 days when from/to are omitted.
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        LocalDate fromDate = from != null ? LocalDate.parse(from) : toDate.minusDays(30);
        return Csv.download(dailyClosingService.exportCsv(CurrentUser.shopId(), fromDate, toDate), "daily-closings.csv");
    }
}
