import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Налаштування</h1>
      <Card>
        <CardHeader>
          <CardTitle>Системні параметри</CardTitle>
        </CardHeader>
        <CardContent className="text-base text-muted-foreground">
          Налаштування локалізації та параметрів безпеки доступні в наступних ітераціях.
        </CardContent>
      </Card>
    </section>
  );
}
