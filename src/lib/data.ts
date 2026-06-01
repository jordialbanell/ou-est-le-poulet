export type Zone = "A" | "B" | "C";

export interface Bar {
  name: string;
  zone: Zone;
  lat: number;
  lng: number;
}

// Exact GPS coordinates from the event KML.
export const BARS: Bar[] = [
  { name: "JU95", zone: "C", lat: 1.2866095, lng: 103.8495598 },
  { name: "The Penny Black", zone: "C", lat: 1.285934, lng: 103.849953 },
  { name: "Skinny's Lounge", zone: "B", lat: 1.2885814, lng: 103.8491907 },
  { name: "Charlie's Restaurant & Bar", zone: "C", lat: 1.2862228, lng: 103.8498206 },
  { name: "Hero's", zone: "C", lat: 1.2864528, lng: 103.8490608 },
  { name: "Molly Malone's Irish Pub", zone: "C", lat: 1.2859317, lng: 103.849344 },
  { name: "D.F. Cantina by Barbary Coast", zone: "B", lat: 1.2862632, lng: 103.8485319 },
  { name: "Mogambo Bar & Restaurant", zone: "C", lat: 1.286271, lng: 103.849461 },
  { name: "beGIN", zone: "C", lat: 1.2858968, lng: 103.8499393 },
  { name: "Taishike (Boat Quay)", zone: "B", lat: 1.2874247, lng: 103.8490143 },
  { name: "Cuba Libre Café & Bar", zone: "A", lat: 1.290247, lng: 103.8464495 },
  { name: "Offtrack", zone: "B", lat: 1.2869115, lng: 103.847206 },
  { name: "Café Iguana Riverside Point", zone: "A", lat: 1.288951, lng: 103.8445214 },
  { name: "Level Up - Live Music & Arcade Bar", zone: "A", lat: 1.289512, lng: 103.8450698 },
  { name: "Yin Bar Singapore", zone: "A", lat: 1.2900912, lng: 103.8448906 },
  { name: "Errazuriz", zone: "A", lat: 1.2890072, lng: 103.8453272 },
  { name: "Daddy Cool Bar & Bistro", zone: "B", lat: 1.2883343, lng: 103.8477007 },
  { name: "Lucid Bar", zone: "B", lat: 1.2872483, lng: 103.8483362 },
  { name: "Ichi Singapore", zone: "A", lat: 1.2900995, lng: 103.8456752 },
  { name: "Azzurro Bistro Bar", zone: "B", lat: 1.2816272, lng: 103.848203 },
  { name: "Marquee Bistro & Bar", zone: "B", lat: 1.2844883, lng: 103.8484634 },
  { name: "Club 69", zone: "B", lat: 1.287064, lng: 103.8481339 },
  { name: "LVLR Rooftop Bar", zone: "B", lat: 1.2877858, lng: 103.8479233 },
  { name: "28 Hongkong St", zone: "B", lat: 1.2876191, lng: 103.8469855 },
  { name: "Jab1", zone: "B", lat: 1.2882168, lng: 103.8489234 },
  { name: "RedTail Bar By Zouk", zone: "A", lat: 1.290948, lng: 103.845856 },
  { name: "Warehouse Bar", zone: "A", lat: 1.290033, lng: 103.8450852 },
  { name: "Kazbar", zone: "B", lat: 1.283605, lng: 103.8486302 },
  { name: "Blu Jaz, Pekin Street", zone: "B", lat: 1.2838137, lng: 103.8482569 },
  { name: "Miss G's Grill & Bar", zone: "B", lat: 1.283264, lng: 103.8486765 },
  { name: "Bar On Chulia", zone: "C", lat: 1.2854944, lng: 103.8489536 },
  { name: "Dingtea Co. Ltd", zone: "B", lat: 1.283228, lng: 103.848288 },
  { name: "Drink Good Beer", zone: "B", lat: 1.2844019, lng: 103.8470546 },
  { name: "The Good Beer Company", zone: "B", lat: 1.2840476, lng: 103.8476204 },
  { name: "LECOQ", zone: "B", lat: 1.2834707, lng: 103.8487683 },
  { name: "Employees Only Singapore", zone: "B", lat: 1.2820556, lng: 103.8476771 },
  { name: "Waa Cow! CIMB Plaza", zone: "C", lat: 1.2841089, lng: 103.852015 },
];

export const ZONES: Record<Zone, { label: string; description: string; color: string }> = {
  A: { label: "Zone A", description: "Clarke Quay / Riverside Point", color: "#1565C0" },
  B: { label: "Zone B", description: "Hong Kong St / Club St", color: "#2E7D32" },
  C: { label: "Zone C", description: "Boat Quay waterfront", color: "#C0392B" },
};

export const ZONE_ORDER: Zone[] = ["A", "B", "C"];

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
