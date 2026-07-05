import bcrypt from "bcryptjs";

import { arenaZones, challenges, questionCategories, type Difficulty } from "@/data/mock";
import { allCompanies, questionBank } from "@/data/question-bank";
import { ensureDatabaseSchema, sql } from "@/lib/postgres";

type DbUser = {
  id: string;
  name: string;
  email: string;
};

type DbQuestion = {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  category: string;
  difficulty: Difficulty;
  zoneId: string;
  challengeSlug: string;
  acceptance: number;
  bestRuntimeMs: number;
  solvedCount: number;
  companyTags: string[];
  inputSchema?: unknown;
  outputSchema?: unknown;
  constraints?: string[];
  hints?: string[];
  walkthrough?: unknown;
  expectedOutput?: string;
  testCases?: Array<{
    id: string;
    name: string;
    visibility: "public" | "hidden";
    inputSummary: string;
    expectedSummary: string;
    requiredPatterns?: string[];
  }>;
  editorial?: string;
  solvedByMe?: boolean;
  bookmarked?: boolean;
};

type ArenaZoneLobby = {
  id: string;
  name: string;
  description: string;
  levelBand: string;
  bgClass: string;
  icon: string;
  totalQuestions: number;
  matchedQuestions: number;
  popularityScore: number;
  completionPercent: number;
};

type DbDiscussion = {
  id: string;
  challengeSlug: string;
  userId: string;
  userName: string;
  comment: string;
  likes: number;
  createdAt: string;
};

type DbSubmission = {
  id: string;
  userId: string;
  userName: string;
  challengeSlug: string;
  questionId: string;
  score: number;
  runtimeMs: number;
  memoryMb: number;
  status: "passed" | "failed";
  createdAt: string;
};

export type SubmissionJobStatus = "queued" | "running" | "completed" | "failed" | "timed_out";

