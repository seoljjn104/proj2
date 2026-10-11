import type { Metadata } from "next";
import SettingsPanel from "@/components/settings/SettingsPanel";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Settings"
        subtitle="How SkillGRID looks, and the account you're signed in with."
      />
      <div className="mt-6 max-w-3xl">
        <SettingsPanel />
      </div>
    </PageShell>
  );
}
