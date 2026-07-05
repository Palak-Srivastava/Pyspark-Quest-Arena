import { NextResponse } from "next/server";

import { createUser } from "@/lib/db";
import { createSessionForUser, setSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

    if (!name || !emailValid || !strongPassword) {
      return NextResponse.json(
        { error: "Provide valid name/email and password with at least 8 chars including one letter and one number." },
        { status: 400 },
      );
    }

    const result = await createUser({ name, email, password });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    const response = NextResponse.json({ user: { id: result.user.id, name: result.user.name, email: result.user.email } });
    const cookies = await createSessionForUser(result.user.id);
    setSessionCookies(response, cookies);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed due to server error.";
    if (message.includes("SUPABASE_DB_URL") || message.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Database URL is missing. Set SUPABASE_DB_URL in .env.local." }, { status: 500 });
    }
    if (message.includes("AUTH_SECRET")) {
      return NextResponse.json({ error: "AUTH_SECRET must be at least 32 characters in .env.local." }, { status: 500 });
    }
    return NextResponse.json({ error: "Registration failed. Verify .env.local and database connectivity." }, { status: 500 });
  }
}