export type SubmissionJobRecord = {
  id: string;
  userId: string;
  userName: string;
  challengeSlug: string;
  questionId: string;
  code: string;
  executionMode: "safe-sandbox" | "heuristic";
  status: SubmissionJobStatus;
  result?: unknown;
  error?: string;
  timeoutMs: number;
  memoryLimitMb: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

type StoredUser = DbUser & {
  passwordHash: string;
};

export type QuestionQuery = {
  difficulty?: Difficulty | "All";
  company?: string | "All";
  sort?: "recommended" | "difficulty" | "solved" | "acceptance";
  search?: string;
  savedOnly?: boolean;
};

export type ArenaZoneSort = "recommended" | "difficulty" | "popularity";

let readyPromise: Promise<void> | null = null;

declare global {
  var __sparkQuestDbReadyPromise: Promise<void> | undefined;
}

export async function ensureDatabaseReady() {
  if (globalThis.__sparkQuestDbReadyPromise) {
    readyPromise = globalThis.__sparkQuestDbReadyPromise;
  }

  if (readyPromise) {
    return readyPromise;
  }

  readyPromise = (async () => {
    await ensureDatabaseSchema();

    const isProduction = process.env.NODE_ENV === "production";
    const skipSeedCheck = isProduction || process.env.DB_SKIP_SEED_CHECK === "true";
    if (skipSeedCheck) {
      return;
    }

    const countRows = await sql<{ count: number }[]>`select count(*)::int as count from questions`;
    const total = Number(countRows[0]?.count ?? 0);

    const metadataRows = await sql<
      {
        has_description: boolean;
        has_company_tags: boolean;
        has_solved_count: boolean;
        has_problem_statement: boolean;
        has_input_schema: boolean;
        has_output_schema: boolean;
        has_test_cases: boolean;
        has_editorial: boolean;
      }[]
    >`
      select
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'description') as has_description,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'company_tags') as has_company_tags,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'solved_count') as has_solved_count,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'problem_statement') as has_problem_statement,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'input_schema') as has_input_schema,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'output_schema') as has_output_schema,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'test_cases') as has_test_cases,
        exists(select 1 from information_schema.columns where table_name = 'questions' and column_name = 'editorial') as has_editorial
    `;

    const metadata = metadataRows[0];

    if (
      total === questionBank.length &&
      metadata?.has_description &&
      metadata?.has_company_tags &&
      metadata?.has_solved_count &&
      metadata?.has_problem_statement &&
      metadata?.has_input_schema &&
      metadata?.has_output_schema &&
      metadata?.has_test_cases &&
      metadata?.has_editorial
    ) {
      return;
    }

    await sql`delete from questions`;

    for (const q of questionBank) {
      await sql`
        insert into questions (
          id, title, description, problem_statement, category, difficulty, zone_id, challenge_slug, 
          acceptance, best_runtime_ms, solved_count, company_tags, input_schema, output_schema, 
          constraints, hints, walkthrough, expected_output, test_cases, editorial
        )
        values (
          ${q.id},
          ${q.title},
          ${q.description},
          ${q.problemStatement},
          ${q.category},
          ${q.difficulty},
          ${q.zoneId},
          ${q.challengeSlug},
          ${q.acceptance},
          ${q.bestRuntimeMs},
          ${q.solvedCount},
          ${q.companyTags},
          ${JSON.stringify(q.inputSchema ?? null)},
          ${JSON.stringify(q.outputSchema ?? null)},
          ${q.constraints ?? []},
          ${q.hints ?? []},
          ${JSON.stringify(q.walkthrough ?? null)},
          ${q.expectedOutput ?? null},
          ${JSON.stringify(q.testCases ?? [])},
          ${q.editorial ?? ""}
        )
        on conflict (id) do nothing
      `;
    }
  })();

  globalThis.__sparkQuestDbReadyPromise = readyPromise;

  return readyPromise;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseJsonColumn<T>(value: unknown): T | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  return value as T;
}

export function getChallengeBySlug(slug: string) {
  return challenges.find((item) => item.id === slug) ?? null;
}

export async function getQuestionsByZone(zoneId: string, page = 1, pageSize = 30, query: QuestionQuery = {}, userId?: string) {
  await ensureDatabaseReady();
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));
  const normalizedSearch = query.search?.trim().toLowerCase() ?? "";
  const difficulty = query.difficulty ?? "All";
  const company = query.company ?? "All";
  const savedOnly = Boolean(query.savedOnly);
  const userIdOrNull = userId ?? null;

  if (savedOnly && !userId) {
    return {
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      items: [],
    };
  }

  const sort = query.sort ?? "recommended";
  const orderByClause =
    sort === "difficulty"
      ? "case q.difficulty when 'Beginner' then 1 when 'Intermediate' then 2 when 'Advanced' then 3 when 'Interview' then 4 else 99 end asc, q.solved_count desc"
      : sort === "solved"
        ? "q.solved_count desc, case q.difficulty when 'Beginner' then 1 when 'Intermediate' then 2 when 'Advanced' then 3 when 'Interview' then 4 else 99 end asc"
        : sort === "acceptance"
          ? "q.acceptance desc, q.solved_count desc"
          : "q.solved_count desc, q.best_runtime_ms asc";

  const likeSearch = `%${normalizedSearch}%`;
  const start = (safePage - 1) * safePageSize;

  const [countRows, rows] = await Promise.all([
    sql<{ count: number }[]>`
      select count(*)::int as count
      from questions q
      where q.zone_id = ${zoneId}
        and (${difficulty} = 'All' or q.difficulty = ${difficulty})
        and (${company} = 'All' or ${company} = any(q.company_tags))
        and (${normalizedSearch} = '' or lower(q.title || ' ' || q.description || ' ' || q.category || ' ' || array_to_string(q.company_tags, ' ')) like ${likeSearch})
        and (${savedOnly ? 1 : 0} = 0 or exists (
          select 1
          from bookmarks b
          where b.user_id = ${userIdOrNull}
            and b.question_id = q.id
        ))
    `,
    sql<
      {
        id: string;
        title: string;
        description: string;
        category: string;
        difficulty: Difficulty;
        zone_id: string;
        challenge_slug: string;
        acceptance: number;
        best_runtime_ms: number;
        solved_count: number;
        company_tags: string[];
        solved_by_me: boolean;
        bookmarked: boolean;
      }[]
    >`
      select
        q.id,
        q.title,
        q.description,
        q.category,
        q.difficulty,
        q.zone_id,
        q.challenge_slug,
        q.acceptance,
        q.best_runtime_ms,
        q.solved_count,
        q.company_tags,
        exists (
          select 1
          from submissions s
          where s.user_id = ${userIdOrNull}
            and s.question_id = q.id
            and s.status = 'passed'
        ) as solved_by_me,
        exists (
          select 1
          from bookmarks b
          where b.user_id = ${userIdOrNull}
            and b.question_id = q.id
        ) as bookmarked
      from questions q
      where q.zone_id = ${zoneId}
        and (${difficulty} = 'All' or q.difficulty = ${difficulty})
        and (${company} = 'All' or ${company} = any(q.company_tags))
        and (${normalizedSearch} = '' or lower(q.title || ' ' || q.description || ' ' || q.category || ' ' || array_to_string(q.company_tags, ' ')) like ${likeSearch})
        and (${savedOnly ? 1 : 0} = 0 or exists (
          select 1
          from bookmarks b
          where b.user_id = ${userIdOrNull}
            and b.question_id = q.id
        ))
      order by ${sql.unsafe(orderByClause)}
      limit ${safePageSize}
      offset ${start}
    `,
  ]);

  const items: DbQuestion[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    problemStatement: "",
    category: item.category,
    difficulty: item.difficulty,
    zoneId: item.zone_id,
    challengeSlug: item.challenge_slug,
    acceptance: Number(item.acceptance),
    bestRuntimeMs: Number(item.best_runtime_ms),
    solvedCount: Number(item.solved_count),
    companyTags: item.company_tags ?? [],
    solvedByMe: Boolean(item.solved_by_me),
    bookmarked: Boolean(item.bookmarked),
  }));

  return {
    total: Number(countRows[0]?.count ?? 0),
    page: safePage,
    pageSize: safePageSize,
    items,
  };
}

