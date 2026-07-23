import "server-only";

import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import {
  isLoginEligible,
  isPublicLoginEligible,
} from "@/lib/auth/permissions";
import { credentialsSchema } from "@/schemas/auth";
import {
  emailVerificationSchema,
  publicLoginSchema,
} from "@/schemas/public-account";
import { verifyPublicUserEmail } from "@/services/public-account.service";

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
      id: "admin-credentials",
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
    CredentialsProvider({
      id: "user-credentials",
      name: "User credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = publicLoginSchema.safeParse(credentials);

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
            emailVerifiedAt: true,
          },
        });
        const passwordMatches = await compare(
          parsed.data.password,
          user?.passwordHash ?? INVALID_ACCOUNT_PASSWORD_HASH,
        );

        if (
          !user ||
          !passwordMatches ||
          !isPublicLoginEligible(
            user.status,
            user.role,
            user.emailVerifiedAt,
          )
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
    CredentialsProvider({
      id: "user-verification",
      name: "User verification",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = emailVerificationSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        try {
          const user = await verifyPublicUserEmail(parsed.data);
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return user;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }

      if (trigger === "update" && session) {
        token.name = typeof session.name === "string" ? session.name : token.name;
        token.picture = typeof session.image === "string" || session.image === null ? session.image : token.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.image = typeof token.picture === "string" ? token.picture : null;
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
