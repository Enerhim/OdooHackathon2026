import { db as prisma } from "../lib/db";
import { scryptSync, randomBytes } from "crypto";

/**
 * Hash a password using scrypt (matching BetterAuth's internal format).
 * BetterAuth uses the format: hash:salt
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${hash}:${salt}`;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // --- 1. Create Admin User ---
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@example.com",
      emailVerified: true,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Create credential account for admin (BetterAuth stores passwords here)
  await prisma.account.upsert({
    where: {
      id: `credential-${adminUser.id}`,
    },
    update: {},
    create: {
      id: `credential-${adminUser.id}`,
      userId: adminUser.id,
      accountId: adminUser.id,
      providerId: "credential",
      password: hashPassword("changeme123"),
    },
  });

  console.log("✅ Admin user created: admin@example.com / changeme123");

  // --- 2. Create Departments ---
  const itDept = await prisma.department.upsert({
    where: { id: "dept-it" },
    update: {},
    create: {
      id: "dept-it",
      name: "Information Technology",
      status: "ACTIVE",
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { id: "dept-hr" },
    update: {},
    create: {
      id: "dept-hr",
      name: "Human Resources",
      status: "ACTIVE",
    },
  });

  const opsDept = await prisma.department.upsert({
    where: { id: "dept-ops" },
    update: {},
    create: {
      id: "dept-ops",
      name: "Operations",
      status: "ACTIVE",
    },
  });

  const financeDept = await prisma.department.upsert({
    where: { id: "dept-finance" },
    update: {},
    create: {
      id: "dept-finance",
      name: "Finance",
      status: "ACTIVE",
    },
  });

  console.log(
    `✅ Departments created: ${[itDept, hrDept, opsDept, financeDept].map((d) => d.name).join(", ")}`
  );

  // --- 3. Create Asset Categories ---
  const categories = [
    {
      id: "cat-electronics",
      name: "Electronics",
      description: "Laptops, monitors, phones, tablets",
      customFieldSchema: {
        fields: [
          { name: "warrantyExpiry", type: "date", label: "Warranty Expiry" },
          { name: "processor", type: "string", label: "Processor" },
          { name: "ramGB", type: "number", label: "RAM (GB)" },
        ],
      },
    },
    {
      id: "cat-furniture",
      name: "Furniture",
      description: "Desks, chairs, cabinets, shelves",
    },
    {
      id: "cat-vehicles",
      name: "Vehicles",
      description: "Company cars, vans, trucks",
      customFieldSchema: {
        fields: [
          {
            name: "registrationNumber",
            type: "string",
            label: "Registration Number",
          },
          { name: "fuelType", type: "string", label: "Fuel Type" },
          { name: "mileage", type: "number", label: "Mileage (km)" },
        ],
      },
    },
    {
      id: "cat-meeting-rooms",
      name: "Meeting Rooms",
      description: "Bookable conference and meeting rooms",
    },
    {
      id: "cat-tools",
      name: "Tools & Equipment",
      description: "Power tools, testing equipment, lab instruments",
    },
  ];

  for (const cat of categories) {
    await prisma.assetCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  console.log(
    `✅ Asset categories created: ${categories.map((c) => c.name).join(", ")}`
  );

  // --- 4. Create sample employees ---
  const employees = [
    {
      name: "Priya Sharma",
      email: "priya@example.com",
      role: "ASSET_MANAGER" as const,
      departmentId: "dept-it",
    },
    {
      name: "Raj Patel",
      email: "raj@example.com",
      role: "DEPARTMENT_HEAD" as const,
      departmentId: "dept-it",
    },
    {
      name: "Anita Desai",
      email: "anita@example.com",
      role: "EMPLOYEE" as const,
      departmentId: "dept-hr",
    },
    {
      name: "Vikram Singh",
      email: "vikram@example.com",
      role: "EMPLOYEE" as const,
      departmentId: "dept-ops",
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        emailVerified: true,
        role: emp.role,
        status: "ACTIVE",
        departmentId: emp.departmentId,
      },
    });

    await prisma.account.upsert({
      where: { id: `credential-${user.id}` },
      update: {},
      create: {
        id: `credential-${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashPassword("password123"),
      },
    });
  }

  // Set Raj as IT department head
  await prisma.department.update({
    where: { id: "dept-it" },
    data: {
      departmentHeadId: (
        await prisma.user.findUnique({ where: { email: "raj@example.com" } })
      )!.id,
    },
  });

  console.log(
    `✅ Sample employees created: ${employees.map((e) => e.name).join(", ")}`
  );

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
