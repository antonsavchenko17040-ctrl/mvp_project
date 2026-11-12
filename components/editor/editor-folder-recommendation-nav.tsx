"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";
import { EDITOR_FOLDER_STATUS_FILTERS } from "@/lib/editor/editor-folder-status-filters";
import type { RecommendationStatus } from "@/lib/types";

export type EditorFolderNavItem = {
  id: string;
  sequenceNumber: number;
  title: string;
  status: RecommendationStatus;
  significance: string;
  sspUnit: string;
};

const badgeTone: Record<string, string> = {
  draft: "border-[#9a9a9a] bg-[#f0f0f0] text-[#4b4b4b]",
  in_progress: "border-[#0069aa] bg-[#dbeffc] text-[#0069aa]",
  revision: "border-[#aa0600] bg-[#ffcaca] text-[#aa0600]",
  manager_review: "border-[#c2a637] bg-[#fff4ca] text-[#7a6400]",
  on_review: "border-[#c2a637] bg-[#fff4ca] text-[#7a6400]",
  published: "border-[#1e6b35] bg-[#dcf3e2] text-[#1e6b35]",
};

function matchesStatus(status: RecommendationStatus, filter: string) {
  if (filter === "all") return true;
  if (filter === "on_review") return status === "on_review" || status === "manager_review";
  return status === filter;
}

export function EditorFolderRecommendationNav({
  folderId,
  folderTitle,
  items,
  children,
}: {
  folderId: string;
  folderTitle: string;
  items: EditorFolderNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onRecommendation = /^\/editor\/folders\/[^/]+\/recommendations\//.test(pathname);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sspFilter, setSspFilter] = useState("all");

  const units = useMemo(
    () => [...new Set(items.map((item) => item.sspUnit.trim()).filter(Boolean))],
    [items],
  );

  if (!onRecommendation) return children;

  const visible = items.filter((item) => {
    if (!matchesStatus(item.status, statusFilter)) return false;
    if (sspFilter !== "all" && item.sspUnit.trim() !== sspFilter) return false;
    const hay = `${item.sequenceNumber} ${item.title}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const activeId = pathname.match(/\/recommendations\/([^/]+)/)?.[1] ?? "";

  return (
    <div className="-m-5 flex min-h-[calc(100dvh-4rem)] flex-col bg-white xl:-m-7 2xl:-mx-10 2xl:-my-9 min-[960px]:flex-row">
      <aside
        aria-label="Рекомендації папки"
        className="flex w-full shrink-0 flex-col border-b border-black min-[960px]:w-[300px] min-[960px]:border-b-0 min-[960px]:border-r min-[1200px]:w-[340px]"
      >
        <div className="flex flex-col gap-1.5 bg-[#0069aa] px-4 py-3.5 text-white">
          <Link href="/editor" className="inline-flex items-center gap-1 text-sm text-[#dbeffc] no-underline hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Усі папки аудитів
          </Link>
          <p className="text-base font-semibold leading-snug">{folderTitle}</p>
        </div>
        <div className="flex flex-col gap-2.5 border-b border-[#d9d9d9] px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span>Рекомендацій у папці</span>
            <span className="inline-flex h-[30px] min-w-7 items-center justify-center rounded-md bg-[#d9d9d9] px-1.5 font-semibold">
              {items.length}
            </span>
          </div>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2.5">
            <span className="sr-only">Пошук за текстом рекомендації</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#595959" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
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
              aria-label="Фільтр за статусом"
              className="h-9 min-w-0 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2 text-sm"
            >
              <option value="all">Статус: усі</option>
              {EDITOR_FOLDER_STATUS_FILTERS.filter((item) => item.key !== "all").map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={sspFilter}
              onChange={(event) => setSspFilter(event.target.value)}
              aria-label="Фільтр за ССП"
              className="h-9 min-w-0 rounded-lg border border-[#b5b5b5] bg-[#fef9f9] px-2 text-sm"
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
          {visible.map((item) => {
            const current = item.id === activeId;
            const draft = item.status === "draft";
            const unit = item.sspUnit.trim();
            return (
              <Link
                key={item.id}
                href={`/editor/folders/${folderId}/recommendations/${item.id}`}
                aria-current={current ? "page" : undefined}
                className={`flex min-w-[300px] flex-col gap-1.5 rounded-xl p-3 text-black no-underline min-[960px]:min-w-0 ${
                  current
                    ? "border-2 border-[#0069aa] bg-[#eef6fc] px-[11px] py-[11px]"
                    : draft
                      ? "border border-dashed border-[#b5b5b5]"
                      : "border border-black"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold">№{item.sequenceNumber}</span>
                  <span
                    className={`inline-flex h-6 items-center rounded-[10px] border px-2 text-sm font-semibold ${badgeTone[item.status] ?? badgeTone.draft}`}
                  >
                    {editorWorkspaceStatusLabel(item.status)}
                  </span>
                </span>
                <span className="line-clamp-3 leading-snug">{item.title || "—"}</span>
                <span className="flex items-center gap-2 text-sm text-[#595959]">
                  {draft && !unit ? (
                    <span>Підрозділ не призначено</span>
                  ) : (
                    <>
                      <span>{item.significance.trim() || "—"}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{unit || "—"}</span>
                    </>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-5 xl:p-7 2xl:px-10 2xl:py-9">{children}</div>
    </div>
  );
}
