import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRolesList } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import { getDepartments } from "@/lib/admin/departments-store";

import {
  archiveDepartmentAction,
  assignDepartmentMemberAction,
  createDepartmentAction,
  removeDepartmentMemberAction,
  renameDepartmentAction,
} from "../actions";

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
  const users = await db.profile.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      roles: { select: { role: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const userMap = new Map(users.map((user) => [user.id, user]));
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

          <div className="border-t pt-6">
            <h3 className="mb-3 text-xl font-medium">Додати новий підрозділ</h3>
            <form action={createDepartmentAction} className="flex max-w-2xl items-center gap-3">
              <Input name="name" placeholder="Назва..." required />
              <Button type="submit" className="min-w-32 bg-[#c9ccf3] text-white hover:bg-[#b5b9ea]">
                + Додати
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-3xl font-semibold">Склад підрозділів (Призначення користувачів)</h2>
      <div className="grid grid-cols-1 gap-5">
        {departments.map((department) => {
          const members = department.memberIds
            .map((memberId) => userMap.get(memberId))
            .filter((member): member is NonNullable<typeof member> => Boolean(member));
          const availableUsers = users.filter((user) => !department.memberIds.includes(user.id));

          return (
            <Card key={department.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{department.name}</CardTitle>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {members.length} співроб.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 border-t pt-4">
                  {members.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      Немає призначених співробітників
                    </div>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                        <div>
                          <p className="font-medium">{member.fullName ?? "Без імені"}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatRolesList(member.roles.map((r) => r.role as UserRole))}
                          </p>
                        </div>
                        <form action={removeDepartmentMemberAction}>
                          <input type="hidden" name="department_id" value={department.id} />
                          <input type="hidden" name="profile_id" value={member.id} />
                          <button type="submit" className="text-[#8a97bf] hover:text-destructive" title="Прибрати користувача">
                            ×
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>

                <form action={assignDepartmentMemberAction} className="flex items-center gap-2 border-t pt-4">
                  <input type="hidden" name="department_id" value={department.id} />
                  <select
                    name="profile_id"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue=""
                    required
                  >
                    <option value="">-- Оберіть користувача --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {`${user.fullName ?? "Без імені"} (${formatRolesList(user.roles.map((r) => r.role as UserRole))})`}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary">
                    Додати
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
