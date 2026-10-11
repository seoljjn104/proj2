"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAX_TODO_LEN, useSessionTodos } from "./useSessionTodos";
import Alert from "@/components/ui/Alert";

interface Props {
  sessionId: string;
  /** Shown as the author of items the other person added. */
  partnerName?: string;
}

/**
 * The shared to-do list as the paper card on the session page.
 *
 * It is called **To do**, not "Agenda": round 11 renamed it ("the agenda is now
 * simply To do") and round 16 draws the session page that way, with an `n of m
 * done` count and a **+ Add to do** affordance. The data layer lives in
 * `useSessionTodos`, so the call's ink sheet shows the same list.
 */
export default function SessionTodoList({ sessionId, partnerName }: Props) {
  const { user } = useAuth();
  const { todos, loading, error, busyId, doneCount, add, toggle, remove } =
    useSessionTodos(sessionId);

  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setAdding(true);
    const ok = await add(draft);
    setAdding(false);
    if (ok) setDraft("");
  }

  return (
    <section className="card" aria-labelledby="session-todo-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="session-todo-heading" className="section-title">
            To do
          </h2>
          <p className="mt-1 text-sm text-ink2">
            What you plan to cover. You can both add to this list.
          </p>
        </div>
        {todos.length > 0 && (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800">
            {doneCount} of {todos.length} done
          </span>
        )}
      </div>

      <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="todo-new" className="sr-only">
          Add an item to the to do list
        </label>
        <input
          id="todo-new"
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_TODO_LEN}
          placeholder="Add something to cover"
          disabled={adding}
        />
        <button
          type="submit"
          className="btn-secondary shrink-0"
          disabled={adding || !draft.trim()}
          aria-busy={adding}
        >
          {adding ? "Adding…" : "Add to do"}
        </button>
      </form>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          <div className="skeleton h-11" />
          <div className="skeleton h-11" />
        </div>
      ) : todos.length === 0 ? (
        <p className="panel mt-4 text-sm text-ink2">
          Nothing on the list yet. Add the first thing you want to cover when you
          meet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line2">
          {todos.map((todo) => {
            const mine = todo.created_by === user?.id;
            const busy = busyId === todo.id;
            return (
              <li key={todo.id} className="flex items-start gap-3 py-2.5">
                <input
                  id={`todo-${todo.id}`}
                  type="checkbox"
                  checked={todo.done}
                  disabled={busy}
                  onChange={() => void toggle(todo)}
                  className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                />
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={`min-w-0 flex-1 cursor-pointer py-1 text-sm ${
                    todo.done ? "text-ink3 line-through" : "text-ink"
                  }`}
                >
                  <span className="break-words">{todo.body}</span>
                  <span className="mt-0.5 block text-xs text-ink3">
                    {mine ? "Added by you" : `Added by ${partnerName ?? "them"}`}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void remove(todo)}
                  disabled={busy}
                  aria-label={`Remove ${todo.body}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink3 transition-colors hover:bg-slate-100 hover:text-red-700"
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
    </section>
  );
}
