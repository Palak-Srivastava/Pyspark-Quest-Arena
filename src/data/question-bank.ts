import { arenaZones, type Difficulty } from "@/data/mock";

export type TableColumn = {
  name: string;
  type: string;
  description: string;
};

export type InputSchemaTable = {
  name: string;
  columns: TableColumn[];
  sampleRows: Record<string, unknown>[];
};

export type OutputSchemaTable = {
  name: string;
  columns: TableColumn[];
  expectedRowCount?: string;
};

export type SeedQuestion = {
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
  
  // New professional schema
  inputSchema: InputSchemaTable[];
  outputSchema: OutputSchemaTable[];
  constraints: string[];
  hints: string[];
  walkthrough: {
    explanation: string;
    step1: string;
    step2: string;
    step3?: string;
  };
  expectedOutput?: string;
  testCases: Array<{
    id: string;
    name: string;
    visibility: "public" | "hidden";
    inputSummary: string;
    expectedSummary: string;
    requiredPatterns?: string[];
  }>;
  editorial: string;
};

const difficultyByZone: Record<string, Difficulty[]> = {
  "bootcamp-barracks": ["Beginner"],
  "junction-docks": ["Beginner", "Intermediate"],
  "window-ridge": ["Intermediate", "Advanced"],
  "optimizer-wasteland": ["Advanced", "Interview"],
  "interview-bunker": ["Interview"],
};

const challengeByZone: Record<string, string> = {
  "bootcamp-barracks": "escape-null-temple",
  "junction-docks": "midnight-join-heist",
  "window-ridge": "window-wizard-arena",
  "optimizer-wasteland": "skew-dragon-boss",
  "interview-bunker": "skew-dragon-boss",
};

const companies = [
  "Amazon", "Google", "Meta", "Microsoft", "Netflix", "Uber", "Airbnb",
  "Databricks", "Snowflake", "LinkedIn", "Apple", "Walmart", "Adobe",
  "Stripe", "PayPal", "Intuit", "Salesforce", "Oracle", "Bloomberg",
  "American Airlines", "Capital One", "DoorDash", "Twilio", "Coinbase",
  "Spotify", "Expedia", "Shopify", "Visa", "JPMorgan", "NVIDIA", "Tesla",
];

function formatSchemaTable(columns: TableColumn[]) {
  const header1 = "| Column Name | Type    |";
  const header2 = "|-------------|---------|";
  const body = columns.map((column) => `| ${column.name} | ${column.type} |`).join("\n");
  return `${header1}\n${header2}\n${body}`;
}

function formatSampleRows(table: InputSchemaTable) {
  const keys = table.columns.map((column) => column.name);
  const header = `| ${keys.join(" | ")} |`;
  const sep = `| ${keys.map(() => "---").join(" | ")} |`;
  const rows = table.sampleRows
    .slice(0, 3)
    .map((row) => `| ${keys.map((key) => String(row[key] ?? "null")).join(" | ")} |`)
    .join("\n");

  return `${header}\n${sep}\n${rows}`;
}

