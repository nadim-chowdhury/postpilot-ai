// ─────────────────────────────────────────────
// Standardized API Response Types
// ─────────────────────────────────────────────

/**
 * Every Server Action and API response uses this discriminated union.
 * Consumers check `result.success` before accessing data.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Paginated response wrapper for list endpoints.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Common query params for list endpoints.
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
