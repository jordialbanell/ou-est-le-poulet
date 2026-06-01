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
  members: string | null;
  selfie_url: string | null;
}

export interface TeamLocation {
  id: string;
  team_id: string;
  game_id: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export interface Message {
  id: string;
  game_id: string;
  team_id: string;
  sender: string;
  content: string;
  is_chicken: boolean;
  sent_at: string;
}

export interface BarCheckin {
  id: string;
  team_id: string;
  game_id: string;
  bar_name: string;
  zone: Zone;
  checked_in_at: string;
  checkin_evidence_url: string | null;
  checkin_note: string | null;
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

export type PendingStatus = "pending" | "approved" | "rejected";

export interface PendingChallenge {
  id: string;
  team_id: string;
  game_id: string;
  challenge_name: string;
  challenge_id: string;
  points: number;
  difficulty: Difficulty;
  status: PendingStatus;
  submitted_at: string;
  reviewed_at: string | null;
  evidence_url: string | null;
  description: string | null;
  message_to_chicken: string | null;
}
