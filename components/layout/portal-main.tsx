"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PortalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const recommendationPage = pathname.includes("/recommendations/");
  const editorRecommendation = /\/editor\/folders\/[^/]+\/recommendations\//.test(pathname);

  return (
    <main
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        editorRecommendation
          ? "overflow-hidden"
          : "overflow-x-auto overflow-y-auto p-5 xl:p-7 2xl:px-10 2xl:py-9",
        !editorRecommendation && (recommendationPage ? "scrollbar-none" : "[scrollbar-gutter:stable]"),
      )}
    >
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-full",
          editorRecommendation && "flex h-full min-h-0 flex-1 flex-col",
        )}
      >
        {children}
      </div>
    </main>
  );
}
