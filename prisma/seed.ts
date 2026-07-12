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

  // --- 5. Create Lots of Dummy Data ---
  const firstNames = ["Arjun", "Neha", "Rahul", "Pooja", "Amit", "Sneha", "Karan", "Riya", "Aditya", "Kavya", "Siddharth", "Tara"];
  const lastNames = ["Sharma", "Gupta", "Mehta", "Jain", "Deshmukh", "Reddy", "Nair", "Iyer", "Das", "Bose", "Menon", "Bhat"];
  const roles = ["EMPLOYEE", "ASSET_MANAGER", "DEPARTMENT_HEAD"];
  const depts = ["dept-it", "dept-hr", "dept-ops", "dept-finance"];
  
  for (let i = 0; i < 20; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;
    
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email: email,
        emailVerified: true,
        role: roles[Math.floor(Math.random() * roles.length)] as any,
        status: i % 5 === 0 ? "INACTIVE" : "ACTIVE",
        departmentId: depts[Math.floor(Math.random() * depts.length)],
      }
    });
  }

  const categoryIds = categories.map(c => c.id);
  const conditions = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"];
  const statuses = ["AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED", "DISPOSED"];
  const assetNames = ["MacBook Pro 16", "Dell XPS 13", "Herman Miller Chair", "Samsung Galaxy S23", "Toyota Innova", "Standing Desk", "Projector", "Conference Table", "Power Drill", "Monitor Stand", "Lenovo ThinkPad", "Ergonomic Mouse", "Whiteboard", "Cisco IP Phone"];
  
  for (let i = 0; i < 30; i++) {
    const tag = `AST-${1000 + i}`;
    const name = assetNames[Math.floor(Math.random() * assetNames.length)];
    const cat = categoryIds[Math.floor(Math.random() * categoryIds.length)];
    
    await prisma.asset.upsert({
      where: { assetTag: tag },
      update: {},
      create: {
        assetTag: tag,
        name: `${name} - ${i + 1}`,
        categoryId: cat,
        serialNumber: `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        acquisitionDate: new Date(Date.now() - Math.random() * 100000000000), // Random date in past 3 years roughly
        acquisitionCost: Math.floor(Math.random() * 3000) + 100,
        condition: conditions[Math.floor(Math.random() * conditions.length)] as any,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        location: i % 3 === 0 ? "Bangalore Office" : "Mumbai HQ",
      }
    });
  }

  console.log("✅ 20 extra employees and 30 extra assets created");
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
