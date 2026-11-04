create table if not exists public.wcr_races (
  external_id text primary key,
  name text not null,
  date date not null,
  category text not null,
  first text not null,
  second text not null,
  third text not null,
  first_driver text,
  second_driver text,
  third_driver text,
  source text not null,
  verified boolean not null default false,
  provider_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint wcr_three_distinct_brands check (first <> second and first <> third and second <> third)
);
create index if not exists wcr_races_date_idx on public.wcr_races (date desc);
alter table public.wcr_races enable row level security;
-- Migration safe for a previously created WCR table.
alter table public.wcr_races add column if not exists first_driver text;
alter table public.wcr_races add column if not exists second_driver text;
alter table public.wcr_races add column if not exists third_driver text;

-- Migration idempotente pour un projet déjà créé :
alter table public.wcr_races add column if not exists first_driver text;
alter table public.wcr_races add column if not exists second_driver text;
alter table public.wcr_races add column if not exists third_driver text;
