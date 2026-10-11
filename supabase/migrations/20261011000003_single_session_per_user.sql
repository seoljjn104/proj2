-- Single session per user: track active sessions and revoke old ones on new login
-- Migration: 20261011000003_single_session_per_user.sql

create extension if not exists pgcrypto;

create table if not exists public.user_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      text not null,                      -- Supabase auth session ID (access token jti or refresh token)
  user_agent      text,
  ip_address      inet,
  created_at      timestamptz not null default now(),
  last_activity   timestamptz not null default now(),
  revoked_at      timestamptz,
  constraint user_sessions_user_id_session_id_key unique (user_id, session_id)
);

create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);
create index if not exists user_sessions_revoked_idx on public.user_sessions (revoked_at) where revoked_at is null;

alter table public.user_sessions enable row level security;

-- Users can only see their own sessions
create policy user_sessions_select_own
  on public.user_sessions for select
  using (user_id = auth.uid());

-- System (service role) can insert/update/delete; users cannot directly manipulate
-- The auth flow will use service-role or a SECURITY DEFINER function

-- Function to register a new session and revoke old ones for the same user
create or replace function public.register_user_session(
  p_user_id uuid,
  p_session_id text,
  p_user_agent text default null,
  p_ip_address inet default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Revoke all other active sessions for this user
  update public.user_sessions
  set revoked_at = now()
  where user_id = p_user_id
    and revoked_at is null
    and session_id <> p_session_id;

  -- Insert the new session
  insert into public.user_sessions (user_id, session_id, user_agent, ip_address)
  values (p_user_id, p_session_id, p_user_agent, p_ip_address)
  on conflict (user_id, session_id) do update
    set last_activity = now(), revoked_at = null;
end;
$$;

-- Function to revoke a specific session (on sign-out)
create or replace function public.revoke_user_session(
  p_user_id uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_sessions
  set revoked_at = now()
  where user_id = p_user_id
    and session_id = p_session_id
    and revoked_at is null;
end;
$$;

-- Function to check if a session is still valid (not revoked)
create or replace function public.is_session_valid(
  p_user_id uuid,
  p_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revoked timestamptz;
begin
  select revoked_at into v_revoked
  from public.user_sessions
  where user_id = p_user_id
    and session_id = p_session_id;
  
  return v_revoked is null;
end;
$$;

-- Function to revoke all sessions for a user (admin or security action)
create or replace function public.revoke_all_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_sessions
  set revoked_at = now()
  where user_id = p_user_id
    and revoked_at is null;
end;
$$;

-- Grant execute to authenticated users (they call these via the app)
grant execute on function public.register_user_session to authenticated;
grant execute on function public.revoke_user_session to authenticated;
grant execute on function public.is_session_valid to authenticated;
grant execute on function public.revoke_all_user_sessions to authenticated;

-- Add to realtime publication for live session tracking (optional)
alter publication supabase_realtime add table public.user_sessions;