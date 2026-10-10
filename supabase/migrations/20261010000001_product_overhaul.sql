-- ============================================================
-- SkillGRID — 20261010000001_product_overhaul.sql
--
-- Product overhaul. ADDITIVE and non-destructive: no column is
-- dropped, no row is rewritten, and every existing session keeps
-- its current status.
--
-- Adds:
--   1. Profile onboarding fields (headline, timezone, format).
--   2. Session clarity: a DECLINED terminal state distinct from
--      CANCELLED, the agreed skills for the exchange, the proposal
--      message, and response/completion timestamps.
--   3. In-app notifications (+ triggers, idempotent per event).
--   4. Blocking (block/unblock) wired into discovery.
--   5. Reporting (member reports; admin review RPC).
--   6. Validated session RPCs (propose / respond / cancel / complete)
--      so the backend — not the client — owns the state machine.
--   7. Block-aware, filterable marketplace feed.
--
-- Session lifecycle (documented, see README §6):
--   PENDING  -> ACCEPTED | DECLINED | CANCELLED
--   ACCEPTED -> COMPLETED | CANCELLED
--   DECLINED / COMPLETED / CANCELLED are terminal.
-- ============================================================

-- ============================================================
-- 1. Profile onboarding fields
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline       text,
  ADD COLUMN IF NOT EXISTS timezone       text,
  ADD COLUMN IF NOT EXISTS session_format text NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN IF NOT EXISTS availability   text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_session_format_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_session_format_check
  CHECK (session_format IN ('ONLINE', 'IN_PERSON', 'EITHER'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_headline_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_headline_check
  CHECK (headline IS NULL OR length(headline) <= 120);

-- ============================================================
-- 2. Sessions: agreed skills, proposal message, timestamps,
--    and the DECLINED terminal status.
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS teach_tag_id     bigint REFERENCES public.skill_tags (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learn_tag_id     bigint REFERENCES public.skill_tags (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_message text,
  ADD COLUMN IF NOT EXISTS decline_reason   text,
  ADD COLUMN IF NOT EXISTS responded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by     uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

-- Replace the status CHECK constraint (drop by introspection so the
-- migration does not depend on the auto-generated constraint name).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'sessions'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.sessions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED'));

-- A pair may not hold two *active* bookings for the same instant, but a
-- slot that was declined or cancelled must be re-proposable.
DROP INDEX IF EXISTS public.idx_sessions_pair_slot;
CREATE UNIQUE INDEX idx_sessions_pair_slot
  ON public.sessions (requester_id, provider_id, scheduled_at)
  WHERE status IN ('PENDING', 'ACCEPTED') AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_teach_tag ON public.sessions (teach_tag_id);
CREATE INDEX IF NOT EXISTS idx_sessions_learn_tag ON public.sessions (learn_tag_id);

-- The original transition trigger (20261006000003) predates DECLINED and
-- would reject PENDING -> DECLINED as an invalid transition. Re-declare it
-- here (append-only: the original file is already applied) to teach the
-- state machine the new DECLINED terminal state. The trigger
-- sessions_status_rules already points at this function name, so replacing
-- the body is enough.
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

  IF OLD.status IN ('COMPLETED', 'CANCELLED', 'DECLINED') THEN
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

  IF OLD.status = 'PENDING' AND NEW.status = 'DECLINED' THEN
    IF v_uid <> OLD.provider_id THEN
      RAISE EXCEPTION 'Only the provider can decline a session'
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

-- ============================================================
-- 3. Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN (
               'SESSION_PROPOSED', 'SESSION_ACCEPTED', 'SESSION_DECLINED',
               'SESSION_CANCELLED', 'SESSION_COMPLETED', 'REVIEW_RECEIVED')),
  title      text NOT NULL,
  body       text,
  session_id uuid REFERENCES public.sessions (id) ON DELETE CASCADE,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: one notification of a given kind per recipient per session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event
  ON public.notifications (user_id, kind, session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- read_at may be set by the recipient; content is otherwise immutable
-- in practice (no insert policy => rows only arrive via SECURITY DEFINER
-- triggers below).
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 3a. Session events -> notifications
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor  uuid := auth.uid();
  v_target uuid;
  v_kind   text;
  v_title  text;
  v_body   text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'PENDING' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, session_id)
      VALUES (
        NEW.provider_id,
        'SESSION_PROPOSED',
        'New session proposal',
        COALESCE(NULLIF(btrim(NEW.proposal_message), ''),
                 'A member proposed a 1:1 exchange with you.'),
        NEW.id
      )
      ON CONFLICT (user_id, kind, session_id) WHERE session_id IS NOT NULL DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'ACCEPTED' THEN
    v_target := NEW.requester_id; v_kind := 'SESSION_ACCEPTED';
    v_title := 'Session accepted'; v_body := 'Your proposal was accepted.';
  ELSIF NEW.status = 'DECLINED' THEN
    v_target := NEW.requester_id; v_kind := 'SESSION_DECLINED';
    v_title := 'Session declined';
    v_body := COALESCE(NULLIF(btrim(NEW.decline_reason), ''), 'Your proposal was declined.');
  ELSIF NEW.status = 'COMPLETED' THEN
    v_target := CASE WHEN v_actor = NEW.requester_id THEN NEW.provider_id ELSE NEW.requester_id END;
    v_kind := 'SESSION_COMPLETED'; v_title := 'Session completed';
    v_body := 'Leave a review to close the loop.';
  ELSIF NEW.status = 'CANCELLED' THEN
    v_target := CASE WHEN v_actor = NEW.requester_id THEN NEW.provider_id ELSE NEW.requester_id END;
    v_kind := 'SESSION_CANCELLED'; v_title := 'Session cancelled'; v_body := NULL;
  END IF;

  IF v_target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, session_id)
    VALUES (v_target, v_kind, v_title, v_body, NEW.id)
    ON CONFLICT (user_id, kind, session_id) WHERE session_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sessions_notify ON public.sessions;
CREATE TRIGGER sessions_notify
  AFTER INSERT OR UPDATE OF status ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_session_change();

REVOKE EXECUTE ON FUNCTION public.notify_session_change() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3b. Reviews -> notification
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, session_id)
  VALUES (NEW.reviewee_id, 'REVIEW_RECEIVED', 'You received a review',
          'A session partner left you feedback.', NEW.session_id)
  ON CONFLICT (user_id, kind, session_id) WHERE session_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reviews_notify ON public.reviews;
CREATE TRIGGER reviews_notify
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review();

REVOKE EXECUTE ON FUNCTION public.notify_review() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3c. Keep notification content immutable (recipient may only
--     flip read_at). Without this the UPDATE policy would let a
--     recipient rewrite titles/bodies.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_notification_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id    IS DISTINCT FROM OLD.user_id
     OR NEW.kind       IS DISTINCT FROM OLD.kind
     OR NEW.title      IS DISTINCT FROM OLD.title
     OR NEW.body       IS DISTINCT FROM OLD.body
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the read state of a notification can be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notifications_protect_content ON public.notifications;
CREATE TRIGGER notifications_protect_content
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_notification_content();

REVOKE EXECUTE ON FUNCTION public.protect_notification_content() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3d. Stamp session lifecycle timestamps
-- ------------------------------------------------------------
-- responded_at / completed_at / completed_by are set whenever the
-- status moves through the state machine, regardless of whether the
-- change came from an RPC or a direct PATCH.
-- ============================================================
CREATE OR REPLACE FUNCTION public.stamp_session_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('ACCEPTED', 'DECLINED') THEN
      NEW.responded_at := COALESCE(NEW.responded_at, now());
    ELSIF NEW.status = 'COMPLETED' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sessions_stamp_timestamps ON public.sessions;
CREATE TRIGGER sessions_stamp_timestamps
  BEFORE UPDATE OF status ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_session_timestamps();

REVOKE EXECUTE ON FUNCTION public.stamp_session_timestamps() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3e. Participants are immutable after creation.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_session_participants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'Session participants cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sessions_protect_participants ON public.sessions;
CREATE TRIGGER sessions_protect_participants
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_session_participants();

REVOKE EXECUTE ON FUNCTION public.protect_session_participants() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. Blocking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_distinct CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocks_select_own ON public.blocks;
CREATE POLICY blocks_select_own
  ON public.blocks FOR SELECT
  TO authenticated
  USING (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS blocks_insert_own ON public.blocks;
CREATE POLICY blocks_insert_own
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS blocks_delete_own ON public.blocks;
CREATE POLICY blocks_delete_own
  ON public.blocks FOR DELETE
  TO authenticated
  USING (blocker_id = (select auth.uid()));

-- ============================================================
-- 5. Reporting
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  session_id  uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'DISMISSED')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_distinct CHECK (reporter_id <> reported_id)
);

