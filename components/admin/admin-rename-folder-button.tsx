"use client";

import { useState } from "react";

import { adminRenameAuditFolder } from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminRenameFolderButtonProps = {
  folderId: string;
  title: string;
  returnTo?: string;
  className?: string;
};

/** Діалог перейменування папки аудиту адміністратором. */
export function AdminRenameFolderButton({
  folderId,
  title,
  returnTo = "/admin",
  className,
}: AdminRenameFolderButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        Перейменувати
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-5 p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Редагувати назву папки</DialogTitle>
          </DialogHeader>
          <form action={adminRenameAuditFolder} className="space-y-4">
            <input type="hidden" name="audit_folder_id" value={folderId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <div className="space-y-1.5">
              <Label htmlFor={`rename-title-${folderId}`}>
                Назва
                <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
                  *
                </span>
              </Label>
              <Input
                id={`rename-title-${folderId}`}
                name="title"
                required
                defaultValue={title}
                className="h-10"
              />
            </div>
            <Button type="submit" className="h-10 w-full bg-[#3a6fb8] hover:bg-[#2f5e9a] sm:w-auto">
              Зберегти назву
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
