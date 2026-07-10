/**
 * Meta Graph API configuration constants.
 * Centralized here so version bumps are a single-line change.
 */
export const metaApiConfig = {
  version: process.env.META_GRAPH_API_VERSION ?? "v24.0",
  get baseUrl() {
    return `https://graph.facebook.com/${this.version}`;
  },
  scopes: [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "pages_read_user_content",
  ],
  endpoints: {
    me: "/me",
    myAccounts: "/me/accounts",
    pageFeed: (pageId: string) => `/${pageId}/feed`,
    pagePhotos: (pageId: string) => `/${pageId}/photos`,
    post: (postId: string) => `/${postId}`,
  },
  /** Token exchange URL for long-lived tokens */
  tokenExchangeUrl: "https://graph.facebook.com/oauth/access_token",
} as const;
