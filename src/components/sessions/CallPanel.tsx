"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SessionTodos } from "./useSessionTodos";
import { MAX_TODO_LEN } from "./useSessionTodos";
import { useSessionMessages } from "@/components/chat/useSessionMessages";
import Alert from "@/components/ui/Alert";
import { useAuth } from "@/hooks/useAuth";
import {
  HandIcon,
  PenIcon,
  PhoneOffIcon,
  ScreenShareIcon,
} from "@/components/layout/icons";

export type CallLayout = "side-by-side" | "speaker" | "grid";
export type CallTab = "todo" | "chat" | "settings";

export const LAYOUTS: {
  id: CallLayout;
  name: string;
  description: string;
}[] = [
  {
    id: "side-by-side",
    name: "Side by side",
    description:
      "Both of you get the same size. The default, so it stays fair.",
  },
  {
    id: "speaker",
    name: "Speaker",
    description:
      "Whoever is talking fills the frame and you sit in the corner. Best while one of you demonstrates.",
  },
  {
    id: "grid",
    name: "Grid",
    description:
      "Rooms for more people, with empty seats kept open for a skill circle later.",
  },
];

const TABS: { id: CallTab; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "chat", label: "Chat" },
  { id: "settings", label: "Settings" },
];

interface Props {
  open: boolean;
  tab: CallTab;
  onTab: (tab: CallTab) => void;
  onClose: () => void;
  sessionId: string;
  todos: SessionTodos;
  partnerName: string;
  layout: CallLayout;
  onLayout: (layout: CallLayout) => void;
  handUp: boolean;
  onHand: () => void;
  sharing: boolean;
  onShare: () => void;
  onSketch: () => void;
  onLeave: () => void;
}

