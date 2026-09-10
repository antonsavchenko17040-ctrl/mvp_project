"use client";

import { useActionState, useState } from "react";

import { signInAction, type LoginActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginActionState = {};

export function LoginForm({
  compact = false,
  title = "Вхід",
}: {
  compact?: boolean;
  title?: string;
}) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const [showForgotPasswordHint, setShowForgotPasswordHint] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {!compact ? <h2 className="text-xl font-semibold">{title}</h2> : null}
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={compact ? "email-modal" : "email"}>Логін / e-mail</Label>
        <Input
          id={compact ? "email-modal" : "email"}
          name="email"
          type="text"
          required
          placeholder="Введіть логін"
          className={compact ? "h-8" : ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={compact ? "password-modal" : "password"}>Пароль</Label>
        <Input
          id={compact ? "password-modal" : "password"}
          name="password"
          type="password"
          required
          className={compact ? "h-8" : ""}
        />
      </div>
      <div className="space-y-1 text-center">
        <button
          type="button"
          className={
            compact
              ? "text-xs text-muted-foreground underline-offset-2 hover:underline"
              : "text-sm text-muted-foreground underline-offset-2 hover:underline"
          }
          onClick={() => setShowForgotPasswordHint(true)}
        >
          Забули пароль?
        </button>
        {showForgotPasswordHint ? (
          <p
            className={
              compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"
            }
            role="status"
          >
            Для оновлення пароля зверніться до адміністратора
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className={compact ? "h-8 w-full bg-[#e8d54f] text-black hover:bg-[#dcc842]" : "w-full"}
      >
        {isPending ? "Виконується..." : "Вхід"}
      </Button>
    </form>
  );
}
