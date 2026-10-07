"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SkillTag, SkillType } from "@/types/database";

interface MySkill {
  id: number;
  type: SkillType;
  tag_id: number;
  skill_tags: { name: string; category: string | null } | null;
}

/**
 * Manages the two tag lists that drive matching:
 *   OFFERED = skills I can teach
 *   WANTED  = skills I want to learn
 */
export default function SkillManager() {
  const supabase = createClient();
  const { user } = useAuth();
  const [tags, setTags] = useState<SkillTag[]>([]);
  const [mine, setMine] = useState<MySkill[]>([]);
  const [pickOffered, setPickOffered] = useState("");
  const [pickWanted, setPickWanted] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState<SkillType>("OFFERED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [tagsResult, mineResult] = await Promise.all([
      supabase.from("skill_tags").select("*").order("name"),
      supabase
        .from("user_skills")
        .select("id, type, tag_id, skill_tags(name, category)")
        .eq("user_id", user.id)
        .order("id"),
    ]);
    setTags((tagsResult.data as SkillTag[]) ?? []);
    // PostgREST types embeds as arrays; skill_tags is many-to-one
    // so the runtime shape is a single object (or null).
    setMine((mineResult.data as unknown as MySkill[]) ?? []);
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const offered = useMemo(
    () => mine.filter((m) => m.type === "OFFERED"),
    [mine],
  );
  const wanted = useMemo(() => mine.filter((m) => m.type === "WANTED"), [mine]);

  const offeredIds = new Set(offered.map((m) => m.tag_id));
  const wantedIds = new Set(wanted.map((m) => m.tag_id));

  const availableTags = useMemo(() => tags, [tags]);

  async function addTag(tagId: number, type: SkillType) {
    if (!user) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("user_skills").insert({
      user_id: user.id,
      tag_id: tagId,
      type,
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "That skill is already on this list."
          : insertError.message,
      );
      return;
    }
    await load();
  }

  async function removeSkill(skillId: number) {
    setBusy(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("user_skills")
      .delete()
      .eq("id", skillId);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  async function createAndAdd(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    const { data: tagIdRaw, error: rpcError } = await supabase.rpc(
      "add_skill_tag",
      { p_name: newName, p_category: newCategory || null },
    );
    if (rpcError) {
      setBusy(false);
      setError(rpcError.message);
      return;
    }
    // int8 may arrive as number or string depending on PostgREST config.
    const tagId = Number(tagIdRaw);
    const { error: insertError } = await supabase.from("user_skills").insert({
      user_id: user.id,
      tag_id: tagId,
      type: newType,
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "That skill is already on this list."
          : insertError.message,
      );
      return;
    }
    setNewName("");
    setNewCategory("");
    await load();
  }

  function list(
    type: SkillType,
    items: MySkill[],
    pick: string,
    setPick: (v: string) => void,
  ) {
    const taken = type === "OFFERED" ? offeredIds : wantedIds;
    const options = availableTags.filter((t) => !taken.has(t.id));
    const grouped = options.reduce<Record<string, SkillTag[]>>((acc, t) => {
      const key = t.category ?? "Other";
      (acc[key] ??= []).push(t);
      return acc;
    }, {});

    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {type === "OFFERED" ? "I can teach" : "I want to learn"}
          </h3>
          <span className="text-xs font-medium text-slate-400">
            {type === "OFFERED" ? "OFFERED" : "WANTED"} · {items.length}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.length === 0 && (
            <span className="text-sm text-slate-400">Nothing listed yet.</span>
          )}
          {items.map((m) => (
            <span
              key={m.id}
              className={type === "OFFERED" ? "chip-offered" : "chip-wanted"}
            >
              {m.skill_tags?.name ?? "Unknown"}
              <button
                type="button"
                onClick={() => void removeSkill(m.id)}
                className="ml-1.5 font-bold opacity-60 hover:opacity-100"
                aria-label={`Remove ${m.skill_tags?.name ?? ""}`}
                disabled={busy}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pick) void addTag(Number(pick), type);
          }}
        >
          <select
            className="input flex-1"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            aria-label={`Add ${type.toLowerCase()} skill`}
          >
            <option value="">Choose a skill…</option>
            {Object.entries(grouped).map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="submit"
            className="btn-secondary"
            disabled={busy || !pick}
          >
            Add
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {list("OFFERED", offered, pickOffered, setPickOffered)}
        {list("WANTED", wanted, pickWanted, setPickWanted)}
      </div>

      <form onSubmit={createAndAdd} className="card space-y-3">
        <h3 className="font-semibold text-slate-900">Create a new skill tag</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="input min-w-40 flex-1"
            placeholder="e.g. Kotlin, Watercolour, Public Speaking"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
            required
          />
          <input
            className="input min-w-32 flex-1"
            placeholder="Category (optional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            maxLength={40}
          />
          <select
            className="input w-auto"
            value={newType}
            onChange={(e) => setNewType(e.target.value as SkillType)}
            aria-label="Skill list"
          >
            <option value="OFFERED">I can teach</option>
            <option value="WANTED">I want to learn</option>
          </select>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Adding…" : "Create & add"}
          </button>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
