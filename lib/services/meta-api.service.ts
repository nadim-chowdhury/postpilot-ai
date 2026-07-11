import { AppError, ErrorCodes } from "@/lib/errors";
import {
  META_GRAPH_BASE_URL,
  META_GRAPH_API_VERSION,
} from "@/lib/constants";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface MetaPageResponse {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface MetaPagesResponse {
  data: MetaPageResponse[];
  paging?: {
    next?: string;
    cursors?: {
      before: string;
      after: string;
    };
  };
}

interface MetaPublishResponse {
  id: string;
}

interface MetaTokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string;
  category: string;
  avatarUrl: string | null;
}

export interface PublishPostPayload {
  message: string;
  link?: string;
  /** Photo URL for photo posts */
  url?: string;
}

// ─────────────────────────────────────────────
// Core API Helpers
// ─────────────────────────────────────────────

async function metaFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${META_GRAPH_BASE_URL}${endpoint}`;

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}access_token=${accessToken}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as MetaErrorResponse;
    const metaError = errorData.error;

    // Rate limited
    if (response.status === 429 || metaError?.code === 32) {
      throw new AppError(
        ErrorCodes.RATE_LIMITED,
        `Meta API rate limit exceeded: ${metaError?.message}`,
        429,
      );
    }

    // Token expired or invalid
    if (metaError?.code === 190) {
      const subcode = metaError.error_subcode;
      if (subcode === 463 || subcode === 467) {
        throw new AppError(
          ErrorCodes.TOKEN_EXPIRED,
          "Page access token has expired. Please reconnect the page.",
          401,
        );
      }
      throw new AppError(
        ErrorCodes.TOKEN_INVALID,
        `Invalid access token: ${metaError.message}`,
        401,
      );
    }

    throw new AppError(
      ErrorCodes.META_API_ERROR,
      metaError?.message ?? "Unknown Meta API error",
      response.status,
      { code: metaError?.code, subcode: metaError?.error_subcode },
    );
  }

  return data as T;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Exchange a short-lived user token for a long-lived token (~60 days).
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn: number | null }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      "META_APP_ID or META_APP_SECRET not configured",
      500,
    );
  }

  const url =
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${shortLivedToken}`;

  const response = await fetch(url);
  const data = (await response.json()) as
    | MetaTokenExchangeResponse
    | MetaErrorResponse;

  if (!response.ok || "error" in data) {
    const errorData = data as MetaErrorResponse;
    throw new AppError(
      ErrorCodes.TOKEN_INVALID,
      errorData.error?.message ?? "Token exchange failed",
      401,
    );
  }

  const tokenData = data as MetaTokenExchangeResponse;
  return {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in ?? null,
  };
}

/**
 * Fetch all Facebook Pages the user manages.
 */
export async function fetchUserPages(
  userAccessToken: string,
): Promise<MetaPage[]> {
  const pages: MetaPage[] = [];
  let nextUrl: string | null =
    `/me/accounts?fields=id,name,access_token,category,picture{url}`;

  while (nextUrl) {
    const data: MetaPagesResponse = await metaFetch<MetaPagesResponse>(
      nextUrl,
      userAccessToken,
    );

    for (const page of data.data) {
      pages.push({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
        avatarUrl: page.picture?.data?.url ?? null,
      });
    }

    nextUrl = data.paging?.next ?? null;
  }

  return pages;
}

/**
 * Publish a post to a Facebook Page feed.
 */
export async function publishToPageFeed(
  pageAccessToken: string,
  pageId: string,
  payload: PublishPostPayload,
): Promise<string> {
  const endpoint = `/${pageId}/feed`;

  const response = await metaFetch<MetaPublishResponse>(
    endpoint,
    pageAccessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.id;
}

/**
 * Publish a photo post to a Facebook Page.
 */
export async function publishPhotoToPage(
  pageAccessToken: string,
  pageId: string,
  payload: { url: string; caption?: string },
): Promise<string> {
  const endpoint = `/${pageId}/photos`;

  const body: Record<string, string> = { url: payload.url };
  if (payload.caption) {
    body.caption = payload.caption;
  }

  const response = await metaFetch<MetaPublishResponse>(
    endpoint,
    pageAccessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return response.id;
}

/**
 * Verify a page access token is still valid.
 */
export async function verifyPageToken(
  pageAccessToken: string,
): Promise<boolean> {
  try {
    await metaFetch<{ id: string }>("/me", pageAccessToken);
    return true;
  } catch {
    return false;
  }
}
