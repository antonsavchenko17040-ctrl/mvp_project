"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { dataTable } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

export function EditorRecommendationTableRow({
  href,
  children,
  className,
  highlighted = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Підсвітка рядка зі сповіщення (query `highlight`). */
  highlighted?: boolean;
}) {
  const router = useRouter();
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!highlighted) return;
    const node = rowRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  return (
    <tr
      ref={rowRef}
      data-highlighted={highlighted ? "true" : undefined}
      className={cn(
        "group",
        dataTable.bodyRow,
        dataTable.rowHover,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
        highlighted &&
          "bg-[#f2ecbe] ring-2 ring-inset ring-[#c4b44a] animate-[pulse_1.2s_ease-in-out_1]",
      )}
      tabIndex={0}
      role="link"
      aria-label="Відкрити рекомендацію"
      aria-current={highlighted ? "true" : undefined}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </tr>
  );
}
