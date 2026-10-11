import type { Metadata } from "next";
import MessagesWorkspace from "@/components/messages/MessagesWorkspace";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return <MessagesWorkspace />;
}
