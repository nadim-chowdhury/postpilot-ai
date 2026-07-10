import type { AuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import { metaApiConfig } from "@/config/meta-api";

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
    async jwt({ token, account }) {
      // Persist the Meta access token in the JWT on initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose non-sensitive fields to the client session
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.sub;
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
