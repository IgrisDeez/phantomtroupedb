-- Shared admin activity log for Phantom DB.
-- Apply after schema.sql and rls.sql.
-- This table is append-only from the app. Run this manually in Supabase SQL Editor.

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  actor_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  actor_discord_id text default private.current_discord_id(),
  actor_role text not null default '',
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_guild_created_idx
  on public.admin_activity_log (guild_id, created_at desc);

create index if not exists admin_activity_log_actor_created_idx
  on public.admin_activity_log (actor_user_id, created_at desc);

alter table public.admin_activity_log enable row level security;

grant select, insert on public.admin_activity_log to authenticated;

drop policy if exists "officers read admin activity log" on public.admin_activity_log;
create policy "officers read admin activity log"
on public.admin_activity_log
for select
to authenticated
using (private.is_current_user_officer());

drop policy if exists "officers insert admin activity log" on public.admin_activity_log;
create policy "officers insert admin activity log"
on public.admin_activity_log
for insert
to authenticated
with check (private.is_current_user_officer());

-- Keep audit rows append-only from the app.
-- Do not create update/delete policies for normal authenticated users.
-- Delete old rows manually from Supabase SQL Editor only if needed.