export async function getQuestionById(questionId: string, userId?: string): Promise<DbQuestion | null> {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      title: string;
      description: string;
      problem_statement: string;
      category: string;
      difficulty: Difficulty;
      zone_id: string;
      challenge_slug: string;
      acceptance: number;
      best_runtime_ms: number;
      solved_count: number;
      company_tags: string[];
      input_schema: unknown;
      output_schema: unknown;
      constraints: string[] | null;
      hints: string[] | null;
      walkthrough: unknown;
      expected_output: string | null;
      test_cases: unknown;
      editorial: string;
    }[]
  >`
    select id, title, description, problem_statement, category, difficulty, zone_id, challenge_slug, acceptance, best_runtime_ms, solved_count, company_tags, input_schema, output_schema, constraints, hints, walkthrough, expected_output, test_cases, editorial
    from questions
    where id = ${questionId}
    limit 1
  `;

  const item = rows[0];
  if (!item) {
    return null;
  }

  let solvedByMe = false;
  let bookmarked = false;

  if (userId) {
    const [solvedRows, bookmarkedRows] = await Promise.all([
      sql<{ exists: boolean }[]>`
        select exists(
          select 1
          from submissions
          where user_id = ${userId} and question_id = ${questionId} and status = 'passed'
        ) as exists
      `,
      sql<{ exists: boolean }[]>`
        select exists(
          select 1
          from bookmarks
          where user_id = ${userId} and question_id = ${questionId}
        ) as exists
      `,
    ]);

    solvedByMe = Boolean(solvedRows[0]?.exists);
    bookmarked = Boolean(bookmarkedRows[0]?.exists);
  }

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    problemStatement: item.problem_statement,
    category: item.category,
    difficulty: item.difficulty,
    zoneId: item.zone_id,
    challengeSlug: item.challenge_slug,
    acceptance: Number(item.acceptance),
    bestRuntimeMs: Number(item.best_runtime_ms),
    solvedCount: Number(item.solved_count),
    companyTags: item.company_tags ?? [],
    inputSchema: parseJsonColumn(item.input_schema),
    outputSchema: parseJsonColumn(item.output_schema),
    constraints: item.constraints ?? [],
    hints: item.hints ?? [],
    walkthrough: parseJsonColumn(item.walkthrough),
    expectedOutput: item.expected_output ?? undefined,
    testCases: parseJsonColumn(item.test_cases),
    editorial: item.editorial,
    solvedByMe,
    bookmarked,
  };
}

export function getAllCompanies() {
  return allCompanies;
}

