"use client";

import { Fragment, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

import {
  assignDepartmentMemberAction,
  assignRole,
  deleteUserAccount,
  removeDepartmentMemberAction,
} from "@/app/(portal)/(admin)/admin/actions";
import { DepartmentSectionHeader } from "@/components/admin/department-section-header";
import { GenerateUserPasswordButton } from "@/components/admin/generate-user-password-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRolesList } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

function matchesNameQuery(user: { fullName: string | null }, query: string) {
  if (!query) return true;
  return (user.fullName ?? "").toLocaleLowerCase("uk").includes(query);
}

type TableUser = {
  id: string;
  fullName: string | null;
  isActive: boolean;
  email: string;
  roles: Array<{ role: string }>;
};

type TableDepartment = {
  id: string;
  name: string;
  memberIds: string[];
};

type RoleOption = { value: UserRole; label: string };

type DepartmentUsersTableProps = {
  departments: TableDepartment[];
  users: TableUser[];
  roleOptions: RoleOption[];
  currentAdminId: string;
};

function UserRowCells({
  user,
  roleOptions,
  currentAdminId,
  departmentId,
  rowKey,
}: {
  user: TableUser;
  roleOptions: RoleOption[];
  currentAdminId: string;
  departmentId?: string;
  rowKey: string;
}) {
  const roleValues = user.roles.map((item) => item.role as UserRole);

  return (
    <>
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
                key={`${rowKey}-${roleOption.value}`}
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
            <input type="hidden" name="current_admin_id" value={currentAdminId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={user.id === currentAdminId}
              title={
                user.id === currentAdminId
                  ? "Неможливо видалити власний обліковий запис"
                  : "Видалити користувача"
              }
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
          {departmentId ? (
            <form action={removeDepartmentMemberAction} className="inline-flex">
              <input type="hidden" name="department_id" value={departmentId} />
              <input type="hidden" name="profile_id" value={user.id} />
              <button
                type="submit"
                className="inline-flex size-9 items-center justify-center rounded-md text-xl leading-none text-[#8a97bf] hover:bg-muted hover:text-destructive"
                title="Прибрати з підрозділу"
                aria-label={`Прибрати ${user.fullName ?? user.email} з підрозділу`}
              >
                ×
              </button>
            </form>
          ) : null}
        </div>
      </td>
    </>
  );
}

/** Єдина таблиця «Склад підрозділів» з керуванням користувачами по секціях. */
export function DepartmentUsersTable({
  departments,
  users,
  roleOptions,
  currentAdminId,
}: DepartmentUsersTableProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("uk");

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const assignedIds = useMemo(
    () => new Set(departments.flatMap((department) => department.memberIds)),
    [departments],
  );
  const activeUsers = useMemo(() => users.filter((user) => user.isActive), [users]);
  const unassignedUsers = useMemo(
    () =>
      users
        .filter((user) => !assignedIds.has(user.id))
        .filter((user) => matchesNameQuery(user, query)),
    [users, assignedIds, query],
  );
  const visibleDepartments = useMemo(
    () =>
      departments
        .map((department) => {
          const members = department.memberIds
            .map((memberId) => userMap.get(memberId))
            .filter((member): member is TableUser => Boolean(member))
            .filter((member) => matchesNameQuery(member, query));
          return { department, members };
        })
        .filter(({ members }) => !query || members.length > 0),
    [departments, userMap, query],
  );
  const colSpan = 4;
  const hasRows = visibleDepartments.length > 0 || unassignedUsers.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Склад підрозділів</CardTitle>
        <div className="relative w-full min-w-[12rem] sm:w-72 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Пошук за іменем…"
            aria-label="Пошук користувача за іменем"
            className="h-9 rounded-3xl bg-white pl-8 sm:h-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className={dataTableWrapClassName()}>
          <table className={dataTableClassName("min-w-[960px]")}>
            <tbody>
              {!hasRows ? (
                <tr className={dataTable.bodyRow}>
                  <td className={dataTable.emptyCell} colSpan={colSpan}>
                    {query
                      ? "Користувачів із таким іменем не знайдено."
                      : "Немає підрозділів і користувачів для відображення."}
                  </td>
                </tr>
              ) : null}

              {visibleDepartments.map(({ department, members }) => {
                const availableUsers = activeUsers.filter(
                  (user) => !department.memberIds.includes(user.id),
                );

                return (
                  <Fragment key={department.id}>
                    <tr className={dataTable.bodyRow}>
                      <td colSpan={colSpan} className={cn(dataTable.cell, "bg-[#f5f7fa] py-3")}>
                        <DepartmentSectionHeader
                          departmentId={department.id}
                          name={department.name}
                          memberCount={
                            query
                              ? members.length
                              : department.memberIds.filter((id) => userMap.has(id)).length
                          }
                        />
                      </td>
                    </tr>

                    {members.length === 0 ? (
                      <tr className={dataTable.bodyRow}>
                        <td
                          colSpan={colSpan}
                          className={cn(dataTable.cell, "text-sm text-muted-foreground")}
                        >
                          Немає призначених співробітників
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => {
                        const rowKey = `${department.id}-${member.id}`;
                        return (
                          <tr
                            key={rowKey}
                            className={cn(dataTable.bodyRow, dataTable.rowHover, "align-middle")}
                          >
                            <UserRowCells
                              user={member}
                              roleOptions={roleOptions}
                              currentAdminId={currentAdminId}
                              departmentId={department.id}
                              rowKey={rowKey}
                            />
                          </tr>
                        );
                      })
                    )}

                    {!query ? (
                      <tr className={dataTable.bodyRow}>
                        <td colSpan={colSpan} className={dataTable.cell}>
                          <form
                            action={assignDepartmentMemberAction}
                            className="flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center"
                          >
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
                                  {`${user.fullName ?? "Без імені"} (${formatRolesList(
                                    user.roles.map((role) => role.role as UserRole),
                                  )})`}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" variant="secondary" className="shrink-0">
                              Додати
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}

              {unassignedUsers.length > 0 ? (
                <Fragment key="unassigned">
                  <tr className={dataTable.bodyRow}>
                    <td colSpan={colSpan} className={cn(dataTable.cell, "bg-[#f5f7fa] py-3")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-semibold">Без підрозділу</p>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {unassignedUsers.length} співроб.
                        </span>
                      </div>
                    </td>
                  </tr>
                  {unassignedUsers.map((user) => {
                    const rowKey = `unassigned-${user.id}`;
                    return (
                      <tr
                        key={rowKey}
                        className={cn(dataTable.bodyRow, dataTable.rowHover, "align-middle")}
                      >
                        <UserRowCells
                          user={user}
                          roleOptions={roleOptions}
                          currentAdminId={currentAdminId}
                          rowKey={rowKey}
                        />
                      </tr>
                    );
                  })}
                </Fragment>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
