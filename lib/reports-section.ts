export const PORTAL_DASHBOARD_HOME = "/dashboard";
export const PORTAL_REPORTS_LIBRARY_HOME = "/reports";
export const PUBLIC_DASHBOARD_HOME = "/public/dashboard";
export const PUBLIC_REPORTS_LIBRARY_HOME = "/public/reports";

/** @deprecated Використовуйте PORTAL_DASHBOARD_HOME */
export const PORTAL_REPORTS_HOME = PORTAL_DASHBOARD_HOME;
/** @deprecated Використовуйте PUBLIC_DASHBOARD_HOME */
export const PUBLIC_REPORTS_HOME = PUBLIC_DASHBOARD_HOME;

export function isPortalDashboardActive(pathname: string): boolean {
  return pathname === PORTAL_DASHBOARD_HOME || pathname.startsWith("/dashboard/folders/");
}

export function isPortalReportsLibraryActive(pathname: string): boolean {
  return pathname === PORTAL_REPORTS_LIBRARY_HOME;
}

export function isPublicDashboardActive(pathname: string): boolean {
  return (
    pathname === "/public" ||
    pathname === PUBLIC_DASHBOARD_HOME ||
    pathname.startsWith("/public/folders/")
  );
}

export function isPublicReportsLibraryActive(pathname: string): boolean {
  return pathname === PUBLIC_REPORTS_LIBRARY_HOME;
}
