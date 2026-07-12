# Asset Management System

A comprehensive, enterprise-grade Asset Management System built with **Next.js (App Router)**, **Prisma (PostgreSQL)**, and **BetterAuth**. This application handles the complete lifecycle of organizational assets, from procurement and allocation to maintenance, auditing, and end-of-life.

## 🌟 Key Features

### Role-Based Access Control (RBAC)
- **Superadmin/Admin:** Full system control, department management, and auditing powers.
- **Asset Manager:** Manage inventory, approve transfers, and handle maintenance ticketing.
- **Department Head:** Oversee department-specific assets and approve inter-departmental transfers.
- **Employee:** Request assets, book shared resources, and raise maintenance tickets.

### Asset Lifecycle Management
- **Inventory Tracking:** Real-time visibility into all hardware and resources.
- **Allocations:** Assign assets to employees or departments with expected return dates.
- **Transfers:** Request and approve asset transfers between employees seamlessly.
- **Maintenance Ticketing:** Report broken assets, track repair statuses, and assign technicians.
- **Auditing:** Conduct organization-wide or department-specific physical audits with discrepancy tracking.

### Resource Booking
- Book shared resources (e.g., conference rooms, projectors, company vehicles) using a robust conflict-prevention calendar system.

### Interactive Dashboard
- Real-time KPIs for available assets, active allocations, pending transfers, maintenance requests, and upcoming/overdue returns.
- System-wide notifications and activity logs to ensure complete transparency.

---

## 🚀 Getting Started

This project uses **Docker** for the PostgreSQL database and **Node.js** for the frontend/backend server.

### Prerequisites

You will need the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/products/docker-desktop) and Docker Compose

### 🛠️ Installation & Setup

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd odoo-hackathon
npm install
```

### 1. Database Setup

You need to run the PostgreSQL database using Docker. The commands vary slightly by operating system.

#### For Linux / macOS
```bash
# Start the database container in the background
sudo docker compose up -d
```

#### For Windows
*Note: Ensure Docker Desktop is running.*
```powershell
# Start the database container in the background
docker-compose up -d
```

### 2. Environment Variables

Create a `.env` file in the root of your project by copying the example file:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` in the `.env` file points to the local Docker database (usually `postgresql://postgres:postgres@localhost:5432/odoo-hackathon?schema=public`).

### 3. Database Migration & Seeding

Once the database is running, push the Prisma schema and seed the initial data:

```bash
npx prisma db push
npx prisma db seed
```
*(The seed script will populate the database with a default Superadmin, initial departments, categories, and dummy assets for testing).*

### 4. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for unit and integration testing.

To run the test suite:
```bash
npm run test
```

*Note: The tests connect to the database. Ensure your Docker container is running before executing tests.*

---

## 📚 Documentation

For a deep dive into the architecture, please refer to the documentation:
- [Backend Architecture & Data Access Layer](./docs/BACKEND.md)
- *(Frontend documentation coming soon)*
