-- ============================================================
-- SkillGRID — 000003_functions.sql
-- Triggers, RPCs, views.
-- ============================================================

-- ============================================================
-- 1. Signup: institutional email domain allowlist (hard check)
--    Client-side check gives a friendly error; this is the
--    authoritative gate. Empty allowlist => every domain ok.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_email_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_domain   text;
  v_total    bigint;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_total FROM public.allowed_email_domains;
  IF v_total = 0 THEN
    RETURN NEW;
  END IF;

  v_domain := lower(split_part(NEW.email, '@', 2));
  IF NOT EXISTS (
    SELECT 1 FROM public.allowed_email_domains d WHERE d.domain = v_domain
  ) THEN
    RAISE EXCEPTION 'SkillGRID signups are restricted to institutional email domains (%)', v_domain
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_email_domain();

-- ============================================================
-- 2. Signup: auto-create the public profile row
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Sessions: overlap prevention for the two participants.
--    Half-open ranges [start, end) => back-to-back allowed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_session_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status NOT IN ('PENDING', 'ACCEPTED') THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_at IS NULL THEN
    RAISE EXCEPTION 'A scheduled time is required for pending/accepted sessions'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id <> NEW.id
      AND s.status IN ('PENDING', 'ACCEPTED')
      AND s.scheduled_at IS NOT NULL
      AND (
        s.requester_id IN (NEW.requester_id, NEW.provider_id)
        OR s.provider_id IN (NEW.requester_id, NEW.provider_id)
      )
      AND tstzrange(s.scheduled_at, s.scheduled_at + make_interval(mins => s.duration_minutes), '[)')
       && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes), '[)')
  ) THEN
    RAISE EXCEPTION 'Time slot overlaps an existing pending/accepted session for one of the participants'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_no_overlap
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_overlap();

-- ============================================================
-- 4. Sessions: status transition + meeting_link rules.
--    (RLS policies cannot see OLD values, the trigger can.)
--
--      PENDING   -> ACCEPTED   provider only
--      PENDING   -> CANCELLED  either participant
--      ACCEPTED  -> COMPLETED  either participant
--      ACCEPTED  -> CANCELLED  either participant
--      COMPLETED / CANCELLED   terminal
--      meeting_link            only writable while ACCEPTED,
--                               participants only
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_session_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NEW.meeting_link IS DISTINCT FROM OLD.meeting_link THEN
    IF OLD.status <> 'ACCEPTED' THEN
      RAISE EXCEPTION 'A meeting link can only be attached to an ACCEPTED session'
        USING ERRCODE = '23514';
    END IF;
    IF v_uid IS NOT NULL AND v_uid NOT IN (OLD.requester_id, OLD.provider_id) THEN
      RAISE EXCEPTION 'Only session participants may set the meeting link'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RETURN NEW; -- service role / SQL console (RLS already blocked anon access)
  END IF;

  IF v_uid NOT IN (OLD.requester_id, OLD.provider_id) THEN
    RAISE EXCEPTION 'Only session participants can change the session status'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'A % session cannot change status', OLD.status
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status = 'ACCEPTED' THEN
    IF v_uid <> OLD.provider_id THEN
      RAISE EXCEPTION 'Only the provider can accept a session'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'A session must be accepted before it can be completed'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'ACCEPTED' AND NEW.status = 'COMPLETED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid session status transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER sessions_status_rules
  BEFORE UPDATE OF status, meeting_link ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_session_transition();

-- ============================================================
-- 5. Reviews: session must be COMPLETED, reviewer + reviewee
--    must be the two session participants.
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requester uuid;
  v_provider  uuid;
  v_status    text;
BEGIN
  SELECT s.requester_id, s.provider_id, s.status
    INTO v_requester, v_provider, v_status
  FROM public.sessions s
  WHERE s.id = NEW.session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = '23503';
  END IF;

  IF v_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Reviews can only be left after the session is COMPLETED'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reviewer_id NOT IN (v_requester, v_provider) THEN
    RAISE EXCEPTION 'Reviewer must be a participant of the session'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reviewee_id NOT IN (v_requester, v_provider)
     OR NEW.reviewee_id = NEW.reviewer_id THEN
    RAISE EXCEPTION 'Reviewee must be the other session participant'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_valid
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review();

