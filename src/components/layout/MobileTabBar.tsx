"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  CompassIcon,
  HomeIcon,
  MatchesIcon,
  MessagesIcon,
} from "./icons";

const TABS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/marketplace", label: "Browse", icon: CompassIcon },
  { href: "/matches", label: "Matches", icon: MatchesIcon },
  { href: "/sessions", label: "Sessions", icon: CalendarIcon },
  { href: "/messages", label: "Messages", icon: MessagesIcon },
];

/**
 * Phone-first navigation. The sidebar is hidden below lg, so the five
 * destinations live on a fixed bottom bar — one tap from anywhere.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line surface-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  active ? "text-teal-700" : "text-ink3 hover:text-ink2"
                }`}
              >
                <Icon className="h-[21px] w-[21px]" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
