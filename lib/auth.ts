import type { AuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import { metaApiConfig } from "@/config/meta-api";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    FacebookProvider({
      clientId: process.env.META_APP_ID!,
      clientSecret: process.env.META_APP_SECRET!,
      authorization: {
        params: {
          scope: metaApiConfig.scopes.join(","),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      // Upsert user in database on every sign-in
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });
      } catch (error) {
        console.error("Failed to upsert user:", error);
        // Don't block sign-in if DB is unavailable
      }

      return true;
    },
    async jwt({ token, account }) {
      // Persist the Meta access token in the JWT on initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose user ID and check for DB user
      if (session.user) {
        const sessionUser = session.user as Record<string, unknown>;
        sessionUser.id = token.sub;
        sessionUser.accessToken = token.accessToken;

        // Look up internal user ID from database
        if (token.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { id: true },
            });
            if (dbUser) {
              sessionUser.id = dbUser.id;
            }
          } catch {
            // Fall back to token.sub if DB unavailable
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
