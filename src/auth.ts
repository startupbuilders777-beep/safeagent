import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

// API Key authentication for programmatic access
const apiKeyAuth = z.object({
  "x-api-key": z.string().min(1),
})

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "API Key",
      credentials: {
        "x-api-key": { label: "API Key", type: "password" },
      },
      async authorize(credentials) {
        const parsed = apiKeyAuth.safeParse(credentials)
        if (!parsed.success) return null
        
        // In production, validate against database
        // For MVP, accept any key starting with "sk_sa_"
        const apiKey = parsed.data["x-api-key"]
        if (apiKey.startsWith("sk_sa_")) {
          return {
            id: apiKey,
            name: "API User",
            email: "api@safeagent.io",
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.apiKey = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.apiKey = token.apiKey as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)


