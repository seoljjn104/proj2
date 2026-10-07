-- ============================================================
-- SkillGRID — 000002_rls_policies.sql
-- Row Level Security for every table.
--
-- Principle: users only ever touch their OWN rows directly.
-- Cross-user discovery (marketplace / matching) is served by
-- SECURITY DEFINER RPCs in 000003_functions.sql, so no
-- read-others policy is ever needed here.
-- ============================================================

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- profiles : strict own-row access
-- ------------------------------------------------------------
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY profiles_delete_own
  ON public.profiles FOR DELETE
  TO authenticated
  USING (id = (select auth.uid()));

-- ------------------------------------------------------------
-- skill_tags : read-only catalog for everyone signed in
-- (no write policies => only superuser / service role can write)
-- ------------------------------------------------------------
CREATE POLICY skill_tags_read
  ON public.skill_tags FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- user_skills : strict own-row access
-- ------------------------------------------------------------
CREATE POLICY user_skills_select_own
  ON public.user_skills FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY user_skills_insert_own
  ON public.user_skills FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY user_skills_update_own
  ON public.user_skills FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY user_skills_delete_own
  ON public.user_skills FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- sessions : visible/editable by the two participants only.
-- INSERT: you may only create a session AS the requester.
-- DELETE: intentionally absent — cancel instead.
-- Status transitions are enforced by trigger (000003).
-- ------------------------------------------------------------
CREATE POLICY sessions_select_participant
  ON public.sessions FOR SELECT
  TO authenticated
  USING (requester_id = (select auth.uid()) OR provider_id = (select auth.uid()));

CREATE POLICY sessions_insert_requester
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = (select auth.uid())
    AND provider_id <> (select auth.uid())
    AND status = 'PENDING'
  );

CREATE POLICY sessions_update_participant
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (requester_id = (select auth.uid()) OR provider_id = (select auth.uid()))
  WITH CHECK (requester_id = (select auth.uid()) OR provider_id = (select auth.uid()));

-- ------------------------------------------------------------
-- messages : only the two session participants, and you can
-- only ever write as yourself.
-- ------------------------------------------------------------
CREATE POLICY messages_select_participant
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

CREATE POLICY messages_insert_participant
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

CREATE POLICY messages_update_own
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY messages_delete_own
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = (select auth.uid()));

-- ------------------------------------------------------------
-- reviews : participants of the session can read; only the
-- reviewer can write their own review. "Session must be
-- COMPLETED" and "reviewee must be the other participant" are
-- enforced by trigger (000003).
-- ------------------------------------------------------------
CREATE POLICY reviews_select_related
  ON public.reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = (select auth.uid())
    OR reviewee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

CREATE POLICY reviews_insert_own
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY reviews_update_own
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY reviews_delete_own
  ON public.reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = (select auth.uid()));

-- ------------------------------------------------------------
-- allowed_email_domains : no policies at all.
-- RLS with zero policies = deny-all for API roles; only the
-- SECURITY DEFINER signup trigger can read it.
-- ------------------------------------------------------------
REVOKE ALL ON public.allowed_email_domains FROM anon, authenticated;
