import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  auditFolderExportFilename,
  auditFolderXlsxOrderBy,
  buildAuditFolderXlsxBuffer,
} from "@/lib/export/audit-folder-xlsx";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Скачування архівованого звіту (XLSX). Доступно всім. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const folder = await db.auditFolder.findFirst({
    where: { id, archivedAt: { not: null } },
    select: {
      id: true,
      title: true,
      year: true,
      recommendations: {
        where: { isActive: true },
        select: {
          sequenceNumber: true,
          vkElement: true,
          deficiency: true,
          recommendationText: true,
          executionIndicator: true,
          expectedResult: true,
          sspUnit: true,
          deadline: true,
          informingDeadline: true,
          progressReport: true,
          actualImplementationDate: true,
          measuresDescription: true,
          expectedAchievement: true,
          supportingDocuments: true,
          sspNotes: true,
          fieldSupplements: {
            orderBy: { changeDate: "asc" },
            select: {
              fieldKey: true,
              content: true,
              previousContent: true,
              changeReason: true,
              changeDate: true,
            },
          },
        },
        orderBy: auditFolderXlsxOrderBy,
      },
    },
  });

  if (!folder) {
    return NextResponse.json(
      { error: "Архівований звіт не знайдено." },
      { status: 404 },
    );
  }

  const buffer = await buildAuditFolderXlsxBuffer({
    title: folder.title,
    year: folder.year,
    recommendations: folder.recommendations,
  });
  const filename = auditFolderExportFilename(folder.title);
  const asciiFallback = "zvit.xlsx";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