-- ============================================================
-- 6. Profiles: only admins may flip is_admin / flagged /
--    flag_reason. (No-JWT paths are trusted: SQL console,
--    service role — API callers always have a JWT.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.flagged IS DISTINCT FROM OLD.flagged
      OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin)
     AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    ) THEN
      RAISE EXCEPTION 'Only administrators can change moderation fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_moderation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_moderation_fields();

-- ============================================================
-- 7. Reciprocal 1:1 matching engine
--    A matches B when A.OFFERED = B.WANTED AND A.WANTED = B.OFFERED
--    (name comparison is case-insensitive).
--    Callable only for yourself (or by an administrator).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_reciprocal_matches(p_user_id uuid)
RETURNS TABLE (
  partner_id      uuid,
  partner_name    text,
  partner_bio     text,
  skills_you_teach text[],
  skills_you_gain  text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL
     OR (p_user_id <> auth.uid()
         AND NOT EXISTS (
           SELECT 1 FROM public.profiles p
           WHERE p.id = auth.uid() AND p.is_admin
         )) THEN
    RAISE EXCEPTION 'You may only request matches for your own profile'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT us.type, lower(st.name) AS tag_name
    FROM public.user_skills us
    JOIN public.skill_tags st ON st.id = us.tag_id
    WHERE us.user_id = p_user_id
  ),
  candidates AS (
    SELECT p.id, p.name, p.bio
    FROM public.profiles p
    WHERE p.id <> p_user_id
      AND p.flagged = false
      -- partner OFFERED intersects my WANTED
      AND EXISTS (
        SELECT 1
        FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id
          AND us.type = 'OFFERED'
          AND EXISTS (SELECT 1 FROM mine m
                      WHERE m.type = 'WANTED' AND m.tag_name = lower(st.name))
      )
      -- partner WANTED intersects my OFFERED
      AND EXISTS (
        SELECT 1
        FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id
          AND us.type = 'WANTED'
          AND EXISTS (SELECT 1 FROM mine m
                      WHERE m.type = 'OFFERED' AND m.tag_name = lower(st.name))
      )
  )
  SELECT
    c.id,
    c.name,
    c.bio,
    (
      SELECT array_agg(DISTINCT st.name ORDER BY st.name)
      FROM public.user_skills us
      JOIN public.skill_tags st ON st.id = us.tag_id
      WHERE us.user_id = c.id
        AND us.type = 'WANTED'
        AND lower(st.name) IN (SELECT tag_name FROM mine WHERE type = 'OFFERED')
    ),
    (
      SELECT array_agg(DISTINCT st.name ORDER BY st.name)
      FROM public.user_skills us
      JOIN public.skill_tags st ON st.id = us.tag_id
      WHERE us.user_id = c.id
        AND us.type = 'OFFERED'
        AND lower(st.name) IN (SELECT tag_name FROM mine WHERE type = 'WANTED')
    )
  FROM candidates c
  ORDER BY c.name NULLS LAST;
END;
$$;

