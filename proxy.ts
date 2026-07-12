import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next.js 16 replacement for middleware).
 * Handles route protection and request modifications.
 *
 * Currently a pass-through since we don't have real auth yet.
 * Once NextAuth is configured with real Meta credentials,
 * uncomment the auth checks below.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicPaths = ["/login", "/api/auth", "/api/jobs", "/api/cron", "/api/meta"];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Bypass auth check in development mode
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const token = request.cookies.get("next-auth.session-token")?.value
    ?? request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
