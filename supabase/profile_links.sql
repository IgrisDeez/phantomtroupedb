-- Phantom Troupe Guild Tracker - Phase 7 Profile links
-- Apply this after schema.sql and rls.sql.
-- Bloxlink data is cached here by the server-side Edge Function only.

create table if not exists public.discord_roblox_links (
  discord_id text primary key,
  supabase_user_id uuid references auth.users(id) on delete set null,
  roblox_user_id text not null default '',
  roblox_username text not null default '',
  normalized_roblox text not null default '',
  link_status text not null default 'linked' check (link_status in ('linked', 'not_linked', 'error')),
  source text not null default 'bloxlink',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.discord_roblox_links is
  'Server-side cache for Discord to Roblox links. Not used for officer permissions.';

create index if not exists discord_roblox_links_user_id_idx
  on public.discord_roblox_links (supabase_user_id);

create index if not exists discord_roblox_links_normalized_roblox_idx
  on public.discord_roblox_links (normalized_roblox);

alter table public.discord_roblox_links enable row level security;

revoke all on public.discord_roblox_links from anon;
revoke all on public.discord_roblox_links from authenticated;
grant select on public.discord_roblox_links to authenticated;

drop policy if exists "users read own roblox link" on public.discord_roblox_links;
create policy "users read own roblox link"
on public.discord_roblox_links
for select
to authenticated
using (
  auth.uid() = supabase_user_id
  or discord_id = private.current_discord_id()
);

-- No authenticated insert/update/delete policies are defined.
-- The resolve-roblox-link Edge Function validates the caller and writes cache rows server-side.
