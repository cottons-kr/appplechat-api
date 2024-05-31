import Elysia, { t } from 'elysia'
import { prisma } from '@/utils/prisma'
import { authorizationHeader, getMemberByAccessToken } from '@/utils/auth'
import { createRoomDto } from '@/utils/dto/room/createRoom.dto'
import { updateRoomDto } from '@/utils/dto/room/updateRoom.dto'
import { NotFoundError } from '@/utils/error'
import { WebSocketEvent, sendToSocket } from '@/utils/websocket'
import { omit } from '@/utils/common'

import roomMessagesRouter from './messages'
import roomMembersRouter from './members'

const router = new Elysia().group('/rooms', app => (
  app
    .use(roomMessagesRouter)
    .use(roomMembersRouter)
    .get(
      '/',
      async ({ headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const rooms = await prisma.room.findMany({
          where: {
            members: {
              some: { uuid: member.uuid }
            }
          },
          include: {
            lastMessage: true
          },
        })
        return rooms.sort((a, b) => {
          const aDate = a.lastMessage?.createdAt ?? a.createdAt
          const bDate = b.lastMessage?.createdAt ?? b.createdAt
          return bDate.getTime() - aDate.getTime()
        })
      },
      {
        headers: authorizationHeader,
        detail: {
          tags: ['Rooms'],
          summary: '채팅방 목록 조회',
        }
      }
    )
    .post(
      '/',
      async ({ body, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const newRoom = await prisma.room.create({
          data: {
            name: body.name,
            members: {
              connect: [...body.members ?? [], member.uuid].map(uuid => ({ uuid }))
            },
          },
          include: {
            members: {
              select: { uuid: true }
            },
            lastMessage: true
          }
        })
        sendToSocket(
          WebSocketEvent.NewRoom,
          newRoom,
          newRoom.members.map(m => m.uuid)
        )
        return newRoom
      },
      {
        body: createRoomDto,
        headers: authorizationHeader,
        detail: {
          tags: ['Rooms'],
          summary: '채팅방 생성',
        }
      }
    )
    .get(
      '/:uuid',
      async ({ params, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const room = await prisma.room.findUnique({
          where: {
            uuid: params.uuid,
            members: {
              some: { uuid: member.uuid }
            }
          },
          include: {
            members: {
              omit: {
                password: true
              }
            },
            lastMessage: true
          }
        })
        if (!room) {
          throw new NotFoundError(`Room not found: ${params.uuid}`)
        }
        return room
      },
      {
        headers: authorizationHeader,
        params: t.Object({ uuid: t.String() }),
        detail: {
          tags: ['Rooms'],
          summary: '채팅방 조회',
        },
      }
    )
    .patch(
      '/:uuid',
      async ({ params, body, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const room = await prisma.room.findUnique({
          where: {
            uuid: params.uuid,
            members: {
              some: { uuid: member.uuid }
            }
          },
          include: {
            members: { select: { uuid: true } }
          }
        })
        if (!room) {
          throw new NotFoundError(`Room not found: ${params.uuid}`)
        }
        const updatedRoom = await prisma.room.update({
          where: { uuid: params.uuid },
          data: body
        })
        sendToSocket(
          WebSocketEvent.RoomUpdate,
          updatedRoom,
          room.members.map(m => m.uuid)
        )
        return updatedRoom
      },
      {
        headers: authorizationHeader,
        body: updateRoomDto,
        params: t.Object({ uuid: t.String() }),
        detail: {
          tags: ['Rooms'],
          summary: '채팅방 수정',
        }
      }
    )
    .delete(
      '/:uuid',
      async ({ params, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const room = await prisma.room.findUnique({
          where: {
            uuid: params.uuid,
            members: {
              some: { uuid: member.uuid }
            }
          },
          include: {
            members: { select: { uuid: true } }
          }
        })
        if (!room) {
          throw new NotFoundError(`Room not found: ${params.uuid}`)
        }
        if (room.members.length > 1) {
          await prisma.room.update({
            where: { uuid: params.uuid },
            data: {
              members: {
                disconnect: { uuid: member.uuid }
              }
            }
          })
        } else {
          await prisma.room.delete({
            where: { uuid: params.uuid }
          })
        }
        return omit(room, ['members'])
      },
      {
        headers: authorizationHeader,
        params: t.Object({ uuid: t.String() }),
        detail: {
          tags: ['Rooms'],
          summary: '채팅방 나가기',
        }
      }
    )
))

export default router
