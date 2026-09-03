import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import OwnerNav from "@/components/OwnerNav";
import ChangePasswordButton from "@/components/ChangePasswordButton";

// Belt-and-suspenders with middleware.ts: middleware redirects unauthenticated
// requests before they render, but a Server Component layout re-checking the
// session means this route group is safe even if it's ever reached a
// different way (e.g. a future server action, or middleware matcher drifting
// out of sync with the routes as more pages get added).
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur print:hidden">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                S
              </span>
              <span className="hidden sm:inline">SME POS</span>
            </a>
            <OwnerNav role={session.role} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{session.username}</span>
            <ChangePasswordButton />
            <LogoutButton />
          </div>
        </div>
      </header>
      {/* print:px-0/py-0: only the receipt page is ever printed from this
          layout, and on a narrow thermal roll every extra mm of unused
          margin is one more mm of paper (and cost) wasted. */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 print:px-0 print:py-0">{children}</main>
    </div>
  );
}
