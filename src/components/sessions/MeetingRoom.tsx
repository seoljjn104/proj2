"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@/components/ui/Alert";

interface JitsiConfig {
  [key: string]: unknown;
}

interface JitsiOptions {
  roomName: string;
  width: string | number;
  height: string | number;
  parentNode: HTMLElement | null;
  configOverwrite?: JitsiConfig;
  interfaceConfigOverwrite?: JitsiConfig;
  userInfo?: { displayName?: string };
  onload?: () => void;
}

interface JitsiMeetExternalAPI {
  dispose(): void;
  executeCommand(command: string, ...args: unknown[]): void;
}

type JitsiExternalAPICtor = new (
  domain: string,
  options: JitsiOptions,
) => JitsiMeetExternalAPI;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiExternalAPICtor;
  }
}

const JITSI_DOMAIN = "meet.jit.si";

let externalApiPromise: Promise<boolean> | null = null;

function loadExternalApi(): Promise<boolean> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(true);
  if (!externalApiPromise) {
    externalApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => resolve(Boolean(window.JitsiMeetExternalAPI));
      script.onerror = () => {
        externalApiPromise = null;
        reject(new Error("The meeting client could not be loaded."));
      };
      document.body.appendChild(script);
    });
  }
  return externalApiPromise;
}

interface Props {
  roomName: string;
  displayName: string;
  /** Direct room URL, offered as a fallback link when embedding fails. */
  href?: string;
}

/**
 * Embedded 1:1 video call (Jitsi Meet IFrame API). Renders the
 * meeting inside the session page — no separate app or tab needed.
 */
export default function MeetingRoom({ roomName, displayName, href }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;

    setState("loading");
    loadExternalApi()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI)
          return;
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: true,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_JITSI_LOGO: false,
          },
          userInfo: { displayName: displayName || "SkillGRID member" },
        });
        apiRef.current = api;
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomName, displayName, attempt]);

  if (state === "error") {
    return (
      <div className="space-y-3">
        <Alert>Could not load the meeting room. Check your connection and try again.</Alert>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open in a new tab
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video max-h-[70dvh] w-full overflow-hidden rounded-2xl border border-slate-200">
      {state === "loading" && (
        <div className="skeleton h-full w-full rounded-none" aria-busy="true" />
      )}
      <div
        ref={containerRef}
        className={`h-full w-full bg-slate-900 ${state === "loading" ? "hidden" : ""}`}
        aria-label="Embedded 1:1 video call"
      />
    </div>
  );
}
