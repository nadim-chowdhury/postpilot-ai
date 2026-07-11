import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppError, ErrorCodes } from "@/lib/errors";

/**
 * Get the current authenticated session.
 * Use in Server Components and Server Actions.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Get the current user ID or throw if not authenticated.
 * Use at the top of every Server Action that requires auth.
 */
export async function requireUserId(): Promise<string> {
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
