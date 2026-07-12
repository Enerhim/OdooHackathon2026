import { db as prisma } from "../lib/db";
import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  // Verify database connectivity
  try {
    await prisma.$connect();
    console.log("✅ Test database connected");
  } catch (error) {
    console.error(
      "❌ Failed to connect to test database. Make sure PostgreSQL is running:",
      error
    );
    throw error;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
