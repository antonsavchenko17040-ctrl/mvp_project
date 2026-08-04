import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/repositories/dashboard-repository";

export default async function StatisticsPage() {
  const stats = await getDashboardStats();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Статистика</h1>
      <Card>
        <CardHeader>
          <CardTitle>Зведені показники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base">
          <p>Загальна кількість рекомендацій: {stats.total}</p>
          <p>Виконано / Забезпечено виконання: {stats.done}</p>
          <p>Частково виконано: {stats.partial}</p>
          <p>Не виконані: {stats.notDone}</p>
        </CardContent>
      </Card>
    </section>
  );
}
