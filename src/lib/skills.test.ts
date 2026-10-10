import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeSkillName,
  skillKey,
  isValidSkillName,
  isValidHeadline,
} from "./skills.ts";

test("normalizeSkillName trims and collapses whitespace", () => {
  assert.equal(normalizeSkillName("  Data   Analysis "), "Data Analysis");
  assert.equal(normalizeSkillName("Guitar"), "Guitar");
  assert.equal(normalizeSkillName(""), "");
});

test("skillKey is case- and whitespace-insensitive", () => {
  assert.equal(skillKey("  DATA analysis "), "data analysis");
  assert.equal(skillKey("Data Analysis"), skillKey("data   analysis"));
});

test("isValidSkillName enforces 2-60 chars after normalization", () => {
  assert.equal(isValidSkillName("a"), false);
  assert.equal(isValidSkillName("ab"), true);
  assert.equal(isValidSkillName("  a  "), false);
  assert.equal(isValidSkillName("x".repeat(60)), true);
  assert.equal(isValidSkillName("x".repeat(61)), false);
});

test("isValidHeadline allows empty but caps at 120 chars", () => {
  assert.equal(isValidHeadline(""), true);
  assert.equal(isValidHeadline("x".repeat(120)), true);
  assert.equal(isValidHeadline("x".repeat(121)), false);
});
