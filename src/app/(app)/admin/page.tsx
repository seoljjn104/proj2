import type { Metadata } from "next";
import AdminFlagTable from "@/components/admin/AdminFlagTable";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Moderation"
        subtitle="Flag accounts that abuse the platform. Flagged members are hidden from the marketplace and matching engine."
      />
      <div className="mt-6">
        <AdminFlagTable />
      </div>
    </div>
  );
}
