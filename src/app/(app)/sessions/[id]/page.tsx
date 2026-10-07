import type { Metadata } from "next";
import SessionChat from "@/components/chat/SessionChat";

export const metadata: Metadata = { title: "Session" };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionChat sessionId={id} />;
}
