import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";

import { ensureDatabaseReady } from "@/lib/db";
import { sql } from "@/lib/postgres";

export const ACCESS_COOKIE = "sparkquest_access";
export const REFRESH_COOKIE = "sparkquest_refresh";
export const CSRF_COOKIE = "sparkquest_csrf";

const ACCESS_TTL_SECONDS = 60 * 15;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type SessionCookieBundle = {
  accessToken: string;
  refreshToken: string;
  csrfToken?: string;
};

type SessionRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  refreshHash: string;
  csrfHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type AuthContext = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  sessionId: string;
  csrfHash: string;
  rotatedCookies?: SessionCookieBundle;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set and at least 32 characters in production.");
  }

  return "dev-only-secret-change-me-please-update-and-replace-now";
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function getJwtKey() {
  return new TextEncoder().encode(getSecret());
}

async function createAccessToken(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(getJwtKey());
}

async function verifyAccessToken(token: string) {
  try {
    const result = await jwtVerify(token, getJwtKey(), { algorithms: ["HS256"] });
    const userId = result.payload.sub;
    const sid = typeof result.payload.sid === "string" ? result.payload.sid : null;

    if (!userId || !sid) {
      return null;
    }

    return { userId, sessionId: sid };
  } catch {
    return null;
  }
}

function createRefreshToken(sessionId: string) {
  return `${sessionId}.${randomBytes(32).toString("base64url")}`;
}

function createCsrfToken() {
  return randomBytes(24).toString("base64url");
}

async function getSessionRecord(sessionId: string): Promise<SessionRecord | null> {
  await ensureDatabaseReady();
  const rows = await sql<
    {
      id: string;
      user_id: string;
      refresh_hash: string;
      csrf_hash: string;
      expires_at: Date;
      revoked_at: Date | null;
      name: string;
      email: string;
    }[]
  >`
    select s.id, s.user_id, s.refresh_hash, s.csrf_hash, s.expires_at, s.revoked_at, u.name, u.email
    from sessions s
    join users u on u.id = s.user_id
    where s.id = ${sessionId}
    limit 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    refreshHash: row.refresh_hash,
    csrfHash: row.csrf_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    name: row.name,
    email: row.email,
  };
}

function isActiveSession(session: SessionRecord) {
  if (session.revokedAt) {
    return false;
  }
  return session.expiresAt.getTime() > Date.now();
}

async function rotateRefreshToken(session: SessionRecord) {
  const refreshToken = createRefreshToken(session.id);
  const refreshHash = hashValue(refreshToken);
  const accessToken = await createAccessToken(session.userId, session.id);

  await sql`
    update sessions
    set refresh_hash = ${refreshHash},
        last_rotated_at = now(),
        expires_at = now() + make_interval(secs => ${SESSION_TTL_SECONDS})
    where id = ${session.id}
  `;

  return {
    accessToken,
    refreshToken,
  };
}

export async function createSessionForUser(userId: string) {
  await ensureDatabaseReady();

  const sessionId = randomUUID();
  const refreshToken = createRefreshToken(sessionId);
  const csrfToken = createCsrfToken();

  await sql`
    insert into sessions (id, user_id, refresh_hash, csrf_hash, expires_at)
    values (${sessionId}, ${userId}, ${hashValue(refreshToken)}, ${hashValue(csrfToken)}, now() + make_interval(secs => ${SESSION_TTL_SECONDS}))
  `;

  const accessToken = await createAccessToken(userId, sessionId);

  return {
    accessToken,
    refreshToken,
    csrfToken,
  } satisfies SessionCookieBundle;
}

export function setSessionCookies(response: NextResponse, cookies: SessionCookieBundle) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: cookies.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });

  response.cookies.set({
    name: REFRESH_COOKIE,
    value: cookies.refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  if (cookies.csrfToken) {
    response.cookies.set({
      name: CSRF_COOKIE,
      value: cookies.csrfToken,
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }
}

export async function clearSessionCookies(response: NextResponse, request?: NextRequest) {
  const secure = process.env.NODE_ENV === "production";
  const refreshToken = request?.cookies.get(REFRESH_COOKIE)?.value;
  const sessionId = refreshToken?.split(".")[0] ?? "";

  if (sessionId) {
    await sql`update sessions set revoked_at = now() where id = ${sessionId}`;
  }

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: CSRF_COOKIE,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext | null> {
  await ensureDatabaseReady();

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const access = await verifyAccessToken(accessToken);
    if (access) {
      const session = await getSessionRecord(access.sessionId);
      if (session && isActiveSession(session) && session.userId === access.userId) {
        return {
          user: {
            id: session.userId,
            name: session.name,
            email: session.email,
          },
          sessionId: session.id,
          csrfHash: session.csrfHash,
        };
      }
    }
  }

  if (!refreshToken) {
    return null;
  }

  const sessionId = refreshToken.split(".")[0] ?? "";
  if (!sessionId) {
    return null;
  }

  const session = await getSessionRecord(sessionId);
  if (!session || !isActiveSession(session)) {
    return null;
  }

  const refreshHash = hashValue(refreshToken);
  if (!safeEqualHex(refreshHash, session.refreshHash)) {
    return null;
  }

  const rotated = await rotateRefreshToken(session);

  return {
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
    },
    sessionId: session.id,
    csrfHash: session.csrfHash,
    rotatedCookies: {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    },
  };
}

export function applyAuthRotation(response: NextResponse, auth: AuthContext | null) {
  if (!auth?.rotatedCookies) {
    return;
  }

  setSessionCookies(response, auth.rotatedCookies);
}

export function validateCsrfToken(request: NextRequest, auth: AuthContext) {
  const headerToken = request.headers.get("x-csrf-token")?.trim();
  if (!headerToken) {
    return false;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value?.trim();
  if (!cookieToken) {
    return false;
  }

  if (headerToken !== cookieToken) {
    return false;
  }

  return safeEqualHex(hashValue(headerToken), auth.csrfHash);
}
