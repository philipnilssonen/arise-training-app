-- ARISE — push_subscriptions
-- One-to-many: a profile can have multiple subscriptions (one per device/browser).
-- RLS intentionally left disabled, matching the rest of the schema (see
-- "Fas 2 — Multiplayer-arkitektur" / "Hosting & Deployment" in the master briefing
-- for the accepted risk trade-off — closed friend group, no sensitive data).

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  endpoint     text not null unique,
  keys_p256dh  text not null,
  keys_auth    text not null,
  created_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_id_idx on push_subscriptions (profile_id);
