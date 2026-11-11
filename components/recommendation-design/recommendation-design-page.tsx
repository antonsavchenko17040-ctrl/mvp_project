"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { FieldRevision, RecommendationSibling } from "@/lib/recommendation-design/view-model";
import { statusTone } from "@/lib/recommendation-design/view-model";

export type DateHistoryModel = {
  count: number;
  initial: string;
  entries: Array<{ from: string; to: string; when: string; reason: string; current: boolean }>;
};

export type DesignField = {
  key: string;
  label: string;
  revisions: FieldRevision[];
};

const toneClass: Record<string, string> = {
  draft: "border-[#9a9a9a] bg-[#f0f0f0] text-[#4b4b4b]",
  progress: "border-[#0069aa] bg-[#dbeffc] text-[#0069aa]",
  revision: "border-[#aa0600] bg-[#ffcaca] text-[#aa0600]",
  approval: "border-[#b35c00] bg-[#ffe3c2] text-[#8a4500]",
  verify: "border-[#c2a637] bg-[#fff4ca] text-[#7a6400]",
  done: "border-[#1e6b35] bg-[#dcf3e2] text-[#1e6b35]",
};

function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-[10px] border px-2 text-sm font-semibold ${toneClass[statusTone(status)] ?? toneClass.draft}`}
    >
      {label}
    </span>
  );
}

function VersionField({ field }: { field: DesignField }) {
  const current = field.revisions.find((item) => item.current) ?? field.revisions[field.revisions.length - 1];
  const [selected, setSelected] = useState(String(current?.n ?? 1));
  const revision = field.revisions.find((item) => String(item.n) === selected) ?? current;
  if (!revision) return null;
  const archived = !revision.current;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold leading-snug">{field.label}</h2>
      {field.revisions.length > 1 ? (
        <label className="relative inline-flex max-w-full self-start">
          <span className="sr-only">Редакція поля «{field.label}»</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="h-9 max-w-full appearance-none rounded-full border border-[#0069aa] bg-[#0069aa] py-0 pl-3.5 pr-10 text-sm font-semibold text-white"
          >
            {field.revisions.map((item) => (
              <option key={item.n} value={item.n} className="bg-white text-black">
                {item.current
                  ? `Редакція ${item.n} — чинна${item.fromLabel ? `, з ${item.fromLabel}` : ""}`
                  : `Редакція ${item.n}${item.fromLabel ? ` — ${item.fromLabel}` : ""}${item.toLabel ? `–${item.toLabel}` : ""}`}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-4 top-2.5" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M6 9l6 6 6-6" fill="none" stroke="white" strokeWidth="2" />
          </svg>
        </label>
      ) : null}
      <div
        className={
          archived
            ? "flex flex-col gap-3 rounded-xl border border-dashed border-[#9a9a9a] bg-[#f5f5f5] px-5 py-[18px] text-[#3b3b3b]"
            : "flex flex-col gap-3 rounded-xl border-2 border-[#0069aa] bg-white px-5 py-[18px]"
        }
      >
        <p className={`text-sm font-bold tracking-wide ${archived ? "text-[#595959]" : "text-[#0069aa]"}`}>
          {archived ? `НЕЧИННА РЕДАКЦІЯ ${revision.n}` : `ЧИННА РЕДАКЦІЯ ${revision.n}`}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{revision.text || "—"}</p>
        {revision.reason ? (
          <p className="border-t border-[#d9d9d9] pt-2.5 text-sm leading-normal text-[#595959]">
            {revision.fromLabel ? `З ${revision.fromLabel}. ` : null}
            Причина: {revision.reason}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function RecommendationDesignPage({
  backHref,
  backLabel = "Назад",
  folderTitle,
  folderYear,
  sequenceNumber,
  auditTitle,
  status,
  statusLabelText,
  significance,
  sspUnit,
  vkElement,
  deadline,
  informingDeadline,
  daysLeft,
  deadlineWas,
  deadlineChanges,
  informingChanges,
  deadlineHistory,
  informingHistory,
  fields,
  showResults,
  progress,
  actualDate,
  measures,
  expectedAchievement,
  documents,
  notes,
  siblings,
  actions,
  alerts,
  changeBanner,
  returnBanner,
  work,
}: {
  backHref: string;
  backLabel?: string;
  folderTitle: string;
  folderYear?: number | null;
  sequenceNumber: number;
  auditTitle?: string;
  status: string;
  statusLabelText: string;
  significance: string;
  sspUnit: string;
  vkElement: string;
  deadline: string;
  informingDeadline: string;
  daysLeft: number | null;
  deadlineWas?: string | null;
  deadlineChanges: number;
  informingChanges: number;
  deadlineHistory: DateHistoryModel;
  informingHistory: DateHistoryModel;
  fields: DesignField[];
  showResults: boolean;
  progress: string;
  actualDate: string;
  measures: string;
  expectedAchievement: string;
  documents: string;
  notes: string;
  siblings: RecommendationSibling[];
  actions?: ReactNode;
  alerts?: ReactNode;
  changeBanner?: { title: string; meta?: string; text: string } | null;
  returnBanner?: { title: string; meta?: string; text: string } | null;
  work?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sspFilter, setSspFilter] = useState("all");
  const [historyOpen, setHistoryOpen] = useState(false);

  const statuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of siblings) map.set(item.status, item.statusLabel);
    return [...map.entries()];
  }, [siblings]);
  const units = useMemo(
    () => [...new Set(siblings.map((item) => item.sspUnit).filter((item) => item && item !== "—"))],
    [siblings],
  );
  const visible = siblings.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (sspFilter !== "all" && item.sspUnit !== sspFilter) return false;
    const hay = `${item.sequenceNumber} ${item.title}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const statusTile =
    statusTone(status) === "revision"
      ? "border-[#aa0600] bg-[#ffcaca]"
      : statusTone(status) === "approval"
        ? "border-[#b35c00] bg-[#ffe3c2]"
        : statusTone(status) === "verify"
          ? "border-[#c2a637] bg-[#fff4ca]"
          : statusTone(status) === "done"
            ? "border-[#1e6b35] bg-[#dcf3e2]"
            : "border-[#d9d9d9] bg-white";

  return (
    <div className="-m-5 flex min-h-[calc(100dvh-4rem)] flex-col bg-white text-base text-black xl:-m-7 2xl:-mx-10 2xl:-my-9 min-[960px]:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-black min-[960px]:w-[340px] min-[960px]:border-b-0 min-[960px]:border-r">
        <div className="flex flex-col gap-1.5 bg-[#0069aa] px-4 py-3.5 text-white">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-[#dbeffc] no-underline hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {backLabel}
          </Link>
          <p className="text-base font-semibold leading-snug">
            {folderTitle}
            {folderYear ? ` · ${folderYear}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 border-b border-[#d9d9d9] px-3.5 py-3">
          <div className="flex items-center justify-between">
            <span>Рекомендацій у папці</span>
            <span className="inline-flex h-[30px] min-w-7 items-center justify-center rounded-md bg-[#d9d9d9] px-1.5 font-semibold">
              {visible.length}
            </span>
          </div>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2.5">
            <span className="sr-only">Пошук рекомендації</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пошук за текстом рекомендації"
              className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 min-w-0 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2 text-sm"
              aria-label="Фільтр за статусом"
            >
              <option value="all">Статус: усі</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={sspFilter}
              onChange={(event) => setSspFilter(event.target.value)}
              className="h-9 min-w-0 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2 text-sm"
              aria-label="Фільтр за підрозділом"
            >
              <option value="all">ССП: усі</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-[#595959]">
            Сортування: <strong className="font-semibold text-black">за номером</strong>
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3.5 min-[960px]:flex-col min-[960px]:overflow-visible">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={`flex min-w-[300px] flex-col gap-1.5 rounded-xl p-2.5 text-black no-underline min-[960px]:min-w-0 ${
                item.current
                  ? "border-2 border-[#0069aa] bg-[#eef6fc] px-[11px] py-[9px]"
                  : item.status === "draft" || item.status === "ssp_draft"
                    ? "border border-dashed border-[#b5b5b5]"
                    : "border border-black"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">№{item.sequenceNumber}</span>
                <Badge status={item.status} label={item.statusLabel} />
              </span>
              <span className="line-clamp-3 leading-snug">{item.title}</span>
              <span className="flex items-center gap-2 text-sm text-[#595959]">
                <span>{item.significance}</span>
                <span aria-hidden>·</span>
                <span className="truncate">{item.sspUnit}</span>
              </span>
            </Link>
          ))}
        </div>
      </aside>

      <div className="@container flex min-w-0 flex-1 flex-col gap-[22px] px-4 py-5 sm:px-6 sm:py-7 lg:px-11">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            {auditTitle ? <p className="text-[#595959]">{auditTitle}</p> : null}
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-[32px]">
              Рекомендація №{sequenceNumber}
            </h1>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>

        {alerts}
        {returnBanner ? (
          <div className="flex gap-3.5 rounded-xl border border-[#aa0600] bg-[#ffdfdf] px-[18px] py-3.5">
            <div>
              <p className="font-bold text-[#aa0600]">{returnBanner.title}</p>
              {returnBanner.meta ? <p className="text-sm text-[#3b3b3b]">{returnBanner.meta}</p> : null}
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{returnBanner.text}</p>
            </div>
          </div>
        ) : null}
        {changeBanner ? (
          <div className="flex gap-3.5 rounded-xl border border-[#0069aa] bg-[#dbeffc] px-[18px] py-3.5">
            <div>
              <p className="font-bold text-[#004a78]">{changeBanner.title}</p>
              {changeBanner.meta ? <p className="text-sm text-[#3b3b3b]">{changeBanner.meta}</p> : null}
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{changeBanner.text}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 min-[392px]:grid-cols-2 @min-[594px]:grid-cols-3 @min-[1200px]:grid-cols-6">
          <article className={`flex gap-2.5 rounded-xl border p-3 ${statusTile}`}>
            <div>
              <p className="text-[#595959]">Статус</p>
              <p className="font-semibold">{statusLabelText}</p>
            </div>
          </article>
          <article
            className={`flex gap-2.5 rounded-xl border p-3 ${
              /серед/i.test(significance)
                ? "border-[#585836] bg-[#fefe9c]"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <div>
              <p className="text-[#595959]">Значущість спостереження</p>
              <p className="font-semibold">{significance || "—"}</p>
            </div>
          </article>
          <article className="flex gap-2.5 rounded-xl border border-[#d9d9d9] p-3">
            <div className="min-w-0">
              <p className="text-[#595959]">Відповідальний підрозділ</p>
              <p className="font-semibold">{sspUnit || "—"}</p>
            </div>
          </article>
          <article className={`flex gap-2.5 rounded-xl border p-3 ${deadlineChanges ? "border-[#0069aa] bg-[#eef6fc]" : "border-[#d9d9d9]"}`}>
            <div>
              <p className="text-[#595959]">Термін виконання</p>
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {deadline}
                {deadlineChanges > 0 ? (
                  <button
                    type="button"
                    className="inline-flex h-[22px] items-center rounded-[10px] bg-[#0069aa] px-2 text-sm font-semibold text-white"
                    aria-expanded={historyOpen}
                    onClick={() => setHistoryOpen((open) => !open)}
                  >
                    {deadlineChanges} змін
                  </button>
                ) : null}
              </p>
              {deadlineWas ? <p className="text-sm text-[#595959]">було {deadlineWas}</p> : null}
              {daysLeft !== null && daysLeft <= 7 ? (
                <p className="mt-1 inline-flex h-[26px] items-center rounded-md bg-[#ffc353] px-2 text-sm font-bold text-[#3d2600]">
                  {daysLeft < 0 ? `прострочено ${Math.abs(daysLeft)} дн.` : `через ${daysLeft} дн.`}
                </p>
              ) : daysLeft !== null ? (
                <p className="text-sm text-[#595959]">через {daysLeft} дн.</p>
              ) : null}
            </div>
          </article>
          <article className={`flex gap-2.5 rounded-xl border p-3 ${informingChanges ? "border-[#0069aa] bg-[#eef6fc]" : "border-[#d9d9d9]"}`}>
            <div>
              <p className="text-[#595959]">Строк інформування</p>
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {informingDeadline}
                {informingChanges > 0 ? (
                  <button
                    type="button"
                    className="inline-flex h-[22px] items-center rounded-[10px] bg-[#0069aa] px-2 text-sm font-semibold text-white"
                    aria-expanded={historyOpen}
                    onClick={() => setHistoryOpen((open) => !open)}
                  >
                    {informingChanges} змін
                  </button>
                ) : null}
              </p>
              {informingHistory.entries.at(-1)?.from ? (
                <p className="text-sm text-[#595959]">було {informingHistory.entries.at(-1)?.from}</p>
              ) : null}
            </div>
          </article>
          <article className="flex gap-2.5 rounded-xl border border-[#d9d9d9] p-3">
            <div className="min-w-0">
              <p className="text-[#595959]">Елемент ВК</p>
              <p className="font-semibold">{vkElement || "—"}</p>
            </div>
          </article>
        </div>

        {historyOpen ? (
          <section className="flex flex-col gap-3 rounded-xl border border-[#0069aa] px-5 py-[18px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Історія зміни строків</h2>
              <button type="button" className="text-sm font-semibold text-[#0069aa]" onClick={() => setHistoryOpen(false)}>
                Згорнути
              </button>
            </div>
            <div className="grid gap-4 min-[960px]:grid-cols-2">
              {[
                { title: "Термін виконання", history: deadlineHistory },
                { title: "Строк інформування", history: informingHistory },
              ].map((column, columnIndex) => (
                <div
                  key={column.title}
                  className={`min-w-0 ${columnIndex === 1 ? "min-[960px]:border-l min-[960px]:border-[#d9d9d9] min-[960px]:pl-8" : "min-[960px]:pr-8"}`}
                >
                  <h3 className="font-semibold">
                    {column.title}
                    {column.history.count ? ` · ${column.history.count} змін` : ""}
                  </h3>
                  <p className="text-sm text-[#595959]">Початковий: {column.history.initial}</p>
                  <ol className="mt-1 list-none p-0">
                    {column.history.entries.map((entry, index) => (
                      <li key={`${column.title}-${index}`} className="flex flex-col gap-1 border-b border-[#e6e6e6] py-3">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {entry.from} → {entry.to}
                          {entry.current ? (
                            <span className="inline-flex h-[22px] items-center rounded-[10px] border border-[#0069aa] px-2 text-sm font-semibold text-[#0069aa]">
                              чинний
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-[#595959]">
                          Змінено {entry.when}. Підстава: {entry.reason}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {fields.map((field) => (
          <VersionField key={field.key} field={field} />
        ))}

        {showResults ? (
          <section className="flex flex-col gap-[22px] border-t border-black pt-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Результати виконання</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-[#d9d9d9] p-3">
                <p className="text-[#595959]">Стан впровадження</p>
                <p className="whitespace-pre-wrap font-semibold">{progress || "—"}</p>
              </article>
              <article className="rounded-xl border border-[#d9d9d9] p-3">
                <p className="text-[#595959]">Фактична дата впровадження</p>
                <p className="font-semibold">{actualDate || "—"}</p>
              </article>
            </div>
            <section className="flex flex-col gap-3">
              <h3 className="border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Заходи з впровадження</h3>
              <p className={`whitespace-pre-wrap leading-relaxed ${measures ? "" : "text-[#595959]"}`}>{measures || "—"}</p>
            </section>
            <div className="grid gap-6 min-[960px]:grid-cols-2">
              {[
                ["Досягнення очікуваного", expectedAchievement],
                ["Підтверджуючі документи", documents],
              ].map(([label, value]) => (
                <section key={label} className="flex flex-col gap-3">
                  <h3 className="border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">{label}</h3>
                  <p className={`whitespace-pre-wrap leading-relaxed ${value ? "" : "text-[#595959]"}`}>{value || "—"}</p>
                </section>
              ))}
            </div>
            <section className="flex flex-col gap-3">
              <h3 className="border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Примітки</h3>
              <p className={`whitespace-pre-wrap leading-relaxed ${notes ? "" : "text-[#595959]"}`}>{notes || "—"}</p>
            </section>
          </section>
        ) : null}

        {work ? <div className="border-t border-black pt-6">{work}</div> : null}
      </div>
    </div>
  );
}