export async function getArenaLobbyZones(options: {
  company?: string | "All";
  sort?: ArenaZoneSort;
  userId?: string;
} = {}): Promise<ArenaZoneLobby[]> {
  await ensureDatabaseReady();

  const company = options.company ?? "All";
  const sort = options.sort ?? "recommended";

  const zoneRows = await sql<
    {
      zone_id: string;
      matched_count: number;
      popularity_score: number;
    }[]
  >`
    select
      zone_id,
      count(*)::int as matched_count,
      coalesce(sum(solved_count), 0)::int as popularity_score
    from questions
    where (${company} = 'All' or ${company} = any(company_tags))
    group by zone_id
  `;

  const matchedByZone = new Map(zoneRows.map((row) => [row.zone_id, { matchedCount: Number(row.matched_count), popularity: Number(row.popularity_score) }]));

  const solvedByZone = new Map<string, number>();
  if (options.userId) {
    const solvedRows = await sql<
      {
        zone_id: string;
        solved_count: number;
      }[]
    >`
      select
        q.zone_id,
        count(distinct s.question_id)::int as solved_count
      from submissions s
      join questions q on q.id = s.question_id
      where s.user_id = ${options.userId}
        and s.status = 'passed'
        and (${company} = 'All' or ${company} = any(q.company_tags))
      group by q.zone_id
    `;

    for (const row of solvedRows) {
      solvedByZone.set(row.zone_id, Number(row.solved_count));
    }
  }

  const difficultyScore: Record<string, number> = {
    "bootcamp-barracks": 1,
    "junction-docks": 2,
    "window-ridge": 3,
    "optimizer-wasteland": 4,
    "interview-bunker": 5,
  };

  const zones = arenaZones.map((zone) => {
    const matched = matchedByZone.get(zone.id)?.matchedCount ?? 0;
    const popularityScore = matchedByZone.get(zone.id)?.popularity ?? 0;
    const solved = solvedByZone.get(zone.id) ?? 0;
    const completionPercent = matched === 0 ? 0 : Math.round((solved / matched) * 100);

    return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      levelBand: zone.levelBand,
      bgClass: zone.bgClass,
      icon: zone.icon,
      totalQuestions: zone.questionCount,
      matchedQuestions: matched,
      popularityScore,
      completionPercent,
    } satisfies ArenaZoneLobby;
  });

  return zones.sort((a, b) => {
    if (sort === "difficulty") {
      return (difficultyScore[a.id] ?? 99) - (difficultyScore[b.id] ?? 99);
    }

    if (sort === "popularity") {
      return b.popularityScore - a.popularityScore || b.matchedQuestions - a.matchedQuestions;
    }

    return b.matchedQuestions - a.matchedQuestions || b.popularityScore - a.popularityScore;
  });
}

export async function getSolvedProgressByZone(userId: string) {
  await ensureDatabaseReady();

  const rows = await sql<
    {
      zone_id: string;
      solved_count: number;
    }[]
  >`
    select q.zone_id, count(distinct s.question_id)::int as solved_count
    from submissions s
    join questions q on q.id = s.question_id
    where s.user_id = ${userId} and s.status = 'passed'
    group by q.zone_id
  `;

  const solvedMap = new Map(rows.map((row) => [row.zone_id, Number(row.solved_count)]));

  return arenaZones.map((zone) => {
    const solved = solvedMap.get(zone.id) ?? 0;
    const total = zone.questionCount;
    return {
      zoneId: zone.id,
      solved,
      total,
      percent: total === 0 ? 0 : Math.round((solved / total) * 100),
    };
  });
}

export async function getBookmarkedQuestionIds(userId: string) {
  await ensureDatabaseReady();
  const rows = await sql<{ question_id: string }[]>`
    select question_id
    from bookmarks
    where user_id = ${userId}
  `;
  return rows.map((row) => row.question_id);
}

export async function addBookmark(userId: string, questionId: string) {
  await ensureDatabaseReady();
  await sql`
    insert into bookmarks (user_id, question_id)
    values (${userId}, ${questionId})
    on conflict (user_id, question_id) do nothing
  `;
  return { ok: true as const };
}

export async function removeBookmark(userId: string, questionId: string) {
  await ensureDatabaseReady();
  await sql`
    delete from bookmarks
    where user_id = ${userId} and question_id = ${questionId}
  `;
  return { ok: true as const };
}

export async function getBookmarkedQuestions(userId: string, limit = 100) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      title: string;
      description: string;
      difficulty: Difficulty;
      zone_id: string;
      category: string;
      solved_count: number;
      bookmarked_at: Date;
    }[]
  >`
    select q.id, q.title, q.description, q.difficulty, q.zone_id, q.category, q.solved_count, b.created_at as bookmarked_at
    from bookmarks b
    join questions q on q.id = b.question_id
    where b.user_id = ${userId}
    order by b.created_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    zoneId: row.zone_id,
    category: row.category,
    solvedCount: Number(row.solved_count),
    bookmarkedAt: toIsoString(row.bookmarked_at),
  }));
}

export async function getRecommendedQuestions(userId: string, limit = 8) {
  await ensureDatabaseReady();

  const rows = await sql<
    {
      id: string;
      title: string;
      description: string;
      difficulty: Difficulty;
      zone_id: string;
      category: string;
      solved_count: number;
      acceptance: number;
    }[]
  >`
    with solved as (
      select distinct question_id
      from submissions
      where user_id = ${userId} and status = 'passed'
    )
    select q.id, q.title, q.description, q.difficulty, q.zone_id, q.category, q.solved_count, q.acceptance
    from questions q
    left join solved s on s.question_id = q.id
    where s.question_id is null
    order by q.acceptance desc, q.solved_count desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    zoneId: row.zone_id,
    category: row.category,
    solvedCount: Number(row.solved_count),
    acceptance: Number(row.acceptance),
  }));
}

