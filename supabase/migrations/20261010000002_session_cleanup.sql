-- ============================================================
-- SkillGRID — 20261010000002_session_cleanup.sql
--
-- Adds public.delete_session(): a participant may permanently remove
-- one of their own *closed* sessions (DECLINED / COMPLETED / CANCELLED),
-- along with its messages, reviews, and notifications (all cascade).
--
-- Active sessions are intentionally NOT deletable — cancel them instead
-- so the other participant sees the state change and the audit trail
-- survives. This is what lets test harnesses (scripts/e2e.mjs,
-- scripts/simulate.mjs) remove the sessions they create instead of
-- leaving residue on a real account.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sessions
  WHERE id = p_session_id
    AND v_uid IN (requester_id, provider_id)
    AND status IN ('DECLINED', 'COMPLETED', 'CANCELLED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only your own closed sessions can be removed' USING ERRCODE = '42501';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.delete_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_session(uuid) TO authenticated, service_role;
