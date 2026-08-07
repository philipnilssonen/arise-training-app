-- ARISE — Brief B: notification system (T1-T4, K1-K2, L1-L3, B1-B4)
--
-- Three tables + two DB triggers + one cron row.
--
--   notification_preferences  — per-profile times/toggles (configurable, not hardcoded)
--   notification_state        — client-mirrored game state the server-side crons need
--                               (schedule, weekly progress, presence heartbeat).
--                               The app's source of truth is localStorage; this is a
--                               denormalized mirror updated by the client on every save.
--   notification_log          — dedup: (profile, key, day) sent at most once
--
--   B1 trigger: gate_damage_events INSERT (kind='boss')  -> push to team except dealer
--   B2 trigger: gate_instances active->victory           -> push to absent team members
--
-- RLS intentionally disabled, matching the rest of the schema.
-- The anon key in http_post headers is public by design (same key ships in index.html).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists notification_preferences (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  tz             text not null default 'Europe/Stockholm',
  t1_time        time not null default '08:00',   -- session planned today
  k1_time        time not null default '12:00',   -- midday macro reminder
  k2_time        time not null default '20:00',   -- end-of-day nutrition log
  b34_time       time not null default '07:30',   -- gate + session morning reminder
  l3_time        time not null default '17:00',   -- unspent skill point
  t4_dow         int  not null default 4,         -- ISO dow for DIS warning (4 = Thursday)
  t4_time        time not null default '18:00',
  enabled        boolean not null default true,   -- master switch
  disabled_keys  text[] not null default '{}',    -- e.g. '{k1,b1}' to mute single types
  created_at     timestamptz not null default now()
);

create table if not exists notification_state (
  profile_id           uuid primary key references profiles(id) on delete cascade,
  schedule             jsonb,        -- 7 day-types, Monday first: ["gym","gym","rest",...]
  days_per_week        int,
  weekly_gym           int default 0,
  weekly_cardio        int default 0,
  today_date           date,         -- local date the today_* flags refer to
  today_gym_logged     boolean default false,
  today_nutrition_done boolean default false,  -- all 3 check-ins done
  skill_points         int default 0,
  last_skill_point_at  timestamptz,
  last_seen_at         timestamptz,  -- presence heartbeat (~60s while app visible)
  updated_at           timestamptz not null default now()
);

create table if not exists notification_log (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  notif_key   text not null,
  sent_on     date not null,
  created_at  timestamptz not null default now(),
  unique (profile_id, notif_key, sent_on)
);

-- Seed prefs for existing profiles (new profiles get a row from the client at login)
insert into notification_preferences (profile_id)
select id from profiles
on conflict (profile_id) do nothing;

-- ============================================================
-- Shared helper: send a push via the send-push Edge Function
-- ============================================================

create or replace function arise_push(p_profile_id uuid, p_title text, p_body text, p_tag text, p_only_if_absent boolean default false)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $fn$
begin
  perform net.http_post(
    url := 'https://tdzdeljxuhghrfobtbti.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkemRlbGp4dWhnaHJmb2J0YnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTY1NzQsImV4cCI6MjEwMTU3MjU3NH0.WMH6cV3gskppDU0FIVXMCzkOAOUUcWduxn8FpxHievI'
    ),
    body := jsonb_build_object(
      'profile_id', p_profile_id,
      'title', p_title,
      'body', p_body,
      'tag', p_tag,
      'only_if_absent', p_only_if_absent
    )
  );
end;
$fn$;

-- ============================================================
-- B1 — team member deals boss damage -> notify rest of team
-- ============================================================
-- Deliberately a small dedicated function (not inline in game logic):
-- switching to milestone-based later means editing only this function.

create or replace function arise_notify_boss_damage()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_gate    record;
  v_dealer  text;
  v_member  uuid;
begin
  select boss_name, team_id, party_size into v_gate
    from gate_instances where id = new.gate_id;
  if v_gate is null or coalesce(v_gate.party_size, 1) < 2 then
    return new;  -- solo gate: no one to notify
  end if;

  select display_name into v_dealer from profiles where id = new.profile_id;

  for v_member in
    select tm.profile_id from team_members tm
    where tm.team_id = v_gate.team_id and tm.profile_id <> new.profile_id
  loop
    perform arise_push(
      v_member,
      'ARISE',
      coalesce(v_dealer, 'A hunter') || ' just did ' || round(new.amount)::text
        || ' damage to ' || coalesce(v_gate.boss_name, 'the boss'),
      'boss-dmg-' || new.gate_id::text,
      false
    );
  end loop;
  return new;
end;
$fn$;

drop trigger if exists trg_arise_notify_boss_damage on gate_damage_events;
create trigger trg_arise_notify_boss_damage
  after insert on gate_damage_events
  for each row
  when (new.kind = 'boss' and new.amount > 0)
  execute function arise_notify_boss_damage();

-- ============================================================
-- B2 — boss dies -> notify team members who are not in the app
-- ============================================================
-- "Absent" = no presence heartbeat within 2 minutes.

create or replace function arise_notify_boss_killed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_striker text;
  v_member  uuid;
begin
  select p.display_name into v_striker
    from gate_damage_events e join profiles p on p.id = e.profile_id
    where e.gate_id = new.id and e.kind = 'boss'
    order by e.created_at desc limit 1;

  for v_member in
    select tm.profile_id from team_members tm
    where tm.team_id = new.team_id
      and not exists (
        select 1 from notification_state ns
        where ns.profile_id = tm.profile_id
          and ns.last_seen_at > now() - interval '2 minutes'
      )
  loop
    perform arise_push(
      v_member,
      'ARISE — Boss defeated!',
      coalesce(v_striker, 'A hunter') || ' just made the final strike to '
        || coalesce(new.boss_name, 'the boss')
        || '. Congratulations Hunter, you killed the boss. You''ve been rewarded for your efforts.',
      'boss-kill-' || new.id::text,
      false
    );
  end loop;
  return new;
end;
$fn$;

drop trigger if exists trg_arise_notify_boss_killed on gate_instances;
create trigger trg_arise_notify_boss_killed
  after update on gate_instances
  for each row
  when (old.status = 'active' and new.status = 'victory')
  execute function arise_notify_boss_killed();

-- ============================================================
-- Cron: run notify-cron every 15 minutes
-- ============================================================
-- The function itself decides per-profile what is due (times are per-profile
-- prefs, not cron schedule) and dedups via notification_log.

select cron.schedule(
  'arise-notify-cron',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://tdzdeljxuhghrfobtbti.supabase.co/functions/v1/notify-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkemRlbGp4dWhnaHJmb2J0YnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTY1NzQsImV4cCI6MjEwMTU3MjU3NH0.WMH6cV3gskppDU0FIVXMCzkOAOUUcWduxn8FpxHievI'
    ),
    body := '{}'::jsonb
  );
  $$
);
