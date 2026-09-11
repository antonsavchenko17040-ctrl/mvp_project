import { createDepartmentAction } from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Форма створення підрозділу (без змін логіки createDepartmentAction). */
export function CreateDepartmentSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Додати новий підрозділ</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createDepartmentAction} className="flex max-w-2xl items-center gap-3">
          <Input name="name" placeholder="Назва..." required />
          <Button type="submit" className="min-w-32 bg-[#c9ccf3] text-white hover:bg-[#b5b9ea]">
            + Додати
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
