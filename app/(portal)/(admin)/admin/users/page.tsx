import { AdminCreateActions } from "@/components/admin/admin-create-actions";
import { DepartmentUsersTable } from "@/components/admin/department-users-table";
import { requireRole } from "@/lib/auth/session";
import { getDepartments } from "@/lib/admin/departments-store";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/types";

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

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold">Керування користувачами</h1>

      <AdminCreateActions
        roleOptions={roleOptions}
        departments={departments.map((department) => ({
          id: department.id,
          name: department.name,
        }))}
      />

      <DepartmentUsersTable
        departments={departments}
        users={users}
        roleOptions={roleOptions}
        currentAdminId={currentAdmin.id}
      />
    </section>
  );
}
