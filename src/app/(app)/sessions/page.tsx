import type { Metadata } from "next";
import SessionList from "@/components/sessions/SessionList";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your proposed and accepted 1:1 exchanges.
      </p>
      <div className="mt-6">
        <SessionList />
      </div>
    </div>
  );
}
