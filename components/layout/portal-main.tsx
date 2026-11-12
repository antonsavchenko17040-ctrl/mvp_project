"use client";

import { usePathname } from "next/navigation";

import { PageFade } from "@/components/layout/page-fade";
import { cn } from "@/lib/utils";

export function PortalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const recommendationPage = pathname.includes("/recommendations/");
  const editorCanvas =
    /\/editor\/folders\/[^/]+\/(?:recommendations\/|new$)/.test(pathname) ||
    /\/(?:admin|analyst|manager|ssp)\/recommendations\//.test(pathname) ||
    /\/admin\/folders\/[^/]+\/new$/.test(pathname);

  return (
    <main
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        editorCanvas
          ? "overflow-hidden bg-white"
          : "overflow-x-auto overflow-y-auto p-5 xl:p-7 2xl:px-10 2xl:py-9",
        !editorCanvas && (recommendationPage ? "scrollbar-none" : "[scrollbar-gutter:stable]"),
      )}
    >
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-full",
          editorCanvas && "flex h-full min-h-0 flex-1 flex-col",
        )}
      >
        {editorCanvas ? (
          children
        ) : (
          <PageFade className="w-full min-w-0">{children}</PageFade>
        )}
      </div>
    </main>
  );
}
