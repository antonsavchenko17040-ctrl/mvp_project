import Link from "next/link";

import { AUDIT_ACTION_LABELS, auditActionLabel, formatAuditDescription } from "@/lib/audit-log";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const entityTypeLabels: Record<string, string> = {
  recommendation: "Рекомендація",
  audit_folder: "Папка аудиту",
  user: "Користувач",
  department: "Підрозділ",
  system: "Система",
};

const roleLabels: Record<string, string> = {
  admin: "Адмін",
  editor: "Редактор",
  ssp: "Відповідальний",
  manager: "Керівник",
  analyst: "Аналітик",
};

function resolveRecommendationId(entry: {
  entityType: string;
  entityId: string;
  recommendationId: string | null;
}): string {
  if (entry.recommendationId) return entry.recommendationId;
  if (entry.entityType === "recommendation" && entry.entityId) return entry.entityId;
  return "";
}

function AuditLogEntityCell({
  entry,
  sequenceByRecommendationId,
}: {
  entry: {
    entityType: string;
    entityId: string;
    recommendationId: string | null;
  };
  sequenceByRecommendationId: Map<string, number>;
}) {
  const typeLabel = entityTypeLabels[entry.entityType] ?? entry.entityType;
  const recommendationId = resolveRecommendationId(entry);
  const sequenceNumber = recommendationId
    ? sequenceByRecommendationId.get(recommendationId)
    : undefined;

  if (entry.entityType === "recommendation" && recommendationId) {
    return (
      <>
        <div className="font-medium">
          {typeLabel}
          {sequenceNumber != null ? ` №${sequenceNumber}` : ""}
        </div>
        <div
          className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
          title={recommendationId}
        >
          id: {recommendationId}
        </div>
        {sequenceNumber != null ? (
          <Link
            href={`/admin/recommendations/${recommendationId}`}
            className="text-xs text-sky-800 hover:underline"
          >
            Відкрити рекомендацію
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div>{typeLabel}</div>
      {entry.entityId ? (
        <div className="truncate font-mono text-xs text-muted-foreground" title={entry.entityId}>
          id: {entry.entityId}
        </div>
      ) : null}
    </>
  );
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    action?: string;
    entityType?: string;
    page?: string;
  }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const action = (query.action ?? "").trim();
  const entityType = (query.entityType ?? "").trim();
  const page = Math.max(1, Number(query.page ?? "1") || 1);

  const where = {
    AND: [
      action ? { action } : {},
      entityType ? { entityType } : {},
      q
        ? {
            OR: [
              { summary: { contains: q } },
              { actorEmail: { contains: q } },
              { actorName: { contains: q } },
              { entityId: { contains: q } },
              { recommendationId: { contains: q } },
              { action: { contains: q } },
            ],
          }
        : {},
    ],
  };

  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const recommendationIds = [
    ...new Set(entries.map(resolveRecommendationId).filter(Boolean)),
  ];

  const recommendations =
    recommendationIds.length > 0
      ? await db.recommendation.findMany({
          where: { id: { in: recommendationIds } },
          select: { id: true, sequenceNumber: true },
        })
      : [];

  const sequenceByRecommendationId = new Map(
    recommendations.map((item) => [item.id, item.sequenceNumber]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = {
      q: overrides.q ?? (q || undefined),
      action: overrides.action ?? (action || undefined),
      entityType: overrides.entityType ?? (entityType || undefined),
      page: overrides.page,
    };
    if (next.q) params.set("q", next.q);
    if (next.action) params.set("action", next.action);
    if (next.entityType) params.set("entityType", next.entityType);
    if (next.page && next.page !== "1") params.set("page", next.page);
    const qs = params.toString();
    return qs ? `/admin/audit-log?${qs}` : "/admin/audit-log";
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Audit Log — історія змін</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Кожна зміна статусу або поля фіксується з AgentID та Timestamp. Показано {entries.length} з{" "}
            {total}.
          </p>
        </div>
        <Link href="/admin" className="text-base font-medium text-sky-800 hover:underline">
          ← До робочого столу адміна
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фільтри</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <div className="md:col-span-2">
              <Label htmlFor="q">Пошук</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="Текст, email, ID…" />
            </div>
            <div>
              <Label htmlFor="action">Дія</Label>
              <select
                id="action"
                name="action"
                defaultValue={action}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Усі дії</option>
                {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="entityType">Тип сутності</Label>
              <select
                id="entityType"
                name="entityType"
                defaultValue={entityType}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Усі типи</option>
                {Object.entries(entityTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-4">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64]"
              >
                Застосувати
              </button>
              <Link
                href="/admin/audit-log"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-black/20 bg-white px-4 text-sm font-medium hover:bg-muted"
              >
                Скинути
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className={dataTableWrapClassName()}>
        <table className={dataTableClassName("min-w-[1100px]")}>
          <thead className={dataTable.thead}>
            <tr className={dataTable.headRow}>
              <th className={dataTable.th}>AgentID</th>
              <th className={dataTable.th}>Timestamp</th>
              <th className={dataTable.th}>Дія</th>
              <th className={dataTable.th}>Сутність</th>
              <th className={dataTable.th}>Опис</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr className={dataTable.bodyRow}>
                <td colSpan={5} className={dataTable.emptyCell}>
                  Записів за обраними фільтрами немає.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const description = formatAuditDescription(entry.summary, entry.difference);
                return (
                <tr key={entry.id} className={cn(dataTable.bodyRow, dataTable.rowHover, "align-top")}>
                  <td className={cn(dataTable.cell, "max-w-[14rem]")}>
                    <div className="text-sm font-medium">
                      {entry.actorName || entry.actorEmail || "—"}
                    </div>
                    {entry.actorRole ? (
                      <div className="text-xs text-muted-foreground">
                        {roleLabels[entry.actorRole] ?? entry.actorRole}
                      </div>
                    ) : null}
                  </td>
                  <td className={cn(dataTable.cell, "whitespace-nowrap tabular-nums")}>
                    {entry.createdAt.toLocaleString("uk-UA")}
                  </td>
                  <td className={dataTable.cell}>
                    <span className="font-medium">{auditActionLabel(entry.action)}</span>
                    <div className="text-xs text-muted-foreground">{entry.action}</div>
                  </td>
                  <td className={dataTable.cell}>
                    <AuditLogEntityCell
                      entry={entry}
                      sequenceByRecommendationId={sequenceByRecommendationId}
                    />
                  </td>
                  <td className={cn(dataTable.cell, "max-w-md break-words")}>
                    <div className="font-medium">{description.headline}</div>
                    {description.details.length > 0 ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {description.details.map((line, index) => (
                          <li key={`${entry.id}-change-${index}`} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Сторінка {page} з {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={hrefFor({ page: String(Math.max(1, page - 1)) })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm",
                page <= 1 && "pointer-events-none opacity-40",
              )}
            >
              Назад
            </Link>
            <Link
              href={hrefFor({ page: String(Math.min(totalPages, page + 1)) })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm",
                page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              Далі
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
