"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSessionRoom } from "./useSessionRoom";
import { useSessionTodos } from "./useSessionTodos";
import MeetingRoom, { type JitsiApi } from "./MeetingRoom";
import CallPanel, { type CallLayout, type CallTab } from "./CallPanel";
import SketchPad from "./SketchPad";
import { roomNameForSession, roomUrl } from "@/lib/room";
import Avatar from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  MicIcon,
  MicOffIcon,
  MoreIcon,
  PhoneOffIcon,
  SwapIcon,
  VideoIcon,
  VideoOffIcon,
} from "@/components/layout/icons";

function clockLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One round control in the centred call bar. */
function BarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  /** Whether the control is currently "on" (raised background). */
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-white/8 text-[#cbc2ad] hover:bg-white/15 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Full-screen session room. Ink in both themes, so a call never flips mid-way.
 * Jitsi supplies the media; all the chrome is ours — the swap title and clock on
 * top, the shared to-do rail under it, and one centred bar:
 * **Mic · Camera · Swap · More · End**. Everything else opens as a sheet.
 *
 * Jitsi's tiles are still Jitsi's: the IFrame API doesn't hand over the video
 * tracks, so the layout choice drives Jitsi's own tile-view / pinned-speaker
 * commands rather than re-rendering the video ourselves.
 */
export default function CallRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    session,
    partner,
    teachSkill,
    learnSkill,
    partnerTeaches,
    loading,
    missing,
  } = useSessionRoom(sessionId);
  const todos = useSessionTodos(sessionId);

  const [api, setApi] = useState<JitsiApi | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [layout, setLayout] = useState<CallLayout>("side-by-side");
  const [sheet, setSheet] = useState<CallTab | null>(null);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [startVideoOff] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("video") === "0",
  );

  /**
   * Jitsi opens in its own speaker layout — one big tile, the rest in a
   * filmstrip — while the drawn default is "Side by side". A config flag does
   * not change that (`tileViewEnabled` is a no-op here), so we send one
   * `toggleTileView` once the conference has actually rendered. Jitsi reports
   * a tile-view state during startup, *before* the room exists, so nudging on
   * that first report fires into the void — hence the join trigger.
   */
  const tileViewRef = useRef(false);
  const defaultDone = useRef(false);

  const onApiReady = useCallback((next: JitsiApi | null) => setApi(next), []);

  useEffect(() => {
    if (!api) return;
    let defaultTimer: number | undefined;

    const onAudio = (p: Record<string, unknown>) => setMicOn(!p.muted);
    const onVideo = (p: Record<string, unknown>) => setCamOn(!p.muted);
    const onShare = (p: Record<string, unknown>) => setSharing(Boolean(p.on));
    const onJoined = (p: Record<string, unknown>) => setRemoteId(String(p.id));
    const onLeft = () => setRemoteId(null);
    const onTiles = (p: Record<string, unknown>) => {
      const enabled = Boolean(p.enabled);
      tileViewRef.current = enabled;
      // If Jitsi already reports tile view, the drawn default is satisfied.
      if (enabled) defaultDone.current = true;
    };
    const onConferenceJoined = () => {
      defaultTimer = window.setTimeout(() => {
        if (defaultDone.current || tileViewRef.current) return;
        defaultDone.current = true;
        api.executeCommand("toggleTileView");
        tileViewRef.current = true;
      }, 1500);
    };
    const onHand = (p: Record<string, unknown>) =>
      setHandUp(Boolean(p.raised ?? p.handRaised));

    api.addEventListener("audioMuteStatusChanged", onAudio);
    api.addEventListener("videoMuteStatusChanged", onVideo);
    api.addEventListener("screenSharingStatusChanged", onShare);
    api.addEventListener("participantJoined", onJoined);
    api.addEventListener("participantLeft", onLeft);
    api.addEventListener("tileViewChanged", onTiles);
    api.addEventListener("videoConferenceJoined", onConferenceJoined);
    api.addEventListener("raiseHandUpdated", onHand);

    return () => {
      if (defaultTimer) window.clearTimeout(defaultTimer);
    };
  }, [api]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  /** The one place that talks to Jitsi's layout commands. */
  function setStage(next: CallLayout) {
    setLayout(next);
    if (!api) return;
    const wantTiles = next !== "speaker";
    if (wantTiles !== tileViewRef.current) {
      api.executeCommand("toggleTileView");
      tileViewRef.current = wantTiles;
    }
    if (next === "speaker" && remoteId) {
      api.executeCommand("setLargeVideoParticipant", remoteId);
    }
  }

  function leave() {
    api?.executeCommand("hangup");
    router.push(`/sessions/${sessionId}`);
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-sm text-[#9c937f]">
        Joining the room…
      </div>
    );
  }

  const partnerName = partner?.name ?? "your partner";
  const callable = session?.status === "ACCEPTED";

  if (missing || !session || !callable) {
    return (
      <div className="mx-auto flex h-[100dvh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="display text-2xl text-[#EDE7DB]">
          {missing || !session ? "Session not found" : "This call isn't ready yet"}
        </h1>
        <p className="mt-2 text-sm text-[#9c937f]">
          {missing || !session
            ? "It may have been removed, or it isn't yours to view."
            : "A call opens once the proposal is accepted. Open the session to check its status."}
        </p>
        <Link
          href={missing || !session ? "/sessions" : `/sessions/${sessionId}`}
          className="btn-secondary mt-6 inline-flex"
        >
          {missing || !session ? "Back to sessions" : "Back to session"}
        </Link>
      </div>
    );
  }

  const roomName = roomNameForSession(session.id, session.meeting_link);
  const swapTitle =
    teachSkill && learnSkill ? `${teachSkill} ⇄ ${learnSkill}` : null;
  const total = todos.todos.length;
  const done = todos.doneCount;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#12100b]">
      {/* Header — back · the swap · the clock */}
      <header className="flex shrink-0 items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 min-[360px]:px-4 sm:px-6">
        <Link
          href={`/sessions/${sessionId}`}
          aria-label="Leave and go back to the session"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#9c937f] transition-colors hover:bg-white/10 hover:text-[#EDE7DB]"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-[#EDE7DB] sm:text-base">
          {swapTitle ?? `Call with ${partnerName}`}
        </h1>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#9c937f] sm:text-sm">
          {clockLabel(now)}
        </span>
      </header>

      {/* The to-do rail — you always know where you are */}
      <div className="shrink-0 px-3 pb-3 min-[360px]:px-4 sm:px-6">
        <div
          role="progressbar"
          aria-label="To-do progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="flex gap-1.5"
        >
          {total === 0 ? (
            <span aria-hidden className="h-1 flex-1 rounded-full bg-white/12" />
          ) : (
            todos.todos.map((todo) => (
              <span
                key={todo.id}
                aria-hidden
                className={`h-1 flex-1 rounded-full ${
                  todo.done
                    ? "bg-teal-400/80"
                    : todo.id === todos.current?.id
                      ? "bg-teal-400"
                      : "bg-white/15"
                }`}
              />
            ))
          )}
        </div>
        <p className="mt-2 flex items-baseline gap-2 text-[12.5px] text-[#9c937f]">
          <span className="min-w-0 truncate">
            {todos.current
              ? `Now: ${todos.current.body}`
              : total > 0
                ? "Everything on the list is done"
                : "Nothing on the to-do yet"}
          </span>
          {total > 0 && (
            <span className="ml-auto shrink-0 tabular-nums">
              {done} of {total}
            </span>
          )}
        </p>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1">
        <MeetingRoom
          roomName={roomName}
          displayName={profile?.name || "SkillGRID member"}
          href={roomUrl(roomName)}
          headless
          startVideoMuted={startVideoOff}
          onApiReady={onApiReady}
        />

        {/* Who you're with, and what they brought */}
        <div className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 backdrop-blur">
          <Avatar name={partnerName} src={partner?.avatar_url} size="sm" />
          <span className="truncate text-sm font-medium text-[#EDE7DB]">
            {partnerName}
          </span>
          {partnerTeaches && (
            <span className="hidden truncate text-xs text-[#9c937f] sm:inline">
              Teaches · {partnerTeaches}
            </span>
          )}
        </div>

        {/* Centred bar: Mic · Camera · Swap · More · End */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-1.5 py-2 backdrop-blur min-[360px]:gap-1.5 min-[360px]:px-2 sm:gap-2 sm:px-3">
            <BarButton
              label={micOn ? "Mute microphone" : "Unmute microphone"}
              active={micOn}
              onClick={() => api?.executeCommand("toggleAudio")}
            >
              {micOn ? (
                <MicIcon className="h-5 w-5" />
              ) : (
                <MicOffIcon className="h-5 w-5" />
              )}
            </BarButton>
            <BarButton
              label={camOn ? "Turn camera off" : "Turn camera on"}
              active={camOn}
              onClick={() => api?.executeCommand("toggleVideo")}
            >
              {camOn ? (
                <VideoIcon className="h-5 w-5" />
              ) : (
                <VideoOffIcon className="h-5 w-5" />
              )}
            </BarButton>
            <BarButton
              label="Swap the main view"
              active={layout === "speaker"}
              onClick={() =>
                setStage(layout === "speaker" ? "side-by-side" : "speaker")
              }
            >
              <SwapIcon className="h-5 w-5" />
            </BarButton>
            <BarButton
              label="More call options"
              active={sheet !== null}
              onClick={() => setSheet(sheet ? null : "todo")}
            >
              <MoreIcon className="h-5 w-5" />
            </BarButton>
            {/* The hairline costs ~9px; a 320px phone needs them. */}
            <span
              aria-hidden
              className="mx-0.5 hidden h-6 w-px bg-white/15 min-[360px]:block"
            />
            <button
              type="button"
              onClick={leave}
              className="flex h-12 items-center gap-1.5 rounded-full bg-red-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 min-[360px]:gap-2 min-[360px]:px-4"
            >
              <PhoneOffIcon className="h-5 w-5" aria-hidden="true" />
              End
            </button>
          </div>
        </div>
      </div>

      <CallPanel
        open={sheet !== null}
        tab={sheet ?? "todo"}
        onTab={(next) => setSheet(next)}
        onClose={() => setSheet(null)}
        sessionId={session.id}
        todos={todos}
        partnerName={partnerName}
        layout={layout}
        onLayout={setStage}
        handUp={handUp}
        onHand={() => {
          api?.executeCommand("toggleRaiseHand");
          setHandUp((up) => !up);
        }}
        sharing={sharing}
        onShare={() => api?.executeCommand("toggleShareScreen")}
        onSketch={() => {
          setSheet(null);
          setSketchOpen(true);
        }}
        onLeave={leave}
      />

      <SketchPad open={sketchOpen} onClose={() => setSketchOpen(false)} />
    </div>
  );
}
