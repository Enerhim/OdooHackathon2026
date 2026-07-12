import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24 hours
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "EMPLOYEE",
        input: false, // cannot be set by the client during signup
      },
      status: {
        type: "string",
        defaultValue: "ACTIVE",
        input: false,
      },
      departmentId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
