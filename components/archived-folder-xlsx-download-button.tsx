import Link from "next/link";
import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ArchivedFolderXlsxDownloadButtonProps = {
  folderId: string;
  className?: string;
};

/** Кнопка скачування архівованого звіту у форматі XLSX. */
export function ArchivedFolderXlsxDownloadButton({
  folderId,
  className,
}: ArchivedFolderXlsxDownloadButtonProps) {
  return (
    <Link
      href={`/public/folders/${folderId}/export`}
      prefetch={false}
      className={cn(buttonVariants({ variant: "outline", size: "default" }), className)}
    >
      <Download data-icon="inline-start" />
      Скачати XLSX
    </Link>
  );
}
