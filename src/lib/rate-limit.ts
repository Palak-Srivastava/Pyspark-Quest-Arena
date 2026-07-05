const bucket = new Map<string, { count: number; resetAt: number }>();

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

async function checkRateLimitMemory(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  bucket.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

function getRedisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  };
}

async function upstashPipeline(commands: Array<Array<string | number>>) {
  const { url, token } = getRedisConfig();
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(commands.map((command) => command.map(String))),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash pipeline failed with HTTP ${response.status}`);
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>;
}

async function checkRateLimitRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowSlot = Math.floor(now / windowMs);
  const redisKey = `rl:${key}:${windowSlot}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  const pipeline = await upstashPipeline([
    ["INCR", redisKey],
    ["EXPIRE", redisKey, ttlSeconds],
  ]);

  const counter = Number(pipeline[0]?.result ?? 0);
  const resetAt = (windowSlot + 1) * windowMs;

  return {
    allowed: counter <= limit,
    remaining: Math.max(0, limit - counter),
    resetAt,
  };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return checkRateLimitMemory(key, limit, windowMs);
  }

  try {
    return await checkRateLimitRedis(key, limit, windowMs);
  } catch {
    return checkRateLimitMemory(key, limit, windowMs);
  }
}