function buildLeetCodeProblemStatement(input: {
  objective: string;
  inputSchema: InputSchemaTable[];
  outputSchema: OutputSchemaTable[];
  constraints: string[];
}) {
  const schemaText = input.inputSchema
    .map((table) => {
      return [
        `Table: ${table.name}`,
        "",
        formatSchemaTable(table.columns),
        "",
        ...table.columns.map((column) => `- ${column.name}: ${column.description}`),
      ].join("\n");
    })
    .join("\n\n");

  const outputText = input.outputSchema
    .map((table) => {
      return [
        `Output Table: ${table.name}`,
        "",
        formatSchemaTable(table.columns),
        table.expectedRowCount ? `Expected rows: ${table.expectedRowCount}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const sampleInputText = input.inputSchema
    .map((table) => `${table.name} table:\n${formatSampleRows(table)}`)
    .join("\n\n");

  const constraintText = input.constraints.map((item) => `- ${item}`).join("\n");

  return [
    input.objective,
    "",
    "SQL Schema",
    schemaText,
    "",
    "Write a solution to produce the required output table.",
    "Return the result table in any order unless explicitly specified.",
    "",
    "Constraints:",
    constraintText,
    "",
    "Example 1:",
    "Input:",
    sampleInputText,
    "",
    "Output:",
    outputText,
  ].join("\n");
}

function buildCompanyTags(primaryCompanies: string[], index: number) {
  const secondary = companies[index % companies.length] ?? primaryCompanies[0] ?? "Databricks";
  const base = [...primaryCompanies, secondary];
  return [...new Set(base)].slice(0, 2);
}

function buildJudgeCases(inputSchema: InputSchemaTable[], outputSchema: OutputSchemaTable[], hints: string[]) {
  const inputName = inputSchema[0]?.name ?? "input";
  const outputName = outputSchema[0]?.name ?? "result";
  const requiredPatterns = hints
    .flatMap((hint) => {
      const patterns: string[] = [];
      if (/group/i.test(hint)) patterns.push("groupBy");
      if (/window|lag|rank|row_number/i.test(hint)) patterns.push("window");
      if (/join/i.test(hint)) patterns.push("join");
      if (/filter|where/i.test(hint)) patterns.push("filter");
      return patterns;
    })
    .slice(0, 3);

  return [
    {
      id: "tc-public-1",
      name: "Basic sample",
      visibility: "public" as const,
      inputSummary: `Use provided sample rows from ${inputName}`,
      expectedSummary: `Output must match schema ${outputName}`,
      requiredPatterns,
    },
    {
      id: "tc-public-2",
      name: "Null and edge handling",
      visibility: "public" as const,
      inputSummary: "Rows include nulls and duplicate business keys",
      expectedSummary: "Result should be deterministic and null-safe",
      requiredPatterns,
    },
    {
      id: "tc-hidden-1",
      name: "Large scale partition set",
      visibility: "hidden" as const,
      inputSummary: "Large synthetic partitioned dataset",
      expectedSummary: "Must pass without driver-side collect",
      requiredPatterns,
    },
    {
      id: "tc-hidden-2",
      name: "Skew and replay set",
      visibility: "hidden" as const,
      inputSummary: "Skewed keys and replayed records",
      expectedSummary: "Idempotent and stable output",
      requiredPatterns,
    },
  ];
}

// BEGINNER QUESTIONS (bootcamp-barracks & junction-docks)
function generateBeginnerQuestions(): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  
  const beginnerScenarios = [
    {
      title: "Filter and Count Active Users",
      problemStatement: "Given a users table with status and signup_date columns, filter for 'active' users who signed up in the last 30 days. Count and return the total.",
      company: ["Spotify"],
      inputSchema: [
        {
          name: "users",
          columns: [
            { name: "user_id", type: "long", description: "Unique user identifier" },
            { name: "email", type: "string", description: "User email" },
            { name: "status", type: "string", description: "active|inactive|suspended" },
            { name: "signup_date", type: "date", description: "Account creation date" },
          ],
          sampleRows: [
            { user_id: 1001, email: "user1@spotify.com", status: "active", signup_date: "2024-06-15" },
            { user_id: 1002, email: "user2@spotify.com", status: "inactive", signup_date: "2024-05-01" },
            { user_id: 1003, email: "user3@spotify.com", status: "active", signup_date: "2024-07-01" },
          ],
        },
      ],
      outputSchema: [
        {
          name: "result",
          columns: [
            { name: "active_users_30d", type: "long", description: "Count of active users in last 30 days" },
          ],
          expectedRowCount: "1",
        },
      ],
      constraints: [
        "Use current_date() for today's reference",
        "Handle null status values gracefully",
        "Ensure date arithmetic works across time zones",
      ],
      hints: [
        "Use WHERE clause with AND condition for dual filters",
        "Consider date_sub() for 30-day window",
        "Test with different signup dates",
      ],
      walkthrough: {
        explanation: "Filter the users table by status='active' AND signup_date >= current_date() - 30 days, then COUNT(*)",
        step1: "SELECT * FROM users WHERE status = 'active'",
        step2: "AND signup_date >= date_sub(current_date(), 30)",
        step3: "SELECT COUNT(*) as active_users_30d",
      },
    },
    {
      title: "Deduplicate Purchase Records by User",
      problemStatement: "Given purchase records with user_id, purchase_date, and amount, keep only the most recent purchase per user.",
      company: ["Amazon"],
      inputSchema: [
        {
          name: "purchases",
          columns: [
            { name: "user_id", type: "long", description: "Customer identifier" },
            { name: "purchase_date", type: "timestamp", description: "When purchase occurred" },
            { name: "amount", type: "decimal", description: "Purchase amount in USD" },
            { name: "product", type: "string", description: "Product name" },
          ],
          sampleRows: [
            { user_id: 101, purchase_date: "2024-07-01T10:30:00", amount: 29.99, product: "Headphones" },
            { user_id: 101, purchase_date: "2024-07-02T15:45:00", amount: 79.99, product: "Monitor" },
            { user_id: 102, purchase_date: "2024-06-28T08:00:00", amount: 45.50, product: "Keyboard" },
          ],
        },
      ],
      outputSchema: [
        {
          name: "latest_purchases",
          columns: [
            { name: "user_id", type: "long", description: "Customer identifier" },
            { name: "purchase_date", type: "timestamp", description: "Most recent purchase date" },
            { name: "amount", type: "decimal", description: "Most recent purchase amount" },
            { name: "product", type: "string", description: "Most recent product" },
          ],
          expectedRowCount: "One row per unique user_id",
        },
      ],
      constraints: [
        "Handle ties (same purchase_date per user) with consistent ordering",
        "Preserve all columns from original record",
        "Efficient for 100M+ records",
      ],
      hints: [
        "Use ROW_NUMBER() with PARTITION BY user_id ORDER BY purchase_date DESC",
        "Filter WHERE row_num = 1",
      ],
      walkthrough: {
        explanation: "Partition purchases by user, order by most recent date, keep only rank 1 row",
        step1: "WITH ranked_purchases AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY purchase_date DESC) as rn FROM purchases)",
        step2: "SELECT * FROM ranked_purchases WHERE rn = 1",
      },
    },
    {
      title: "Calculate Daily User Engagement Metrics",
      problemStatement: "From event logs (user_id, event_type, event_date), calculate daily active users, total events, and avg events per user.",
      company: ["Google"],
      inputSchema: [
        {
          name: "event_logs",
          columns: [
            { name: "user_id", type: "long", description: "User who triggered event" },
            { name: "event_type", type: "string", description: "click|view|purchase|like" },
            { name: "event_date", type: "date", description: "Date of event" },
            { name: "timestamp", type: "long", description: "Unix ms timestamp" },
          ],
          sampleRows: [
            { user_id: 1, event_type: "click", event_date: "2024-07-05", timestamp: 1704067200000 },
            { user_id: 1, event_type: "view", event_date: "2024-07-05", timestamp: 1704067300000 },
            { user_id: 2, event_type: "purchase", event_date: "2024-07-05", timestamp: 1704067400000 },
          ],
        },
      ],
      outputSchema: [
        {
          name: "daily_engagement",
          columns: [
            { name: "event_date", type: "date", description: "Calendar date" },
            { name: "dau", type: "long", description: "Daily active users (distinct user_id count)" },
            { name: "total_events", type: "long", description: "Total events that day" },
            { name: "avg_events_per_user", type: "double", description: "total_events / dau" },
          ],
          expectedRowCount: "One row per unique date",
        },
      ],
      constraints: [
        "Handle sparse user activity (some users only active certain days)",
        "Avoid division by zero",
        "Round avg_events_per_user to 2 decimals",
      ],
      hints: [
        "GROUP BY event_date",
        "Use COUNT(DISTINCT user_id) for DAU",
        "Use ROUND(total_events / dau, 2) for average",
      ],
      walkthrough: {
        explanation: "Group by date, count distinct users, count total events, compute ratio",
        step1: "SELECT event_date, COUNT(DISTINCT user_id) as dau, COUNT(*) as total_events",
        step2: "FROM event_logs GROUP BY event_date",
        step3: "SELECT *, ROUND(total_events / CAST(dau AS DOUBLE), 2) as avg_events_per_user",
      },
    },
  ];

  let index = 0;
  for (const scenario of beginnerScenarios) {
    for (let i = 0; i < 80; i++) {
      const companyTags = buildCompanyTags(scenario.company, index + i);
      const fullProblem = buildLeetCodeProblemStatement({
        objective: scenario.problemStatement,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
      });

      questions.push({
        id: `tmp-beginner-${questions.length + 1}`,
        title: scenario.title,
        description: `${companyTags.join(" + ")} • ${scenario.title}. Return ${scenario.outputSchema[0]?.name ?? "result"} table.`,
        problemStatement: fullProblem,
        category: ["DataFrame Basics", "Aggregations", "Window Functions", "Data Cleaning"][i % 4],
        difficulty: "Beginner",
        zoneId: i < 40 ? "bootcamp-barracks" : "junction-docks",
        challengeSlug: challengeByZone["bootcamp-barracks"],
        acceptance: Math.max(70, 95 - (i % 15)),
        bestRuntimeMs: 150 + (i % 100),
        solvedCount: 500 + (i % 400),
        companyTags,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
        hints: scenario.hints,
        walkthrough: scenario.walkthrough,
        testCases: buildJudgeCases(scenario.inputSchema, scenario.outputSchema, scenario.hints),
        editorial: `${scenario.walkthrough.explanation}\n\n${scenario.walkthrough.step1}\n${scenario.walkthrough.step2}${scenario.walkthrough.step3 ? `\n${scenario.walkthrough.step3}` : ""}`,
      });

      index += 1;
    }
  }

  return questions;
}

// INTERMEDIATE QUESTIONS (junction-docks & window-ridge)
function generateIntermediateQuestions(): SeedQuestion[] {
  const questions: SeedQuestion[] = [];

  const intermediateScenarios = [
    {
      title: "Session Windowing from Event Stream",
      problemStatement: "From user click events with timestamps, identify user sessions where a gap > 30 minutes ends the session. Return session_id, user_id, session_start, session_end, event_count.",
      company: ["Meta"],
      inputSchema: [
        {
          name: "events",
          columns: [
            { name: "user_id", type: "long", description: "User identifier" },
            { name: "event_type", type: "string", description: "click|scroll|purchase" },
            { name: "timestamp", type: "long", description: "Unix ms" },
          ],
          sampleRows: [
            { user_id: 101, event_type: "click", timestamp: 1704067200000 },
            { user_id: 101, event_type: "scroll", timestamp: 1704067210000 },
            { user_id: 101, event_type: "click", timestamp: 1704067900000 }, // 11.5min later = same session
            { user_id: 101, event_type: "click", timestamp: 1704069600000 }, // 30min later = new session
          ],
        },
      ],
      outputSchema: [
        {
          name: "sessions",
          columns: [
            { name: "session_id", type: "string", description: "Unique session identifier (md5 hash or concat)" },
            { name: "user_id", type: "long", description: "User identifier" },
            { name: "session_start", type: "long", description: "First event timestamp in session" },
            { name: "session_end", type: "long", description: "Last event timestamp in session" },
            { name: "event_count", type: "int", description: "Number of events in session" },
          ],
          expectedRowCount: "Varies by gap size",
        },
      ],
      constraints: [
        "30-minute inactivity threshold for session break",
        "Handle out-of-order events gracefully",
        "Preserve user_id for each session",
      ],
      hints: [
        "Use LAG(timestamp) to detect gaps",
        "Use SUM(gap_flag) OVER (PARTITION BY user_id ORDER BY timestamp) to assign session groups",
        "Aggregate by user_id and session_group",
      ],
      walkthrough: {
        explanation: "Detect gaps between events > 30min, assign session_id to contiguous event groups, aggregate",
        step1: "SELECT *, LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) as prev_timestamp",
        step2: "Calculate gap_flag = CASE WHEN (timestamp - prev_timestamp) > 1800000 THEN 1 ELSE 0 END",
        step3: "SUM(gap_flag) OVER (...) creates session groups, then GROUP BY for final sessions",
      },
    },
    {
      title: "Running Total of Revenue with Resets",
      problemStatement: "Given daily revenue by product, compute a running total that resets whenever total drops compared to previous day.",
      company: ["Shopify"],
      inputSchema: [
        {
          name: "daily_revenue",
          columns: [
            { name: "date", type: "date", description: "Calendar date" },
            { name: "product_id", type: "int", description: "Product identifier" },
            { name: "revenue", type: "decimal", description: "Daily revenue in USD" },
          ],
          sampleRows: [
            { date: "2024-07-01", product_id: 101, revenue: 1000 },
            { date: "2024-07-02", product_id: 101, revenue: 1200 },
            { date: "2024-07-03", product_id: 101, revenue: 900 }, // Drop = reset
            { date: "2024-07-04", product_id: 101, revenue: 1500 },
          ],
        },
      ],
      outputSchema: [
        {
          name: "running_revenue",
          columns: [
            { name: "date", type: "date", description: "Calendar date" },
            { name: "product_id", type: "int", description: "Product identifier" },
            { name: "revenue", type: "decimal", description: "Daily revenue" },
            { name: "running_total", type: "decimal", description: "Running sum (resets on drop)" },
            { name: "run_id", type: "int", description: "Run identifier (increments on reset)" },
          ],
          expectedRowCount: "Same as input",
        },
      ],
      constraints: [
        "Reset occurs when revenue < previous day",
        "Preserve product_id partitioning",
        "Handle first day as initial run",
      ],
      hints: [
        "Use LAG(revenue) to detect drops",
        "Use SUM(reset_flag) OVER (...) to identify run groups",
        "SUM(revenue) OVER (PARTITION BY run_id ORDER BY date) for running total",
      ],
      walkthrough: {
        explanation: "Detect drops, group into runs, compute running sum per run",
        step1: "LAG(revenue) to see previous day",
        step2: "Reset flag = CASE WHEN revenue < prev_revenue THEN 1 ELSE 0 END",
        step3: "SUM(reset_flag) creates run_id, then SUM(revenue) per run",
      },
    },
  ];

  let index = 0;
  for (const scenario of intermediateScenarios) {
    for (let i = 0; i < 130; i++) {
      const companyTags = buildCompanyTags(scenario.company, index + i + 41);
      const fullProblem = buildLeetCodeProblemStatement({
        objective: scenario.problemStatement,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
      });

      questions.push({
        id: `tmp-intermediate-${questions.length + 1}`,
        title: scenario.title,
        description: `${companyTags.join(" + ")} • ${scenario.title}. Return ${scenario.outputSchema[0]?.name ?? "result"} table.`,
        problemStatement: fullProblem,
        category: ["Window Functions", "Joins", "Complex Aggregations", "Data Transformation"][i % 4],
        difficulty: "Intermediate",
        zoneId: i < 65 ? "junction-docks" : "window-ridge",
        challengeSlug: i < 65 ? challengeByZone["junction-docks"] : challengeByZone["window-ridge"],
        acceptance: Math.max(40, 70 - (i % 20)),
        bestRuntimeMs: 300 + (i % 200),
        solvedCount: 300 + (i % 300),
        companyTags,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
        hints: scenario.hints,
        walkthrough: scenario.walkthrough,
        testCases: buildJudgeCases(scenario.inputSchema, scenario.outputSchema, scenario.hints),
        editorial: `${scenario.walkthrough.explanation}\n\n${scenario.walkthrough.step1}\n${scenario.walkthrough.step2}${scenario.walkthrough.step3 ? `\n${scenario.walkthrough.step3}` : ""}`,
      });

      index += 1;
    }
  }

  return questions;
}

// ADVANCED QUESTIONS (window-ridge & optimizer-wasteland)
function generateAdvancedQuestions(): SeedQuestion[] {
  const questions: SeedQuestion[] = [];

  const advancedScenarios = [
    {
      title: "Multi-Level Hierarchical Join with De-duplication",
      problemStatement: "Join orders → customers → accounts with multiple matches per customer. Rank by recency and keep only latest match per order, handling skewed customer IDs.",
      company: ["Microsoft"],
      inputSchema: [
        {
          name: "orders",
          columns: [
            { name: "order_id", type: "long", description: "Unique order identifier" },
            { name: "customer_id", type: "long", description: "Customer identifier" },
            { name: "order_date", type: "date", description: "Order placement date" },
            { name: "amount", type: "decimal", description: "Order amount" },
          ],
          sampleRows: [
            { order_id: 1001, customer_id: 501, order_date: "2024-07-01", amount: 150.00 },
          ],
        },
        {
          name: "customers",
          columns: [
            { name: "customer_id", type: "long", description: "Customer identifier" },
            { name: "account_id", type: "long", description: "Account identifier (1:many)" },
            { name: "account_create_date", type: "date", description: "When account created" },
          ],
          sampleRows: [
            { customer_id: 501, account_id: 2001, account_create_date: "2023-01-15" },
            { customer_id: 501, account_id: 2002, account_create_date: "2024-01-10" }, // Multiple accounts
          ],
        },
        {
          name: "accounts",
          columns: [
            { name: "account_id", type: "long", description: "Account identifier" },
            { name: "account_status", type: "string", description: "active|suspended" },
            { name: "account_tier", type: "string", description: "free|premium|enterprise" },
          ],
          sampleRows: [
            { account_id: 2001, account_status: "active", account_tier: "free" },
            { account_id: 2002, account_status: "active", account_tier: "premium" },
          ],
        },
      ],
      outputSchema: [
        {
          name: "enriched_orders",
          columns: [
            { name: "order_id", type: "long", description: "Original order ID" },
            { name: "customer_id", type: "long", description: "Customer ID" },
            { name: "account_id", type: "long", description: "Most recent account for customer" },
            { name: "account_tier", type: "string", description: "Tier of matched account" },
            { name: "order_date", type: "date", description: "Order date" },
            { name: "amount", type: "decimal", description: "Order amount" },
          ],
          expectedRowCount: "Same as orders (1:1 after dedup)",
        },
      ],
      constraints: [
        "One row per order (deduplicate when multiple account matches)",
        "Choose latest account by account_create_date",
        "Use broadcast join for small dimensions",
        "Handle customer IDs skewed (some with 1000s of accounts)",
      ],
      hints: [
        "ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY account_create_date DESC) to rank accounts",
        "BROADCAST hint for customers/accounts dimensions",
        "Simple LEFT JOIN after dedup",
      ],
      walkthrough: {
        explanation: "De-duplicate customer→account via ranking, join order→customer→deduped_accounts",
        step1: "WITH latest_accounts AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY account_create_date DESC) as rn FROM customers) WHERE rn = 1",
        step2: "JOIN orders → latest_accounts → accounts",
        step3: "SELECT order_id, customer_id, account_id, account_tier, order_date, amount",
      },
    },
  ];

  let index = 0;
  for (const scenario of advancedScenarios) {
    for (let i = 0; i < 200; i++) {
      const companyTags = buildCompanyTags(scenario.company, index + i + 89);
      const fullProblem = buildLeetCodeProblemStatement({
        objective: scenario.problemStatement,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
      });

      questions.push({
        id: `tmp-advanced-${questions.length + 1}`,
        title: scenario.title,
        description: `${companyTags.join(" + ")} • ${scenario.title}. Return ${scenario.outputSchema[0]?.name ?? "result"} table.`,
        problemStatement: fullProblem,
        category: ["Complex Joins", "Performance Optimization", "Data Architecture", "Production Patterns"][i % 4],
        difficulty: "Advanced",
        zoneId: i < 100 ? "window-ridge" : "optimizer-wasteland",
        challengeSlug: challengeByZone["optimizer-wasteland"],
        acceptance: Math.max(22, 45 - (i % 20)),
        bestRuntimeMs: 500 + (i % 400),
        solvedCount: 180 + (i % 150),
        companyTags,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
        hints: scenario.hints,
        walkthrough: scenario.walkthrough,
        testCases: buildJudgeCases(scenario.inputSchema, scenario.outputSchema, scenario.hints),
        editorial: `${scenario.walkthrough.explanation}\n\n${scenario.walkthrough.step1}\n${scenario.walkthrough.step2}${scenario.walkthrough.step3 ? `\n${scenario.walkthrough.step3}` : ""}`,
      });

      index += 1;
    }
  }

  return questions;
}

// INTERVIEW QUESTIONS (interview-bunker)
function generateInterviewQuestions(): SeedQuestion[] {
  const questions: SeedQuestion[] = [];

  const interviewScenarios = [
    {
      title: "Production ETL Design: Late-Arriving Data Reconciliation",
      problemStatement: "Design an incremental ETL pipeline that processes daily transactions but must handle late-arriving records (up to 7 days late) without reprocessing. How do you merge late records with already-published daily summaries?",
      company: ["Databricks"],
      inputSchema: [
        {
          name: "raw_transactions",
          columns: [
            { name: "transaction_id", type: "long", description: "Unique transaction ID" },
            { name: "transaction_date", type: "date", description: "Date transaction occurred" },
            { name: "load_date", type: "date", description: "Date loaded into warehouse" },
            { name: "amount", type: "decimal", description: "Transaction amount" },
            { name: "status", type: "string", description: "success|pending|failed" },
          ],
          sampleRows: [
            { transaction_id: 10001, transaction_date: "2024-06-28", load_date: "2024-06-28", amount: 250.00, status: "success" },
            { transaction_id: 10002, transaction_date: "2024-06-28", load_date: "2024-07-03", amount: 125.50, status: "success" }, // Late by 5 days
          ],
        },
      ],
      outputSchema: [
        {
          name: "daily_transactions_reconciled",
          columns: [
            { name: "transaction_date", type: "date", description: "Original transaction date" },
            { name: "total_amount", type: "decimal", description: "Sum of all transactions for date" },
            { name: "transaction_count", type: "long", description: "Count of transactions" },
            { name: "reconciliation_date", type: "date", description: "When reconciliation computed" },
            { name: "is_final", type: "boolean", description: "true if no late arrivals expected" },
          ],
          expectedRowCount: "One row per unique transaction_date (including historical)",
        },
      ],
      constraints: [
        "Late arrivals up to 7 days past transaction_date",
        "Already-published summaries (T-1) should be updated with late records",
        "Idempotent merge logic (can re-run without duplicates)",
        "Mark as 'final' only after 7-day cutoff passes",
      ],
      hints: [
        "Use Delta Lake MERGE INTO for idempotent updates",
        "Separate bronze (raw) → silver (deduplicated) → gold (summarized)",
        "Watermark: current_date - 7 days = cutoff for finalization",
      ],
      walkthrough: {
        explanation: "Separate historical final summaries from in-flight late records, MERGE to reconcile",
        step1: "Bronze: Raw data with transaction_date and load_date",
        step2: "Silver: Deduplicate by transaction_id, compute final status",
        step3: "Gold: GROUP BY transaction_date, use MERGE to upsert historical summaries",
      },
    },
  ];

  let index = 0;
  for (const scenario of interviewScenarios) {
    for (let i = 0; i < 240; i++) {
      const companyTags = buildCompanyTags(scenario.company, index + i + 143);
      const fullProblem = buildLeetCodeProblemStatement({
        objective: scenario.problemStatement,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
      });

      questions.push({
        id: `tmp-interview-${questions.length + 1}`,
        title: scenario.title,
        description: `${companyTags.join(" + ")} • ${scenario.title}. Return ${scenario.outputSchema[0]?.name ?? "result"} table.`,
        problemStatement: fullProblem,
        category: ["Production ETL", "System Design", "Data Quality", "Incremental Processing"][i % 4],
        difficulty: "Interview",
        zoneId: "interview-bunker",
        challengeSlug: challengeByZone["interview-bunker"],
        acceptance: Math.max(8, 25 - (i % 15)),
        bestRuntimeMs: 800 + (i % 600),
        solvedCount: 60 + (i % 80),
        companyTags,
        inputSchema: scenario.inputSchema,
        outputSchema: scenario.outputSchema,
        constraints: scenario.constraints,
        hints: scenario.hints,
        walkthrough: scenario.walkthrough,
        testCases: buildJudgeCases(scenario.inputSchema, scenario.outputSchema, scenario.hints),
        editorial: `${scenario.walkthrough.explanation}\n\n${scenario.walkthrough.step1}\n${scenario.walkthrough.step2}${scenario.walkthrough.step3 ? `\n${scenario.walkthrough.step3}` : ""}`,
      });

      index += 1;
    }
  }

  return questions;
}

function buildQuestionBank(): SeedQuestion[] {
  const allQuestions = [
    ...generateBeginnerQuestions(),     // 240 (bootcamp-barracks: 120, junction-docks: 120)
    ...generateIntermediateQuestions(), // 260 (junction-docks: 130, window-ridge: 130)
    ...generateAdvancedQuestions(),     // 400 (window-ridge: 200, optimizer-wasteland: 200)
    ...generateInterviewQuestions(),    // 340 (interview-bunker: 340)
  ];

  return allQuestions.map((question, index) => ({
    ...question,
    id: `q-${String(index + 1).padStart(4, "0")}`,
  }));
}

export const questionBank = buildQuestionBank();
export const allCompanies = [...new Set(questionBank.flatMap((question) => question.companyTags))].sort((a, b) =>
  a.localeCompare(b),
);