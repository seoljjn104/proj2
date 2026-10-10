import type { Metadata } from "next";
import ProfileForm from "@/components/profile/ProfileForm";
import SkillManager from "@/components/profile/SkillManager";
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
      </div>
    </div>
  );
}
