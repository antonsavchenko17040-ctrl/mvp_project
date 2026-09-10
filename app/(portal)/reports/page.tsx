import { redirect } from "next/navigation";

import { PORTAL_REPORTS_ACTIVE_HOME } from "@/lib/reports-section";

export default function ReportsPage() {
  redirect(PORTAL_REPORTS_ACTIVE_HOME);
}
