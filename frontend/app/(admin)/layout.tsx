import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import AdminNav from "@/components/AdminNav";
import ChangePasswordButton from "@/components/ChangePasswordButton";

// Belt-and-suspenders with middleware.ts, same rationale as (owner)/layout.tsx:
// middleware already blocks non-Admins from /admin/**, but re-checking here
// keeps this route group safe even if middleware's matcher ever drifts.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session || session.role !== "ROLE_ADMIN") redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <a href="/admin/shops" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
                S
              </span>
              <span>SME POS · Admin</span>
            </a>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{session.username}</span>
            <ChangePasswordButton />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
