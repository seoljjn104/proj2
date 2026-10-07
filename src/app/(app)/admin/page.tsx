import type { Metadata } from "next";
import AdminFlagTable from "@/components/admin/AdminFlagTable";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p className="mt-1 text-sm text-slate-500">
        Flag accounts that abuse the platform. Flagged members are hidden from
        the marketplace and matching engine.
      </p>
      <div className="mt-6">
        <AdminFlagTable />
      </div>
    </div>
  );
}
