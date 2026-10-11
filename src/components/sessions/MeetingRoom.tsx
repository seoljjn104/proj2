"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@/components/ui/Alert";
import { JITSI_DOMAIN } from "@/lib/room";

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

/** The subset of the Jitsi IFrame API the app drives. */
export interface JitsiApi {
  dispose(): void;
  executeCommand(command: string, ...args: unknown[]): void;
  addEventListener(
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ): void;
}

type JitsiExternalAPICtor = new (
  domain: string,
  options: JitsiOptions,
) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiExternalAPICtor;
  }
}

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
  /**
   * Headless: hide Jitsi's own chrome so the parent renders a custom,
   * centred control bar (see CallRoom). Requires `onApiReady`.
   */
  headless?: boolean;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  onApiReady?: (api: JitsiApi | null) => void;
}

/**
 * Embedded 1:1 video call (Jitsi Meet IFrame API). In `headless` mode Jitsi's
 * toolbar, watermarks and pre-join page are suppressed so the app can present
 * its own call UI while still using Jitsi for the media.
 */
export default function MeetingRoom({
  roomName,
  displayName,
  href,
  headless = false,
  startAudioMuted = false,
  startVideoMuted = false,
  onApiReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
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
            startWithAudioMuted: startAudioMuted,
            startWithVideoMuted: startVideoMuted,
            prejoinPageEnabled: !headless,
            prejoinConfig: { enabled: !headless },
            disableDeepLinking: true,
            // Never knock on a lobby: 1:1 rooms open the moment a participant
            // arrives, on both the embedded and the standalone page.
            enableLobby: false,
            ...(headless
              ? {
                  toolbarButtons: [],
                  notifications: [],
                  hideConferenceSubject: true,
                  hideConferenceTimer: false,
                  subject: "",
                }
              : {}),
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_JITSI_LOGO: false,
            ...(headless
              ? {
                  TOOLBAR_BUTTONS: [],
                  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                  HIDE_INVITE_MORE_HEADER: true,
                  MOBILE_APP_PROMO: false,
                }
              : {}),
          },
          userInfo: { displayName: displayName || "SkillGRID member" },
        });
        apiRef.current = api;
        onApiReady?.(api);
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });

    return () => {
      disposed = true;
      onApiReady?.(null);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [
    roomName,
    displayName,
    headless,
    startAudioMuted,
    startVideoMuted,
    attempt,
    onApiReady,
  ]);

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
    <div
      className={
        headless
          ? "h-full w-full overflow-hidden bg-[#12100b]"
          : "aspect-video max-h-[70dvh] w-full overflow-hidden rounded-2xl border border-line"
      }
    >
      {state === "loading" && (
        <div className="skeleton h-full w-full rounded-none" aria-busy="true" />
      )}
      <div
        ref={containerRef}
        className={`h-full w-full bg-[#12100b] ${state === "loading" ? "hidden" : ""}`}
        aria-label="Embedded 1:1 video call"
      />
    </div>
  );
}
