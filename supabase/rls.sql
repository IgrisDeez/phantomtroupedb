-- Phantom Troupe Guild Tracker - Phase 2 RLS
-- Apply schema.sql before this file.
-- Helper functions live in the private schema so permission logic is not exposed as normal public API.

create schema if not exists private;

alter table public.guild_settings enable row level security;
alter table public.snapshots enable row level security;
alter table public.members enable row level security;
alter table public.member_checks enable row level security;
alter table public.upgrades enable row level security;
alter table public.officer_allowlist enable row level security;
alter table public.profiles enable row level security;

create or replace function private.current_discord_id()
returns text
language sql
security definer
set search_path = auth, public, private
stable
as $$
  select coalesce(
    i.identity_data->>'sub',
    i.identity_data->>'provider_id',
    i.identity_data->>'id',
    i.id
  )
  from auth.identities i
  where i.user_id = auth.uid()
    and i.provider = 'discord'
  order by i.created_at desc
  limit 1
$$;

create or replace function private.is_current_user_officer()
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.officer_allowlist officer
    where officer.discord_id = private.current_discord_id()
  )
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_discord_id() to authenticated;
grant execute on function private.is_current_user_officer() to authenticated;

-- Bootstrap the first officer manually in the Supabase SQL editor after Discord OAuth is configured.
-- Use the stable numeric Discord user ID, not username/display name:
-- insert into public.officer_allowlist (discord_id, label)
-- values ('123456789012345678', 'Owner')
-- on conflict (discord_id) do nothing;

drop policy if exists "public read guild settings" on public.guild_settings;
create policy "public read guild settings"
on public.guild_settings
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert guild settings" on public.guild_settings;
create policy "officer insert guild settings"
on public.guild_settings
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update guild settings" on public.guild_settings;
create policy "officer update guild settings"
on public.guild_settings
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete guild settings" on public.guild_settings;
create policy "officer delete guild settings"
on public.guild_settings
for delete
to authenticated
using (private.is_current_user_officer());

drop policy if exists "public read snapshots" on public.snapshots;
create policy "public read snapshots"
on public.snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert snapshots" on public.snapshots;
create policy "officer insert snapshots"
on public.snapshots
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update snapshots" on public.snapshots;
create policy "officer update snapshots"
on public.snapshots
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete snapshots" on public.snapshots;
create policy "officer delete snapshots"
on public.snapshots
for delete
to authenticated
using (private.is_current_user_officer());

drop policy if exists "public read members" on public.members;
create policy "public read members"
on public.members
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert members" on public.members;
create policy "officer insert members"
on public.members
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update members" on public.members;
create policy "officer update members"
on public.members
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete members" on public.members;
create policy "officer delete members"
on public.members
for delete
to authenticated
using (private.is_current_user_officer());

drop policy if exists "public read member checks" on public.member_checks;
create policy "public read member checks"
on public.member_checks
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert member checks" on public.member_checks;
create policy "officer insert member checks"
on public.member_checks
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update member checks" on public.member_checks;
create policy "officer update member checks"
on public.member_checks
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete member checks" on public.member_checks;
create policy "officer delete member checks"
on public.member_checks
for delete
to authenticated
using (private.is_current_user_officer());

drop policy if exists "public read upgrades" on public.upgrades;
create policy "public read upgrades"
on public.upgrades
for select
to anon, authenticated
using (true);

drop policy if exists "officer insert upgrades" on public.upgrades;
create policy "officer insert upgrades"
on public.upgrades
for insert
to authenticated
with check (private.is_current_user_officer());

drop policy if exists "officer update upgrades" on public.upgrades;
create policy "officer update upgrades"
on public.upgrades
for update
to authenticated
using (private.is_current_user_officer())
with check (private.is_current_user_officer());

drop policy if exists "officer delete upgrades" on public.upgrades;
create policy "officer delete upgrades"
on public.upgrades
for delete
to authenticated
using (private.is_current_user_officer());

drop policy if exists "officers read allowlist" on public.officer_allowlist;
create policy "officers read allowlist"
on public.officer_allowlist
for select
to authenticated
using (private.is_current_user_officer());

-- v1 safety: officer_allowlist is manually managed in the Supabase dashboard/SQL editor only.
-- Keep these drops so rerunning this script removes older app-write allowlist policies.
drop policy if exists "officers insert allowlist" on public.officer_allowlist;
drop policy if exists "officers update allowlist" on public.officer_allowlist;
drop policy if exists "officers delete allowlist" on public.officer_allowlist;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