export async function getSubmissionHeatmap(userId: string, days = 45) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      day: string;
      submissions: number;
      solved: number;
    }[]
  >`
    select
      to_char(created_at::date, 'YYYY-MM-DD') as day,
      count(*)::int as submissions,
      count(*) filter (where status = 'passed')::int as solved
    from submissions
    where user_id = ${userId}
      and created_at >= now() - make_interval(days => ${days})
    group by created_at::date
    order by created_at::date asc
  `;

  return rows.map((row) => ({
    day: row.day,
    submissions: Number(row.submissions),
    solved: Number(row.solved),
  }));
}

export async function getQuestionCatalog(search = "", limit = 200) {
  await ensureDatabaseReady();
  const normalized = `%${search.trim().toLowerCase()}%`;
  const rows = await sql<
    {
      id: string;
      title: string;
      difficulty: Difficulty;
      zone_id: string;
      category: string;
      company_tags: string[];
      solved_count: number;
      acceptance: number;
    }[]
  >`
    select id, title, difficulty, zone_id, category, company_tags, solved_count, acceptance
    from questions
    where (${search.trim()} = '' or lower(title) like ${normalized} or lower(category) like ${normalized})
    order by id asc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    zoneId: row.zone_id,
    category: row.category,
    companyTags: row.company_tags ?? [],
    solvedCount: Number(row.solved_count),
    acceptance: Number(row.acceptance),
  }));
}

export async function getDiscussionByChallenge(slug: string) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      challenge_slug: string;
      user_id: string;
      user_name: string;
      comment: string;
      likes: number;
      created_at: Date;
    }[]
  >`
    select id, challenge_slug, user_id, user_name, comment, likes, created_at
    from discussions
    where challenge_slug = ${slug}
    order by created_at desc
    limit 50
  `;

  return rows.map((item): DbDiscussion => ({
    id: item.id,
    challengeSlug: item.challenge_slug,
    userId: item.user_id,
    userName: item.user_name,
    comment: item.comment,
    likes: Number(item.likes),
    createdAt: toIsoString(item.created_at),
  }));
}

export async function addDiscussion(input: { slug: string; userId: string; userName: string; comment: string }) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      challenge_slug: string;
      user_id: string;
      user_name: string;
      comment: string;
      likes: number;
      created_at: Date;
    }[]
  >`
    insert into discussions (challenge_slug, user_id, user_name, comment, likes)
    values (${input.slug}, ${input.userId}, ${input.userName}, ${input.comment}, 0)
    returning id, challenge_slug, user_id, user_name, comment, likes, created_at
  `;

  const created = rows[0];
  return {
    id: created.id,
    challengeSlug: created.challenge_slug,
    userId: created.user_id,
    userName: created.user_name,
    comment: created.comment,
    likes: Number(created.likes),
    createdAt: toIsoString(created.created_at),
  };
}

export async function deleteDiscussion(input: { discussionId: string; userId: string }) {
  await ensureDatabaseReady();

  const ownDelete = await sql<{ id: string }[]>`
    delete from discussions
    where id = ${input.discussionId} and user_id = ${input.userId}
    returning id
  `;

  if (ownDelete.length > 0) {
    return { ok: true as const };
  }

  const exists = await sql<{ id: string }[]>`select id from discussions where id = ${input.discussionId} limit 1`;
  if (exists.length === 0) {
    return { error: "Discussion not found." as const };
  }

  return { error: "You can delete only your own comments." as const };
}

export async function reportDiscussion(input: { discussionId: string; reporterUserId: string; reason: string }) {
  await ensureDatabaseReady();
  await sql`
    insert into discussion_reports (discussion_id, reporter_user_id, reason)
    values (${input.discussionId}, ${input.reporterUserId}, ${input.reason})
    on conflict (discussion_id, reporter_user_id) do update set reason = excluded.reason
  `;
  return { ok: true as const };
}

export async function getModerationQueue(limit = 100) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      discussion_id: string;
      comment: string;
      challenge_slug: string;
      report_count: number;
      latest_reason: string;
      latest_reported_at: Date;
    }[]
  >`
    select
      d.id as discussion_id,
      d.comment,
      d.challenge_slug,
      count(r.id)::int as report_count,
      max(r.reason) as latest_reason,
      max(r.created_at) as latest_reported_at
    from discussions d
    join discussion_reports r on r.discussion_id = d.id
    group by d.id, d.comment, d.challenge_slug
    order by report_count desc, latest_reported_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    discussionId: row.discussion_id,
    comment: row.comment,
    challengeSlug: row.challenge_slug,
    reportCount: Number(row.report_count),
    latestReason: row.latest_reason,
    latestReportedAt: toIsoString(row.latest_reported_at),
  }));
}

