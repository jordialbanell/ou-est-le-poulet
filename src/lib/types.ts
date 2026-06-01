import type { Zone, Difficulty } from "./data";

export interface Game {
  id: string;
  code: string;
  created_at: string;
  is_active: boolean;
  chicken_location: string | null;
}

export interface Team {
  id: string;
  game_id: string;
  name: string;
  created_at: string;
  color: string;
}

export interface BarCheckin {
  id: string;
  team_id: string;
  game_id: string;
  bar_name: string;
  zone: Zone;
  checked_in_at: string;
}

export interface ChallengeCompletion {
  id: string;
  team_id: string;
  game_id: string;
  challenge_name: string;
  points: number;
  difficulty: Difficulty;
  completed_at: string;
}

export interface PushedChallenge {
  id: string;
  game_id: string;
  challenge_text: string;
  points: number;
  pushed_at: string;
  expires_at: string | null;
}
