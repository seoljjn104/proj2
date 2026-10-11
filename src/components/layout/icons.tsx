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

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11l8-6.5L20 11" />
      <path d="M6.2 9.8V19h11.6V9.8" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function MessagesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 5h15v10.5H9.5L4.5 20z" />
      <path d="M8.5 9h7M8.5 12h4.5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.7-3.7" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" />
    </svg>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9.5 12 15l6-5.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.2 12.3 11 15.1l4.8-5.2" />
    </svg>
  );
}

export function TrendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15.5l3.5-4.5 3 3 4.5-6" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5.4A3 3 0 0 1 15 6v4.5M9 9v2.5a3 3 0 0 0 4.6 2.5" />
      <path d="M5.5 11a6.5 6.5 0 0 0 10 5.5" />
      <path d="M12 17.5V21M9 21h6" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="12" height="12" rx="2.6" />
      <path d="M15 10.5l5.5-3v9l-5.5-3z" />
    </svg>
  );
}

export function VideoOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 10.5l5.5-3v9l-5.5-3z" />
      <path d="M12.5 6H5.6A2.6 2.6 0 0 0 3 8.6v6.8A2.6 2.6 0 0 0 5.6 18h6.9" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function ScreenShareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="12" rx="2.2" />
      <path d="M8.5 20h7M12 16.5V20" />
      <path d="M12 12.5V7.5M9.7 9.8 12 7.5l2.3 2.3" />
    </svg>
  );
}

export function PhoneOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 14.3c4.9-4.6 11.1-4.6 16 0l-2.3 2.6-3.2-1.4-.5-2.1a10 10 0 0 0-3.9 0l-.5 2.1-3.2 1.4z" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 9.5h3l3.5-3v11l-3.5-3h-3z" />
      <path d="M15 9.2a4 4 0 0 1 0 5.6M17.5 6.8a7.5 7.5 0 0 1 0 10.4" />
    </svg>
  );
}

/** The swap mark: two arrows passing each other, the app's ⇄ motif. */
export function SwapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h13l-3.2-3.2" />
      <path d="M20 16H7l3.2 3.2" />
    </svg>
  );
}

/** "More" — opens the in-call sheet. */
export function MoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Raise your hand. */
export function HandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 12.4V6.2a1.5 1.5 0 0 1 3 0v5" />
      <path d="M11.5 11V4.6a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14.5 11.2V6.6a1.5 1.5 0 0 1 3 0v8.6a6 6 0 0 1-6 6h-.7a5.3 5.3 0 0 1-5.3-5.3v-3.2l-1.8-1.9a1.5 1.5 0 0 1 2.1-2.1l1.2 1.2" />
    </svg>
  );
}

/** Sketch — the full-screen pad. */
export function PenIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20l4-1 9.5-9.5a2 2 0 0 0-2.8-2.8L5.2 16.2 4 20Z" />
      <path d="M13.6 6.4l4 4" />
    </svg>
  );
}
