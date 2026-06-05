export type Zone = "A" | "B" | "C";

export interface Bar {
  name: string;
  zone: Zone;
  lat: number;
  lng: number;
}

// Exact GPS coordinates from the event KML.
export const BARS: Bar[] = [
  { name: "Cuba Libre Café & Bar", zone: "A", lat: 1.290247, lng: 103.8464495 },
  { name: "Level Up - Live Music & Arcade Bar", zone: "A", lat: 1.289512, lng: 103.8450698 },
  { name: "Yin Bar Singapore", zone: "A", lat: 1.2900912, lng: 103.8448906 },
  { name: "Errazuriz", zone: "A", lat: 1.2890072, lng: 103.8453272 },
  { name: "Ichi Singapore", zone: "A", lat: 1.2900995, lng: 103.8456752 },
  { name: "RedTail Bar By Zouk", zone: "A", lat: 1.290948, lng: 103.845856 },
  { name: "Warehouse Bar", zone: "A", lat: 1.290033, lng: 103.8450852 },
  { name: "Chupitos", zone: "A", lat: 1.2901911, lng: 103.8462401 },
  { name: "First Round Bar", zone: "A", lat: 1.2869129, lng: 103.8450223 },
  { name: "Uncabunca", zone: "A", lat: 1.2915513, lng: 103.840913 },
  { name: "Flow", zone: "A", lat: 1.2913028, lng: 103.8413206 },
  { name: "Cocktales", zone: "A", lat: 1.2886871, lng: 103.8438623 },
  { name: "Rosso Vino", zone: "A", lat: 1.2910039, lng: 103.8418306 },
  { name: "The Magic Bar", zone: "A", lat: 1.2871749, lng: 103.8451817 },
  { name: "Wings Bar & Grill", zone: "A", lat: 1.2890397, lng: 103.8443098 },
  { name: "Azzurro Bistro Bar", zone: "B", lat: 1.2816272, lng: 103.848203 },
  { name: "Marquee Bistro & Bar", zone: "B", lat: 1.2844883, lng: 103.8484634 },
  { name: "Kazbar", zone: "B", lat: 1.283605, lng: 103.8486302 },
  { name: "Blu Jaz, Pekin Street", zone: "B", lat: 1.2838137, lng: 103.8482569 },
  { name: "Miss G's Grill & Bar", zone: "B", lat: 1.283264, lng: 103.8486765 },
  { name: "Bar On Chulia", zone: "B", lat: 1.2854944, lng: 103.8489536 },
  { name: "Dingtea Co. Ltd", zone: "B", lat: 1.283228, lng: 103.848288 },
  { name: "Drink Good Beer", zone: "B", lat: 1.2844019, lng: 103.8470546 },
  { name: "The Good Beer Company", zone: "B", lat: 1.2840476, lng: 103.8476204 },
  { name: "LECOQ", zone: "B", lat: 1.2834707, lng: 103.8487683 },
  { name: "Employees Only Singapore", zone: "B", lat: 1.2820556, lng: 103.8476771 },
  { name: "Waa Cow! CIMB Plaza", zone: "B", lat: 1.2841089, lng: 103.852015 },
  { name: "Lime Bar", zone: "B", lat: 1.2856757, lng: 103.8463666 },
  { name: "Yen Bar", zone: "B", lat: 1.2813178, lng: 103.8486311 },
  { name: "Barouv Rooftop Bar", zone: "B", lat: 1.2807689, lng: 103.8454104 },
  { name: "Upward Taproom", zone: "B", lat: 1.2826706, lng: 103.8466074 },
  { name: "Le Bon Funk", zone: "B", lat: 1.2823685, lng: 103.8464917 },
  { name: "Social Bar & Bistro", zone: "B", lat: 1.283202, lng: 103.8508675 },
  { name: "JU95", zone: "C", lat: 1.2866095, lng: 103.8495598 },
  { name: "The Penny Black", zone: "C", lat: 1.285934, lng: 103.849953 },
  { name: "Skinny's Lounge", zone: "C", lat: 1.2885814, lng: 103.8491907 },
  { name: "Charlie's Restaurant & Bar (Boat Quay)", zone: "C", lat: 1.2862228, lng: 103.8498206 },
  { name: "Hero's", zone: "C", lat: 1.2864528, lng: 103.8490608 },
  { name: "Molly Malone's Irish Pub", zone: "C", lat: 1.2859317, lng: 103.849344 },
  { name: "D.F. Cantina by Barbary Coast", zone: "C", lat: 1.2862632, lng: 103.8485319 },
  { name: "Mogambo Bar & Restaurant", zone: "C", lat: 1.286271, lng: 103.849461 },
  { name: "beGIN", zone: "C", lat: 1.2858968, lng: 103.8499393 },
  { name: "Taishike (Boat Quay)", zone: "C", lat: 1.2874247, lng: 103.8490143 },
  { name: "Offtrack", zone: "C", lat: 1.2869115, lng: 103.847206 },
  { name: "Daddy Cool Bar & Bistro", zone: "C", lat: 1.2883343, lng: 103.8477007 },
  { name: "Lucid Bar", zone: "C", lat: 1.2872483, lng: 103.8483362 },
  { name: "Club 69", zone: "C", lat: 1.287064, lng: 103.8481339 },
  { name: "LVLR Rooftop Bar", zone: "C", lat: 1.2877858, lng: 103.8479233 },
  { name: "28 Hongkong St", zone: "C", lat: 1.2876191, lng: 103.8469855 },
  { name: "Jab1", zone: "C", lat: 1.2882168, lng: 103.8489234 },
  { name: "Bar Middle", zone: "C", lat: 1.2875382, lng: 103.8471107 },
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
  { id: "e8", name: "Chef Hat", description: "Take a photo with a chef hat.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e9", name: "Digits", description: "Get a phone number from a stranger (opposite gender to the team member asking).", points: 1, difficulty: "easy" },
  { id: "e10", name: "Kick-Ups", description: "Do 30 kick-ups.", points: 1, difficulty: "easy", requiresVideo: true },
{ id: "e11", name: "Lucky Number Deluxe", description: "Find a stranger whose phone number ends in the same 2 digits as one team member. Photo with visible matching digits on both phones.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e12", name: "The Interview", description: "Conduct a post-match World Cup-style interview with a stranger. 30+ second video.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e13", name: "Full Singlish", description: "Deliver a 30-second continuous speech entirely in Singlish to a local Singaporean. Video plus confirmation from the stranger.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e14", name: "United Nations", description: "Team photo with people from multiple continents. Include nationality/continent proof.", points: 1, difficulty: "easy", requiresPhoto: true },
  { id: "e15", name: "Boo a French Person", description: "Team publicly boos a French person in a playful, consensual way.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e16", name: "Tektonik Dance", description: "At least 3 team members perform a Tektonik dance in public.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e17", name: "Mannequin Challenge", description: "Entire team freezes for 1 full minute in public. Continuous 60-second video.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e18", name: "Fake Reunion", description: "Convince a stranger to act like they are a long-lost friend of a teammate and perform a 30-second emotional reunion.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e19", name: "90th Minute Winner", description: "Film a team celebration pretending you've scored a 90th-minute winner.", points: 1, difficulty: "easy", requiresVideo: true },
  { id: "e20", name: "Pour Your Own", description: "Pour yourself a drink from behind a bar.", points: 1, difficulty: "easy", requiresVideo: true },

  // Medium — 2 points each
  { id: "m1", name: "Bullseye", description: "Hit a bullseye (inner or outer) on a dartboard. Legal throw, video required.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m2", name: "Generous Stranger", description: "Get someone to buy your whole team tequila shots. Photo of consenting party needed.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m3", name: "Shoe Drink", description: "Have a drink out of your shoe. Must be substantive.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m5", name: "Clothes Swap", description: "2 members of the team swap clothes for 1 hour. Must be opposite gender.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m6", name: "Zummi Zummi", description: "Play Zummi Zummi in a bar — loudly.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m7", name: "Football Shirt", description: "Take a photo wearing a football shirt.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m8", name: "Water Gun", description: "Shoot someone with a water gun.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m9", name: "Sing Waka Waka", description: "Stand up as a team and sing Waka Waka. Get more than 2 strangers to join in.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m10", name: "Real Chicken", description: "Take a photo with a real chicken.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m11", name: "Face Paint", description: "Paint your face the colour of a World Cup nation. Chicken must guess correctly on first try.", points: 2, difficulty: "medium", requiresPhoto: true },
{ id: "m13", name: "Human Table", description: "Convince a stranger to act as a table for a drink.", points: 2, difficulty: "medium", requiresPhoto: true },
  { id: "m14", name: "Piggyback Pint", description: "One teammate carries another for a 50m run while holding a full pint.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m15", name: "Durian Dare", description: "Every team member eats durian.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m16", name: "Best Man Speech", description: "Deliver a 60-second wedding speech to at least 5 strangers. At least 3 strangers must applaud.", points: 2, difficulty: "medium", requiresVideo: true },
  { id: "m17", name: "Bar Recruit", description: "Convince a bartender to join your group after their shift. Bonus +2 points if the bartender joins for a drink within 1 hour.", points: 2, difficulty: "medium", requiresVideo: true },

  // Hard — 3 points each
  { id: "h1", name: "The Kiss", description: "One team member must kiss a stranger (on the mouth).", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h2", name: "Boat Quay Swim", description: "Swim in Boat Quay. No need to put your head under the water.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h4", name: "Yes!", description: "Propose to a stranger and they say yes. Video required.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h5", name: "Underwear Photo", description: "Take a photo as a team outside in your underwear. A random person must take the photo.", points: 3, difficulty: "hard", requiresPhoto: true },
  { id: "h6", name: "Split the G", description: "Split the G on a Guinness. Google it. Video required to prove it was done in 1 sip.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h7", name: "Match Maker", description: "Get 2 strangers to kiss each other.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h8", name: "Mum on FaceTime", description: "Get a stranger's mum on FaceTime with the Chicken. Figure out the logistics.", points: 3, difficulty: "hard" },
{ id: "h9", name: "Wedding Crasher", description: "Enter a private event and stay at least 10 minutes. Video/photo inside the event.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h10", name: "Hawker Meal Challenge", description: "One team member must prepare a full meal at a randomly chosen hawker stall.", points: 3, difficulty: "hard", requiresVideo: true },
  { id: "h11", name: "Harlem Shake Challenge", description: "Full team performs a properly edited Harlem Shake video in public.", points: 3, difficulty: "hard", requiresVideo: true },

  // World Cup Nations bonus
  { id: "b1", name: "12 Nations", description: "Find people from 12 World Cup nations. Photographic evidence of their country needed.", points: 2, difficulty: "bonus", requiresPhoto: true },
  { id: "b2", name: "24 Nations", description: "Find people from 24 World Cup nations. Photographic evidence needed.", points: 4, difficulty: "bonus", requiresPhoto: true },
  { id: "b3", name: "48 Nations", description: "Find people from all 48 World Cup nations. Photographic evidence needed.", points: 8, difficulty: "bonus", requiresPhoto: true },

  // Team vs Team — tracked separately
  { id: "t1", name: "Boat Race", description: "Each team selects 3 champions with a full pint each. Relay drinking race. First team to finish all 3 wins.", points: 4, difficulty: "team" },
  { id: "t2", name: "1-on-1 Drink Race", description: "Each team picks a champion. Race to finish a pint or large cocktail (no shots!). First to finish wins.", points: 4, difficulty: "team" },
  { id: "t3", name: "Capital Challenge", description: "Nominate a champion from your team, and challenge another team to name capitals. Last man/woman/chicken/person standing wins. If you don't know anything in 5 seconds, you lose", points: 2, difficulty: "team" },
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
