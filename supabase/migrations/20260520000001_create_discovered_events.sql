-- Migration: create discovered_events table
-- Stores events sourced from Instagram, Ticketmaster, Eventbrite, etc.
-- Separate from the user-created `events` table (which is group-scoped).

create table if not exists public.discovered_events (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  venue           text,
  location        text,                        -- full address if available
  city            text not null default 'Cape Town',
  date            date,                        -- event date (no time)
  starts_at       timestamptz,                 -- full datetime if known
  ends_at         timestamptz,
  price           text,                        -- "Free" or "From R100"
  ticket_url      text,                        -- deep link to purchase page
  image_url       text,                        -- source slide/poster image
  category        text,                        -- 'music', 'arts', 'food', etc.
  source          text not null,               -- 'instagram', 'ticketmaster', etc.
  source_account  text,                        -- e.g. '@letsgetlocalct'
  source_post_id  text,                        -- instagram post ID or API event ID
  raw_data        jsonb,                       -- full original payload for debugging
  created_at      timestamptz default now(),

  -- Prevent duplicates when re-running the scraper
  unique (source, source_account, name, starts_at)
);

-- Index for the most common app query: events by city + date
create index discovered_events_city_date_idx
  on public.discovered_events (city, date);

-- RLS: anyone authenticated can read; only service_role can write
alter table public.discovered_events enable row level security;

create policy "Anyone can read discovered events"
  on public.discovered_events for select
  using (true);

-- Inserts/updates come from the Edge Function using service_role key,
-- which bypasses RLS entirely — no insert policy needed for the app.