-- ============================================================
-- 8. Marketplace feed: every other profile with its skill tags,
--    direct-match flag computed against the CALLER, optional
--    free-text search over name / bio / tag names.
--    Flagged profiles are hidden.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_marketplace_feed(
  p_search text DEFAULT NULL,
  p_limit  integer DEFAULT 60
)
RETURNS TABLE (
  profile_id      uuid,
  name            text,
  bio             text,
  offered         text[],
  wanted          text[],
  is_direct_match boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_q    text := NULLIF(btrim(coalesce(p_search, '')), '');
  v_lim  integer := LEAST(GREATEST(coalesce(p_limit, 60), 1), 200);
BEGIN
  RETURN QUERY
  WITH mine AS (
    SELECT us.type, lower(st.name) AS tag_name
    FROM public.user_skills us
    JOIN public.skill_tags st ON st.id = us.tag_id
    WHERE us.user_id = v_uid
  )
  SELECT
    p.id,
    p.name,
    p.bio,
    coalesce(
      (SELECT array_agg(st.name ORDER BY st.name)
       FROM public.user_skills us
       JOIN public.skill_tags st ON st.id = us.tag_id
       WHERE us.user_id = p.id AND us.type = 'OFFERED'),
      '{}'::text[]
    ),
    coalesce(
      (SELECT array_agg(st.name ORDER BY st.name)
       FROM public.user_skills us
       JOIN public.skill_tags st ON st.id = us.tag_id
       WHERE us.user_id = p.id AND us.type = 'WANTED'),
      '{}'::text[]
    ),
    (EXISTS (
        SELECT 1 FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id AND us.type = 'OFFERED'
          AND EXISTS (SELECT 1 FROM mine m
                      WHERE m.type = 'WANTED' AND m.tag_name = lower(st.name))
      )
      AND EXISTS (
        SELECT 1 FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id AND us.type = 'WANTED'
          AND EXISTS (SELECT 1 FROM mine m
                      WHERE m.type = 'OFFERED' AND m.tag_name = lower(st.name))
      )
    ) AND v_uid IS NOT NULL
  FROM public.profiles p
  WHERE p.flagged = false
    AND (v_uid IS NULL OR p.id <> v_uid)
    AND (
      v_q IS NULL
      OR p.name ILIKE '%' || v_q || '%'
      OR coalesce(p.bio, '') ILIKE '%' || v_q || '%'
      OR EXISTS (
        SELECT 1 FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id AND st.name ILIKE '%' || v_q || '%'
      )
    )
  ORDER BY 6 DESC, p.name NULLS LAST
  LIMIT v_lim;
END;
$$;

-- ============================================================
-- 9. Create (or fetch) a skill tag, case-insensitively.
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_skill_tag(p_name text, p_category text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_id   bigint;
BEGIN
  v_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');

  IF length(v_name) < 2 OR length(v_name) > 60 THEN
    RAISE EXCEPTION 'Skill names must be between 2 and 60 characters'
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_id
  FROM public.skill_tags
  WHERE lower(name) = lower(v_name)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  BEGIN
    INSERT INTO public.skill_tags (name, category)
    VALUES (v_name, NULLIF(btrim(coalesce(p_category, '')), ''))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- lost a race against a concurrent insert of the same skill
    SELECT id INTO v_id
    FROM public.skill_tags
    WHERE lower(name) = lower(v_name)
    LIMIT 1;
  END;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 10. Moderation RPCs (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.flag_user(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.is_admin
     ) THEN
    RAISE EXCEPTION 'Only administrators can flag users'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot flag yourself' USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
  SET flagged = true,
      flag_reason = NULLIF(btrim(coalesce(p_reason, '')), '')
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '23503';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unflag_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.is_admin
     ) THEN
    RAISE EXCEPTION 'Only administrators can unflag users'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET flagged = false,
      flag_reason = NULL
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '23503';
  END IF;
END;
$$;

-- ============================================================
-- 11. Views
-- ============================================================

-- Public-safe profile projection (NO email) for chat headers,
-- session lists, marketplace cards. View executes with the
-- owner's rights => bypasses own-row RLS by design.
CREATE VIEW public.profile_directory AS
  SELECT id, name, bio, created_at
  FROM public.profiles;

-- Admin moderation board. Returns zero rows for non-admins:
-- the EXISTS filter is evaluated with the view owner's rights,
-- while auth.uid() still resolves the caller's JWT sub.
CREATE VIEW public.admin_user_flags AS
  SELECT
    p.id,
    p.name,
    p.email,
    p.bio,
    p.flagged,
    p.flag_reason,
    p.created_at,
    coalesce(r.avg_rating, 0)::numeric(3, 2) AS avg_rating,
    coalesce(r.review_count, 0)::bigint        AS review_count
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

-- ============================================================
-- 12. Privileges
-- ============================================================

-- Tables: make grants explicit (RLS scopes the rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles      TO authenticated;
GRANT SELECT                           ON public.skill_tags  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews       TO authenticated;

REVOKE ALL ON public.allowed_email_domains FROM PUBLIC, anon, authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON public.profile_directory  TO authenticated;
GRANT SELECT ON public.admin_user_flags   TO authenticated;

-- Functions: RPCs are for signed-in users only.
REVOKE ALL ON FUNCTION public.get_reciprocal_matches(uuid)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_marketplace_feed(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_skill_tag(text, text)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.flag_user(uuid, text)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unflag_user(uuid)               FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_reciprocal_matches(uuid)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_marketplace_feed(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_skill_tag(text, text)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.flag_user(uuid, text)           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unflag_user(uuid)               TO authenticated, service_role;
