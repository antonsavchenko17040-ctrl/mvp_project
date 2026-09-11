import { redirect } from "next/navigation";

import { PUBLIC_REPORTS_ACTIVE_HOME } from "@/lib/reports-section";

export default function PublicReportsPage() {
  redirect(PUBLIC_REPORTS_ACTIVE_HOME);
}
