-- ============================================================
-- SkillGRID — 20261011000001_avatars.sql
--
-- Profile pictures. ADDITIVE: no column is dropped, no row is
-- rewritten, and every existing session keeps its status.
--
--   1. profiles.avatar_url — the public URL of a member's picture.
--   2. A public `avatars` Storage bucket that a member may only
--      write inside their own `<user id>/` folder.
--   3. The three discovery RPCs now return avatar_url, so other
--      members' pictures show up in the marketplace, in matches,
--      and wherever a partner is looked up by id.
--
-- Note: the RPCs are dropped and recreated because Postgres will
-- not let CREATE OR REPLACE change a function's return type. That
-- drops their grants too, so each is re-granted below.
-- ============================================================

-- ============================================================
-- 1. The column
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS
  'Public URL of the member''s profile picture in the avatars Storage bucket.';

-- ============================================================
-- 2. Storage bucket + policies
--
-- Objects are public to read (they are shown to other members) but
-- only the owner can write, and only under their own top-level
-- folder. The client always uploads to `avatars/<auth uid>/...`.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 3. get_profile_directory() gains avatar_url
-- ============================================================
DROP FUNCTION IF EXISTS public.get_profile_directory(uuid[]);

CREATE FUNCTION public.get_profile_directory(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id         uuid,
  name       text,
  bio        text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.bio, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p_ids IS NULL OR p.id = ANY (p_ids);
$$;

REVOKE ALL ON FUNCTION public.get_profile_directory(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_directory(uuid[]) TO authenticated, service_role;

-- ============================================================
-- 4. get_marketplace_feed() gains avatar_url
--    (logic unchanged from 20261010000001)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_marketplace_feed(text, text, text, boolean, text, integer, integer);

CREATE FUNCTION public.get_marketplace_feed(
  p_search      text    DEFAULT NULL,
  p_offered     text    DEFAULT NULL,
  p_wanted      text    DEFAULT NULL,
  p_only_direct boolean DEFAULT false,
  p_format      text    DEFAULT NULL,
  p_limit       integer DEFAULT 60,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  profile_id      uuid,
  name            text,
  headline        text,
  bio             text,
  avatar_url      text,
  offered         text[],
  wanted          text[],
  session_format  text,
  is_direct_match boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid    := auth.uid();
  v_q    text    := NULLIF(btrim(coalesce(p_search, '')), '');
  v_off  text    := NULLIF(btrim(coalesce(p_offered, '')), '');
  v_want text    := NULLIF(btrim(coalesce(p_wanted, '')), '');
  v_fmt  text    := NULLIF(btrim(coalesce(p_format, '')), '');
  v_lim  integer := LEAST(GREATEST(coalesce(p_limit, 60), 1), 200);
  v_off_skip integer := GREATEST(coalesce(p_offset, 0), 0);
BEGIN
  RETURN QUERY
  WITH mine AS (
    SELECT us.type, lower(st.name) AS tag_name
    FROM public.user_skills us
    JOIN public.skill_tags st ON st.id = us.tag_id
    WHERE us.user_id = v_uid
  ),
  cand AS (
    SELECT p.id, p.name, p.headline, p.bio, p.avatar_url, p.session_format
    FROM public.profiles p
    WHERE p.flagged = false
      AND (v_uid IS NULL OR p.id <> v_uid)
      AND (v_uid IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = v_uid AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = v_uid)
      ))
      AND (
        v_q IS NULL
        OR p.name ILIKE '%' || v_q || '%'
        OR coalesce(p.bio, '') ILIKE '%' || v_q || '%'
        OR coalesce(p.headline, '') ILIKE '%' || v_q || '%'
        OR EXISTS (
          SELECT 1 FROM public.user_skills us
          JOIN public.skill_tags st ON st.id = us.tag_id
          WHERE us.user_id = p.id AND st.name ILIKE '%' || v_q || '%'
        )
      )
      AND (v_off IS NULL OR EXISTS (
        SELECT 1 FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id AND us.type = 'OFFERED' AND st.name ILIKE '%' || v_off || '%'
      ))
      AND (v_want IS NULL OR EXISTS (
        SELECT 1 FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id AND us.type = 'WANTED' AND st.name ILIKE '%' || v_want || '%'
      ))
      AND (v_fmt IS NULL OR p.session_format = v_fmt)
  ),
  scored AS (
    SELECT
      c.*,
      (v_uid IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.user_skills us
         JOIN public.skill_tags st ON st.id = us.tag_id
         WHERE us.user_id = c.id AND us.type = 'OFFERED'
           AND EXISTS (SELECT 1 FROM mine m WHERE m.type = 'WANTED' AND m.tag_name = lower(st.name))
       )
       AND EXISTS (
         SELECT 1 FROM public.user_skills us
         JOIN public.skill_tags st ON st.id = us.tag_id
         WHERE us.user_id = c.id AND us.type = 'WANTED'
           AND EXISTS (SELECT 1 FROM mine m WHERE m.type = 'OFFERED' AND m.tag_name = lower(st.name))
       )
      ) AS is_direct_match
    FROM cand c
  )
  SELECT
    s.id,
    s.name,
    s.headline,
    s.bio,
    s.avatar_url,
    coalesce(
      (SELECT array_agg(st.name ORDER BY st.name)
       FROM public.user_skills us
       JOIN public.skill_tags st ON st.id = us.tag_id
       WHERE us.user_id = s.id AND us.type = 'OFFERED'),
      '{}'::text[]
    ),
    coalesce(
      (SELECT array_agg(st.name ORDER BY st.name)
       FROM public.user_skills us
       JOIN public.skill_tags st ON st.id = us.tag_id
       WHERE us.user_id = s.id AND us.type = 'WANTED'),
      '{}'::text[]
    ),
    s.session_format,
    s.is_direct_match
  FROM scored s
  WHERE (NOT p_only_direct) OR s.is_direct_match
  ORDER BY s.is_direct_match DESC, s.name NULLS LAST
  LIMIT v_lim OFFSET v_off_skip;
END $$;

REVOKE ALL ON FUNCTION public.get_marketplace_feed(text, text, text, boolean, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_feed(text, text, text, boolean, text, integer, integer) TO authenticated, service_role;

-- ============================================================
-- 5. get_reciprocal_matches() gains partner_avatar_url
--    (logic unchanged from 20261010000001)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_reciprocal_matches(uuid);

CREATE FUNCTION public.get_reciprocal_matches(p_user_id uuid)
RETURNS TABLE (
  partner_id          uuid,
  partner_name        text,
  partner_bio         text,
  partner_avatar_url  text,
  skills_you_teach    text[],
  skills_you_gain     text[]
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
    SELECT p.id, p.name, p.bio, p.avatar_url
    FROM public.profiles p
    WHERE p.id <> p_user_id
      AND p.flagged = false
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = p_user_id AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = p_user_id)
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_skills us
        JOIN public.skill_tags st ON st.id = us.tag_id
        WHERE us.user_id = p.id
          AND us.type = 'OFFERED'
          AND EXISTS (SELECT 1 FROM mine m
                      WHERE m.type = 'WANTED' AND m.tag_name = lower(st.name))
      )
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
    c.avatar_url,
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
END $$;

REVOKE ALL ON FUNCTION public.get_reciprocal_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reciprocal_matches(uuid) TO authenticated, service_role;
