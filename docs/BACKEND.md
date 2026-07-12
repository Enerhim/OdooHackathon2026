# Server Functions & API Reference

This document serves as a guide for frontend developers to integrate the UI with the backend logic, including Authentication, Server Actions (Data Access Layer), and the Database Schema.

## 1. Authentication (BetterAuth)

Our authentication is powered by [BetterAuth](https://better-auth.com/). 

### Frontend Integration (`lib/auth-client.ts`)
When building client components, use the pre-configured `authClient` exported from `lib/auth-client.ts`.

| Function/Hook | Usage | Description |
|---|---|---|
| `useSession()` | `const { data: session, isPending } = useSession()` | React hook to get the current authenticated session on the client side. Returns `null` if unauthenticated. |
| `signIn.email()` | `await signIn.email({ email, password })` | Authenticate an existing user. |
| `signUp.email()` | `await signUp.email({ email, password, name })` | Register a new user. The default role is `EMPLOYEE`. |
| `signOut()` | `await signOut()` | Clear the session and log the user out. |

### Server Integration (`lib/auth-utils.ts`)
When building Server Components or API routes, use these utility functions:

| Function | Usage | Description |
|---|---|---|
| `getSession()` | `const session = await getSession()` | Retrieves the session securely from headers. Returns `null` if the user is unauthenticated. |
| `requireSession()` | `const session = await requireSession()` | Retrieves the session. If the user is unauthenticated, it automatically redirects them to `/login`. |
| `requireRole()` | `await requireRole(["ADMIN", "ASSET_MANAGER"])` | Checks if the user has the required role. Throws a 403 Error if unauthorized or redirects to login if unauthenticated. |

*Note on `app/api/auth/[...all]/route.ts`: This is a catch-all Next.js route that handles all BetterAuth background processes (like session management, callbacks, and credential validation). You do not need to call this manually.*

---

## 2. Server Actions (Data Access Layer)

All database operations are encapsulated in Server Actions located in `lib/actions/`. These can be directly imported and called from both Server Components and Client Components. 

**Standard Return Type:**
Every server action is wrapped in a `try/catch` and returns a standard object format:
```typescript
{
  success: boolean;
  data?: any;      // The requested data or updated object
  error?: string;  // Error message if success is false
}
```

### Action Modules

#### `user.actions.ts` (User Management)
| Function | Required Roles | Description |
|---|---|---|
| `getCurrentUser()` | *Authenticated* | Gets the full profile of the currently logged-in user. |
| `getUsers(filters?)` | `ADMIN` | Lists users with optional filters (role, status, departmentId, search). |
| `getUserById(id)` | *Authenticated* | Retrieves a user with their associated department. |
| `updateUserRole(id, role)` | `ADMIN` | Updates a user's role and logs the activity. |
| `updateUserStatus(id, status)` | `ADMIN` | Updates an account status (`ACTIVE`, `INACTIVE`) and logs the activity. |

#### `department.actions.ts` (Department Management)
| Function | Required Roles | Description |
|---|---|---|
| `getDepartments()` | *Authenticated* | Lists all departments, including the department head and employee counts. |
| `getDepartmentById(id)` | *Authenticated* | Gets specific department details, including its employees. |
| `createDepartment(data)` | `ADMIN` | Creates a new department. |
| `updateDepartment(id, data)` | `ADMIN` | Updates department fields. |

#### `category.actions.ts` (Asset Category Management)
| Function | Required Roles | Description |
|---|---|---|
| `getCategories()` | *Authenticated* | Lists all asset categories with asset counts. |
| `getCategoryById(id)` | *Authenticated* | Retrieves a specific category by its ID. |
| `createCategory(data)` | `ADMIN` | Creates a new asset category with an optional custom field schema. |
| `updateCategory(id, data)` | `ADMIN` | Updates an existing asset category. |

#### `asset.actions.ts` (Asset Management)
| Function | Required Roles | Description |
|---|---|---|
| `getAssets(filters?)` | *Authenticated* | Lists assets based on filters (status, category, location, bookable). |
| `getAssetById(id)` | *Authenticated* | Gets an asset with its allocations, maintenance history, and bookings. |
| `createAsset(data)` | `MANAGER`, `ADMIN` | Creates an asset and auto-generates its `assetTag` (e.g., `AF-0001`). |
| `updateAsset(id, data)` | `MANAGER`, `ADMIN` | Partially updates asset details. |

#### `allocation.actions.ts` (Asset Allocation)
| Function | Required Roles | Description |
|---|---|---|
| `getAllocations(filters?)` | *Authenticated* | Lists allocations. |
| `allocateAsset(data)` | `MANAGER`, `ADMIN` | Checks if asset is `AVAILABLE`, creates allocation, and sets status to `ALLOCATED`. |
| `returnAsset(id, notes)` | `MANAGER`, `ADMIN` | Marks allocation as `RETURNED`, sets actual return date, makes asset `AVAILABLE`. |
| `getOverdueAllocations()`| `HEAD`, `MANAGER`, `ADMIN` | Returns active allocations where `expectedReturnDate` is in the past. |

#### `transfer.actions.ts` (Asset Transfer Requests)
| Function | Required Roles | Description |
|---|---|---|
| `createTransferRequest()` | *Authenticated* | Creates a transfer request for an allocated asset. Status: `REQUESTED`. |
| `approveTransfer(id)` | `HEAD`, `MANAGER`, `ADMIN` | Sets request status to `APPROVED`. |
| `rejectTransfer(id)` | `HEAD`, `MANAGER`, `ADMIN` | Sets request status to `REJECTED`. |
| `completeTransfer(id)` | `MANAGER`, `ADMIN` | Sets request to `COMPLETED`, updates allocations, and transfers the asset. |
| `getTransferRequests()` | *Authenticated* | Lists transfer requests based on filters. |

#### `booking.actions.ts` (Resource Booking)
| Function | Required Roles | Description |
|---|---|---|
| `createBooking(data)` | *Authenticated* | Checks if `asset.isBookable` is true and prevents overlapping time slots. |
| `cancelBooking(id)` | *Authenticated* | Cancels an existing booking. |
| `getBookingsForAsset(id)`| *Authenticated* | Retrieves bookings for calendar integration. |
| `getMyBookings()` | *Authenticated* | Retrieves bookings belonging to the current user. |

#### `maintenance.actions.ts` (Asset Maintenance)
| Function | Required Roles | Description |
|---|---|---|
| `createMaintenanceRequest`| *Authenticated* | Raises a maintenance request. Status: `PENDING`. |
| `approveMaintenance...` | `MANAGER`, `ADMIN` | Sets request to `APPROVED` and asset status to `UNDER_MAINTENANCE`. |
| `rejectMaintenance...` | `MANAGER`, `ADMIN` | Rejects the request. |
| `assignTechnician(id)` | `MANAGER`, `ADMIN` | Assigns a technician to the request. |
| `resolveMaintenance...` | `MANAGER`, `ADMIN` | Resolves the request and makes the asset `AVAILABLE` again. |
| `getMaintenanceRequests()`| *Authenticated* | Lists maintenance requests. |

#### `audit.actions.ts` (Audits)
| Function | Required Roles | Description |
|---|---|---|
| `createAuditCycle(data)` | `ADMIN` | Creates an audit and auto-populates `auditItems` based on scope (dept/location). |
| `assignAuditors(id, ids)`| `ADMIN` | Assigns users as auditors for a cycle. |
| `recordAuditItem(id, ...)`| *Auditor* | Records item results. Auto-creates `AuditDiscrepancy` if `MISSING`/`DAMAGED`. |
| `closeAuditCycle(id)` | `ADMIN` | Closes the audit. Marks `MISSING` items as `LOST` in the main Asset catalog. |
| `getAuditCycleDetails()` | *Authenticated* | Retrieves full audit progress details. |

#### `notification.actions.ts` & `dashboard.actions.ts`
| Function | Description |
|---|---|
| `getNotifications()` | Gets user notifications. |
| `markAsRead(id)` | Marks a single notification as read. |
| `markAllAsRead()` | Marks all user notifications as read. |
| `getUnreadCount()` | Gets the count of unread notifications for badges. |
| `checkOverdueAllocations()` | Cron handler to check and trigger notifications for overdue allocations. |
| `getDashboardStats()` | Gets high-level KPIs (Available Assets, Overdue Returns, Upcoming Returns, Pending Transfers, etc.). |
| `getUpcomingReturns()` | Gets active allocations where expected return date is in the future. |

---

## 3. Data & Schema Architecture

Our PostgreSQL database schema is designed around several core domain features. Below is a detailed breakdown of how the tables relate and function together.

### Identity & Organization
**Tables:** `User`, `Department`, `Session`, `Account`
* **Purpose:** Handles authentication and the organizational hierarchy.
* **Relations:** 
  * A `User` belongs to one `Department`. 
  * A `Department` can have a `parentDepartmentId` (allowing nested sub-departments) and a `departmentHeadId` (linking to a `User` who manages it).
* **Feature Integration:** The `Role` enum (`ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, `EMPLOYEE`) dictates what users can do in the application. Auth tables (`Session`, `Account`) are strictly managed by BetterAuth.

### Core Asset Catalog
**Tables:** `Asset`, `AssetCategory`
* **Purpose:** The source of truth for all physical hardware and resources in the company.
* **Relations:** Every `Asset` belongs to an `AssetCategory`.
* **Important Fields:**
  * `assetTag`: A unique identifier (e.g., "AF-0012") used for inventory tracking and barcode/QR scanning.
  * `isBookable`: A boolean that dictates if the asset can be reserved via the Resource Booking feature (e.g., Meeting Rooms or Projectors).
  * `customFieldValues`: A JSON field allowing dynamic properties depending on the category (e.g., "RAM size" for a Laptop category).
* **State Management:** The `status` field (`AVAILABLE`, `ALLOCATED`, `UNDER_MAINTENANCE`, `LOST`, etc.) is strictly controlled by the Server Actions. Direct mutation of this field from the client should never occur; it should only change as a side-effect of Allocations or Maintenance.

### Asset Lifecycles (Allocations & Transfers)
**Tables:** `AssetAllocation`, `TransferRequest`
* **Purpose:** Tracks who holds an asset at any given time.
* **Architecture:** 
  * Instead of a simple `userId` on the `Asset` table, we use `AssetAllocation` to maintain a historical log of who has owned the asset. 
  * When an asset is assigned, an `AssetAllocation` is created with an `expectedReturnDate`.
  * **Transfers:** If Employee A wants to give their allocated laptop to Employee B, a `TransferRequest` is created pointing to Employee A's active `AssetAllocation`. When the manager approves it, the Server Action marks Employee A's allocation as `TRANSFERRED` and creates a new `ACTIVE` allocation for Employee B.

### Resource Booking
**Tables:** `ResourceBooking`
* **Purpose:** Allows temporary reservation of shared resources (e.g., conference rooms, vehicles).
* **Architecture:** Operates independently of allocations. It uses `startTime` and `endTime` to prevent double-booking. The Server Action `createBooking` explicitly checks for overlapping time ranges in the database before allowing a new booking.

### Maintenance & Support
**Tables:** `MaintenanceRequest`
* **Purpose:** Handles repair ticketing.
* **Integration:** When a `MaintenanceRequest` is approved by a manager, the parent `Asset.status` is automatically updated to `UNDER_MAINTENANCE`. When resolved, it reverts to `AVAILABLE`. It acts as a state machine for broken assets.

### Auditing & Compliance
**Tables:** `AuditCycle`, `AuditCycleAuditor`, `AuditItem`, `AuditDiscrepancy`
* **Purpose:** Enables massive inventory checks (e.g., End-of-year physical counts).
* **Architecture:**
  * An `AuditCycle` defines the scope (e.g., "All assets in the IT Department").
  * When created, the backend automatically snapshots all relevant assets and creates `AuditItem` rows for them with a `PENDING` result.
  * Assigned users (`AuditCycleAuditor`) verify each item. 
  * If an item is marked as `MISSING`, an `AuditDiscrepancy` is automatically generated for manual review. If the cycle is closed without resolving the discrepancy, the `Asset.status` is automatically forced to `LOST`.

### Global Activity Tracking
**Tables:** `ActivityLog`, `Notification`
* **Purpose:** System transparency.
* **Architecture:** Every state-changing server action explicitly creates an `ActivityLog` row (tracking who did what and to which entity). `Notification` acts as a direct messaging table for alerts like "Transfer Approved" or "Return Overdue".
