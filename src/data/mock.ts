export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Interview";

export type Challenge = {
  id: string;
  title: string;
  theme: string;
  difficulty: Difficulty;
  xp: number;
  estMinutes: number;
  completionRate: number;
  story: string;
  objective: string;
};

export type ArenaZone = {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  levelBand: string;
  bgClass: string;
  icon: string;
};

export type DiscussionPost = {
  user: string;
  role: string;
  likes: number;
  comment: string;
  posted: string;
};

export type TopSubmission = {
  user: string;
  runtimeMs: number;
  memoryMb: number;
  language: string;
  submittedAt: string;
};

export type BankQuestion = {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  acceptance: number;
  discussionCount: number;
  bestRuntimeMs: number;
  challengeSlug: string;
  zoneId: string;
};

export const stats = [
  { label: "Active Players", value: "48,240", delta: "+18%" },
  { label: "Question Bank", value: "1,240", delta: "Basic → Advanced" },
  { label: "Arena Zones", value: "12", delta: "Theme based" },
  { label: "Live Discussions", value: "9,380", delta: "Growing" },
];

export const questionCategories = [
  { name: "DataFrame Basics", total: 180, levels: ["Beginner", "Intermediate"] },
  { name: "Joins and Aggregations", total: 220, levels: ["Beginner", "Intermediate", "Advanced"] },
  { name: "Window Functions", total: 140, levels: ["Intermediate", "Advanced"] },
  { name: "Nested JSON and Arrays", total: 110, levels: ["Intermediate", "Advanced"] },
  { name: "Performance and Optimization", total: 210, levels: ["Advanced", "Interview"] },
  { name: "Streaming", total: 90, levels: ["Intermediate", "Advanced", "Interview"] },
  { name: "Delta and Data Modeling", total: 150, levels: ["Intermediate", "Advanced", "Interview"] },
  { name: "Interview Marathon", total: 140, levels: ["Advanced", "Interview"] },
];

export const totalQuestionCount = questionCategories.reduce((sum, item) => sum + item.total, 0);

export const arenaZones: ArenaZone[] = [
  {
    id: "bootcamp-barracks",
    name: "Bootcamp Barracks",
    description: "Warm-up drop zone for schema, select, filter, and casting drills.",
    questionCount: 240,
    levelBand: "Beginner",
    bgClass: "zone-barracks",
    icon: "🛡️",
  },
  {
    id: "junction-docks",
    name: "Junction Docks",
    description: "Join-heavy tactical map with null traps and duplicate explosions.",
    questionCount: 260,
    levelBand: "Beginner → Intermediate",
    bgClass: "zone-docks",
    icon: "⚓",
  },
  {
    id: "window-ridge",
    name: "Window Ridge",
    description: "High-ground map for ranking, lead/lag, and session windows.",
    questionCount: 220,
    levelBand: "Intermediate",
    bgClass: "zone-ridge",
    icon: "🏔️",
  },
  {
    id: "optimizer-wasteland",
    name: "Optimizer Wasteland",
    description: "Hardcore zone where skew, shuffle, and partitioning decide survival.",
    questionCount: 280,
    levelBand: "Advanced",
    bgClass: "zone-wasteland",
    icon: "🔥",
  },
  {
    id: "interview-bunker",
    name: "Interview Bunker",
    description: "Timed raids with hidden test cases and strict performance cutoffs.",
    questionCount: 240,
    levelBand: "Interview",
    bgClass: "zone-bunker",
    icon: "🎯",
  },
];

