import { AdminCreateActions } from "@/components/admin/admin-create-actions";
import { GenerateUserPasswordButton } from "@/components/admin/generate-user-password-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDepartments } from "@/lib/admin/departments-store";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

import { assignRole, deleteUserAccount, setUserDepartmentAction } from "../actions";

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

  const departments = (await getDepartments()).filter((item) => item.isActive);
  const departmentByUserId = new Map<string, string>();
  for (const department of departments) {
    for (const memberId of department.memberIds) {
      if (!departmentByUserId.has(memberId)) {
        departmentByUserId.set(memberId, department.id);
      }
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold">Керування користувачами</h1>

      <AdminCreateActions roleOptions={roleOptions} />

      <Card>
        <CardHeader>
          <CardTitle>Користувачі</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={dataTableWrapClassName()}>
            <table className={dataTableClassName("min-w-[1040px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <th className={dataTable.th}>Ім&apos;я користувача</th>
                  <th className={dataTable.th}>Логін</th>
                  <th className={dataTable.th}>Ролі</th>
                  <th className={dataTable.th}>Підрозділ</th>
                  <th className={dataTable.thCenter}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleValues = user.roles.map((r) => r.role as UserRole);
                  const currentDepartmentId = departmentByUserId.get(user.id) ?? "";
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
                      <td className={dataTable.cell}>
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
                      <td className={dataTable.cell}>
                        <form action={setUserDepartmentAction} className="space-y-2">
                          <input type="hidden" name="profile_id" value={user.id} />
                          <select
                            name="department_id"
                            defaultValue={currentDepartmentId}
                            disabled={!user.isActive}
                            className="h-9 w-full min-w-[10rem] rounded-md border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Підрозділ користувача ${user.fullName ?? user.email}`}
                          >
                            <option value="">— Не призначено —</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline" size="sm" disabled={!user.isActive}>
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
