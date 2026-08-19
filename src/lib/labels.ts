import { Role, AccountStatus } from "@/generated/prisma/enums";

export const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: "Administrator",
  [Role.USER]: "Pracownik",
  [Role.STUDENT]: "Uczen",
};

export const statusLabels: Record<AccountStatus, string> = {
  [AccountStatus.PENDING_EMAIL]: "Oczekuje na e-mail",
  [AccountStatus.PENDING_APPROVAL]: "Oczekuje na akceptacje",
  [AccountStatus.ACTIVE]: "Aktywne",
  [AccountStatus.DISABLED]: "Wylaczone",
};
