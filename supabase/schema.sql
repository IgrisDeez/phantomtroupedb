-- Phantom Troupe Guild Tracker - Phase 2 schema
-- Apply this in Supabase before rls.sql.
-- This phase only prepares shared tables; the app remains localStorage-only until later phases.

create extension if not exists pgcrypto;

create table if not exists public.guild_settings (
  id text primary key default 'phantom-troupe',
  guild_name text not null default 'Phantom Troupe',
  guild_display_name text not null default 'Phantom Troupe',
  tracked_guild_name text not null default 'Phantom Troupe',
  tracked_guild_aliases text not null default 'PhantomTroupe
Phantom troupe
PHANTOM TROUPE',
  guild_timezone text not null default 'Asia/Taipei',
  guild_id text not null default '',
  member_cap integer not null default 150 check (member_cap > 0),
  daily_requirement integer not null default 50 check (daily_requirement >= 0),
  active_members integer not null default 0 check (active_members >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  raw_text text not null default '',
  saved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, slot)
);

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

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  roblox text not null,
  normalized_roblox text not null,
  discord text not null default '',
  playtime text not null default '',
  notes text not null default '',
  contribution integer not null default 0 check (contribution >= 0),
  previous_contribution integer not null default 0 check (previous_contribution >= 0),
  last_checked timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, normalized_roblox)
);

create table if not exists public.member_checks (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  roblox text not null,
  normalized_roblox text not null,
  discord text not null default '',
  playtime text not null default '',
  notes text not null default '',
  contribution integer not null check (contribution >= 0),
  checked_at timestamptz not null,
  batch_id text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (guild_id, normalized_roblox, checked_at)
);

create table if not exists public.upgrades (
  id text primary key,
  guild_id text not null default 'phantom-troupe' references public.guild_settings(id) on delete cascade,
  name text not null,
  level integer not null default 0 check (level >= 0),
  value text not null default '',
  max_level integer not null default 10 check (max_level > 0),
  maxed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.officer_allowlist (
  discord_id text primary key,
  label text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

comment on table public.officer_allowlist is
  'Manually managed v1 officer allowlist. Store stable numeric Discord user IDs only, never usernames.';

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Display cache only. Never use profiles as permission authority; officer access is checked against auth.identities plus officer_allowlist.';

create index if not exists member_checks_guild_checked_at_idx
  on public.member_checks (guild_id, checked_at desc);

create index if not exists member_checks_normalized_roblox_idx
  on public.member_checks (guild_id, normalized_roblox, checked_at desc);

create index if not exists members_normalized_roblox_idx
  on public.members (guild_id, normalized_roblox);

create index if not exists snapshots_guild_slot_idx
  on public.snapshots (guild_id, slot);

create index if not exists snapshot_history_guild_snapshot_idx
  on public.snapshot_history (guild_id, snapshot_number);

insert into public.guild_settings (id)
values ('phantom-troupe')
on conflict (id) do nothing;

insert into public.snapshots (guild_id, slot, raw_text)
values
  ('phantom-troupe', 1, ''),
  ('phantom-troupe', 2, '')
on conflict (guild_id, slot) do nothing;

insert into public.upgrades (id, guild_id, name, level, value, max_level, maxed)
values
  ('capacity', 'phantom-troupe', 'Member Capacity', 0, '', 10, false),
  ('damage', 'phantom-troupe', 'Damage %', 0, '', 10, false),
  ('critDamage', 'phantom-troupe', 'Crit Damage', 0, '', 10, false),
  ('critChance', 'phantom-troupe', 'Crit Chance', 0, '', 10, false),
  ('hp', 'phantom-troupe', 'HP %', 0, '', 10, false),
  ('luck', 'phantom-troupe', 'Luck', 0, '', 10, false)
on conflict (id) do nothing;
