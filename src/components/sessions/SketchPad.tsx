"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

const COLORS = [
  { id: "paper", value: "#EDE7DB", label: "Paper" },
  { id: "teal", value: "#5eead4", label: "Teal" },
  { id: "amber", value: "#fcd34d", label: "Amber" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * The full-screen sketch pad. Draws on a canvas at device resolution and keeps
 * the strokes so a resize re-renders rather than clearing.
 *
 * Local to this device for now: nothing is sent to the other participant until
 * a shared canvas gets a home in the database.
 */
export default function SketchPad({ open, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(COLORS[0].value);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      if (stroke.points.length === 1) {
        // A dot: a zero-length line renders nothing, so draw a filled circle.
        ctx.arc(
          stroke.points[0].x,
          stroke.points[0].y,
          stroke.width / 2,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  }, []);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!open) return;
    fit();
    window.addEventListener("resize", fit);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, fit, onClose]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push({
      color,
      width: 3,
      points: [pointFrom(e)],
    });
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    stroke.points.push(pointFrom(e));
    redraw();
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sketch"
      className="fixed inset-0 z-[60] flex flex-col bg-[#12100b] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-[#EDE7DB]">Sketch</h2>

        <div className="flex items-center gap-1" role="group" aria-label="Pen colour">
          {COLORS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setColor(option.value)}
              aria-pressed={color === option.value}
              aria-label={option.label}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                color === option.value
                  ? "border-white/40 bg-white/10"
                  : "border-white/10 hover:bg-white/8"
              }`}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: option.value }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            strokesRef.current = [];
            redraw();
          }}
          className="btn-secondary"
        >
          Clear
        </button>
        <button type="button" onClick={onClose} className="btn-primary">
          Done
        </button>
      </div>

      <p className="mt-1.5 shrink-0 text-[12.5px] text-[#9c937f]">
        Only you can see this sketch.
      </p>

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="mt-3 min-h-0 flex-1 touch-none rounded-xl border border-white/12 bg-[#17140f]"
      />
    </div>
  );
}
