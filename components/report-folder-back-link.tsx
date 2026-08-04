import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ReportFolderBackLinkProps = {
  href: string;
  label: string;
};

export function ReportFolderBackLink({ href, label }: ReportFolderBackLinkProps) {
  return (
    <div className="flex w-full justify-start">
      <Link
        href={href}
        className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
          <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <span className="text-left text-sm font-medium sm:text-base">{label}</span>
      </Link>
    </div>
  );
}
