import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifyEmailButton } from "./verify-email-button";

export default async function VerifyEmailPage(
  props: PageProps<"/verify-email/[token]">
) {
  const { token } = await props.params;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Potwierdzenie e-mail</CardTitle>
          <CardDescription>
            Kliknij przycisk ponizej, aby potwierdzic swoj adres e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyEmailButton token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
