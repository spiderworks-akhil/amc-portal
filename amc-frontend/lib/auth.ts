import type { AuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";

type AuthenticatedUser = AdapterUser & {
  role?: string;
  accessToken?: string;
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        token: { label: "Token", type: "text" },
        id: { label: "ID", type: "text" },
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token || !credentials?.id || !credentials?.name) {
          return null;
        }

        return {
          id: credentials.id,
          name: credentials.name,
          email: credentials.email,
          role: credentials.role,
          accessToken: credentials.token,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
    updateAge: 15 * 60, // Refresh JWT every 15 min on activity
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const authenticatedUser = user as AuthenticatedUser;
        token.id = authenticatedUser.id;
        token.role = authenticatedUser.role ?? "USER";
        token.accessToken = authenticatedUser.accessToken ?? "";
      }

      if (trigger === "update" && session) {
        token.accessToken =
          typeof session.accessToken === "string"
            ? session.accessToken
            : token.accessToken;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role =
          typeof token.role === "string" ? token.role : "USER";
      }

      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : "";
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        // Ignore invalid URLs and fall back to baseUrl.
      }

      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login", // Show errors on the login page
  },
};
