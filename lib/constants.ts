// ─────────────────────────────────────────────
// App Constants
// ─────────────────────────────────────────────

export const APP_NAME = "PostPilot AI";
export const APP_DESCRIPTION =
  "Centralized content automation for Facebook Pages";

// ─────────────────────────────────────────────
// Scheduling
// ─────────────────────────────────────────────

/** Maximum posts allowed per page per day */
export const MAX_POSTS_PER_DAY = 6;

/** Minimum jitter offset in seconds (1 minute) */
export const MIN_JITTER_SECONDS = 60;

/** Maximum jitter offset in seconds (8 minutes) */
export const MAX_JITTER_SECONDS = 480;

/** Maximum retry attempts for failed publishes */
export const MAX_RETRY_ATTEMPTS = 3;

/** Minimum gap between posts to same page in seconds (3 minutes) */
export const MIN_POST_GAP_SECONDS = 180;

// ─────────────────────────────────────────────
// Meta API
// ─────────────────────────────────────────────

export const META_GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION ?? "v24.0";

export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/** Rate limit: max API calls per hour across all pages */
export const META_RATE_LIMIT_PER_HOUR = 200;

// ─────────────────────────────────────────────
// Posting Hours (page timezone)
// ─────────────────────────────────────────────

/** Earliest hour to post (inclusive) */
export const POSTING_HOUR_START = 8;

/** Latest hour to post (inclusive) */
export const POSTING_HOUR_END = 22;

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
