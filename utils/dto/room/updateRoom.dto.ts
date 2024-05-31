import { t } from 'elysia'

export const updateRoomDto = t.Object({
  name: t.Optional(t.String())
})
