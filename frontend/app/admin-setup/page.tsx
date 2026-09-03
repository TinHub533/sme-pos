import { Card } from "@/components/ui";
import AdminSetupForm from "./AdminSetupForm";
import type { BootstrapStatusResponse } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Deliberately outside both the (owner) and (admin) route groups, and named
// "/admin-setup" rather than anything under "/admin/**" — middleware.ts
// treats every "/admin/**" path as requiring an authenticated ADMIN session,
// which would make the very first admin impossible to create. This page has
// to be reachable with zero credentials in the system.
export default async function AdminSetupPage() {
  const res = await fetch(`${BACKEND_URL}/admin/bootstrap`, { cache: "no-store" });
  const status: BootstrapStatusResponse = await res.json();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white shadow-sm shadow-gray-900/30">
            S
          </span>
          <span className="text-lg font-semibold text-gray-900">SME POS · Admin setup</span>
        </div>

        {status.bootstrapped ? (
          <Card className="p-6 text-center sm:p-7">
            <h1 className="text-xl font-semibold text-gray-900">Already set up</h1>
            <p className="mt-2 text-sm text-gray-500">
              An admin account already exists on this platform. Ask an existing admin for a login, or add more
              admins from the Admins page once signed in.
            </p>
            <a
              href="/login"
              className="mt-5 inline-block font-medium text-brand-600 hover:text-brand-700"
            >
              Go to sign in
            </a>
          </Card>
        ) : (
          <Card className="p-6 sm:p-7">
            <AdminSetupForm />
          </Card>
        )}
      </div>
    </div>
  );
}
