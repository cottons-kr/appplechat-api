import Elysia, { t } from 'elysia'
import { createMemberDto } from '@/utils/dto/member/createMember.dto'
import { prisma } from '@/utils/prisma'
import { authorizationHeader } from '@/utils/auth'
import { ConflictError, NotFoundError } from '@/utils/error'

const router = new Elysia().group('/members', app => (
  app
    .post(
      '/',
      async ({ body }) => {
        const exists = await prisma.member.findFirst({
          where: { OR: [
            { id: body.id },
            { nickname: body.nickname }
          ] }
        })
        if (exists) {
          throw new ConflictError('ID or nickname already exists')
        }
        const newMember = await prisma.member.create({
          data: {
            ...body,
            password: Bun.password.hashSync(body.password)
          },
          omit: {
            password: true
          }
        })
        return newMember
      },
      {
        body: createMemberDto,
        detail: {
          tags: ['Members'],
          summary: '회원가입',
          description: '회원을 생성합니다.',
        }
      }
    )
    .get(
      '/:id',
      async ({ params }) => {
        const member = await prisma.member.findUnique({
          where: { id: params.id },
          omit: { password: true }
        })
        if (!member) {
          throw new NotFoundError(`Member not found: ${params.id}`)
        }
        return member
      },
      {
        headers: authorizationHeader,
        params: t.Object({
          id: t.String()
        }),
        detail: {
          tags: ['Members'],
          summary: '멤버 조회',
          description: '멤버를 조회합니다.',
        }
      }
    )
))

export default router
