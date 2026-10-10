"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Tone = "teal" | "amber";

interface Props {
  href: string;
  label: string;
  icon: NavIcon;
  active?: boolean;
  collapsed?: boolean;
  badge?: ReactNode;
  /** Active accent. Amber is reserved for admin surfaces. */
  tone?: Tone;
  /** Overrides the computed aria-label (e.g. to include an unread count). */
  ariaLabel?: string;
  onClick?: () => void;
}

const TONES: Record<Tone, { active: string; rail: string; dot: string }> = {
  teal: { active: "bg-teal-50 text-teal-800", rail: "bg-teal-600", dot: "bg-teal-600" },
  amber: {
    active: "bg-amber-50 text-amber-800",
    rail: "bg-amber-500",
    dot: "bg-amber-500",
  },
};

/**
 * One navigation row. Shared by the desktop sidebar and the mobile drawer so
 * both stay visually identical. Collapsed, the label is hidden but kept in the
 * accessibility tree via aria-label and a title tooltip.
 */
export default function NavItem({
  href,
  label,
  icon: Icon,
  active = false,
  collapsed = false,
  badge,
  tone = "teal",
  ariaLabel,
  onClick,
}: Props) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel ?? (collapsed ? label : undefined)}
      title={collapsed ? label : undefined}
      className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-0" : ""
      } ${
        active
          ? t.active
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-0 w-1 rounded-full transition-opacity ${
          active ? `${t.rail} opacity-100` : "opacity-0"
        }`}
      />
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge ? <span className="ml-auto">{badge}</span> : null}
      {collapsed && badge ? (
        <span
          className={`absolute right-2 top-2 h-2 w-2 rounded-full ${t.dot}`}
        />
      ) : null}
    </Link>
  );
}
