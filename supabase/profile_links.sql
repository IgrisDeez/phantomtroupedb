-- Phantom Troupe Guild Tracker - Phase 7 Profile links
-- Apply this after schema.sql and rls.sql.
-- Bloxlink data can be cached here later; current v1 links are officer-managed manually.

create table if not exists public.discord_roblox_links (
  discord_id text primary key,
  supabase_user_id uuid references auth.users(id) on delete set null,
  label text not null default '',
  roblox_user_id text not null default '',
  roblox_username text not null default '',
  normalized_roblox text not null default '',
  link_status text not null default 'linked' check (link_status in ('linked', 'not_linked', 'error')),
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discord_roblox_links
  add column if not exists label text not null default '';

alter table public.discord_roblox_links
  alter column source set default 'manual';

comment on table public.discord_roblox_links is
  'Discord to Roblox profile links. Not used for officer permissions.';

create index if not exists discord_roblox_links_user_id_idx
  on public.discord_roblox_links (supabase_user_id);

create index if not exists discord_roblox_links_normalized_roblox_idx
  on public.discord_roblox_links (normalized_roblox);

alter table public.discord_roblox_links enable row level security;

revoke all on public.discord_roblox_links from anon;
revoke all on public.discord_roblox_links from authenticated;
grant select, insert, update on public.discord_roblox_links to authenticated;

drop policy if exists "users read own roblox link" on public.discord_roblox_links;
create policy "users read own roblox link"
on public.discord_roblox_links
for select
to authenticated
using (
  private.is_current_user_officer()
  or
  auth.uid() = supabase_user_id
  or discord_id = private.current_discord_id()
);

drop policy if exists "officers insert roblox links" on public.discord_roblox_links;
create policy "officers insert roblox links"
on public.discord_roblox_links
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "users insert own roblox link" on public.discord_roblox_links;
create policy "users insert own roblox link"
on public.discord_roblox_links
for insert
to authenticated
with check (
  discord_id = private.current_discord_id()
  and supabase_user_id = auth.uid()
);

drop policy if exists "officers update roblox links" on public.discord_roblox_links;
create policy "officers update roblox links"
on public.discord_roblox_links
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "users update own roblox link" on public.discord_roblox_links;
create policy "users update own roblox link"
on public.discord_roblox_links
for update
to authenticated
using (
  discord_id = private.current_discord_id()
  or supabase_user_id = auth.uid()
)
with check (
  discord_id = private.current_discord_id()
  and supabase_user_id = auth.uid()
);

drop policy if exists "officers delete roblox links" on public.discord_roblox_links;

update public.discord_roblox_links
set source = 'manual'
where source = '';
