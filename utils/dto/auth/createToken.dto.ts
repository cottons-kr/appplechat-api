import { t } from 'elysia'

export const createTokenDto = t.Object({
  id: t.String(),
  password: t.String(),
})
