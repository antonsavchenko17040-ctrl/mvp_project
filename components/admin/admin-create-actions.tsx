"use client";

import { useState } from "react";

import {
  createDepartmentAction,
  createUserAccount,
} from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const yellowButtonClass =
  "rounded-3xl border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64] sm:text-base";

type RoleOption = { value: UserRole; label: string };

type DepartmentOption = { id: string; name: string };

type AdminCreateActionsProps = {
  roleOptions: RoleOption[];
  departments: DepartmentOption[];
};

export function AdminCreateActions({ roleOptions, departments }: AdminCreateActionsProps) {
  const [userOpen, setUserOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <Button
          type="button"
          className={cn("h-9 sm:h-10", yellowButtonClass)}
          onClick={() => setUserOpen(true)}
        >
          + Створити користувача
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-3xl border-black/15 bg-white px-4 text-sm font-semibold sm:h-10 sm:text-base"
          onClick={() => setDepartmentOpen(true)}
        >
          + Створити ССП
        </Button>
      </div>

      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent
          className="gap-5 p-5 sm:max-w-lg sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Додати нового користувача</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            action={async (formData) => {
              await createUserAccount(formData);
              setUserOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Повне ПІБ</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Напр. Шевченко Тарас"
                required
                className="h-10"
              />
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
            <div className="space-y-1.5">
              <Label htmlFor="create_user_department">ССП</Label>
              <select
                id="create_user_department"
                name="department_id"
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Оберіть ССП
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Логін</Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="Введіть логін..."
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_hint">Пароль</Label>
              <Input id="password_hint" value="Генерується автоматично" disabled className="h-10" />
            </div>
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              + Створити
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={departmentOpen} onOpenChange={setDepartmentOpen}>
        <DialogContent
          className="gap-5 p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Додати новий підрозділ</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            action={async (formData) => {
              await createDepartmentAction(formData);
              setDepartmentOpen(false);
            }}
          >
            <Input name="name" placeholder="Назва..." required className="h-10" />
            <Button
              type="submit"
              className="h-10 min-w-32 w-full bg-[#c9ccf3] text-white hover:bg-[#b5b9ea] sm:w-auto"
            >
              + Додати
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
