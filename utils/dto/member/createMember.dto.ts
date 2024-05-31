import { t } from 'elysia'

export const createMemberDto = t.Object({
  id: t.String(),
  password: t.String(),
  nickname: t.String(),
})
