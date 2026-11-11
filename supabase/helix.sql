create table if not exists public.helix_players (
  id uuid primary key,
  skin text not null default '',
  cleared integer not null default 0,
  xp integer not null default 0,
  words jsonb not null default '[]'::jsonb,
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

create table if not exists public.helix_cards (
  player_id uuid not null references public.helix_players (id) on delete cascade,
  skin text not null,
  card_id text not null,
  owner text not null,
  light_on boolean not null,
  pos integer not null,
  primary key (player_id, skin, card_id)
);

create table if not exists public.helix_clears (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.helix_players (id) on delete cascade,
  level_index integer not null,
  xp integer not null,
  created_at timestamptz not null default now()
);

alter table public.helix_players enable row level security;
alter table public.helix_cards enable row level security;
alter table public.helix_clears enable row level security;
