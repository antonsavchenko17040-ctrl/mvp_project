import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/repositories/dashboard-repository";

export default async function PublicStatisticsPage() {
  const stats = await getDashboardStats();

  return (
    <section className="space-y-4">
      <h1 className="text-4xl font-semibold">Статистика</h1>
      <Card>
        <CardHeader>
          <CardTitle>Публічні дані</CardTitle>
        </CardHeader>
        <CardContent className="text-base text-muted-foreground">
          Загальна кількість верифікованих рекомендацій: <span className="font-semibold text-foreground">{stats.total}</span>
        </CardContent>
      </Card>
    </section>
  );
}

