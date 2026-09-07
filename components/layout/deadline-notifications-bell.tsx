"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { DeadlineReminderItem } from "@/lib/deadline-reminder-ui";
import { deadlineReminderHighlightHref } from "@/lib/deadline-reminder-ui";
import { cn } from "@/lib/utils";

type DeadlineNotificationsBellProps = {
  items: DeadlineReminderItem[];
};

export function DeadlineNotificationsBell({ items }: DeadlineNotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [armedId, setArmedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onReminderActivate = (item: DeadlineReminderItem) => {
    setOpen(false);
    if (armedId === item.id) {
      setArmedId(null);
      router.push(item.href);
      return;
    }
    setArmedId(item.id);
    router.push(deadlineReminderHighlightHref(item.href, item.id));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={count > 0 ? `Сповіщення: ${count}` : "Сповіщення"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        style={{ cursor: "pointer" }}
        className={cn(
          "relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-black/25 bg-white text-foreground transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
      >
        <Bell className="size-5" strokeWidth={2} aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Нагадування про терміни"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-black/15 bg-white shadow-lg"
        >
          <div className="border-b border-black/10 px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Нагадування</p>
            <p className="text-xs text-muted-foreground">
              1-й клік — підсвітити в таблиці, 2-й — відкрити
            </p>
          </div>
          {count === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Немає нагадувань про терміни.</p>
          ) : (
            <ul className="max-h-[min(22rem,60vh)] overflow-y-auto py-1">
              {items.map((item) => {
                const armed = armedId === item.id;
                return (
                  <li key={item.id} className="border-b border-black/5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onReminderActivate(item)}
                      className={cn(
                        "block w-full px-3 py-2.5 text-left text-sm leading-snug text-foreground transition-colors hover:bg-[#f2ecbe]",
                        armed && "bg-[#f2ecbe]",
                      )}
                    >
                      <span className="block">{item.message}</span>
                      <span
                        className={cn(
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          item.daysLeft <= 3
                            ? "bg-red-100 text-red-800"
                            : item.daysLeft <= 7
                              ? "bg-amber-100 text-amber-900"
                              : "bg-sky-100 text-sky-900",
                        )}
                      >
                        Залишилось {item.daysLeft} дн.
                      </span>
                      {armed ? (
                        <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                          Натисніть ще раз, щоб відкрити
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