/** A labelled round-ish chip used for the extra call controls. */
function ControlChip({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-teal-400/60 bg-teal-400/15 text-[#EDE7DB]"
          : "border-white/10 bg-white/5 text-[#cbc2ad] hover:bg-white/10 hover:text-[#EDE7DB]"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function TodoTab({
  todos,
  partnerName,
}: {
  todos: SessionTodos;
  partnerName: string;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setAdding(true);
    const ok = await todos.add(draft);
    setAdding(false);
    if (ok) setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h3 className="text-sm font-semibold text-[#EDE7DB]">
          What you&apos;ll cover
        </h3>
        {todos.todos.length > 0 && (
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-[#cbc2ad] tabular-nums">
            {todos.doneCount} of {todos.todos.length} done
          </span>
        )}
      </div>

      <form onSubmit={onAdd} className="flex gap-2">
        <label htmlFor="call-todo-new" className="sr-only">
          Add an item to the to-do list
        </label>
        <input
          id="call-todo-new"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_TODO_LEN}
          placeholder="Add something to cover"
          disabled={adding}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-white/5 px-3 text-sm text-[#EDE7DB] placeholder:text-[#8b8371] focus:border-teal-400/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={adding || !draft.trim()}
          aria-busy={adding}
          className="btn-primary shrink-0"
        >
          {adding ? "Adding…" : "Add to do"}
        </button>
      </form>

      {todos.error && (
        <div className="pt-3">
          <Alert>{todos.error}</Alert>
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {todos.loading ? (
          <div className="space-y-2" aria-busy="true">
            <div className="skeleton h-11 rounded-xl" />
            <div className="skeleton h-11 rounded-xl" />
          </div>
        ) : todos.todos.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-[#cbc2ad]">
            Nothing on the list yet. Add the first thing you want to cover.
          </p>
        ) : (
          <ul className="divide-y divide-white/8">
            {todos.todos.map((todo) => {
              const mine = todo.created_by === user?.id;
              return (
                <li key={todo.id} className="flex items-start gap-3 py-2.5">
                  <input
                    id={`call-todo-${todo.id}`}
                    type="checkbox"
                    checked={todo.done}
                    disabled={todos.busyId === todo.id}
                    onChange={() => void todos.toggle(todo)}
                    className="mt-1 h-5 w-5 shrink-0 accent-teal-400"
                  />
                  <label
                    htmlFor={`call-todo-${todo.id}`}
                    className={`min-w-0 flex-1 cursor-pointer py-1 text-sm ${
                      todo.done
                        ? "text-[#8b8371] line-through"
                        : "text-[#EDE7DB]"
                    }`}
                  >
                    <span className="break-words">{todo.body}</span>
                    <span className="mt-0.5 block text-[11px] text-[#8b8371]">
                      {mine ? "Added by you" : `Added by ${partnerName}`}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void todos.remove(todo)}
                    disabled={todos.busyId === todo.id}
                    aria-label={`Remove ${todo.body}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#8b8371] transition-colors hover:bg-white/10 hover:text-red-300"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M3.5 4h9M6.5 4V2.75h3V4M5 4l.6 8.5h4.8L11 4M6.8 6.4v4M9.2 6.4v4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChatTab({ sessionId }: { sessionId: string }) {
  const { messages, loading, error, sending, send } =
    useSessionMessages(sessionId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await send(text);
    if (ok) setText("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="log"
        aria-live="polite"
        aria-label="Session chat messages"
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-3"
      >
        {loading && <div className="skeleton h-20 rounded-xl" aria-busy="true" />}
        {!loading && messages.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-[#cbc2ad]">
            No messages yet. Say hi and confirm what you&apos;ll exchange.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <p className="text-[11px] text-[#8b8371]">
              {new Date(m.created_at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-0.5 break-words rounded-xl bg-white/8 px-3 py-2 text-[#EDE7DB]">
              {m.content}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 pt-3">
        <label htmlFor="call-chat-input" className="sr-only">
          Message
        </label>
        <input
          id="call-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write a message"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-white/5 px-3 text-sm text-[#EDE7DB] placeholder:text-[#8b8371] focus:border-teal-400/70 focus:outline-none"
        />
        <button
          type="submit"
          className="btn-primary shrink-0"
          disabled={sending || !text.trim()}
          aria-busy={sending}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>

      {error && (
        <div className="pt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}

/** Tiny diagrams of each layout, so the choice is obvious without reading. */
function LayoutGlyph({ id }: { id: CallLayout }) {
  const box = "fill-current";
  return (
    <svg viewBox="0 0 40 26" className="h-6 w-9 shrink-0" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="25" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      {id === "side-by-side" && (
        <>
          <rect x="3" y="3" width="16" height="20" rx="2" className={box} opacity="0.55" />
          <rect x="21" y="3" width="16" height="20" rx="2" className={box} opacity="0.55" />
        </>
      )}
      {id === "speaker" && (
        <>
          <rect x="3" y="3" width="22" height="20" rx="2" className={box} opacity="0.6" />
          <rect x="27" y="16" width="10" height="7" rx="1.5" className={box} opacity="0.45" />
        </>
      )}
      {id === "grid" && (
        <>
          <rect x="3" y="3" width="16" height="9" rx="1.5" className={box} opacity="0.55" />
          <rect x="21" y="3" width="16" height="9" rx="1.5" className={box} opacity="0.55" />
          <rect x="3" y="14" width="16" height="9" rx="1.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 3" />
          <rect x="21" y="14" width="16" height="9" rx="1.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 3" />
        </>
      )}
    </svg>
  );
}

function SettingsTab({
  layout,
  onLayout,
  onLeave,
}: {
  layout: CallLayout;
  onLayout: (layout: CallLayout) => void;
  onLeave: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <fieldset>
        <legend className="text-sm font-semibold text-[#EDE7DB]">
          How you see the call
        </legend>
        <p className="mt-1 text-[12.5px] text-[#9c937f]">
          This only changes your own view.
        </p>
        <div className="mt-3 space-y-2">
          {LAYOUTS.map((option) => {
            const active = layout === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400/70 ${
                  active
                    ? "border-teal-400/60 bg-teal-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                }`}
              >
                <input
                  type="radio"
                  name="call-layout"
                  value={option.id}
                  checked={active}
                  onChange={() => onLayout(option.id)}
                  className="sr-only"
                />
                <span
                  className={active ? "text-teal-300" : "text-[#cbc2ad]"}
                  aria-hidden="true"
                >
                  <LayoutGlyph id={option.id} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#EDE7DB]">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-[#9c937f]">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 border-t border-white/10 pt-4">
        <button type="button" onClick={onLeave} className="btn-danger w-full">
          <PhoneOffIcon className="h-5 w-5" aria-hidden="true" />
          Leave the call
        </button>
      </div>
    </div>
  );
}

/**
 * The in-call sheet: everything that isn't the bar. To do, Chat and Settings,
 * plus the controls that don't earn a permanent seat (hand, share, sketch).
 * Rises from the bottom on a phone, anchors bottom-right on a wide screen.
 */
export default function CallPanel({
  open,
  tab,
  onTab,
  onClose,
  sessionId,
  todos,
  partnerName,
  layout,
  onLayout,
  handUp,
  onHand,
  sharing,
  onShare,
  onSketch,
  onLeave,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close the call panel"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/45"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Call panel"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col rounded-t-2xl border-t border-white/12 bg-[#1a1712] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[70dvh] sm:w-[26rem] sm:rounded-2xl sm:border"
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

        <div className="flex shrink-0 gap-2">
          <ControlChip label="Hand" active={handUp} onClick={onHand}>
            <HandIcon className="h-5 w-5" aria-hidden="true" />
          </ControlChip>
          <ControlChip label="Share" active={sharing} onClick={onShare}>
            <ScreenShareIcon className="h-5 w-5" aria-hidden="true" />
          </ControlChip>
          <ControlChip label="Sketch" onClick={onSketch}>
            <PenIcon className="h-5 w-5" aria-hidden="true" />
          </ControlChip>
        </div>

        <div
          role="tablist"
          aria-label="Call panel sections"
          className="mt-4 flex shrink-0 gap-1 border-b border-white/10"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`call-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`call-panel-${t.id}`}
              onClick={() => onTab(t.id)}
              className={`-mb-px rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-teal-400 text-[#EDE7DB]"
                  : "border-transparent text-[#9c937f] hover:text-[#EDE7DB]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`call-panel-${tab}`}
          aria-labelledby={`call-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col pt-4"
        >
          {tab === "todo" && (
            <TodoTab todos={todos} partnerName={partnerName} />
          )}
          {tab === "chat" && <ChatTab sessionId={sessionId} />}
          {tab === "settings" && (
            <SettingsTab layout={layout} onLayout={onLayout} onLeave={onLeave} />
          )}
        </div>
      </div>
    </>
  );
}
