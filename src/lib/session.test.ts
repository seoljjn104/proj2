import test from "node:test";
import assert from "node:assert/strict";

import {
  actorFor,
  bucketFor,
  canCancel,
  canComplete,
  canRespond,
  isTerminal,
  statusLabel,
  TERMINAL_STATUSES,
} from "./session.ts";

const REQUESTER = "user-requester";
const PROVIDER = "user-provider";
const STRANGER = "user-stranger";

test("actorFor classifies the three sides", () => {
  assert.equal(actorFor(REQUESTER, REQUESTER, PROVIDER), "REQUESTER");
  assert.equal(actorFor(PROVIDER, REQUESTER, PROVIDER), "PROVIDER");
  assert.equal(actorFor(STRANGER, REQUESTER, PROVIDER), "OBSERVER");
});

test("only the provider can respond to a pending proposal", () => {
  assert.equal(canRespond("PENDING", "PROVIDER"), true);
  assert.equal(canRespond("PENDING", "REQUESTER"), false);
  assert.equal(canRespond("ACCEPTED", "PROVIDER"), false);
  assert.equal(canRespond("DECLINED", "PROVIDER"), false);
});

test("either participant can cancel a pending or accepted session", () => {
  assert.equal(canCancel("PENDING", "REQUESTER"), true);
  assert.equal(canCancel("PENDING", "PROVIDER"), true);
  assert.equal(canCancel("ACCEPTED", "REQUESTER"), true);
  assert.equal(canCancel("COMPLETED", "REQUESTER"), false);
  assert.equal(canCancel("CANCELLED", "PROVIDER"), false);
  assert.equal(canCancel("ACCEPTED", "OBSERVER"), false);
});

test("only accepted sessions can be completed, by a participant", () => {
  assert.equal(canComplete("ACCEPTED", "REQUESTER"), true);
  assert.equal(canComplete("ACCEPTED", "PROVIDER"), true);
  assert.equal(canComplete("PENDING", "PROVIDER"), false);
  assert.equal(canComplete("ACCEPTED", "OBSERVER"), false);
});

test("terminal statuses are exactly DECLINED, COMPLETED, CANCELLED", () => {
  assert.deepEqual([...TERMINAL_STATUSES], ["DECLINED", "COMPLETED", "CANCELLED"]);
  assert.equal(isTerminal("PENDING"), false);
  assert.equal(isTerminal("ACCEPTED"), false);
  assert.equal(isTerminal("DECLINED"), true);
  assert.equal(isTerminal("COMPLETED"), true);
  assert.equal(isTerminal("CANCELLED"), true);
});

test("bucketFor routes pending by role and terminal to history", () => {
  assert.equal(bucketFor("PENDING", "PROVIDER"), "incoming");
  assert.equal(bucketFor("PENDING", "REQUESTER"), "outgoing");
  assert.equal(bucketFor("ACCEPTED", "REQUESTER"), "upcoming");
  assert.equal(bucketFor("ACCEPTED", "PROVIDER"), "upcoming");
  assert.equal(bucketFor("COMPLETED", "REQUESTER"), "history");
  assert.equal(bucketFor("DECLINED", "PROVIDER"), "history");
  assert.equal(bucketFor("CANCELLED", "REQUESTER"), "history");
});

test("statusLabel gives user-facing copy", () => {
  assert.equal(statusLabel("PENDING"), "Pending");
  assert.equal(statusLabel("ACCEPTED"), "Scheduled");
  assert.equal(statusLabel("DECLINED"), "Declined");
  assert.equal(statusLabel("COMPLETED"), "Completed");
  assert.equal(statusLabel("CANCELLED"), "Cancelled");
});