export const challenges: Challenge[] = [
  {
    id: "escape-null-temple",
    title: "Escape the Null Temple",
    theme: "Escape Room",
    difficulty: "Beginner",
    xp: 120,
    estMinutes: 12,
    completionRate: 76,
    story: "Ancient logs are corrupted by null values. Clean and decode the key columns to open the gate.",
    objective: "Use withColumn, coalesce, and filter to restore a clean clue table.",
  },
  {
    id: "midnight-join-heist",
    title: "Midnight Join Heist",
    theme: "Mystery",
    difficulty: "Intermediate",
    xp: 250,
    estMinutes: 20,
    completionRate: 54,
    story: "Merge witness reports and transaction trails to identify the final suspect.",
    objective: "Perform multi-key joins with null-safe logic and produce ranked suspects.",
  },
  {
    id: "window-wizard-arena",
    title: "Window Wizard Arena",
    theme: "Battle",
    difficulty: "Advanced",
    xp: 390,
    estMinutes: 28,
    completionRate: 37,
    story: "Your rival team controls the scoreboard. Use window functions to overtake them.",
    objective: "Compute streaks, dense rank, lag metrics, and running totals.",
  },
  {
    id: "skew-dragon-boss",
    title: "Skew Dragon Boss",
    theme: "Raid",
    difficulty: "Interview",
    xp: 540,
    estMinutes: 35,
    completionRate: 22,
    story: "A giant skew key is melting your cluster. Refactor the strategy before time expires.",
    objective: "Optimize skewed joins with salting and broadcast-safe transformations.",
  },
];

export const challengeDiscussions: Record<string, DiscussionPost[]> = {
  "escape-null-temple": [
    {
      user: "SparkNomad",
      role: "Top 1%",
      likes: 36,
      comment: "I solved this with `coalesce` first, then used a guard filter before aggregation. Removed one shuffle stage.",
      posted: "2h ago",
    },
    {
      user: "DataPhoenix",
      role: "Mentor",
      likes: 24,
      comment: "Try validating schema early. Many failures come from implicit string to double cast mismatch.",
      posted: "5h ago",
    },
  ],
  "midnight-join-heist": [
    {
      user: "NullHunter",
      role: "Master",
      likes: 19,
      comment: "Null-safe join + pre-filtering right side dataset made runtime much better.",
      posted: "1d ago",
    },
  ],
  "window-wizard-arena": [
    {
      user: "WindowNinja",
      role: "Master",
      likes: 29,
      comment: "Two windows are enough here. Avoid nested windows if you can derive metrics in one pass.",
      posted: "9h ago",
    },
  ],
  "skew-dragon-boss": [
    {
      user: "JoinRanger",
      role: "Diamond",
      likes: 17,
      comment: "Salt strategy with deterministic buckets worked well for me. Kept output stable across retries.",
      posted: "3h ago",
    },
  ],
};

export const topSubmissions: Record<string, TopSubmission[]> = {
  "escape-null-temple": [
    { user: "SparkNomad", runtimeMs: 412, memoryMb: 88, language: "PySpark", submittedAt: "Today 10:12" },
    { user: "CodeVoyager", runtimeMs: 451, memoryMb: 92, language: "PySpark", submittedAt: "Today 10:20" },
    { user: "ByteClutch", runtimeMs: 498, memoryMb: 90, language: "PySpark", submittedAt: "Today 10:27" },
  ],
  "midnight-join-heist": [
    { user: "NullHunter", runtimeMs: 622, memoryMb: 130, language: "PySpark", submittedAt: "Today 09:45" },
    { user: "DataPhoenix", runtimeMs: 681, memoryMb: 142, language: "PySpark", submittedAt: "Today 09:52" },
  ],
  "window-wizard-arena": [
    { user: "WindowNinja", runtimeMs: 704, memoryMb: 151, language: "PySpark", submittedAt: "Today 08:33" },
  ],
  "skew-dragon-boss": [
    { user: "JoinRanger", runtimeMs: 832, memoryMb: 178, language: "PySpark", submittedAt: "Today 07:11" },
  ],
};

const zoneBlueprint: Record<
  string,
  {
    prefix: string;
    categories: string[];
    difficulties: Difficulty[];
    defaultChallenge: string;
  }
