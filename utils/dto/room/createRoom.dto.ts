import { t } from 'elysia'

export const createRoomDto = t.Object({
  name: t.String(),
  members: t.Optional(t.Array(t.String()))
})
