import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Help" };

const FAQ = [
  {
    q: "How does a swap work?",
    a: "You list what you can teach and what you want to learn. When someone's lists line up with yours both ways, you get a match. Either of you proposes a time, the other accepts, and you meet 1:1.",
  },
  {
    q: "What is a direct match?",
    a: "A direct match is someone who wants to learn something you teach and can teach something you want to learn — a two-way fit. These carry the amber mark and sit at the top of your marketplace.",
  },
  {
    q: "Where do I edit my skills?",
    a: "Your profile. It lives behind the account menu, next to your name. Keeping both lists filled is what makes matching work.",
  },
  {
    q: "How do I join a session?",
    a: "Once a proposal is accepted a video room link is generated. Open the session to see the time, message your partner, and join the room when it's time.",
  },
  {
    q: "Can I change the theme?",
    a: "Yes. Open the account menu and pick Light, Dark or System under Appearance. The video room always stays dark so a call never flips mid-session.",
  },
];

export default function HelpPage() {
  return (
    <PageShell>
      <PageHeader
        title="Help"
        subtitle="How the exchange works, in short."
      />
      <div className="mt-6 max-w-3xl space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="card group [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink">
              {item.q}
              <span
                aria-hidden
                className="text-ink3 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink2">{item.a}</p>
          </details>
        ))}
        <p className="pt-2 text-sm text-ink2">
          Still stuck? Open the{" "}
          <Link href="/marketplace" className="font-semibold text-teal-700">
            marketplace
          </Link>{" "}
          and propose a session — members are happy to help.
        </p>
      </div>
    </PageShell>
  );
}
