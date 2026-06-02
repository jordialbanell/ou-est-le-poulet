-- ============================================================
--  Où Est Le Poulet — Supabase schema
--  Run this whole file in the Supabase SQL editor (one time).
-- ============================================================

-- Games table (one per event night)
create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,          -- 4-digit code e.g. "4269"
  created_at timestamptz default now(),
  is_active boolean default true,
  chicken_location text               -- revealed by admin when ready
);

-- Teams table
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  color text not null default '#C8860A'
);

-- Bar check-ins
create table if not exists bar_checkins (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  bar_name text not null,
  zone text not null,                 -- 'A', 'B', or 'C'
  checked_in_at timestamptz default now()
);

-- First 6 bars require a drink photo (added later).
alter table bar_checkins add column if not exists checkin_evidence_url text;
alter table bar_checkins add column if not exists checkin_note text;

-- Challenge completions
create table if not exists challenge_completions (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  challenge_name text not null,
  points integer not null,            -- negative for admin point deductions
  difficulty text not null,           -- 'easy','medium','hard','bonus','team','deduction'
  completed_at timestamptz default now()
);

-- Random challenges pushed by the Chicken (admin)
create table if not exists pushed_challenges (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  challenge_text text not null,
  points integer not null default 2,
  pushed_at timestamptz default now(),
  expires_at timestamptz
);

-- Optional "complete by HH:MM" deadline shown as a live countdown to teams.
alter table pushed_challenges add column if not exists deadline text;

-- Shareable 6-char join code so multiple devices can join the same team.
alter table teams add column if not exists team_code text unique;

-- Challenge submissions awaiting the Chicken's approval.
-- Teams can no longer add points directly: they submit here, the admin approves,
-- and only then is a row written to challenge_completions.
create table if not exists pending_challenges (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  challenge_name text not null,
  challenge_id text not null,
  points integer not null,
  difficulty text not null,
  status text not null default 'pending',   -- 'pending' | 'approved' | 'rejected'
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Enable realtime on all tables (ignore "already member" errors on re-run)
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table bar_checkins;
alter publication supabase_realtime add table challenge_completions;
alter publication supabase_realtime add table pushed_challenges;
alter publication supabase_realtime add table pending_challenges;
alter publication supabase_realtime add table games;

-- RLS: allow all reads and inserts (no auth needed for this game)
alter table games enable row level security;
alter table teams enable row level security;
alter table bar_checkins enable row level security;
alter table challenge_completions enable row level security;
alter table pushed_challenges enable row level security;
alter table pending_challenges enable row level security;

drop policy if exists "Public read" on games;
drop policy if exists "Public insert" on games;
drop policy if exists "Public update" on games;
create policy "Public read"   on games for select using (true);
create policy "Public insert" on games for insert with check (true);
create policy "Public update" on games for update using (true);

drop policy if exists "Public read" on teams;
drop policy if exists "Public insert" on teams;
drop policy if exists "Public update" on teams;
create policy "Public read"   on teams for select using (true);
create policy "Public insert" on teams for insert with check (true);
create policy "Public update" on teams for update using (true);  -- edit team on Home tab

drop policy if exists "Public read" on bar_checkins;
drop policy if exists "Public insert" on bar_checkins;
drop policy if exists "Public delete" on bar_checkins;
create policy "Public read"   on bar_checkins for select using (true);
create policy "Public insert" on bar_checkins for insert with check (true);
create policy "Public delete" on bar_checkins for delete using (true);

drop policy if exists "Public read" on challenge_completions;
drop policy if exists "Public insert" on challenge_completions;
drop policy if exists "Public delete" on challenge_completions;
create policy "Public read"   on challenge_completions for select using (true);
create policy "Public insert" on challenge_completions for insert with check (true);
create policy "Public delete" on challenge_completions for delete using (true);

drop policy if exists "Public read" on pushed_challenges;
drop policy if exists "Public insert" on pushed_challenges;
create policy "Public read"   on pushed_challenges for select using (true);
create policy "Public insert" on pushed_challenges for insert with check (true);

drop policy if exists "Public read" on pending_challenges;
drop policy if exists "Public insert" on pending_challenges;
drop policy if exists "Public update" on pending_challenges;
create policy "Public read"   on pending_challenges for select using (true);
create policy "Public insert" on pending_challenges for insert with check (true);
create policy "Public update" on pending_challenges for update using (true);

-- ============================================================
--  Cloudinary evidence + team profiles + live GPS tracking
-- ============================================================

alter table pending_challenges add column if not exists evidence_url text;
alter table pending_challenges add column if not exists description text;
alter table pending_challenges add column if not exists message_to_chicken text;
alter table pending_challenges add column if not exists rejection_reason text;
alter table teams add column if not exists members text;
alter table teams add column if not exists selfie_url text;

create table if not exists team_locations (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  lat float not null,
  lng float not null,
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table team_locations;

alter table team_locations enable row level security;
drop policy if exists "Public read" on team_locations;
drop policy if exists "Public insert" on team_locations;
drop policy if exists "Public update" on team_locations;
create policy "Public read"   on team_locations for select using (true);
create policy "Public insert" on team_locations for insert with check (true);
create policy "Public update" on team_locations for update using (true);

-- ============================================================
--  Team ↔ Chicken chat
-- ============================================================

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  sender text not null,
  content text not null,
  is_chicken boolean not null default false,
  sent_at timestamptz default now()
);

alter publication supabase_realtime add table messages;

alter table messages enable row level security;
drop policy if exists "Public read" on messages;
drop policy if exists "Public insert" on messages;
create policy "Public read"   on messages for select using (true);
create policy "Public insert" on messages for insert with check (true);

-- ============================================================
--  Persistent unread tracking (survives closing the tab)
-- ============================================================

-- When a team last read its chat with the Chicken.
alter table teams add column if not exists last_read_at timestamptz;

-- When the admin last read each team's thread.
create table if not exists admin_read_receipts (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  last_read_at timestamptz default now(),
  unique(game_id, team_id)
);

alter publication supabase_realtime add table admin_read_receipts;

alter table admin_read_receipts enable row level security;
drop policy if exists "Public read" on admin_read_receipts;
drop policy if exists "Public insert" on admin_read_receipts;
drop policy if exists "Public update" on admin_read_receipts;
create policy "Public read"   on admin_read_receipts for select using (true);
create policy "Public insert" on admin_read_receipts for insert with check (true);
create policy "Public update" on admin_read_receipts for update using (true);
