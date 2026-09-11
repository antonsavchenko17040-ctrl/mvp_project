import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/session";
import { getDepartments } from "@/lib/admin/departments-store";

import { archiveDepartmentAction, renameDepartmentAction } from "../actions";

const errorMessages: Record<string, string> = {
  department_name_required: "Вкажіть назву підрозділу.",
  department_not_found: "Підрозділ не знайдено.",
  department_duplicate: "Підрозділ із такою назвою вже існує.",
};

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const departments = (await getDepartments()).filter((item) => item.isActive);
  const errorText =
    query.error && errorMessages[query.error] ? errorMessages[query.error] : null;
  const successText = query.ok === "department_renamed" ? "Назву підрозділу збережено." : null;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="size-6 text-[#587be5]" />
        <h1 className="text-3xl font-semibold">Керування підрозділами</h1>
      </div>

      {errorText ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
          {errorText}
        </p>
      ) : null}
      {successText ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-base text-emerald-900">
          {successText}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h2 className="mb-3 text-3xl font-semibold">Активні підрозділи</h2>
            {departments.length === 0 ? (
              <p className="text-base text-muted-foreground">Активних підрозділів ще немає.</p>
            ) : (
              <ul className="space-y-2">
                {departments.map((department) => (
                  <li
                    key={department.id}
                    className="flex flex-col gap-2 rounded-xl border bg-[#eff2fb] p-3 sm:flex-row sm:items-center"
                  >
                    <form
                      action={renameDepartmentAction}
                      className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="department_id" value={department.id} />
                      <Input
                        name="name"
                        defaultValue={department.name}
                        required
                        aria-label={`Назва підрозділу ${department.name}`}
                        className="min-w-0 flex-1 border-[#c5cce8] bg-white text-base font-medium text-[#4a5fb0]"
                      />
                      <Button type="submit" variant="secondary" className="shrink-0">
                        Зберегти
                      </Button>
                    </form>
                    <form action={archiveDepartmentAction} className="shrink-0">
                      <input type="hidden" name="department_id" value={department.id} />
                      <button
                        type="submit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-xl leading-none text-[#8a97bf] hover:bg-white/70 hover:text-destructive"
                        title="Прибрати підрозділ"
                        aria-label={`Прибрати підрозділ ${department.name}`}
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
