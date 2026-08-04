import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentProfile } from "@/lib/auth/session";
import { uk } from "@/lib/i18n/uk";
import { hashPassword } from "@/lib/auth/password";
import { clearTempPassword } from "@/lib/auth/temp-password-store";
import { db } from "@/lib/db";

async function changePassword(formData: FormData) {
  "use server";
  const password = String(formData.get("newPassword") ?? "");
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  await db.profile.update({
    where: { id: profile.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    },
  });
  await clearTempPassword(profile.id);
  redirect("/dashboard");
}

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{uk.auth.changePassword}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{uk.auth.firstLoginHint}</p>
          <form action={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{uk.auth.newPassword}</Label>
              <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">
              {uk.auth.savePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
