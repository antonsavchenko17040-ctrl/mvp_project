"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  generateUserPassword,
  type GenerateUserPasswordState,
} from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: GenerateUserPasswordState = {};

export function GenerateUserPasswordButton({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(generateUserPassword, initialState);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && state.password && state.userId === userId) {
      setOpen(true);
    }
    wasPending.current = isPending;
  }, [isPending, state.password, state.userId, userId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const password = state.userId === userId ? state.password : undefined;

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <form action={formAction}>
        <input type="hidden" name="user_id" value={userId} />
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {isPending ? "Генерація..." : "Згенерувати новий пароль"}
        </Button>
      </form>
      {open && password ? (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-56 rounded-xl border bg-white p-3 shadow-lg"
          role="status"
        >
          <p className="text-xs uppercase text-muted-foreground">Тимчасовий пароль</p>
          <p className="mt-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">{password}</p>
        </div>
      ) : null}
    </div>
  );
}