> = {
  "bootcamp-barracks": {
    prefix: "Bootcamp",
    categories: ["DataFrame Basics", "Schema", "Filters", "Casting"],
    difficulties: ["Beginner"],
    defaultChallenge: "escape-null-temple",
  },
  "junction-docks": {
    prefix: "Junction",
    categories: ["Join Basics", "Join Strategy", "Aggregation"],
    difficulties: ["Beginner", "Intermediate"],
    defaultChallenge: "midnight-join-heist",
  },
  "window-ridge": {
    prefix: "Window",
    categories: ["Ranking", "Lead/Lag", "Sessionization"],
    difficulties: ["Intermediate", "Advanced"],
    defaultChallenge: "window-wizard-arena",
  },
  "optimizer-wasteland": {
    prefix: "Optimizer",
    categories: ["Skew", "Partitioning", "Shuffle Reduction", "Catalyst"],
    difficulties: ["Advanced", "Interview"],
    defaultChallenge: "skew-dragon-boss",
  },
  "interview-bunker": {
    prefix: "Interview",
    categories: ["Mixed Case", "System Design", "Performance"],
    difficulties: ["Interview"],
    defaultChallenge: "skew-dragon-boss",
  },
};

const challengeByDifficulty: Record<Difficulty, string> = {
  Beginner: "escape-null-temple",
  Intermediate: "midnight-join-heist",
  Advanced: "window-wizard-arena",
  Interview: "skew-dragon-boss",
};

export function getZoneById(zoneId: string) {
  return arenaZones.find((zone) => zone.id === zoneId);
}

export function getQuestionsByZone(zoneId: string, requestedLimit = 60): BankQuestion[] {
  const blueprint = zoneBlueprint[zoneId];
  if (!blueprint) {
    return [];
  }

  const zone = getZoneById(zoneId);
  const maxCount = zone?.questionCount ?? requestedLimit;
  const limit = Math.min(requestedLimit, maxCount);

  const list: BankQuestion[] = [];
  for (let i = 0; i < limit; i += 1) {
    const difficulty = blueprint.difficulties[i % blueprint.difficulties.length];
    const category = blueprint.categories[i % blueprint.categories.length];
    const challengeSlug = challengeByDifficulty[difficulty] ?? blueprint.defaultChallenge;
    const missionNumber = i + 1;

    list.push({
      id: `${zoneId}-${missionNumber}`,
      title: `${blueprint.prefix} Mission ${missionNumber}`,
      category,
      difficulty,
      acceptance: Math.max(18, 83 - (i % 27)),
      discussionCount: 8 + (i % 34),
      bestRuntimeMs: 310 + (i % 9) * 37,
      challengeSlug,
      zoneId,
    });
  }

  return list;
}

export const leaderboard = [
  { rank: 1, player: "SparkNomad", score: 15420, streak: 28, tier: "Conqueror" },
  { rank: 2, player: "DataPhoenix", score: 15180, streak: 23, tier: "Ace" },
  { rank: 3, player: "NullHunter", score: 14970, streak: 19, tier: "Ace" },
  { rank: 4, player: "WindowNinja", score: 14740, streak: 16, tier: "Crown" },
  { rank: 5, player: "JoinRanger", score: 14510, streak: 15, tier: "Crown" },
  { rank: 6, player: "SkewBuster", score: 14110, streak: 12, tier: "Diamond" },
  { rank: 7, player: "CatalystKing", score: 13820, streak: 11, tier: "Diamond" },
  { rank: 8, player: "DeltaPulse", score: 13670, streak: 9, tier: "Platinum" },
];

export const profile = {
  name: "Code Voyager",
  level: 41,
  xp: 24380,
  nextLevelXp: 27500,
  title: "Arena Marshal",
  badges: ["Join Master", "Window Wizard", "Skew Slayer", "Top 5% Season"],
  solved: 486,
  rank: "Platinum II",
  winRate: "72%",
  discussions: 138,
  submissions: 1320,
};
