import {
  assignDepartmentMemberAction,
  removeDepartmentMemberAction,
} from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRolesList } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";

type MembershipUser = {
  id: string;
  fullName: string | null;
  roles: Array<{ role: string }>;
};

type MembershipDepartment = {
  id: string;
  name: string;
  memberIds: string[];
};

type DepartmentMembershipSectionProps = {
  departments: MembershipDepartment[];
  users: MembershipUser[];
};

/** Призначення користувачів до підрозділів (без CRUD самих підрозділів). */
export function DepartmentMembershipSection({
  departments,
  users,
}: DepartmentMembershipSectionProps) {
  const userMap = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="space-y-5">
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
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
                      >
                        <div>
                          <p className="font-medium">{member.fullName ?? "Без імені"}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatRolesList(member.roles.map((role) => role.role as UserRole))}
                          </p>
                        </div>
                        <form action={removeDepartmentMemberAction}>
                          <input type="hidden" name="department_id" value={department.id} />
                          <input type="hidden" name="profile_id" value={member.id} />
                          <button
                            type="submit"
                            className="text-[#8a97bf] hover:text-destructive"
                            title="Прибрати користувача"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>

                <form
                  action={assignDepartmentMemberAction}
                  className="flex items-center gap-2 border-t pt-4"
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
                        {`${user.fullName ?? "Без імені"} (${formatRolesList(user.roles.map((role) => role.role as UserRole))})`}
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
    </div>
  );
}