export async function getSubmissionsByChallenge(slug: string) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      score: number;
      runtime_ms: number;
      memory_mb: number;
      status: "passed" | "failed";
      created_at: Date;
    }[]
  >`
    select id, user_id, user_name, challenge_slug, question_id, score, runtime_ms, memory_mb, status, created_at
    from submissions
    where challenge_slug = ${slug} and status = 'passed'
    order by runtime_ms asc
    limit 20
  `;

  return rows.map((item): DbSubmission => ({
    id: item.id,
    userId: item.user_id,
    userName: item.user_name,
    challengeSlug: item.challenge_slug,
    questionId: item.question_id,
    score: Number(item.score),
    runtimeMs: Number(item.runtime_ms),
    memoryMb: Number(item.memory_mb),
    status: item.status,
    createdAt: toIsoString(item.created_at),
  }));
}

export async function addSubmission(input: {
  userId: string;
  userName: string;
  slug: string;
  questionId: string;
  score: number;
  runtimeMs: number;
  memoryMb: number;
  status: "passed" | "failed";
}) {
  await ensureDatabaseReady();

  const rows = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      score: number;
      runtime_ms: number;
      memory_mb: number;
      status: "passed" | "failed";
      created_at: Date;
    }[]
  >`
    insert into submissions (user_id, user_name, challenge_slug, question_id, score, runtime_ms, memory_mb, status)
    values (${input.userId}, ${input.userName}, ${input.slug}, ${input.questionId}, ${input.score}, ${input.runtimeMs}, ${input.memoryMb}, ${input.status})
    returning id, user_id, user_name, challenge_slug, question_id, score, runtime_ms, memory_mb, status, created_at
  `;

  const submission = rows[0];

  if (input.status === "passed") {
    await sql`
      update questions
      set solved_count = solved_count + 1
      where id = ${input.questionId}
    `;
  }

  return {
    id: submission.id,
    userId: submission.user_id,
    userName: submission.user_name,
    challengeSlug: submission.challenge_slug,
    questionId: submission.question_id,
    score: Number(submission.score),
    runtimeMs: Number(submission.runtime_ms),
    memoryMb: Number(submission.memory_mb),
    status: submission.status,
    createdAt: toIsoString(submission.created_at),
  };
}

function mapSubmissionJob(row: {
  id: string;
  user_id: string;
  user_name: string;
  challenge_slug: string;
  question_id: string;
  code: string;
  execution_mode: "safe-sandbox" | "heuristic";
  status: SubmissionJobStatus;
  result: unknown;
  error: string | null;
  timeout_ms: number;
  memory_limit_mb: number;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}): SubmissionJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    challengeSlug: row.challenge_slug,
    questionId: row.question_id,
    code: row.code,
    executionMode: row.execution_mode,
    status: row.status,
    result: parseJsonColumn(row.result),
    error: row.error ?? undefined,
    timeoutMs: Number(row.timeout_ms),
    memoryLimitMb: Number(row.memory_limit_mb),
    createdAt: toIsoString(row.created_at),
    startedAt: row.started_at ? toIsoString(row.started_at) : undefined,
    finishedAt: row.finished_at ? toIsoString(row.finished_at) : undefined,
  };
}

export async function createSubmissionJob(input: {
  userId: string;
  userName: string;
  challengeSlug: string;
  questionId: string;
  code: string;
  executionMode: "safe-sandbox" | "heuristic";
  timeoutMs: number;
  memoryLimitMb: number;
}) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      code: string;
      execution_mode: "safe-sandbox" | "heuristic";
      status: SubmissionJobStatus;
      result: unknown;
      error: string | null;
      timeout_ms: number;
      memory_limit_mb: number;
      created_at: Date;
      started_at: Date | null;
      finished_at: Date | null;
    }[]
  >`
    insert into submission_jobs (user_id, user_name, challenge_slug, question_id, code, execution_mode, timeout_ms, memory_limit_mb)
    values (${input.userId}, ${input.userName}, ${input.challengeSlug}, ${input.questionId}, ${input.code}, ${input.executionMode}, ${input.timeoutMs}, ${input.memoryLimitMb})
    returning id, user_id, user_name, challenge_slug, question_id, code, execution_mode, status, result, error, timeout_ms, memory_limit_mb, created_at, started_at, finished_at
  `;

  return mapSubmissionJob(rows[0]);
}

