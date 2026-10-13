import { parseSspUnits } from "@/lib/ssp-units";
import { cn } from "@/lib/utils";

type DepartmentOption = {
  id: string;
  name: string;
};

type SspUnitMultiSelectProps = {
  departments: DepartmentOption[];
  /** Ім'я поля форми (повторюється на кожному checkbox). */
  name?: string;
  id?: string;
  /** Поточне збережене значення (`A` або `A | B`) або масив назв. */
  defaultValue?: string | string[];
  className?: string;
  /** Додаткові опції, яких немає в активному довіднику (напр. застаріла назва). */
  extraOptions?: string[];
};

export function SspUnitMultiSelect({
  departments,
  name = "ssp_unit",
  id = "ssp_unit",
  defaultValue = [],
  className,
  extraOptions = [],
}: SspUnitMultiSelectProps) {
  const selected = new Set(
    Array.isArray(defaultValue) ? defaultValue : parseSspUnits(defaultValue),
  );

  const knownNames = new Set(departments.map((department) => department.name));
  const extras = extraOptions
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value && !knownNames.has(value));

  const options: DepartmentOption[] = [
    ...extras.map((value) => ({ id: `extra:${value}`, name: value })),
    ...departments,
  ];

  return (
    <div
      id={id}
      role="group"
      aria-label="Відповідальний підрозділ / ССП"
      className={cn(
        "max-h-44 w-full overflow-y-auto rounded-md border border-input bg-background",
        className,
      )}
    >
      {options.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-muted-foreground">Немає активних підрозділів.</p>
      ) : (
        <ul className="divide-y divide-border/70 py-0.5">
          {options.map((department) => {
            const inputId = `${id}-${department.id}`;
            return (
              <li key={department.id}>
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-muted/60"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    name={name}
                    value={department.name}
                    defaultChecked={selected.has(department.name)}
                    className="mt-0.5 size-4 shrink-0 rounded border border-input accent-[#3a6fb8]"
                  />
                  <span className="min-w-0 leading-snug">{department.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
        Можна обрати кілька підрозділів.
      </p>
    </div>
  );
}