-- One open report per reporter -> reported member per session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_open
  ON public.reports (reporter_id, reported_id, COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports (reported_id, status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reporters see their own reports; everyone else (incl. the reported
-- member) sees nothing. Admins read through get_reports().
DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

-- ============================================================
-- 6. Validated session RPCs (backend owns the state machine)
-- ============================================================
CREATE OR REPLACE FUNCTION public.propose_session(
  p_provider        uuid,
  p_scheduled_at    timestamptz,
  p_duration_minutes integer DEFAULT 60,
  p_teach_tag_id    bigint  DEFAULT NULL,
  p_learn_tag_id    bigint  DEFAULT NULL,
  p_message         text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_provider IS NULL OR p_provider = v_uid THEN
    RAISE EXCEPTION 'Choose another member to propose to' USING ERRCODE = '22023';
  END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'Choose a time in the future' USING ERRCODE = '22007';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 15 OR p_duration_minutes > 480 THEN
    RAISE EXCEPTION 'Duration must be between 15 and 480 minutes' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_provider) THEN
    RAISE EXCEPTION 'That member no longer exists' USING ERRCODE = '23503';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_provider AND flagged) THEN
    RAISE EXCEPTION 'That member is not available for proposals' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = v_uid AND b.blocked_id = p_provider)
       OR (b.blocker_id = p_provider AND b.blocked_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'You cannot propose a session with this member' USING ERRCODE = '42501';
  END IF;

  IF p_teach_tag_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_skills us
    WHERE us.user_id = v_uid AND us.tag_id = p_teach_tag_id AND us.type = 'OFFERED'
  ) THEN
    RAISE EXCEPTION 'You can only offer to teach a skill you have listed' USING ERRCODE = '22023';
  END IF;
  IF p_learn_tag_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_skills us
    WHERE us.user_id = p_provider AND us.tag_id = p_learn_tag_id AND us.type = 'OFFERED'
  ) THEN
    RAISE EXCEPTION 'Your partner does not offer that skill' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sessions (
    requester_id, provider_id, status, scheduled_at, duration_minutes,
    teach_tag_id, learn_tag_id, proposal_message
  ) VALUES (
    v_uid, p_provider, 'PENDING', p_scheduled_at, p_duration_minutes,
    p_teach_tag_id, p_learn_tag_id, NULLIF(btrim(coalesce(p_message, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.respond_session(
  p_session_id uuid,
  p_accept     boolean,
  p_reason     text DEFAULT NULL
)
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

  UPDATE public.sessions
  SET status         = CASE WHEN p_accept THEN 'ACCEPTED' ELSE 'DECLINED' END,
      decline_reason = CASE WHEN p_accept THEN NULL
                            ELSE NULLIF(btrim(coalesce(p_reason, '')), '') END
  WHERE id = p_session_id
    AND provider_id = v_uid
    AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This proposal is no longer awaiting your response' USING ERRCODE = '23514';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id uuid)
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

  UPDATE public.sessions
  SET status = 'CANCELLED'
  WHERE id = p_session_id
    AND status IN ('PENDING', 'ACCEPTED')
    AND v_uid IN (requester_id, provider_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This session can no longer be cancelled' USING ERRCODE = '23514';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.complete_session(p_session_id uuid)
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

  UPDATE public.sessions
  SET status = 'COMPLETED'
  WHERE id = p_session_id
    AND status = 'ACCEPTED'
    AND v_uid IN (requester_id, provider_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This session is not ready to be completed' USING ERRCODE = '23514';
  END IF;
END $$;

-- ============================================================
-- 7. Moderation: reports RPCs (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_reports()
RETURNS TABLE (
  id          bigint,
  reporter_id uuid,
  reporter_name text,
  reported_id uuid,
  reported_name text,
  reason      text,
  session_id  uuid,
  status      text,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.reporter_id, rp.name, r.reported_id, dp.name,
    r.reason, r.session_id, r.status, r.created_at
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles dp ON dp.id = r.reported_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles a WHERE a.id = auth.uid() AND a.is_admin
  )
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles a WHERE a.id = auth.uid() AND a.is_admin
  ) THEN
    RAISE EXCEPTION 'Only administrators can resolve reports' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('OPEN', 'REVIEWED', 'DISMISSED') THEN
    RAISE EXCEPTION 'Unknown report status' USING ERRCODE = '22023';
  END IF;
  UPDATE public.reports SET status = p_status WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = '23503';
  END IF;
END $$;

-- ============================================================
-- 8. Discovery: block-aware, filterable marketplace feed
-- ============================================================
DROP FUNCTION IF EXISTS public.get_marketplace_feed(text, integer);

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
    SELECT p.id, p.name, p.headline, p.bio, p.session_format
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

-- Reciprocal matching: same rule as before, now block-aware.
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

-- Offered skills of a member as id+name options. Needed by the propose
-- modal, which cannot read another member's user_skills rows directly
-- (that table is own-row RLS). Only non-flagged members are exposed, and
-- only the OFFERED list — the same information the feed already shows.
CREATE OR REPLACE FUNCTION public.get_member_offered_skills(p_user_id uuid)
RETURNS TABLE (
  id   bigint,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT st.id, st.name
  FROM public.user_skills us
  JOIN public.skill_tags st ON st.id = us.tag_id
  JOIN public.profiles p ON p.id = us.user_id
  WHERE us.user_id = p_user_id
    AND us.type = 'OFFERED'
    AND p.flagged = false
  ORDER BY st.name;
$$;

-- ============================================================
-- 9. Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, DELETE          ON public.blocks        TO authenticated;
GRANT SELECT, INSERT                  ON public.reports       TO authenticated;

REVOKE ALL ON FUNCTION public.propose_session(uuid, timestamptz, integer, bigint, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_session(uuid, boolean, text)                              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_session(uuid)                                              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_session(uuid)                                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_reports()                                                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_report(bigint, text)                                      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.propose_session(uuid, timestamptz, integer, bigint, bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_session(uuid, boolean, text)                              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_session(uuid)                                              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_session(uuid)                                            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reports()                                                     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_report(bigint, text)                                      TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_marketplace_feed(text, text, text, boolean, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_feed(text, text, text, boolean, text, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_member_offered_skills(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_offered_skills(uuid) TO authenticated, service_role;
