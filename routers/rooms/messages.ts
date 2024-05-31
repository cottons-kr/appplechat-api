import { authorizationHeader, getMemberByAccessToken } from '@/utils/auth'
import { omit } from '@/utils/common'
import { createMessageDto } from '@/utils/dto/message/createMessage.dto'
import { NotFoundError } from '@/utils/error'
import { prisma } from '@/utils/prisma'
import { WebSocketEvent, sendToSocket } from '@/utils/websocket'
import Elysia, { t } from 'elysia'

const messageIncludes = {
  room: {
    include: {
      members: { select: { uuid: true } }
    }
  },
  sender: {
    omit: {
      password: true,
      createdAt: true,
    }
  },
} as const

const router = new Elysia().group('/:uuid/messages', app => (
  app
    .onBeforeHandle(async ({ params }) => {
      const uuid = (params as { uuid: string }).uuid
      const exists = await prisma.room.findUnique({
        where: { uuid }
      })
      if (!exists) {
        return new NotFoundError(`Room not found: ${uuid}`)
      }
    })
    .get(
      '/',
      async ({ params, query }) => {
        const page = query.page ?? 0
        const messages = await prisma.message.findMany({
          where: {
            room: {
              uuid: params.uuid
            }
          },
          include: {
            readHistories: true,
            sender: {
              omit: {
                password: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: page * 30,
          take: 30
        })
        return messages
      },
      {
        headers: authorizationHeader,
        query: t.Object({
          page: t.Optional(t.Number())
        }),
        detail: {
          tags: ['Messages'],
          summary: '메시지 목록 조회',
        }
      }
    )
    .post(
      '/',
      async ({ params, body, headers }) => {
        if (body.replyTo) {
          const replyTo = await prisma.message.findUnique({
            where: {
              id: body.replyTo
            }
          })
          if (!replyTo) {
            throw new NotFoundError(`Message not found: ${body.replyTo}`)
          }
        }
        const member = await getMemberByAccessToken(headers.authorization)
        const message = await prisma.message.create({
          data: {
            content: body.content,
            room: {
              connect: {
                uuid: params.uuid
              }
            },
            sender: {
              connect: {
                uuid: member.uuid
              }
            },
            replyTo: body.replyTo ? {
              connect: {
                id: body.replyTo
              }
            } : undefined,
            lastMessageIn: {
              connect: {
                uuid: params.uuid
              }
            }
          },
          include: messageIncludes
        })
        sendToSocket(
          WebSocketEvent.NewMessage,
          omit(message, ['room']),
          message.room.members.map(m => m.uuid)
        )
        return message
      },
      {
        headers: authorizationHeader,
        body: createMessageDto,
        detail: {
          tags: ['Messages'],
          summary: '메시지 전송',
        }
      }
    )
    .patch(
      '/:id',
      async ({ params, body, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const target = await prisma.message.findUnique({
          where: {
            id: Number(params.id),
            sender: {
              uuid: member.uuid
            }
          }
        })
        if (!target) {
          throw new NotFoundError(`Message not found: ${params.id}`)
        }

        const updated = await prisma.message.update({
          where: {
            id: target.id
          },
          data: {
            content: body.content,
            replyTo: body.replyTo ? {
              connect: {
                id: body.replyTo
              }
            } : undefined,
            editedAt: new Date()
          },
          include: messageIncludes
        })
        sendToSocket(
          WebSocketEvent.MessageEdit,
          omit(updated, ['room']),
          updated.room.members.map(m => m.uuid)
        )
        return updated
      },
      {
        headers: authorizationHeader,
        body: createMessageDto,
        params: t.Object({
          uuid: t.String(),
          id: t.String()
        }),
        detail: {
          tags: ['Messages'],
          summary: '메시지 수정',
        }
      }
    )
    .delete(
      '/:id',
      async ({ params, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const target = await prisma.message.findUnique({
          where: {
            id: Number(params.id),
            sender: {
              uuid: member.uuid
            }
          },
          include: messageIncludes
        })
        if (!target) {
          throw new NotFoundError(`Message not found: ${params.id}`)
        }
        await prisma.message.delete({
          where: { id: target.id },
        })
        sendToSocket(
          WebSocketEvent.MessageDelete,
          target.id,
          target.room.members.map(m => m.uuid)
        )
        return target
      },
      {
        headers: authorizationHeader,
        params: t.Object({
          uuid: t.String(),
          id: t.String()
        }),
        detail: {
          tags: ['Messages'],
          summary: '메시지 삭제',
        }
      }
    )
))

export default router
