import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy initialize Upstash Ratelimit if keys are present
let ratelimit: Ratelimit | null = null;

function getUpstashRatelimit() {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are missing. Falling back to in-memory rate limiter.");
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"), // 20 requests per minute
      analytics: true,
    });
    return ratelimit;
  } catch (error) {
    console.error("Failed to initialize Upstash Ratelimit:", error);
    return null;
  }
}

// Lightweight in-memory rate limiter fallback for local development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryLimit(key: string, limit = 20, windowMs = 60000): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    // Initialize or reset window
    const newRecord = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, newRecord);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: newRecord.resetAt,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetAt,
  };
}

/**
 * Validate rate limit hits against a specific key identifier (e.g., user IP, API route name).
 * Automatically switches between Upstash Redis and local memory fallbacks.
 */
export async function limitRequest(
  key: string,
  limit = 20,
  windowSeconds = 60,
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const upstashLimit = getUpstashRatelimit();

  if (upstashLimit) {
    try {
      const response = await upstashLimit.limit(key);
      return {
        success: response.success,
        limit: response.limit,
        remaining: response.remaining,
        reset: response.reset,
      };
    } catch (err) {
      console.error("Upstash Redis lookup failed. Falling back to local rate check:", err);
      // Fallback to local check if Redis is down
    }
  }

  // Fallback to local memory limiter
  return checkInMemoryLimit(key, limit, windowSeconds * 1000);
}
