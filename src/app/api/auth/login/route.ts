import { NextResponse } from "next/server";

import { loginUser } from "@/lib/db";
import { createSessionForUser, setSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await loginUser({ email, password });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({ user: { id: result.user.id, name: result.user.name, email: result.user.email } });
  const cookies = await createSessionForUser(result.user.id);
  setSessionCookies(response, cookies);
  return response;
}
