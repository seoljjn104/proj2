-- ============================================================
-- SkillGRID — 20261007000001_advisor_fixes.sql
--
-- Clears Supabase Advisors findings:
--   * security_definer_view (ERROR x2)
--       -> profile_directory / admin_user_flags become SECURITY
--          DEFINER RPCs with pinned search_path (get_profile_directory,
--          get_admin_flags); views are dropped.
--   * function executed with definer rights by anon/authenticated
--     (WARN) -> EXECUTE revoked on the six trigger functions.
--     PostgreSQL checks EXECUTE when a trigger is created, not when it
--     fires, so trigger behaviour is unchanged.
--   * rls_enabled_no_policy (INFO) on allowed_email_domains
--       -> explicit deny-all policy (access stays SQL-only).
--   * unused_index (INFO) -> idx_skill_tags_category dropped;
--     skill categories are only grouped client-side.
-- ============================================================

-- 1. Trigger functions: no direct EXECUTE for API roles. -----------
REVOKE EXECUTE ON FUNCTION public.enforce_email_domain()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_session_overlap()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_session_transition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_review()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_moderation_fields()  FROM PUBLIC, anon, authenticated;

-- 2. allowed_email_domains: RLS enabled, explicit deny-all policy. -
CREATE POLICY allowed_email_domains_deny_all
  ON public.allowed_email_domains
  FOR ALL TO PUBLIC
  USING (false)
  WITH CHECK (false);

-- 3. Unused index (category never filtered/sorted in SQL). ---------
DROP INDEX public.idx_skill_tags_category;

-- 4. profile_directory view -> get_profile_directory RPC. ----------
CREATE OR REPLACE FUNCTION public.get_profile_directory(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id         uuid,
  name       text,
  bio        text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.bio, p.created_at
  FROM public.profiles p
  WHERE p_ids IS NULL OR p.id = ANY (p_ids);
$$;

-- 5. admin_user_flags view -> get_admin_flags RPC. -----------------
--    Returns zero rows for non-admins: the EXISTS filter runs with
--    the function owner's rights while auth.uid() still resolves the
--    caller's JWT sub (same semantics as the view it replaces).
CREATE OR REPLACE FUNCTION public.get_admin_flags()
RETURNS TABLE (
  id           uuid,
  name         text,
  email        text,
  bio          text,
  flagged      boolean,
  flag_reason  text,
  created_at   timestamptz,
  avg_rating   numeric(3, 2),
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    p.name,
    p.email,
    p.bio,
    p.flagged,
    p.flag_reason,
    p.created_at,
    coalesce(r.avg_rating, 0)::numeric(3, 2) AS avg_rating,
    coalesce(r.review_count, 0)::bigint       AS review_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT rv.reviewee_id,
           avg(rv.rating)::numeric(3, 2) AS avg_rating,
           count(*)                      AS review_count
    FROM public.reviews rv
    GROUP BY rv.reviewee_id
  ) r ON r.reviewee_id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles a
    WHERE a.id = auth.uid() AND a.is_admin
  );
$$;

-- 6. Drop the replaced views. --------------------------------------
DROP VIEW public.profile_directory;
DROP VIEW public.admin_user_flags;

-- 7. Privileges: signed-in users and the service role only. --------
REVOKE ALL ON FUNCTION public.get_profile_directory(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_flags()             FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_profile_directory(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_flags()             TO authenticated, service_role;
