import "server-only";

import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { isLoginEligible } from "@/lib/auth/permissions";
import { credentialsSchema } from "@/schemas/auth";

const INVALID_ACCOUNT_PASSWORD_HASH =
  "$2b$12$bQQXCYjM4ZP6CiV/RYKnSOWKrQFE3Z84aGOLigtzqCGwibTj6cuWS";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            role: true,
            status: true,
          },
        });

        const passwordMatches = await compare(
          parsed.data.password,
          user?.passwordHash ?? INVALID_ACCOUNT_PASSWORD_HASH,
        );

        if (
          !user ||
          !passwordMatches ||
          !isLoginEligible(user.status, user.role)
        ) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        return new URL(url).origin === new URL(baseUrl).origin
          ? url
          : `${baseUrl}/admin`;
      } catch {
        return `${baseUrl}/admin`;
      }
    },
  },
};
