-- Bengaluru Pulse - initial production schema (Wave 0 foundation).
-- Postgres + PostGIS on Supabase. Replaces the in-memory shared/scenario.ts.
-- Design notes:
--   * Multi-corridor from day one (the prototype was single-corridor).
--   * Feed snapshots are the raw ingested layer; events are the predicted output.
--   * RLS: officers (authenticated) read/act; citizens never touch the DB directly
--     (the API serves them via the service role). See policies at the bottom.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table agencies (
  code        text primary key check (code in ('DULT','BTP','GBA','BMTC','BMRCL')),
  name        text not null
);

create table corridors (
  id          text primary key,                       -- e.g. 'orr-east'
  name        text not null,                          -- 'ORR East - Silk Board to Marathahalli'
  geometry    geometry(LineString, 4326),             -- corridor path
  nodes       jsonb not null default '[]',            -- CorridorNode[] (name,x,y) for the map
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People (officers). Profile row linked to Supabase auth.users.
-- ---------------------------------------------------------------------------

create table officers (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  agency      text not null references agencies(code),
  role        text not null default 'officer' check (role in ('officer','admin')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ingestion layer: raw normalized snapshots from each live feed adapter.
-- ---------------------------------------------------------------------------

create table feed_snapshots (
  id            bigint generated always as identity primary key,
  source        text not null check (source in
                  ('traffic','rain','bus','metro','flood','population')),
  corridor_id   text references corridors(id),
  payload       jsonb not null,                        -- adapter-normalized reading
  observed_at   timestamptz not null,                  -- when the source measured it
  ingested_at   timestamptz not null default now()
);
create index on feed_snapshots (source, corridor_id, observed_at desc);

-- ---------------------------------------------------------------------------
-- Prediction output: a risk event + its children (recs, timeline, outcome).
-- ---------------------------------------------------------------------------

create table events (
  id                text primary key,                  -- '2026-0904-ORR-E'
  corridor_id       text not null references corridors(id),
  window_label      text not null,                     -- '5:00-8:00 PM'
  lead_time_min     int  not null,
  state             text not null check (state in ('normal','delay','disruption')),
  confidence_pct    int  not null,
  uncertainty_min   int  not null,
  impact            jsonb not null,                    -- Impact
  factors           jsonb not null default '[]',       -- ContributingFactor[]
  flood_context     jsonb not null default '{}',       -- FloodContext
  predictor_version text not null default 'stub-0',    -- which Predictor produced this
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index on events (corridor_id, created_at desc);

create table recommendations (
  id                    text primary key,              -- 'rec-btp-ecospace'
  event_id              text not null references events(id) on delete cascade,
  owner_agency          text not null references agencies(code),
  title                 text not null,
  detail                text not null,
  priority              int  not null,
  status                text not null default 'pending'
                          check (status in ('pending','awaiting','acknowledged','sent','acted')),
  status_meta           text,
  triggers_citizen_push boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on recommendations (event_id, priority);

create table timeline_snapshots (
  id               bigint generated always as identity primary key,
  event_id         text not null references events(id) on delete cascade,
  time_label       text not null,                      -- '4:15 PM'
  clock_minutes    int  not null,                      -- minutes since midnight
  state            text not null check (state in ('normal','delay','disruption')),
  advisory         text not null,
  citizen_headline text not null,
  confidence_pct   int  not null
);
create index on timeline_snapshots (event_id, clock_minutes);

create table outcomes (
  event_id             text primary key references events(id) on delete cascade,
  flagged_at           text not null,
  actual_peak_delay_min int,
  predicted_range      int[] not null,
  within_prediction    boolean,
  avoided_person_min   int,
  baseline_note        text not null
);

-- ---------------------------------------------------------------------------
-- Citizen channel: push tokens + advisory dispatch log.
-- ---------------------------------------------------------------------------

create table push_tokens (
  id               bigint generated always as identity primary key,
  expo_push_token  text unique not null,
  area             text,
  created_at       timestamptz not null default now()
);

create table advisories (
  id             bigint generated always as identity primary key,
  event_id       text not null references events(id) on delete cascade,
  channel        text not null default 'push' check (channel in ('push','whatsapp')),
  title          text not null,
  body           text not null,
  reached_count  int  not null default 0,
  sent_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit: every officer action (recommend-and-account requires a trail).
-- ---------------------------------------------------------------------------

create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references officers(id),
  action      text not null,                           -- 'approve_recommendation'
  entity      text not null,                           -- 'recommendation'
  entity_id   text not null,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on audit_log (entity, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Authenticated officers may read domain data and their own profile.
--   Writes (approve, ingest, predict, advisory) go through the API on the
--   service-role key, which bypasses RLS - so no write policies for anon/auth.
--   Citizens are anon and never hit the DB directly; the API mediates them.
-- ---------------------------------------------------------------------------

alter table events             enable row level security;
alter table recommendations    enable row level security;
alter table timeline_snapshots enable row level security;
alter table outcomes           enable row level security;
alter table corridors          enable row level security;
alter table agencies           enable row level security;
alter table officers           enable row level security;

create policy officers_read_events   on events             for select to authenticated using (true);
create policy officers_read_recs     on recommendations    for select to authenticated using (true);
create policy officers_read_timeline on timeline_snapshots for select to authenticated using (true);
create policy officers_read_outcomes on outcomes           for select to authenticated using (true);
create policy officers_read_corridors on corridors         for select to authenticated using (true);
create policy officers_read_agencies on agencies           for select to authenticated using (true);
create policy officers_read_self     on officers           for select to authenticated using (id = auth.uid());

-- feed_snapshots, push_tokens, advisories, audit_log have RLS left disabled:
-- they are written and read only by the service-role API, never by clients.
