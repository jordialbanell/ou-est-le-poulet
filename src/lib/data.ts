export type Zone = "A" | "B" | "C";

export interface Bar {
  name: string;
  zone: Zone;
}

// NOTE: the source list had "LVLR Rooftop Bar" twice in Zone B — deduped here
// so bar names stay unique (used as keys + check-in identifiers).
export const BARS: Bar[] = [
  // Zone A — Clarke Quay / Riverside Point
  { name: "Café Iguana Riverside Point", zone: "A" },
  { name: "Yin Bar Singapore", zone: "A" },
  { name: "Level Up - Live Music & Arcade Bar", zone: "A" },
  { name: "Warehouse Bar", zone: "A" },
  { name: "Errazuriz", zone: "A" },
  { name: "Ichi Singapore", zone: "A" },
  { name: "RedTail Bar By Zouk", zone: "A" },
  { name: "Cuba Libre Café & Bar", zone: "A" },

  // Zone B — Hong Kong St / Club St
  { name: "28 Hongkong St", zone: "B" },
  { name: "Drink Good Beer", zone: "B" },
  { name: "Offtrack", zone: "B" },
  { name: "The Good Beer Company", zone: "B" },
  { name: "Employees Only Singapore", zone: "B" },
  { name: "Daddy Cool Bar & Bistro", zone: "B" },
  { name: "LVLR Rooftop Bar", zone: "B" },
  { name: "Club 69", zone: "B" },
  { name: "Azzurro Bistro Bar", zone: "B" },
  { name: "Blu Jaz, Pekin Street", zone: "B" },
  { name: "Lucid Bar", zone: "B" },
  { name: "Marquee Bistro & Bar", zone: "B" },
  { name: "D.F. Cantina by Barbary Coast", zone: "B" },
  { name: "Kazbar", zone: "B" },
  { name: "Miss G's Grill & Bar", zone: "B" },
  { name: "LECOQ", zone: "B" },
  { name: "Jab1", zone: "B" },
  { name: "Skinny's Lounge", zone: "B" },

  // Zone C — Boat Quay waterfront
  { name: "Bar On Chulia", zone: "C" },
  { name: "Taishike (Boat Quay)", zone: "C" },
  { name: "Hero's", zone: "C" },
  { name: "Molly Malone's Irish Pub", zone: "C" },
  { name: "Mogambo Bar & Restaurant", zone: "C" },
  { name: "JU95", zone: "C" },
  { name: "Charlie's Restaurant & Bar", zone: "C" },
  { name: "beGIN", zone: "C" },
  { name: "The Penny Black", zone: "C" },
  { name: "Waa Cow! CIMB Plaza", zone: "C" },
  { name: "Dingtea Co. Ltd", zone: "C" },
];

export const ZONES: Record<Zone, { label: string; description: string; color: string }> = {
  A: { label: "Zone A", description: "Clarke Quay / Riverside Point", color: "#1565C0" },
  B: { label: "Zone B", description: "Hong Kong St / Club St", color: "#2E7D32" },
  C: { label: "Zone C", description: "Boat Quay waterfront", color: "#C0392B" },
};

export const ZONE_ORDER: Zone[] = ["A", "B", "C"];

// Approximate centre of each zone in Singapore (we don't have per-bar GPS, so
// bar pins are spread deterministically around these on the map).
export const ZONE_CENTERS: Record<Zone, { lat: number; lng: number }> = {
  A: { lat: 1.2906, lng: 103.8462 }, // Clarke Quay / Riverside Point
  B: { lat: 1.2846, lng: 103.8468 }, // Hong Kong St / Club St
  C: { lat: 1.2868, lng: 103.8498 }, // Boat Quay
};

export const SINGAPORE_CENTER = { lat: 1.288, lng: 103.848 };

/** Deterministic spread of a bar around its zone centre (no per-bar GPS data). */
export function barPosition(zone: Zone, indexInZone: number): { lat: number; lng: number } {
  const c = ZONE_CENTERS[zone];
  // Golden-angle spiral so pins fan out evenly and don't overlap.
  const golden = 2.399963229728653;
  const a = indexInZone * golden;
  const r = 0.0009 * Math.sqrt(indexInZone + 1); // ~100m steps
  return { lat: c.lat + r * Math.cos(a), lng: c.lng + r * Math.sin(a) };
}

export type Difficulty = "easy" | "medium" | "hard" | "bonus" | "team";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  points: number;
  difficulty: Difficulty;
  requiresVideo?: boolean;
  requiresPhoto?: boolean;
}

