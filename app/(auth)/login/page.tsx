import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { uk } from "@/lib/i18n/uk";
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{uk.auth.login}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm title={uk.auth.login} />
        </CardContent>
      </Card>
    </main>
  );
}
