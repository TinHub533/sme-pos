"use client";

import { Button } from "@/components/ui";

// A real print, not a formatted PDF/export — the assumption is a shop
// prints on whatever printer they already have (thermal or regular), and
// window.print()'s browser dialog is what lets them pick it. Manual, not
// auto-triggered on load: an unexpected print dialog every time this page
// is opened (including by a browser back/forward cache restore) would be
// more annoying than one extra click.
export default function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} className="w-full print:hidden">
      Print
    </Button>
  );
}
