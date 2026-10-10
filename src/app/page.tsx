import type { Metadata } from "next";
import LandingContent from "@/components/landing/LandingContent";

export const metadata: Metadata = {
  title: "SkillGRID — peer-to-peer skill exchange",
  description:
    "Teach what you know, learn what you need. Direct 1:1 skill exchange.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Landing page. Auth is a popup over this page (see LandingContent); the
 * `auth` query param deep-links straight to a popup so middleware and the old
 * /login, /signup URLs can hand off without a dedicated auth page.
 */
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const auth = typeof params.auth === "string" ? params.auth : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const initialAuth = auth === "signup" ? "signup" : auth === "login" ? "login" : null;

  return <LandingContent initialAuth={initialAuth} next={next} />;
}