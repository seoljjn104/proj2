import type { Metadata } from "next";
import NotificationList from "@/components/notifications/NotificationList";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Proposals, responses, and completed sessions."
      />
      <div className="mt-6 max-w-3xl">
        <NotificationList />
      </div>
    </div>
  );
}