export async function getSubmissionJobById(jobId: string) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      code: string;
      execution_mode: "safe-sandbox" | "heuristic";
      status: SubmissionJobStatus;
      result: unknown;
      error: string | null;
      timeout_ms: number;
      memory_limit_mb: number;
      created_at: Date;
      started_at: Date | null;
      finished_at: Date | null;
    }[]
  >`
    select id, user_id, user_name, challenge_slug, question_id, code, execution_mode, status, result, error, timeout_ms, memory_limit_mb, created_at, started_at, finished_at
    from submission_jobs
    where id = ${jobId}
    limit 1
  `;

  const row = rows[0];
  return row ? mapSubmissionJob(row) : null;
}

export async function claimSubmissionJob(jobId: string, userId: string) {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      code: string;
      execution_mode: "safe-sandbox" | "heuristic";
      status: SubmissionJobStatus;
      result: unknown;
      error: string | null;
      timeout_ms: number;
      memory_limit_mb: number;
      created_at: Date;
      started_at: Date | null;
      finished_at: Date | null;
    }[]
  >`
    update submission_jobs
    set status = 'running', started_at = now(), error = null
    where id = ${jobId} and user_id = ${userId} and status = 'queued'
    returning id, user_id, user_name, challenge_slug, question_id, code, execution_mode, status, result, error, timeout_ms, memory_limit_mb, created_at, started_at, finished_at
  `;

  const row = rows[0];
  return row ? mapSubmissionJob(row) : null;
}

export async function completeSubmissionJob(jobId: string, result: unknown) {
  await ensureDatabaseReady();
  await sql`
    update submission_jobs
    set status = 'completed', result = ${JSON.stringify(result)}, finished_at = now(), error = null
    where id = ${jobId}
  `;
}

export async function failSubmissionJob(jobId: string, errorMessage: string) {
  await ensureDatabaseReady();
  await sql`
    update submission_jobs
    set status = 'failed', error = ${errorMessage.slice(0, 700)}, finished_at = now()
    where id = ${jobId}
  `;
}

export async function timeoutSubmissionJob(jobId: string, errorMessage: string) {
  await ensureDatabaseReady();
  await sql`
    update submission_jobs
    set status = 'timed_out', error = ${errorMessage.slice(0, 700)}, finished_at = now()
    where id = ${jobId}
  `;
}

export async function createUser(input: { name: string; email: string; password: string }) {
  await ensureDatabaseReady();
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    const rows = await sql<{ id: string; name: string; email: string; created_at: Date }[]>`
      insert into users (name, email, password_hash)
      values (${input.name.trim()}, ${normalizedEmail}, ${bcrypt.hashSync(input.password, 10)})
      returning id, name, email, created_at
    `;

    const user = rows[0];
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "23505") {
      return { error: "Email already registered." as const };
    }
    throw error;
  }
}

