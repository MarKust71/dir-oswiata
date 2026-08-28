'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/dal'
import {
  ProfileCorrectionSchema,
  type ProfileCorrectionFormState,
} from '@/lib/validation'
import {
  DB_CONNECTION_ERROR_MESSAGE,
  isDatabaseConnectionError,
} from '@/lib/db-error'
import { Role } from '@/generated/prisma/enums'

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
    // Zerujemy powiązanie z wynikiem - próbę ponownego dopasowania na
    // podstawie nowych danych podejmuje dopiero panel przy najbliższym
    // wejściu (zob. src/app/panel/page.tsx), już po pokazaniu zapisanych
    // zmian.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        phone: phone || null,
        peselPositions: validated.data.peselPositions,
        peselDigits: validated.data.peselDigits,
        resultId: null,
      },
    })

    revalidatePath('/panel')

    return { success: true, message: 'Zapisano dane.' }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { message: DB_CONNECTION_ERROR_MESSAGE, values }
    }
    throw error
  }
}
