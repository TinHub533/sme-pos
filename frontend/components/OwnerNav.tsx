"use client";

import { useMemo, useState, type SVGProps } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import type { Role } from "@/lib/types";

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.3" />
      <rect x="11" y="2.5" width="6.5" height="4.5" rx="1.3" />
      <rect x="11" y="9" width="6.5" height="8.5" rx="1.3" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.3" />
    </svg>
  );
}

function PosIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 5h15l-1.4 8.2a1.5 1.5 0 0 1-1.5 1.3H5.4a1.5 1.5 0 0 1-1.5-1.3L2.5 5Z" />
      <path d="M6 5 7.5 2h5L14 5" />
      <circle cx="7.5" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProductsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 2.5 17 6v8l-7 3.5L3 14V6l7-3.5Z" />
      <path d="M3 6l7 3.5L17 6M10 9.5V17.5" />
    </svg>
  );
}

function OrdersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 2.5h10v15l-2.2-1.5-1.8 1.5-1.8-1.5-1.8 1.5L5 17.5v-15Z" />
      <path d="M7.3 6.5h5.4M7.3 9.5h5.4M7.3 12.5h3" />
    </svg>
  );
}

function ClosingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <path d="M7.5 8.5 9 10l3.5-3.5" />
      <path d="M6.5 13.5h7" />
    </svg>
  );
}

function StaffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 17c.5-3 2.2-4.5 4.5-4.5S11 14 11.5 17" />
      <circle cx="14.3" cy="7.2" r="2" />
      <path d="M13 12.9c2 .1 3.3 1.5 3.7 4.1" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, ownerOnly: false },
  { href: "/pos", label: "POS", icon: PosIcon, ownerOnly: false },
  { href: "/products", label: "Products", icon: ProductsIcon, ownerOnly: false },
  { href: "/orders", label: "Orders", icon: OrdersIcon, ownerOnly: false },
  // Closing and Staff are OWNER-only on the backend (DailyClosingController,
  // StaffController) — a Cashier hitting either just gets a 403 (and
  // middleware.ts redirects them away before the page even renders), so
  // don't show a nav link that always dead-ends for that role.
  { href: "/closing", label: "Closing", icon: ClosingIcon, ownerOnly: true },
  { href: "/staff", label: "Staff", icon: StaffIcon, ownerOnly: true },
];

export default function OwnerNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = useMemo(
    () => NAV_LINKS.filter((link) => !link.ownerOnly || role !== "ROLE_CASHIER"),
    [role],
  );

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {links.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </a>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 md:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-5 w-5">
          {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3 5.5h14M3 10h14M3 14.5h14" />}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-lg md:hidden">
          <nav className="grid grid-cols-2 gap-1">
            {links.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
