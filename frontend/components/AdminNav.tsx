"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const NAV_LINKS = [
  { href: "/admin/shops", label: "Shops" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/security", label: "Security" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
