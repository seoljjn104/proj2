import type { Metadata } from "next";
import ProfileForm from "@/components/profile/ProfileForm";
import SkillManager from "@/components/profile/SkillManager";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your two skill lists power the matching engine: OFFERED is what you
          teach, WANTED is what you want to learn.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">Profile details</h2>
        <ProfileForm />
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-slate-900">My skills</h2>
        <SkillManager />
      </div>
    </div>
  );
}
