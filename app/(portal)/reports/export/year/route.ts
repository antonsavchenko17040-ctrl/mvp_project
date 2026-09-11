import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  auditFolderXlsxOrderBy,
  buildYearAuditFoldersXlsxBuffer,
  yearAuditFoldersExportFilename,
} from "@/lib/export/audit-folder-xlsx";

/** Зведений XLSX усіх звітів за рік (окрім поточного календарного року). */
export async function GET(request: Request) {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const yearRaw = String(searchParams.get("year") ?? "").trim();
  const year = Number(yearRaw);
  const currentYear = new Date().getFullYear();

  if (!yearRaw || !Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Вкажіть коректний рік." }, { status: 400 });
  }

  if (year === currentYear) {
    return NextResponse.json(
      { error: "Зведений експорт недоступний для поточного року." },
      { status: 400 },
    );
  }

  const folders = await db.auditFolder.findMany({
    where: { year },
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
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

  const foldersWithRows = folders.filter((folder) => folder.recommendations.length > 0);
  if (foldersWithRows.length === 0) {
    return NextResponse.json(
      { error: "За обраний рік звітів для експорту не знайдено." },
      { status: 404 },
    );
  }

  const buffer = await buildYearAuditFoldersXlsxBuffer({
    year,
    folders: foldersWithRows.map((folder) => ({
      title: folder.title,
      recommendations: folder.recommendations,
    })),
  });
  const filename = yearAuditFoldersExportFilename(year);
  const asciiFallback = `zvity-${year}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