export const CHALLENGES: Challenge[] = [
  // Easy — 1 point each
  { id: "e1", name: "Behind the Bar", description: "As a team, take a picture behind the bar.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e2", name: "Lionel, Cristiano, or Tim", description: "Take a photo with someone named Lionel, Cristiano, or Tim. Photo of their ID needed.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e3", name: "Baby Guinness", description: "Each member of the team must drink a Baby Guinness.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e4", name: "Sticky Fingers", description: "Steal a beer glass and a cocktail glass from a bar. Must be brought to the Chicken.", points: 1, difficulty: "easy" },
  { id: "e5", name: "Rejected", description: "Propose to a stranger and get rejected.", points: 1, difficulty: "easy" },
  { id: "e6", name: "Shotgun", description: "Shotgun a beer.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e7", name: "Cup Pyramid", description: "Build a pyramid of cups. Base must be 4+ cups.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e8", name: "Sombrero", description: "Take a photo with a sombrero.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e9", name: "Digits", description: "Get a phone number from a stranger (opposite gender to the team member asking).", points: 1, difficulty: "easy" },
  { id: "e10", name: "Kick-Ups", description: "Do 30 kick-ups.", points: 1, difficulty: "easy", requiresVideo: true },

  // Medium — 2 points each
  { id: "m1", name: "Bullseye", description: "Hit a bullseye (inner or outer) on a dartboard. Legal throw, video required.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m2", name: "Generous Stranger", description: "Get someone to buy your whole team tequila shots. Photo of consenting party needed.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m3", name: "Shoe Drink", description: "Have a drink out of your shoe. Must be substantive.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m4", name: "90th Minute Winner", description: "Film a team celebration pretending you've scored a 90th-minute winner.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m5", name: "Clothes Swap", description: "2 members of the team swap clothes for 1 hour. Must be opposite gender.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m6", name: "Zummi Zummi", description: "Play Zummi Zummi in a bar — loudly.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m7", name: "Football Shirt", description: "Take a photo wearing a football shirt.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m8", name: "Water Gun", description: "Shoot someone with a water gun.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m9", name: "Sing-Along", description: "Stand up as a team and sing a song. Get more than 2 strangers to join in.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m10", name: "Real Chicken", description: "Take a photo with a real chicken.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m11", name: "Face Paint", description: "Paint your face the colour of a World Cup nation. Chicken must guess correctly on first try.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m12", name: "Pour Your Own", description: "Pour yourself a drink from behind a bar.", points: 2, difficulty: "medium", requiresVideo: true },

  // Hard — 3 points each
  { id: "h1", name: "The Kiss", description: "One team member must kiss a stranger (on the mouth).", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h2", name: "Boat Quay Swim", description: "Swim in Boat Quay. No need to put your head under the water.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h3", name: "Wannabe", description: "2 members sing Wannabe by the Spice Girls at a karaoke bar.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h4", name: "Yes!", description: "Propose to a stranger and they say yes. Video required.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h5", name: "Underwear Photo", description: "Take a photo as a team outside in your underwear. A random person must take the photo.", points: 3, difficulty: "hard", requiresPhoto: true },
  { id: "h6", name: "Split the G", description: "Split the G on a Guinness. Google it. Video required to prove it was done in 1 sip.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h7", name: "Match Maker", description: "Get 2 strangers to kiss each other.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h8", name: "Mum on FaceTime", description: "Get a stranger's mum on FaceTime with the Chicken. Figure out the logistics.", points: 3, difficulty: "hard" },

  // World Cup Nations bonus
  { id: "b1", name: "12 Nations", description: "Find people from 12 World Cup nations. Photographic evidence of their country needed.", points: 2, difficulty: "bonus", requiresPhoto: true },
  { id: "b2", name: "24 Nations", description: "Find people from 24 World Cup nations. Photographic evidence needed.", points: 4, difficulty: "bonus", requiresPhoto: true },
  { id: "b3", name: "48 Nations", description: "Find people from all 48 World Cup nations. Photographic evidence needed.", points: 8, difficulty: "bonus", requiresPhoto: true },

  // Team vs Team — tracked separately
  { id: "t1", name: "Boat Race", description: "Each team selects 3 champions with a full pint each. Relay drinking race. First team to finish all 3 wins.", points: 4, difficulty: "team" },
  { id: "t2", name: "1-on-1 Drink Race", description: "Each team picks a champion. Race to finish a pint or large cocktail (no shots!). First to finish wins.", points: 4, difficulty: "team" },
  { id: "t3", name: "Chicken's Riddle", description: "The Chicken sends both teams an identical riddle or trivia question. First team to text the correct answer wins.", points: 4, difficulty: "team" },
];

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; badge: string; accent: string }
> = {
  easy: { label: "Easy", badge: "1 pt", accent: "#2E7D32" },
  medium: { label: "Medium", badge: "2 pts", accent: "#1565C0" },
  hard: { label: "Hard", badge: "3 pts", accent: "#C0392B" },
  bonus: { label: "World Cup Bonus", badge: "★", accent: "#C8860A" },
  team: { label: "Team vs Team", badge: "VS", accent: "#6A1B9A" },
};

// Display order for the Challenges tab sections.
export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "bonus", "team"];

export const POINTS_TO_WIN = 20;

// Team colour palette — assigned round-robin as teams join.
export const TEAM_COLORS = [
  "#C8860A",
  "#1565C0",
  "#2E7D32",
  "#C0392B",
  "#6A1B9A",
  "#00838F",
  "#D81B60",
  "#5D4037",
];
