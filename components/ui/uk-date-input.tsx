"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  UK_MONTH_NAMES,
  UK_WEEKDAY_SHORT,
  compareDateOnlyIso,
  formatDateOnlyDisplay,
  formatDateOnlyInput,
  parseDateOnlyInput,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

type UkDateInputProps = {
  id?: string;
  name?: string;
  /** Associate with an external form by id (same as native `form` attribute). */
  form?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  title?: string;
  "aria-label"?: string;
};

function isoFromParts(year: number, monthIndex: number, day: number): string {
  return formatDateOnlyInput(new Date(year, monthIndex, day));
}

function monthGrid(year: number, monthIndex: number): Array<number | null> {
  const first = new Date(year, monthIndex, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: startOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Поле дати з українським календарем і ручним введенням ДД.ММ.РРРР.
 * Не підставляє «сьогодні» під час набору; у форму йде YYYY-MM-DD.
 */
export function UkDateInput({
  id,
  name,
  form,
  required,
  disabled,
  min,
  max,
  defaultValue = "",
  value,
  onChange,
  className,
  title,
  "aria-label": ariaLabel,
}: UkDateInputProps) {
  const isControlled = value !== undefined;
  const [uncontrolledIso, setUncontrolledIso] = useState(defaultValue);
  const isoValue = isControlled ? value : uncontrolledIso;

  const [text, setText] = useState(() => {
    const parsed = parseDateOnlyInput(defaultValue || value || "");
    return parsed ? formatDateOnlyDisplay(parsed) : "";
  });
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseDateOnlyInput(defaultValue || value || "") ?? new Date();
    return parsed.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseDateOnlyInput(defaultValue || value || "") ?? new Date();
    return parsed.getMonth();
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const setIso = (nextIso: string) => {
    if (!isControlled) setUncontrolledIso(nextIso);
    onChange?.(nextIso);
  };

  useEffect(() => {
    if (!isControlled) return;
    const parsed = parseDateOnlyInput(value);
    if (parsed) {
      setText(formatDateOnlyDisplay(parsed));
    } else if (!value) {
      setText("");
    }
  }, [isControlled, value]);

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

  const validateAgainstBounds = (nextIso: string): string => {
    if (min && compareDateOnlyIso(nextIso, min) < 0) {
      return "Дата не може бути раніше дозволеної.";
    }
    if (max && compareDateOnlyIso(nextIso, max) > 0) {
      return "Дата не може бути пізніше дозволеної.";
    }
    return "";
  };

  const commitFromParsed = (parsed: Date) => {
    const nextIso = formatDateOnlyInput(parsed);
    setText(formatDateOnlyDisplay(parsed));
    setIso(nextIso);
    const boundError = validateAgainstBounds(nextIso);
    inputRef.current?.setCustomValidity(boundError);
  };

  const applyTypedValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setText("");
      setIso("");
      inputRef.current?.setCustomValidity(required ? "Заповніть це поле." : "");
      return;
    }
    const parsed = parseDateOnlyInput(trimmed);
    if (!parsed) {
      // Залишаємо введене користувачем — без підміни на сьогодні.
      setIso("");
      inputRef.current?.setCustomValidity("Введіть коректну дату у форматі ДД.ММ.РРРР.");
      return;
    }
    commitFromParsed(parsed);
  };

  const cells = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const isDayDisabled = (day: number) => {
    const iso = isoFromParts(viewYear, viewMonth, day);
    if (min && compareDateOnlyIso(iso, min) < 0) return true;
    if (max && compareDateOnlyIso(iso, max) > 0) return true;
    return false;
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <input type="hidden" form={form} name={name} value={isoValue} />
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          id={id}
          form={form}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          required={required}
          title={title}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listboxId}
          placeholder="ДД.ММ.РРРР"
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            inputRef.current?.setCustomValidity("");
            const trimmed = next.trim();
            if (!trimmed) {
              setIso("");
              return;
            }
            const parsed = parseDateOnlyInput(trimmed);
            if (parsed) {
              const nextIso = formatDateOnlyInput(parsed);
              setIso(nextIso);
              inputRef.current?.setCustomValidity(validateAgainstBounds(nextIso));
            } else {
              // Часткове введення: не підставляємо сьогодні і не відправляємо старе значення.
              setIso("");
            }
          }}
          onBlur={() => applyTypedValue(text)}
          onInvalid={() => {
            if (!text.trim() && required) {
              inputRef.current?.setCustomValidity("Заповніть це поле.");
            } else if (text.trim() && !isoValue) {
              inputRef.current?.setCustomValidity("Введіть коректну дату у форматі ДД.ММ.РРРР.");
            } else if (isoValue) {
              inputRef.current?.setCustomValidity(validateAgainstBounds(isoValue));
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyTypedValue(text);
            }
          }}
          className={cn(
            "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          )}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Відкрити календар"
          title="Календар"
          onClick={() => {
            const parsed = parseDateOnlyInput(isoValue);
            if (parsed) {
              setViewYear(parsed.getFullYear());
              setViewMonth(parsed.getMonth());
            }
            setOpen((current) => !current);
          }}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground",
            "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "bg-muted",
          )}
        >
          <CalendarDays className="size-5" aria-hidden />
        </button>
      </div>

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label="Календар"
          className="absolute left-0 top-[calc(100%+4px)] z-40 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-input bg-background p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Попередній місяць"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold capitalize">
              {UK_MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Наступний місяць"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {UK_WEEKDAY_SHORT.map((day) => (
              <span key={day} className="py-1 font-medium">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day == null) {
                return <span key={`empty-${index}`} className="size-8" />;
              }
              const iso = isoFromParts(viewYear, viewMonth, day);
              const selected = iso === isoValue;
              const dayDisabled = isDayDisabled(day);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => {
                    commitFromParsed(new Date(viewYear, viewMonth, day));
                    setOpen(false);
                  }}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md text-sm",
                    selected && "bg-[#3a6fb8] font-semibold text-white",
                    !selected && !dayDisabled && "hover:bg-muted",
                    dayDisabled && "cursor-not-allowed text-muted-foreground/40",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
