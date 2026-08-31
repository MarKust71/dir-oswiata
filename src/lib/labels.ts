import { Role, AccountStatus, EventType } from '@/generated/prisma/enums'

export const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.USER]: 'Pracownik',
  [Role.STUDENT]: 'Student',
}

export const statusLabels: Record<AccountStatus, string> = {
  [AccountStatus.PENDING_EMAIL]: 'Oczekuje na e-mail',
  [AccountStatus.PENDING_APPROVAL]: 'Oczekuje na akceptację',
  [AccountStatus.ACTIVE]: 'Aktywne',
  [AccountStatus.DISABLED]: 'Wyłączone',
}

export const eventTypeLabels: Record<EventType, string> = {
  [EventType.REGISTRATION_SUBMITTED]: 'Rejestracja',
  [EventType.REGISTRATION_BLOCKED_RATE_LIMIT]:
    'Rejestracja zablokowana (limit)',
  [EventType.REGISTRATION_BLOCKED_DUPLICATE_RESULT]:
    'Rejestracja zablokowana (cudzy wynik)',
  [EventType.EMAIL_VERIFICATION_SENT]: 'Link weryfikacyjny wysłany',
  [EventType.EMAIL_VERIFICATION_RESENT]: 'Link weryfikacyjny wysłany ponownie',
  [EventType.EMAIL_VERIFIED]: 'E-mail potwierdzony',
  [EventType.ACCOUNT_PENDING_APPROVAL]: 'Konto oczekuje na akceptację',
  [EventType.ACCOUNT_ACTIVATED]: 'Konto aktywowane',
  [EventType.ACCOUNT_ACTIVATED_SKIP_EMAIL_VERIFICATION]:
    'Konto aktywowane (bez e-maila)',
  [EventType.ACCOUNT_DEACTIVATED]: 'Konto dezaktywowane',
  [EventType.ACCOUNT_DELETED]: 'Konto usunięte',
  [EventType.ACCOUNT_ROLE_CHANGED]: 'Zmieniono rolę konta',
  [EventType.ACCOUNT_LOCKED_APPLICATION_NUMBER]:
    'Konto zablokowane (numer wniosku)',
  [EventType.ACCOUNT_LOCKED_RESULTS_VIEW_LIMIT]:
    'Konto zablokowane (limit wyświetleń)',
  [EventType.PROFILE_CORRECTED]: 'Poprawiono dane profilu',
  [EventType.PROFILE_EDIT_BLOCKED_DUPLICATE_RESULT]:
    'Edycja zablokowana (cudzy wynik)',
  [EventType.RESULTS_IMPORTED]: 'Import wyników',
  [EventType.RESULTS_RELINKED]: 'Ponowne dopasowanie wyników',
  [EventType.LOGIN_SUCCEEDED]: 'Logowanie udane',
  [EventType.LOGIN_FAILED]: 'Logowanie nieudane',
  [EventType.SETTINGS_CHANGED]: 'Zmiana ustawień',
  [EventType.DB_BACKUP_CREATED]: 'Kopia zapasowa pobrana',
  [EventType.DB_BACKUP_RESTORED]: 'Kopia zapasowa przywrócona',
  [EventType.EMAIL_SEND_FAILED]: 'Wysyłka e-maila nieudana',
  [EventType.EMAIL_SEND_SKIPPED_HOURLY_LIMIT]:
    'Wysyłka e-maila pominięta (limit)',
}
