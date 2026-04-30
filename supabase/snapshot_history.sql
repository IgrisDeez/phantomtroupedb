-- Snapshot history import support for Phantom DB.
-- Apply after schema.sql and rls.sql.

alter table public.guild_settings
  add column if not exists tracked_guild_name text not null default 'Phantom Troupe',
  add column if not exists tracked_guild_aliases text not null default 'PhantomTroupe
Phantom troupe
PHANTOM TROUPE',
  add column if not exists guild_timezone text not null default 'Asia/Taipei';

create table if not exists public.snapshot_history (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  snapshot_number integer not null check (snapshot_number > 0),
  timestamp_text text not null default '',
  captured_at timestamptz,
  rank integer check (rank is null or rank > 0),
  guild text not null,
  normalized_guild text not null,
  points integer not null check (points >= 0),
  raw_line text not null default '',
  raw_import_text text not null default '',
  saved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, snapshot_number, normalized_guild)
);

create index if not exists snapshot_history_guild_snapshot_idx
  on public.snapshot_history (guild_id, snapshot_number);

alter table public.snapshot_history
  add column if not exists captured_at timestamptz;

alter table public.snapshot_history enable row level security;

drop policy if exists "public read snapshot history" on public.snapshot_history;
create policy "public read snapshot history"
on public.snapshot_history
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert snapshot history" on public.snapshot_history;
create policy "officer insert snapshot history"
on public.snapshot_history
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update snapshot history" on public.snapshot_history;
create policy "officer update snapshot history"
on public.snapshot_history
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete snapshot history" on public.snapshot_history;
create policy "officer delete snapshot history"
on public.snapshot_history
for delete
to authenticated
using (private.is_current_user_officer());
