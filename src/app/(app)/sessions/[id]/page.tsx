import type { Metadata } from "next";
import SessionChat from "@/components/chat/SessionChat";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Session" };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell>
      <SessionChat sessionId={id} />
    </PageShell>
  );
}
