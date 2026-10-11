-- ============================================================
-- SkillGRID — 20261011000002_session_agenda.sql
--
-- The call agenda: a small shared to-do list per session, so the
-- two participants can agree what the swap will actually cover
-- before they join — and tick items off as they go.
--
-- ADDITIVE: one new table, no existing column or row is touched.
-- Visibility mirrors `messages` exactly: only the two named
-- participants of that session can read or write it.
-- ============================================================

-- ============================================================
-- 1. The table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text NOT NULL,
  done        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_todos_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 200)
);

COMMENT ON TABLE public.session_todos IS
  'Shared call agenda: to-do items for one session, editable by both participants.';

CREATE INDEX IF NOT EXISTS session_todos_session_id_idx
  ON public.session_todos (session_id, created_at);

ALTER TABLE public.session_todos ENABLE ROW LEVEL SECURITY;

-- Tables: make grants explicit (RLS scopes the rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_todos TO authenticated;

-- ============================================================
-- 2. Policies — the two participants only
--
-- Read and delete are participant-scoped; INSERT additionally
-- pins `created_by` to the caller, so an item can never be
-- attributed to the other person.
--
-- UPDATE is deliberately participant-scoped rather than
-- author-scoped: ticking off a to-do *the other person added* is
-- the whole point of a shared agenda. `created_by` is protected
-- by the trigger below instead.
-- ============================================================
DROP POLICY IF EXISTS session_todos_select_participant ON public.session_todos;
CREATE POLICY session_todos_select_participant
  ON public.session_todos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS session_todos_insert_participant ON public.session_todos;
CREATE POLICY session_todos_insert_participant
  ON public.session_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS session_todos_update_participant ON public.session_todos;
CREATE POLICY session_todos_update_participant
  ON public.session_todos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS session_todos_delete_participant ON public.session_todos;
CREATE POLICY session_todos_delete_participant
  ON public.session_todos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.requester_id = (select auth.uid()) OR s.provider_id = (select auth.uid()))
    )
  );

-- ============================================================
-- 3. A to-do cannot change hands or move sessions
--
-- Without this, the participant-scoped UPDATE policy would let one
-- participant rewrite `created_by` and blame the other.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_session_todo_author()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'A to-do keeps its session, author and creation time'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS session_todos_protect_author ON public.session_todos;
CREATE TRIGGER session_todos_protect_author
  BEFORE UPDATE ON public.session_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_session_todo_author();

REVOKE EXECUTE ON FUNCTION public.protect_session_todo_author() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. Live updates
--
-- Both participants see the agenda change as it happens, which
-- matters when they are on the call together. Realtime still
-- enforces the SELECT policy above.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE NOTICE 'publication supabase_realtime not found; skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_todos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_todos;
  END IF;
END
$$;
