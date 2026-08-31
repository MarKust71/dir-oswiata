'use server'

import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { deleteSession } from '@/lib/session'
import {
  findAccountAlreadyLinkedToMatchingResult,
  tryLinkUserToResult,
} from '@/lib/results-matching'
import { getNotificationEmails } from '@/lib/settings'
import {
  sendDuplicateResultProfileEditAttemptAdminNotification,
  sendDuplicateResultProfileEditAttemptUserEmail,
  sendProfileCorrectionAdminNotification,
  sendProfileCorrectionUserEmail,
} from '@/lib/mailer'
import { getClientRequestInfo } from '@/lib/request-info'
import { logEvent } from '@/lib/event-log'
import {
  ProfileCorrectionSchema,
  type ProfileCorrectionFormState,
} from '@/lib/validation'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { AccountStatus, EventType, Role } from '@/generated/prisma/enums'

export async function updateProfileAction(
  _state: ProfileCorrectionFormState,
  formData: FormData
): Promise<ProfileCorrectionFormState> {
  const user = await requireRole([Role.STUDENT])

  const peselPositions = formData.getAll('peselPositions').map(Number)
  const peselDigits = peselPositions.map((pos) =>
    String(formData.get(`peselDigit-${pos}`) ?? '')
  )

  const values = {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  }

  const validated = ProfileCorrectionSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    peselPositions,
    peselDigits,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values }
  }

  const { firstName, lastName, phone } = validated.data

  let linkedAccountEmail: string | null = null

  try {
    // Zanim zapiszemy poprawione dane, sprawdzamy, czy nie pasują już do
    // wyniku przypisanego do innego, cudzego konta - w takim wypadku
    // odrzucamy zmianę i blokujemy to konto zamiast próbować powiązania.
    linkedAccountEmail = await findAccountAlreadyLinkedToMatchingResult(
      {
        firstName,
        lastName,
        peselPositions: validated.data.peselPositions,
        peselDigits: validated.data.peselDigits,
      },
      user.id
    )

    const { ip, userAgent } = await getClientRequestInfo()

    if (linkedAccountEmail) {
      const logMessage = `Zablokowano konto (${user.email}) - poprawione dane pasują do wyniku już przypisanego do konta ${linkedAccountEmail}.`

      console.warn(`[profile] ${logMessage}`)

      await prisma.user.update({
        where: { id: user.id },
        data: { status: AccountStatus.DISABLED },
      })

      await logEvent({
        type: EventType.PROFILE_EDIT_BLOCKED_DUPLICATE_RESULT,
        message: logMessage,
        actorEmail: user.email,
        actorUserId: user.id,
        targetEmail: linkedAccountEmail,
        ip,
        userAgent,
      })

      await sendDuplicateResultProfileEditAttemptUserEmail(linkedAccountEmail)

      const adminEmails = await getNotificationEmails()
      await sendDuplicateResultProfileEditAttemptAdminNotification(
        adminEmails,
        linkedAccountEmail,
        user.email
      )
    } else {
      // Poprawa danych mogła zmienić okoliczności dopasowania do wyniku
      // egzaminu - konto wraca więc do stanu wymagającego ponownej weryfikacji
      // i aktywacji przez administratora, tak jak nowo zarejestrowane konto.
      // Próbę automatycznego dopasowania podejmujemy od razu (a nie dopiero po
      // reaktywacji), żeby administrator widział na liście już aktualny wynik
      // powiązania.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          phone: phone || null,
          peselPositions: validated.data.peselPositions,
          peselDigits: validated.data.peselDigits,
          resultId: null,
          status: AccountStatus.DISABLED,
        },
      })

      await tryLinkUserToResult({
        id: user.id,
        firstName,
        lastName,
        peselPositions: validated.data.peselPositions,
        peselDigits: validated.data.peselDigits,
      })

      const adminEmails = await getNotificationEmails()
      await Promise.all([
        sendProfileCorrectionAdminNotification(adminEmails, user.email),
        sendProfileCorrectionUserEmail(user.email),
      ])

      await logEvent({
        type: EventType.PROFILE_CORRECTED,
        message: `Konto ${user.email} poprawiło dane w panelu i wraca do stanu oczekującego na akceptację.`,
        actorEmail: user.email,
        actorUserId: user.id,
        targetEmail: user.email,
        targetUserId: user.id,
        ip,
        userAgent,
      })
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE, values }
    }
    throw error
  }

  await deleteSession()
  redirect(
    linkedAccountEmail
      ? '/login?reason=duplicate-result-block'
      : '/login?reason=profile-correction'
  )
}
