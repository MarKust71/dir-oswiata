import { requireUser } from "@/lib/dal";
import { roleLabels } from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PanelPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Witaj!</CardTitle>
          <CardDescription>Twoje konto</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">E-mail</span>
            <span className="break-all text-right font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Rola</span>
            <span className="font-medium">{roleLabels[user.role]}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
