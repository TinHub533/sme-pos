// Same fixed zone the backend uses for "today" (DashboardService,
// OrderController, DailyClosingService) — a Cambodia-market POS's day
// boundary is always Asia/Phnom_Penh midnight. Pure/no I/O, so both
// closing/page.tsx and its loading.tsx skeleton can call it directly
// instead of the skeleton showing a placeholder for a value that's
// actually available instantly.
export function todayInPhnomPenh(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
}
