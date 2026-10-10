import type { Metadata } from "next";
import ProfileForm from "@/components/profile/ProfileForm";
import SkillManager from "@/components/profile/SkillManager";
import BlockedMembers from "@/components/moderation/BlockedMembers";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Your two skill lists power the matching engine: OFFERED is what you teach, WANTED is what you want to learn."
      />

      <div className="mt-6 max-w-3xl space-y-6">
        <div className="card">
          <h2 className="mb-4 font-semibold text-slate-900">Profile details</h2>
          <ProfileForm />
        </div>

        <div>
          <h2 className="mb-4 font-semibold text-slate-900">My skills</h2>
          <SkillManager />
        </div>

        <div className="card">
          <h2 className="mb-1 font-semibold text-slate-900">Blocked members</h2>
          <p className="mb-4 text-sm text-slate-500">
            People you&apos;ve blocked won&apos;t appear in your Marketplace or
            Matches.
          </p>
          <BlockedMembers />
        </div>
      </div>
    </div>
  );
}
