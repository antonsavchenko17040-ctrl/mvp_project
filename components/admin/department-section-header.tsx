"use client";

import { useState } from "react";
import { Key, Trash2 } from "lucide-react";

import {
  archiveDepartmentAction,
  renameDepartmentAction,
} from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DepartmentSectionHeaderProps = {
  departmentId: string;
  name: string;
  memberCount: number;
};

/** Заголовок секції ССП: перегляд назви, редагування через ключик, архівування. */
export function DepartmentSectionHeader({
  departmentId,
  name,
  memberCount,
}: DepartmentSectionHeaderProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {editing ? (
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          action={async (formData) => {
            await renameDepartmentAction(formData);
            setEditing(false);
          }}
        >
          <input type="hidden" name="department_id" value={departmentId} />
          <input type="hidden" name="return_to" value="/admin/users" />
          <Input
            name="name"
            defaultValue={name}
            required
            aria-label="Назва ССП"
            className="h-9 min-w-[12rem] max-w-md flex-1 border-[#c5cce8] bg-white text-base font-semibold"
            autoFocus
          />
          <Button type="submit" variant="secondary" size="sm">
            Зберегти
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Скасувати
          </Button>
        </form>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <p className="text-base font-semibold">{name}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-[#8a97bf] hover:bg-white/70 hover:text-[#4a5fb0]"
            title="Редагувати назву ССП"
            aria-label={`Редагувати назву «${name}»`}
          >
            <Key className="size-4" />
          </button>
          <form
            action={archiveDepartmentAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Видалити ССП «${name}»? Користувачі залишаться в системі без цього підрозділу.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="department_id" value={departmentId} />
            <button
              type="submit"
              className="inline-flex size-8 items-center justify-center rounded-md text-[#8a97bf] hover:bg-white/70 hover:text-destructive"
              title="Видалити ССП"
              aria-label={`Видалити ССП «${name}»`}
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      )}
      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        {memberCount} співроб.
      </span>
    </div>
  );
}
