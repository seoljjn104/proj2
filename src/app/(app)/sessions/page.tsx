import type { Metadata } from "next";
import SessionList from "@/components/sessions/SessionList";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Your proposed and accepted 1:1 exchanges, with the video call when the time comes."
      />
      <div className="mt-6">
        <SessionList />
      </div>
    </div>
  );
}
