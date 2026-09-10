export const PORTAL_DASHBOARD_HOME = "/dashboard";
export const PORTAL_REPORTS_LIBRARY_HOME = "/reports";
export const PORTAL_REPORTS_ACTIVE_HOME = "/reports/active";
export const PORTAL_REPORTS_COMPLETED_HOME = "/reports/completed";
export const PUBLIC_DASHBOARD_HOME = "/public/dashboard";
export const PUBLIC_REPORTS_LIBRARY_HOME = "/public/reports";

export const PORTAL_DASHBOARD_FOLDERS_PREFIX = "/dashboard/folders";
export const PUBLIC_DASHBOARD_FOLDERS_PREFIX = "/public/folders";
export const PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX = "/reports/folders";
export const PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX = "/public/reports/folders";

/** @deprecated Використовуйте PORTAL_DASHBOARD_HOME */
export const PORTAL_REPORTS_HOME = PORTAL_DASHBOARD_HOME;
/** @deprecated Використовуйте PUBLIC_DASHBOARD_HOME */
export const PUBLIC_REPORTS_HOME = PUBLIC_DASHBOARD_HOME;

export function isPortalDashboardActive(pathname: string): boolean {
  return pathname === PORTAL_DASHBOARD_HOME || pathname.startsWith(`${PORTAL_DASHBOARD_FOLDERS_PREFIX}/`);
}

export function isPortalReportsLibraryActive(pathname: string): boolean {
  return (
    pathname === PORTAL_REPORTS_LIBRARY_HOME ||
    pathname === PORTAL_REPORTS_ACTIVE_HOME ||
    pathname === PORTAL_REPORTS_COMPLETED_HOME ||
    pathname.startsWith(`${PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX}/`)
  );
}

export function isPortalReportsActiveListActive(pathname: string): boolean {
  return pathname === PORTAL_REPORTS_ACTIVE_HOME;
}

export function isPortalReportsCompletedListActive(pathname: string): boolean {
  return pathname === PORTAL_REPORTS_COMPLETED_HOME;
}

export function isPublicDashboardActive(pathname: string): boolean {
  return (
    pathname === "/public" ||
    pathname === PUBLIC_DASHBOARD_HOME ||
    pathname.startsWith(`${PUBLIC_DASHBOARD_FOLDERS_PREFIX}/`)
  );
}

export function isPublicReportsLibraryActive(pathname: string): boolean {
  return (
    pathname === PUBLIC_REPORTS_LIBRARY_HOME ||
    pathname.startsWith(`${PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX}/`)
  );
}
