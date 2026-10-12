import type { Metadata } from "next";
import AdminFlagTable from "@/components/admin/AdminFlagTable";
import AdminReports from "@/components/admin/AdminReports";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <PageShell>
      <PageHeader
        title="Admin"
        subtitle="Review reports and flag accounts that abuse the platform. Flagged members are hidden from the marketplace and matching engine."
      />

      <div className="mt-6 space-y-10">
        <section>
          <h2 className="section-title mb-4">Member reports</h2>
          <AdminReports />
        </section>

        <section>
          <h2 className="section-title mb-4">Accounts</h2>
          <AdminFlagTable />
        </section>
      </div>
    </PageShell>
  );
}
