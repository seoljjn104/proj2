import type { Metadata } from "next";
import AvatarUpload from "@/components/profile/AvatarUpload";
import ProfileForm from "@/components/profile/ProfileForm";
import SkillManager from "@/components/profile/SkillManager";
import BlockedMembers from "@/components/moderation/BlockedMembers";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <PageShell>
      <PageHeader
        title="My Profile"
        subtitle="Your profile is how members see you in the marketplace; your two skill lists power the matching engine."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <div className="mb-5 border-b border-line2 pb-4">
              <h2 className="section-title">Profile details</h2>
              <p className="mt-1 text-sm text-ink2">
                Your picture, name, bio and preferences shown on your
                marketplace card.
              </p>
            </div>
            <div className="border-b border-line2 pb-6">
              <AvatarUpload />
            </div>
            <div className="pt-6">
              <ProfileForm />
            </div>
          </section>

          <section className="card">
            <div className="mb-5 border-b border-line2 pb-4">
              <h2 className="section-title">My skills</h2>
              <p className="mt-1 text-sm text-ink2">
                Fill both lists so reciprocal matches can line up with someone
                else&apos;s.
              </p>
            </div>
            <SkillManager />
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-1">
          <section className="card">
            <div className="mb-5 border-b border-line2 pb-4">
              <h2 className="section-title">Blocked members</h2>
              <p className="mt-1 text-sm text-ink2">
                People you&apos;ve blocked won&apos;t appear in your marketplace
                or matches.
              </p>
            </div>
            <BlockedMembers />
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
