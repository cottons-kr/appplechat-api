import { t } from 'elysia'

export const createMessageDto = t.Object({
  content: t.String(),
  replyTo: t.Optional(t.Number())
})
