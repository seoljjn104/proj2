-- ============================================================
-- SkillGRID — 000001_schema.sql
-- Tables, constraints, indexes.
-- Additions beyond the core spec (documented in README):
--   * profiles.is_admin / flagged / flag_reason  -> moderation (spec 5)
--   * sessions.duration_minutes                  -> overlap checks need an end time
--   * UNIQUE(user_id, tag_id, type)              -> no duplicate skill rows
--   * UNIQUE(session_id, reviewer_id)            -> one review per reviewer per session
--   * allowed_email_domains                     -> institutional email allowlist
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name        text,
  email       text,
  bio         text,
  is_admin    boolean NOT NULL DEFAULT false,
  flagged     boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'One row per auth user. Created automatically by trigger on auth.users.';

-- ------------------------------------------------------------
-- skill_tags (catalog of teachable/wanted skills)
-- ------------------------------------------------------------
CREATE TABLE public.skill_tags (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     text NOT NULL UNIQUE,
  category text
);

-- ------------------------------------------------------------
-- user_skills (OFFERED / WANTED tags per user)
-- ------------------------------------------------------------
CREATE TABLE public.user_skills (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tag_id  bigint NOT NULL REFERENCES public.skill_tags (id) ON DELETE RESTRICT,
  type    text NOT NULL CHECK (type IN ('OFFERED', 'WANTED')),
  CONSTRAINT user_skills_unique UNIQUE (user_id, tag_id, type)
);

-- ------------------------------------------------------------
-- sessions (direct 1:1 only: requester <-> provider)
-- ------------------------------------------------------------
CREATE TABLE public.sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  provider_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED')),
  scheduled_at     timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  meeting_link     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_distinct_parties CHECK (requester_id <> provider_id)
);

-- ------------------------------------------------------------
-- messages (chat scoped to a session)
-- ------------------------------------------------------------
CREATE TABLE public.messages (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- reviews (post-session ratings)
-- ------------------------------------------------------------
CREATE TABLE public.reviews (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_distinct_parties CHECK (reviewer_id <> reviewee_id),
  CONSTRAINT reviews_unique UNIQUE (session_id, reviewer_id)
);

-- ------------------------------------------------------------
-- allowed_email_domains (institutional allowlist)
-- Empty table => every domain is accepted (dev default).
-- ------------------------------------------------------------
CREATE TABLE public.allowed_email_domains (
  domain     text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Matching engine: reciprocal skill lookups
CREATE INDEX idx_user_skills_user        ON public.user_skills (user_id);
CREATE INDEX idx_user_skills_tag_type    ON public.user_skills (tag_id, type);
CREATE INDEX idx_user_skills_type_tag    ON public.user_skills (type, tag_id);

-- Sessions: participant lookups + overlap scans
CREATE INDEX idx_sessions_requester      ON public.sessions (requester_id, status);
CREATE INDEX idx_sessions_provider       ON public.sessions (provider_id, status);
CREATE INDEX idx_sessions_scheduled      ON public.sessions (scheduled_at);

-- A given pair cannot book the exact same slot twice
CREATE UNIQUE INDEX idx_sessions_pair_slot
  ON public.sessions (requester_id, provider_id, scheduled_at);

-- Chat: ordered reads per session
CREATE INDEX idx_messages_session        ON public.messages (session_id, created_at);
CREATE INDEX idx_messages_sender         ON public.messages (sender_id);

-- Reviews: rating aggregation per user
CREATE INDEX idx_reviews_reviewee        ON public.reviews (reviewee_id);
CREATE INDEX idx_reviews_reviewer        ON public.reviews (reviewer_id);
CREATE INDEX idx_reviews_session         ON public.reviews (session_id);

-- Skill catalog browsing
CREATE INDEX idx_skill_tags_category     ON public.skill_tags (category);

-- Matching compares tag names case-insensitively ('Python' = 'python'),
-- so the catalog must never contain case-duplicates.
CREATE UNIQUE INDEX idx_skill_tags_name_lower ON public.skill_tags (lower(name));
