"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { dataTable } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

type AdminAuditFolderRowProps = {
  id: string;
  title: string;
  year: number;
  authorEmail: string;
  authorFullName: string | null;
  recommendationsCount: number;
  selected: boolean;
  archivedAt?: Date | string | null;
  actions: ReactNode;
};

export function AdminAuditFolderRow({
  id,
  title,
  year,
  authorEmail,
  authorFullName,
  recommendationsCount,
  selected,
  archivedAt = null,
  actions,
}: AdminAuditFolderRowProps) {
  const router = useRouter();
  const isArchived = archivedAt != null && archivedAt !== "";

  const openFolder = () => {
    router.push(`/admin?folder=${id}`);
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={cn(
        dataTable.bodyRow,
        "relative cursor-pointer align-top transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isArchived
          ? selected
            ? "bg-[#c9ced8] text-slate-900 hover:bg-[#b8bfcc]"
            : "bg-[#d5dae3] text-slate-900 hover:bg-[#c4cbd6]"
          : selected
            ? "bg-[#f2ecbe] hover:bg-[#ece4a8]"
            : "hover:bg-[#f2ecbe]",
      )}
      onClick={openFolder}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFolder();
        }
      }}
    >
      <td className={cn(dataTable.cell, "relative font-medium", isArchived && "pt-7")}>
        {isArchived ? (
          <span className="absolute top-1.5 left-1.5 z-10 rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
            Архівовано
          </span>
        ) : null}
        <span>{title}</span>
      </td>
      <td className={dataTable.cell}>{year}</td>
      <td className={dataTable.cell}>
        <span className="text-sm">{authorEmail}</span>
        {authorFullName ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{authorFullName}</span>
        ) : null}
      </td>
      <td className={dataTable.cell}>{recommendationsCount}</td>
      <td
        className={dataTable.cell}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {actions}
      </td>
    </tr>
  );
}
