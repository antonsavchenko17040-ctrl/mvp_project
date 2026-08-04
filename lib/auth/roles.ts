import type { UserRole } from "@/lib/types";

export const ROLE_LABEL_UK: Record<UserRole, string> = {
  admin: "Адміністратор",
  editor: "Редактор",
  ssp: "Відповідальний",
  manager: "Керівник",
  analyst: "Аналітик",
};

/** Workspace redirect priority after login */
const LOGIN_REDIRECT_ORDER: UserRole[] = ["admin", "editor", "ssp", "manager", "analyst"];

export function loginRedirectPath(map: Record<UserRole, string>, roles: UserRole[]): string {
  for (const role of LOGIN_REDIRECT_ORDER) {
    if (roles.includes(role)) {
      return map[role];
    }
  }
  return "/dashboard";
}

export function formatRolesList(roles: UserRole[]): string {
  return roles.map((r) => ROLE_LABEL_UK[r]).join(", ");
}

export function hasAnyRole(userRoles: UserRole[], allowed: UserRole[]): boolean {
  if (userRoles.includes("admin")) {
    return true;
  }
  return allowed.some((r) => userRoles.includes(r));
}

/** State machine: transitions that allow SSP path — prefer admin when present */
export function actingRoleForSsp(userRoles: UserRole[]): UserRole {
  if (userRoles.includes("admin")) {
    return "admin";
  }
  if (userRoles.includes("ssp")) {
    return "ssp";
  }
  return userRoles[0] ?? "ssp";
}

/** Manager verification flows */
export function actingRoleForManager(userRoles: UserRole[]): UserRole {
  if (userRoles.includes("admin")) {
    return "admin";
  }
  if (userRoles.includes("manager")) {
    return "manager";
  }
  return userRoles[0] ?? "manager";
}

/** Analyst verification flows */
export function actingRoleForAnalyst(userRoles: UserRole[]): UserRole {
  if (userRoles.includes("admin")) {
    return "admin";
  }
  if (userRoles.includes("analyst")) {
    return "analyst";
  }
  return userRoles[0] ?? "analyst";
}
