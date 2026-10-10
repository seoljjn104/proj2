import test from "node:test";
import assert from "node:assert/strict";

import { reciprocalMatch, skillKeySet } from "./matching.ts";

test("skillKeySet canonicalizes and drops blanks", () => {
  const set = skillKeySet(["  Data  Analysis ", "data analysis", "", "  "]);
  assert.deepEqual([...set], ["data analysis"]);
});

test("match requires teaching AND learning both ways", () => {
  const result = reciprocalMatch(
    { offered: ["Guitar"], wanted: ["Spanish"] },
    { offered: ["Spanish"], wanted: ["Guitar"] },
  );
  assert.equal(result.isReciprocal, true);
  assert.deepEqual(result.youTeach, ["Guitar"]);
  assert.deepEqual(result.youLearn, ["Spanish"]);
});

test("one-way overlap is not a reciprocal match", () => {
  const result = reciprocalMatch(
    { offered: ["Guitar"], wanted: ["Spanish"] },
    { offered: ["Guitar"], wanted: ["Piano"] },
  );
  assert.equal(result.isReciprocal, false);
  assert.deepEqual(result.youTeach, []);
  assert.deepEqual(result.youLearn, []);
});

test("matching is exact, not substring", () => {
  const result = reciprocalMatch(
    { offered: ["Java"], wanted: ["Guitar"] },
    { offered: ["JavaScript"], wanted: ["Java"] },
  );
  assert.equal(result.isReciprocal, false);
});

test("matching is case- and whitespace-insensitive", () => {
  const result = reciprocalMatch(
    { offered: ["  DATA analysis "], wanted: ["Guitar"] },
    { offered: ["guitar"], wanted: ["data  ANALYSIS"] },
  );
  assert.equal(result.isReciprocal, true);
  assert.deepEqual(result.youTeach, ["DATA analysis"]);
  assert.deepEqual(result.youLearn, ["guitar"]);
});

test("duplicate offered skills are reported once", () => {
  const result = reciprocalMatch(
    { offered: ["Guitar", "guitar", " Guitar "], wanted: ["Spanish"] },
    { offered: ["Spanish"], wanted: ["Guitar"] },
  );
  assert.deepEqual(result.youTeach, ["Guitar"]);
});

test("empty profiles never match", () => {
  assert.equal(
    reciprocalMatch({ offered: [], wanted: [] }, { offered: [], wanted: [] })
      .isReciprocal,
    false,
  );
});
