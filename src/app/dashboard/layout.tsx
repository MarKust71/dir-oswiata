import { requireRole } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.ADMIN, Role.USER]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
  );
}
