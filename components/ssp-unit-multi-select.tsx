"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { parseSspUnits } from "@/lib/ssp-units";
import { cn } from "@/lib/utils";

type DepartmentOption = {
  id: string;
  name: string;
};

type SspUnitMultiSelectProps = {
  departments: DepartmentOption[];
  /** Hidden JSON field with selected department ids (source of truth for server). */
  name?: string;
  id?: string;
  /** Current stored sspUnit string (`A | B`) or selected names. */
  defaultValue?: string | string[];
  /** Selected department ids when known (preferred over name matching). */
  defaultSelectedIds?: string[];
  className?: string;
  extraOptions?: string[];
};

function initialSelectedIds(
  departments: DepartmentOption[],
  defaultSelectedIds: string[] | undefined,
  defaultValue: string | string[],
): string[] {
  if (defaultSelectedIds && defaultSelectedIds.length > 0) {
    return [...new Set(defaultSelectedIds)];
  }
  const selectedNames = new Set(
    Array.isArray(defaultValue) ? defaultValue : parseSspUnits(defaultValue),
  );
  return departments
    .filter((department) => selectedNames.has(department.name))
    .map((department) => department.id);
}

/**
 * Compact multi-select dropdown for відповідальних ССП.
 * Відправляє `ssp_department_ids` як JSON-масив id — надійніше за кілька checkbox-значень з назвами.
 */
export function SspUnitMultiSelect({
  departments,
  name = "ssp_department_ids",
  id = "ssp_unit",
  defaultValue = [],
  defaultSelectedIds,
  className,
  extraOptions = [],
}: SspUnitMultiSelectProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialSelectedIds(departments, defaultSelectedIds, defaultValue),
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const knownNames = useMemo(
    () => new Set(departments.map((department) => department.name)),
    [departments],
  );
  const extras = extraOptions
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value && !knownNames.has(value));

  const selectedNames = useMemo(
    () =>
      departments
        .filter((department) => selectedIds.includes(department.id))
        .map((department) => department.name),
    [departments, selectedIds],
  );

  const summary =
    selectedNames.length === 0 ? "Оберіть підрозділ" : selectedNames.join(" · ");

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

  const toggle = (departmentId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(departmentId) ? current : [...current, departmentId];
      }
      return current.filter((idValue) => idValue !== departmentId);
    });
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <input type="hidden" name={name} value={JSON.stringify(selectedIds)} />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Відповідальний підрозділ / ССП"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selectedNames.length === 0 ? "text-muted-foreground" : "text-foreground",
          )}
          title={selectedNames.length > 0 ? selectedNames.join(" · ") : undefined}
        >
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Список підрозділів ССП"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-y-auto rounded-md border border-input bg-background shadow-lg"
        >
          {departments.length === 0 && extras.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">Немає активних підрозділів.</p>
          ) : (
            <ul className="divide-y divide-border/70 py-0.5">
              {extras.map((extraName) => (
                <li key={`extra:${extraName}`}>
                  <div className="flex items-start gap-2.5 px-3 py-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 leading-snug">{extraName} (немає в довіднику)</span>
                  </div>
                </li>
              ))}
              {departments.map((department) => {
                const inputId = `${id}-${department.id}`;
                const checked = selectedIds.includes(department.id);
                return (
                  <li key={department.id} role="option" aria-selected={checked}>
                    <label
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-muted/60"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggle(department.id, event.target.checked)}
                        className="mt-0.5 size-4 shrink-0 rounded border border-input accent-[#3a6fb8]"
                      />
                      <span className="min-w-0 whitespace-normal break-words leading-snug">
                        {department.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="sticky bottom-0 border-t border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground">
            Можна обрати кілька підрозділів. Обрано: {selectedIds.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}
