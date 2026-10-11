"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSessionRoom } from "./useSessionRoom";
import Avatar from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "@/components/layout/icons";

function slotText(iso: string | null): string {
  if (!iso) return "No time chosen yet";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Pre-call page. A custom, ink-coloured check-screen: live camera preview,
 * mic level, device pickers, then "Join now" or "Join with camera off". No
 * Jitsi chrome and nothing to configure beyond what you actually need.
 */
export default function PreCall({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const { session, partner, loading, missing } = useSessionRoom(sessionId);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [denied, setDenied] = useState(false);
  const [level, setLevel] = useState(0);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");

  const stopPreview = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startPreview = useCallback(
    async (nextCam?: string, nextMic?: string) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
      stopPreview();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: nextCam ? { deviceId: { exact: nextCam } } : true,
          audio: nextMic ? { deviceId: { exact: nextMic } } : true,
        });
        streamRef.current = stream;
        setDenied(false);
        if (videoRef.current) videoRef.current.srcObject = stream;

        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter((d) => d.kind === "videoinput");
        const audioInputs = all.filter((d) => d.kind === "audioinput");
        setCams(videoInputs);
        setMics(audioInputs);
        if (!nextCam && videoInputs[0]) setCamId(videoInputs[0].deviceId);
        if (!nextMic && audioInputs[0]) setMicId(audioInputs[0].deviceId);

        // Live mic level.
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteTimeDomainData(buf);
            let peak = 0;
            for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
            setLevel(Math.min(1, peak / 90));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch {
        setDenied(true);
      }
    },
    [stopPreview],
  );

  useEffect(() => {
    if (loading || missing || !session) return;
    void startPreview();
    return () => stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, missing, session?.id]);

  useEffect(() => {
    const stream = streamRef.current;
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);
  useEffect(() => {
    const stream = streamRef.current;
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  function join(withVideo: boolean) {
    stopPreview();
    router.push(`/sessions/${sessionId}/room${withVideo ? "" : "?video=0"}`);
  }

  if (loading) {
    return <div className="p-8 text-sm text-[#9c937f]">Loading your session…</div>;
  }

  if (missing || !session) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="display text-2xl text-[#EDE7DB]">Session not found</h1>
        <p className="mt-2 text-sm text-[#9c937f]">
          It may have been removed, or it isn&apos;t yours to view.
        </p>
        <Link href="/sessions" className="btn-secondary mt-6 inline-flex">
          Back to sessions
        </Link>
      </div>
    );
  }

  const partnerName = partner?.name ?? "your partner";
  const callable = session.status === "ACCEPTED";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9c937f] transition-colors hover:text-[#EDE7DB]"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to session
        </Link>
      </div>

      <h1 className="display mt-6 text-[28px] text-[#EDE7DB] sm:text-[34px]">
        Ready to join, {profile?.name?.split(" ")[0] ?? "there"}?
      </h1>
      <p className="mt-2 text-sm text-[#9c937f]">
        {slotText(session.scheduled_at)} · {session.duration_minutes} minutes with{" "}
        {partnerName}
      </p>

      <div className="mt-7 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Preview */}
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/50">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover transition-opacity ${camOn ? "opacity-100" : "opacity-0"}`}
            autoPlay
            muted
            playsInline
          />
          {!camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Avatar name={profile?.name} src={profile?.avatar_url} size="lg" />
              <p className="text-sm text-[#9c937f]">Camera off</p>
            </div>
          )}
          {denied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium text-[#EDE7DB]">
                We can&apos;t reach your camera or microphone
              </p>
              <p className="text-xs text-[#9c937f]">
                Check your browser permissions. You can still join — you&apos;ll
                simply be muted until you allow access.
              </p>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-2 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              aria-pressed={!micOn}
              aria-label={micOn ? "Turn microphone off" : "Turn microphone on"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                micOn ? "bg-white/12 text-[#EDE7DB] hover:bg-white/20" : "bg-red-500/90 text-white"
              }`}
            >
              {micOn ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setCamOn((v) => !v)}
              aria-pressed={!camOn}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                camOn ? "bg-white/12 text-[#EDE7DB] hover:bg-white/20" : "bg-red-500/90 text-white"
              }`}
            >
              {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Controls panel */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div>
            <label
              htmlFor="precall-mic"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9c937f]"
            >
              Microphone
            </label>
            <select
              id="precall-mic"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[#EDE7DB] outline-none focus:border-teal-400"
              value={micId}
              onChange={(e) => {
                setMicId(e.target.value);
                void startPreview(camId, e.target.value);
              }}
            >
              {mics.length === 0 && <option value="">Default microphone</option>}
              {mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-teal-400 transition-[width] duration-75"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-[#9c937f]">speaking</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="precall-cam"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9c937f]"
            >
              Camera
            </label>
            <select
              id="precall-cam"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[#EDE7DB] outline-none focus:border-teal-400"
              value={camId}
              onChange={(e) => {
                setCamId(e.target.value);
                void startPreview(e.target.value, micId);
              }}
            >
              {cams.length === 0 && <option value="">Default camera</option>}
              {cams.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-auto flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-[#9c937f]">
            <span className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-teal-400" aria-hidden="true" />
              You&apos;ll exchange: {session.proposal_message ? "as proposed" : "1:1 skills swap"}
            </span>
            <span className="flex items-center gap-2">
              <MicIcon className="h-4 w-4 text-teal-400" aria-hidden="true" />
              Only you and {partnerName} can hear this call
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => join(false)}>
          Join with camera off
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => join(true)}
          disabled={!callable}
          title={callable ? undefined : "This session isn't ready to join yet"}
        >
          Join now
        </button>
      </div>
    </div>
  );
}
