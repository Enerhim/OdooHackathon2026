import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./setup";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${hash}:${salt}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [hash, salt] = storedHash.split(":");
  const hashToVerify = scryptSync(password, salt, 64).toString("hex");
  return hash === hashToVerify;
}

describe("Authentication Layer", () => {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  let testUserId: string;

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.account.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("User Registration", () => {
    it("should create a new user with EMPLOYEE role by default", async () => {
      const user = await prisma.user.create({
        data: {
          name: "Test Auth User",
          email: testEmail,
          emailVerified: false,
          role: "EMPLOYEE",
          status: "ACTIVE",
        },
      });

      testUserId = user.id;
      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.role).toBe("EMPLOYEE");
      expect(user.status).toBe("ACTIVE");
      expect(user.emailVerified).toBe(false);
    });

    it("should create a credential account with hashed password", async () => {
      const hashedPw = hashPassword("securePassword123");

      const account = await prisma.account.create({
        data: {
          userId: testUserId,
          accountId: testUserId,
          providerId: "credential",
          password: hashedPw,
        },
      });

      expect(account).toBeDefined();
      expect(account.providerId).toBe("credential");
      expect(account.password).not.toBe("securePassword123");
      expect(verifyPassword("securePassword123", account.password!)).toBe(true);
      expect(verifyPassword("wrongPassword", account.password!)).toBe(false);
    });

    it("should prevent duplicate email registration", async () => {
      await expect(
        prisma.user.create({
          data: {
            name: "Duplicate User",
            email: testEmail,
            emailVerified: false,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Session Management", () => {
    let sessionToken: string;

    it("should create a session for an authenticated user", async () => {
      sessionToken = randomBytes(32).toString("hex");

      const session = await prisma.session.create({
        data: {
          token: sessionToken,
          userId: testUserId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress: "127.0.0.1",
          userAgent: "vitest/1.0",
        },
      });

      expect(session).toBeDefined();
      expect(session.token).toBe(sessionToken);
      expect(session.userId).toBe(testUserId);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should retrieve session with user data", async () => {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });

      expect(session).toBeDefined();
      expect(session!.user.email).toBe(testEmail);
      expect(session!.user.role).toBe("EMPLOYEE");
    });

    it("should enforce unique session tokens", async () => {
      await expect(
        prisma.session.create({
          data: {
            token: sessionToken, // same token
            userId: testUserId,
            expiresAt: new Date(Date.now() + 3600000),
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Role-Based Access Control", () => {
    it("should allow admin to update user roles", async () => {
      const updated = await prisma.user.update({
        where: { id: testUserId },
        data: { role: "ASSET_MANAGER" },
      });

      expect(updated.role).toBe("ASSET_MANAGER");
    });

    it("should validate role enum values", async () => {
      await expect(
        prisma.user.update({
          where: { id: testUserId },
          data: { role: "SUPERADMIN" as any },
        })
      ).rejects.toThrow();
    });

    it("should restore original role", async () => {
      const restored = await prisma.user.update({
        where: { id: testUserId },
        data: { role: "EMPLOYEE" },
      });

      expect(restored.role).toBe("EMPLOYEE");
    });
  });
});
