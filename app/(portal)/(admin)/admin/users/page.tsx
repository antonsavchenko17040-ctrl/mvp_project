import { GenerateUserPasswordButton } from "@/components/admin/generate-user-password-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

import { assignRole, createUserAccount, deleteUserAccount } from "../actions";

export default async function AdminUsersPage() {
  const roleOptions: Array<{ value: UserRole; label: string }> = [
    { value: "editor", label: "Редактор" },
    { value: "ssp", label: "Відповідальний (ССП)" },
    { value: "manager", label: "Керівник" },
    { value: "analyst", label: "Аналітик" },
    { value: "admin", label: "Адміністратор" },
  ];
  const currentAdmin = await requireRole(["admin"]);
  const users = await db.profile.findMany({
    select: {
      id: true,
      fullName: true,
      isActive: true,
      email: true,
      roles: { select: { role: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold">Керування користувачами</h1>

      <Card>
        <CardHeader>
          <CardTitle>Додати нового користувача</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAccount} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="full_name">Повне ПІБ</Label>
                <Input id="full_name" name="full_name" placeholder="Напр. Шевченко Тарас" required />
              </div>
              <div className="space-y-2">
                <Label>Ролі (оберіть одну або кілька)</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border bg-background px-3 py-2">
                  {roleOptions.map((roleOption) => (
                    <label key={roleOption.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="roles"
                        value={roleOption.value}
                        defaultChecked={roleOption.value === "editor"}
                      />
                      {roleOption.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="email">Логін</Label>
              <Input id="email" name="email" type="text" placeholder="Введіть логін..." required />
            </div>
            <div>
              <Label htmlFor="password_hint">Пароль</Label>
              <Input id="password_hint" value="Генерується автоматично" disabled />
            </div>
            <Button type="submit" className="self-end">
              + Створити
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Користувачі</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={dataTableWrapClassName()}>
            <table className={dataTableClassName("min-w-[880px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <th className={dataTable.th}>Ім&apos;я користувача</th>
                  <th className={dataTable.th}>Логін</th>
                  <th className={dataTable.th}>Ролі</th>
                  <th className={dataTable.thCenter}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleValues = user.roles.map((r) => r.role as UserRole);
                  return (
                    <tr
                      key={user.id}
                      className={cn(dataTable.bodyRow, dataTable.rowHover, "align-middle")}
                    >
                      <td className={dataTable.cell}>
                        <p className="font-medium">{user.fullName ?? "Без імені"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {!user.isActive ? <p className="text-xs text-destructive">Деактивований</p> : null}
                      </td>
                      <td className={dataTable.cell}>
                        <p className="font-mono text-sm">{user.email}</p>
                      </td>
                      <td className={cn(dataTable.cell, "align-top")}>
                        <form action={assignRole} className="space-y-2">
                          <input type="hidden" name="user_id" value={user.id} />
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {roleOptions.map((roleOption) => (
                              <label
                                key={`${user.id}-${roleOption.value}`}
                                className="flex cursor-pointer items-center gap-1.5 text-sm leading-tight"
                              >
                                <input
                                  type="checkbox"
                                  name="roles"
                                  value={roleOption.value}
                                  defaultChecked={roleValues.includes(roleOption.value)}
                                />
                                {roleOption.label}
                              </label>
                            ))}
                          </div>
                          <Button type="submit" variant="outline" size="sm">
                            Зберегти
                          </Button>
                        </form>
                      </td>
                      <td className={cn(dataTable.cell, "text-center")}>
                        <div className="inline-flex items-center justify-center gap-2">
                          <GenerateUserPasswordButton userId={user.id} />
                          <form action={deleteUserAccount} className="inline-flex">
                            <input type="hidden" name="user_id" value={user.id} />
                            <input type="hidden" name="current_admin_id" value={currentAdmin.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              disabled={user.id === currentAdmin.id}
                              title={
                                user.id === currentAdmin.id
                                  ? "Неможливо видалити власний обліковий запис"
                                  : "Видалити користувача"
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
