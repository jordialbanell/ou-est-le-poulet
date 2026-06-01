# Où Est Le Poulet 🍗

A real-time multiplayer pub crawl tracker. Teams race across ~37 bars in 3 zones,
complete challenges for points, and the first team to visit all zones **and** hit
20 points can sit down with the Chicken to claim the prize.

**Stack:** React + Vite + TypeScript + Tailwind CSS v4 + Supabase Realtime.
No login — teams join with a 4-digit game code. Mobile-first.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema:** open the SQL editor and paste all of [`supabase/schema.sql`](supabase/schema.sql), then run it.
3. **Add credentials:** copy `.env.example` to `.env` and fill in your project URL + anon key
   (Supabase dashboard → Project Settings → API).
4. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```

## How to play

- **Admin / the Chicken:** open `/admin`, hit **Create New Game** → you get a 4-digit code.
  From here you can reveal the Chicken's location, push surprise challenges, and watch
  every team's progress live. Share the join link or just the code.
- **Players:** open `/` (or the shared link), enter the code + a team name, and you're in.
  - **Home** — points, zone coverage, and the big **CAN WE SIT DOWN?** button.
  - **Bars** — check in at each bar; one per zone is required to win.
  - **Tasks** — complete challenges for points; send Team-vs-Team challenges to rivals.
  - **Ranks** — live leaderboard of every team.

## Win conditions

A team can sit down when they have:
1. Visited at least one bar in **each** of Zones A, B, and C, and
2. Earned at least **20 points** from challenges.

## Notes

- Team identity is stored in `localStorage` (`oelp.team`) — no accounts.
- All game state syncs live over Supabase Realtime.
- Dark-mode toggle (handy in a dark bar), challenge chime, win confetti, and a
  PWA manifest (add to home screen) are all included.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |
