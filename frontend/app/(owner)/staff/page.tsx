import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import type { StaffResponse } from "@/lib/types";
import { Badge, Card, EmptyState, ErrorAlert, PageHeader } from "@/components/ui";
import CreateStaffForm from "./CreateStaffForm";
import ResetPasswordButton from "@/components/ResetPasswordButton";

// Belt-and-suspenders with middleware.ts: this whole page is OWNER-only,
// mirroring @PreAuthorize("hasRole('OWNER')") on StaffController.
export default async function StaffPage() {
  const session = getSession();
  if (session && session.role === "ROLE_CASHIER") redirect(roleHomePath(session.role));

  let staff: StaffResponse[];
  let loadError: string | null = null;

  try {
    staff = await apiFetch<StaffResponse[]>("/users");
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load staff";
    staff = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" subtitle="Cashier accounts for this shop." actions={<CreateStaffForm />} />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Username</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Role</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{s.username}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge tone="brand">{s.role}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {/* Owner-initiated reset only covers Cashiers (StaffService
                      rejects any other role target) — a shop only ever has
                      one Owner, and it's not this endpoint's job to reset
                      the caller's own password (see ChangePasswordButton). */}
                  {s.role === "CASHIER" && (
                    <ResetPasswordButton apiPath={`/api/users/${s.id}/reset-password`} targetLabel={s.username} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length === 0 && !loadError && <EmptyState>No staff accounts yet.</EmptyState>}
      </Card>
    </div>
  );
}
