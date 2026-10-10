-- ============================================================
-- SkillGRID — 20261010000003_session_insert_lockdown.sql
--
-- Close the last bypass on the session state machine.
--
-- Before this migration a signed-in client could INSERT into
-- public.sessions directly (policy sessions_insert_requester),
-- which skipped propose_session()'s checks for: blocked pairs,
-- flagged providers, future scheduling, duration bounds, and the
-- agreed teach/learn skills. The overlap trigger still applied,
-- but everything else was client-trusting.
--
-- Removing the INSERT policy means rows can only be created by
-- SECURITY DEFINER code (propose_session), which owns the table
-- and therefore bypasses RLS. Reads/updates stay RLS-scoped and
-- the transition trigger keeps guarding status changes.
-- ============================================================

DROP POLICY IF EXISTS sessions_insert_requester ON public.sessions;
