'use server'

import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import { deleteSession } from '@/lib/session'
import { tryLinkUserToResult } from '@/lib/results-matching'
import { getNotificationEmails } from '@/lib/settings'
import {
  sendProfileCorrectionAdminNotification,
  sendProfileCorrectionUserEmail,
} from '@/lib/mailer'
import {
  ProfileCorrectionSchema,
  type ProfileCorrectionFormState,
} from '@/lib/validation'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { AccountStatus, Role } from '@/generated/prisma/enums'

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

  try {
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
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE, values }
    }
    throw error
  }

  await deleteSession()
  redirect('/login?reason=profile-correction')
}
