import type { Metadata } from "next";
import AdminFlagTable from "@/components/admin/AdminFlagTable";
import AdminReports from "@/components/admin/AdminReports";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Moderation"
        subtitle="Review reports and flag accounts that abuse the platform. Flagged members are hidden from the marketplace and matching engine."
      />

      <div className="mt-6 space-y-10">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Member reports
          </h2>
          <AdminReports />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Accounts
          </h2>
          <AdminFlagTable />
        </section>
      </div>
    </div>
  );
}
