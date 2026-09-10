"use client";

import { useEffect, useRef, type DetailsHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** `<details>` that closes on outside click and Escape. */
export function DismissibleDetails({
  className,
  children,
  ...props
}: DetailsHTMLAttributes<HTMLDetailsElement>) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!el.open) return;
      if (!el.contains(event.target as Node)) {
        el.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && el.open) {
        el.open = false;
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={cn(className)} {...props}>
      {children}
    </details>
  );
}
