import type { Metadata } from "next";
import PreCall from "@/components/sessions/PreCall";

export const metadata: Metadata = { title: "Before you join" };

export default async function PreCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PreCall sessionId={id} />;
}
