import { NextResponse } from "next/server";

import { sql } from "@/lib/postgres";

function checkRequiredEnv() {
  const issues: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    issues.push("Missing database connection string.");
  }

  if (isProduction) {
    const authSecret = process.env.AUTH_SECRET ?? "";
    if (authSecret.length < 32) {
      issues.push("AUTH_SECRET is missing or too short for production.");
    }
  }

  return issues;
}

export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {
    env: { ok: true },
    database: { ok: true },
    tables: { ok: true },
  };

  const envIssues = checkRequiredEnv();
  if (envIssues.length > 0) {
    checks.env = { ok: false, message: envIssues.join(" ") };
  }

  try {
    await sql`select 1`;
  } catch (error) {
    checks.database = {
      ok: false,
      message: error instanceof Error ? error.message : "Database ping failed.",
    };
  }

  if (checks.database.ok) {
    try {
      const rows = await sql<{ table_name: string }[]>`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name in ('users', 'questions', 'submissions', 'sessions')
      `;

      const found = new Set(rows.map((row) => row.table_name));
      const required = ["users", "questions", "submissions", "sessions"];
      const missing = required.filter((name) => !found.has(name));
      if (missing.length > 0) {
        checks.tables = {
          ok: false,
          message: `Missing required tables: ${missing.join(", ")}`,
        };
      }
    } catch (error) {
      checks.tables = {
        ok: false,
        message: error instanceof Error ? error.message : "Table readiness check failed.",
      };
    }
  }

  const ready = Object.values(checks).every((item) => item.ok);
  return NextResponse.json(
    {
      ok: ready,
      status: ready ? "ready" : "not-ready",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
