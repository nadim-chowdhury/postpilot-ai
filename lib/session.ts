import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppError, ErrorCodes } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/**
 * Get the current authenticated session.
 * Use in Server Components and Server Actions.
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.warn("[Session] Failed to fetch server session:", error);
    return null;
  }
}

/**
 * Get the current user ID or throw if not authenticated.
 * Use at the top of every Server Action that requires auth.
 */
export async function requireUserId(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const firstUser = await prisma.user.findFirst({
      select: { id: true }
    });
    if (firstUser) {
      console.log(`[Dev Auth Fallback] Forcing user ID in dev mode: ${firstUser.id}`);
      return firstUser.id;
    }
  }

  const session = await getSession();
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as
    | string
    | undefined;

  if (!userId) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      "You must be signed in to perform this action.",
      401,
    );
  }

  return userId;
}

/**
 * Get the current user's Meta access token or throw if not authenticated.
 */
export async function requireUserAccessToken(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const firstUser = await prisma.user.findFirst({
      select: { id: true }
    });
    if (firstUser) {
      const firstPage = await prisma.fbPage.findFirst({
        where: { userId: firstUser.id, platform: "FACEBOOK" },
        select: { accessToken: true }
      });
      if (firstPage?.accessToken) {
        const { decrypt } = await import("@/lib/services/encryption.service");
        try {
          const decryptedToken = decrypt(firstPage.accessToken);
          console.log(`[Dev Auth Fallback] Forcing Meta page access token in dev mode.`);
          return decryptedToken;
        } catch (e) {
          console.error("[Dev Auth Fallback] Failed to decrypt fallback page token", e);
        }
      }
    }
  }

  const session = await getSession();
  const token = (session?.user as Record<string, unknown> | undefined)?.accessToken as
    | string
    | undefined;

  if (!token) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      "No active Facebook session found. Please sign in again.",
      401,
    );
  }

  return token;
}

