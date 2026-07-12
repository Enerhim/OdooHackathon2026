import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

/**
 * Get the current session, or null if unauthenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Get the current session or redirect to /login.
 * Use in server components/actions that require authentication.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Require the current user to have one of the specified roles.
 * Redirects to /login if unauthenticated, throws 403 if unauthorized.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireSession();
  const userRole = (session.user as Record<string, unknown>).role as Role;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(
      `Forbidden: requires one of [${allowedRoles.join(", ")}], but user has role [${userRole}]`
    );
  }

  return session;
}