export async function loginUser(input: { email: string; password: string }) {
  await ensureDatabaseReady();
  const normalizedEmail = input.email.trim().toLowerCase();

  const rows = await sql<
    {
      id: string;
      name: string;
      email: string;
      password_hash: string;
    }[]
  >`
    select id, name, email, password_hash
    from users
    where lower(email) = ${normalizedEmail}
    limit 1
  `;

  const user = rows[0];
  if (!user) {
    return { error: "Invalid credentials." as const };
  }

  const ok = bcrypt.compareSync(input.password, user.password_hash);
  if (!ok) {
    return { error: "Invalid credentials." as const };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  await ensureDatabaseReady();
  const rows = await sql<{ id: string; name: string; email: string }[]>`
    select id, name, email
    from users
    where id = ${userId}
    limit 1
  `;

  const user = rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function getUserWithPasswordById(userId: string): Promise<StoredUser | null> {
  await ensureDatabaseReady();
  const rows = await sql<{ id: string; name: string; email: string; password_hash: string }[]>`
    select id, name, email, password_hash
    from users
    where id = ${userId}
    limit 1
  `;

  const user = rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
  };
}

export async function getLeaderboard(limit = 50) {
  await ensureDatabaseReady();

  const submissions = await sql<
    {
      user_id: string;
      user_name: string;
      question_id: string;
      score: number;
      status: "passed" | "failed";
      runtime_ms: number;
    }[]
  >`
    select user_id, user_name, question_id, score, status, runtime_ms
    from submissions
  `;

  // Track total attempts per user
  const userAttempts = new Map<string, { userId: string; userName: string; attempts: number }>();
  for (const s of submissions) {
    const u = userAttempts.get(s.user_id);
    if (u) {
      u.attempts += 1;
    } else {
      userAttempts.set(s.user_id, { userId: s.user_id, userName: s.user_name, attempts: 1 });
    }
  }

  // Best score per (user, question) to prevent stacking on retries
  const bestByKey = new Map<string, { score: number; passed: boolean; runtimeMs: number }>();
  for (const s of submissions) {
    const key = `${s.user_id}:${s.question_id}`;
    const curr = bestByKey.get(key);
    const score = Number(s.score);
    const runtimeMs = Number(s.runtime_ms);
    if (!curr || score > curr.score || (score === curr.score && s.status === "passed" && !curr.passed)) {
      bestByKey.set(key, { score, passed: s.status === "passed", runtimeMs });
    }
  }

  // Aggregate best scores to per-user totals
  const byUser = new Map<string, { userId: string; userName: string; totalScore: number; bestRuntimeMs: number; solved: number; attempts: number }>();

  for (const [key, best] of bestByKey) {
    const userId = key.split(":")[0];
    const info = userAttempts.get(userId);
    if (!info) continue;
    const curr = byUser.get(userId) ?? {
      userId,
      userName: info.userName,
      totalScore: 0,
      bestRuntimeMs: Number.POSITIVE_INFINITY,
      solved: 0,
      attempts: info.attempts,
    };
    // Only award score for passed submissions — ignores non-zero scores on old failed rows
    curr.totalScore += best.passed ? best.score : 0;
    if (best.passed) {
      curr.solved += 1;
      curr.bestRuntimeMs = Math.min(curr.bestRuntimeMs, best.runtimeMs);
    }
    byUser.set(userId, curr);
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map((item, idx) => ({
      rank: idx + 1,
      player: item.userName,
      score: item.totalScore,
      solved: item.solved,
      attempts: item.attempts,
      bestRuntimeMs: Number.isFinite(item.bestRuntimeMs) ? item.bestRuntimeMs : 0,
      tier: item.totalScore > 12000 ? "Conqueror" : item.totalScore > 7000 ? "Ace" : item.totalScore > 3000 ? "Crown" : "Rookie",
    }));
}

export async function getProfile(userId: string) {
  await ensureDatabaseReady();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const submissions = await sql<
    {
      id: string;
      user_id: string;
      user_name: string;
      challenge_slug: string;
      question_id: string;
      score: number;
      runtime_ms: number;
      memory_mb: number;
      status: "passed" | "failed";
      created_at: Date;
    }[]
  >`
    select id, user_id, user_name, challenge_slug, question_id, score, runtime_ms, memory_mb, status, created_at
    from submissions
    where user_id = ${userId}
    order by created_at desc
  `;

  const discussionRows = await sql<{ count: number }[]>`
    select count(*)::int as count
    from discussions
    where user_id = ${userId}
  `;

  const solvedSet = new Set(submissions.filter((item) => item.status === "passed").map((item) => item.question_id));

  // Use best (highest) score per unique question, passed submissions only
  // This correctly handles old DB rows where failed submissions have non-zero scores
  const bestScoreByQuestion = new Map<string, number>();
  for (const s of submissions) {
    if (s.status !== "passed") continue;
    const prev = bestScoreByQuestion.get(s.question_id) ?? 0;
    if (Number(s.score) > prev) {
      bestScoreByQuestion.set(s.question_id, Number(s.score));
    }
  }
  const totalScore = Array.from(bestScoreByQuestion.values()).reduce((sum, v) => sum + v, 0);

  const level = Math.max(1, Math.floor(totalScore / 600) + 1);
  const nextLevelScore = level * 600;
  const winRate = submissions.length === 0 ? 0 : Math.round((solvedSet.size / submissions.length) * 100);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    level,
    score: totalScore,
    nextLevelScore,
    solved: solvedSet.size,
    submissions: submissions.length,
    discussions: Number(discussionRows[0]?.count ?? 0),
    winRate,
    recentSubmissions: submissions.slice(0, 8).map((item) => ({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      challengeSlug: item.challenge_slug,
      questionId: item.question_id,
      score: Number(item.score),
      runtimeMs: Number(item.runtime_ms),
      memoryMb: Number(item.memory_mb),
      status: item.status,
      createdAt: toIsoString(item.created_at),
    })),
  };
}

export async function getOverview() {
  await ensureDatabaseReady();

  const [activeUsersRow] = await sql<{ count: number }[]>`select count(*)::int as count from users`;
  const [totalQuestionsRow] = await sql<{ count: number }[]>`select count(*)::int as count from questions`;
  const [totalDiscussionsRow] = await sql<{ count: number }[]>`select count(*)::int as count from discussions`;
  const [totalSubmissionsRow] = await sql<{ count: number }[]>`select count(*)::int as count from submissions`;

  return {
    activeUsers: Number(activeUsersRow?.count ?? 0),
    totalQuestions: Number(totalQuestionsRow?.count ?? 0),
    totalDiscussions: Number(totalDiscussionsRow?.count ?? 0),
    totalSubmissions: Number(totalSubmissionsRow?.count ?? 0),
  };
}
