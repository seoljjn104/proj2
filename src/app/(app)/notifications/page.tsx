import type { Metadata } from "next";
import NotificationList from "@/components/notifications/NotificationList";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle="Proposals, responses, and completed sessions."
      />
      <div className="mt-6 max-w-3xl">
        <NotificationList />
      </div>
    </PageShell>
  );
}
