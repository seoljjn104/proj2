import type { SVGProps } from "react";

/**
 * Hand-rolled line icons for the app shell. Kept as plain SVG components
 * (no icon dependency) so the sidebar, mobile top bar and drawer share one
 * consistent 24px stroke language. All are decorative — the label always
 * accompanies them in the DOM.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function MarketplaceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </svg>
  );
}

export function MatchesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.2a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.2" cy="9" r="2.2" />
      <path d="M15.6 14.3a5 5 0 0 1 4.9 4.9" />
    </svg>
  );
}

export function SessionsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="12.5" height="12" rx="2.6" />
      <path d="M15.5 10.5 20.5 8v8l-5-2.5z" />
    </svg>
  );
}

export function NotificationsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.7 1.8 5.8 1.8 5.8H4.4s1.8-1.1 1.8-5.8Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M5 19.6a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function AdminIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.4 5 6.3v4.9c0 4.4 2.9 7.4 7 8.9 4.1-1.5 7-4.5 7-8.9V6.3L12 3.4Z" />
      <path d="M9.2 11.9l2 2 3.6-4" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 6 9 12l5.5 6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5H5.6A1.6 1.6 0 0 0 4 6.6v10.8A1.6 1.6 0 0 0 5.6 19H9" />
      <path d="M16 8l4 4-4 4" />
      <path d="M20 12H9" />
    </svg>
  );
}
