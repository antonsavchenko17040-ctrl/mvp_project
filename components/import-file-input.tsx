"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type ImportFileInputProps = {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  className?: string;
};

/** File input without the browser «Вибрати файл» button label. */
export function ImportFileInput({
  id,
  name,
  accept,
  required,
  className,
}: ImportFileInputProps) {
  const [fileName, setFileName] = useState("");

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
        onChange={(event) => {
          setFileName(event.target.files?.[0]?.name ?? "");
        }}
      />
      <div
        className={cn(
          "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
          fileName ? "text-foreground" : "text-muted-foreground",
        )}
        aria-hidden
      >
        <span className="truncate">{fileName || "\u00A0"}</span>
      </div>
    </div>
  );
}
