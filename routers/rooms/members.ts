import { authorizationHeader, getMemberByAccessToken } from '@/utils/auth'
import { inviteMemberDto } from '@/utils/dto/room/inviteMember.dto'
import { ConflictError } from '@/utils/error'
import { prisma } from '@/utils/prisma'
import Elysia, { NotFoundError, t } from 'elysia'

const router = new Elysia().group('/:uuid/members', app => (
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
      async ({ params, headers }) => {
        const member = await getMemberByAccessToken(headers.authorization)
        const room = await prisma.room.findUnique({
          where: {
            uuid: params.uuid,
            members: {
              some: { id: member.id }
            }
          },
          include: {
            members: {
              omit: {
                password: true
              }
            }
          }
        })
        if (!room) {
          throw new NotFoundError(`Room not found: ${params.uuid}`)
        }
        return room.members
      },
      {
        headers: authorizationHeader,
        params: t.Object({
          uuid: t.String()
        }),
        detail: {
          tags: ['Rooms'],
          summary: '참가한 멤버 목록 조회',
        }
      }
    )
    .post(
      '/',
      async ({ params, body }) => {
        const room = await prisma.room.findUnique({
          where: {
            uuid: params.uuid,
            members: {
              some: { id: body.id }
            }
          }
        })
        const member = await prisma.member.findUnique({
          where: { id: body.id },
          include: {
            joinedRooms: true
          }
        })
        if (!room) {
          throw new NotFoundError(`Room not found: ${params.uuid}`)
        }
        if (!member) {
          throw new NotFoundError(`Member not found: ${body.id}`)
        }
        if (member.joinedRooms.map(r => r.uuid).includes(params.uuid)) {
          throw new ConflictError(`Member already joined: ${params.uuid}`)
        }
        await prisma.room.update({
          where: { uuid: params.uuid },
          data: {
            members: {
              connect: {
                id: body.id
              }
            }
          }
        })
        return member
      },
      {
        headers: authorizationHeader,
        params: t.Object({
          uuid: t.String()
        }),
        body: inviteMemberDto,
        detail: {
          tags: ['Rooms'],
          summary: '멤버 초대',
        }
      }
    )
))

export default router
