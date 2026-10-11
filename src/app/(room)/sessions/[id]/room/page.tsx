import type { Metadata } from "next";
import CallRoom from "@/components/sessions/CallRoom";

export const metadata: Metadata = { title: "In session" };

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CallRoom sessionId={id} />;
}
