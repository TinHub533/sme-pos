import { apiFetch, ApiError } from "@/lib/api";
import type { AdminUserResponse } from "@/lib/types";
import { Card, EmptyState, ErrorAlert, PageHeader } from "@/components/ui";
import CreateAdminForm from "./CreateAdminForm";
import ResetPasswordButton from "@/components/ResetPasswordButton";

export default async function AdminAdminsPage() {
  let admins: AdminUserResponse[];
  let loadError: string | null = null;

  try {
    admins = await apiFetch<AdminUserResponse[]>("/admin/users");
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load admins";
    admins = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admins" subtitle="Platform admin accounts." actions={<CreateAdminForm />} />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Username</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{a.username}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <ResetPasswordButton apiPath={`/api/admin/users/${a.id}/reset-password`} targetLabel={a.username} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins.length === 0 && !loadError && <EmptyState>No admin accounts yet.</EmptyState>}
      </Card>
    </div>
  );
}
