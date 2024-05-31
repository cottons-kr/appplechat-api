import { createAccessToken, getMemberByAccessToken, authorizationHeader } from '@/utils/auth'
import { createTokenDto } from '@/utils/dto/auth/createToken.dto'
import { BadRequestError } from '@/utils/error'
import { prisma } from '@/utils/prisma'
import Elysia from 'elysia'

const router = new Elysia().group('/auth', app => (
  app
    .post(
      '/token',
      async ({ body, set }) => {
        const member = await prisma.member.findUniqueOrThrow({
          where: {
            id: body.id
          }
        })
        if (Bun.password.verifySync(body.password, member.password)) {
          set.status = 'Created'
          return createAccessToken(member)
        } else {
          throw new BadRequestError('Invalid password')
        }
      },
      {
        body: createTokenDto,
        detail: {
          tags: ['Auth'],
          summary: 'Access Token 생성',
          description: 'ID와 비밀번호로 Access Token을 생성합니다.',
        }
      }
    )
    .get(
      '/me',
      async ({ headers }) => {
        return getMemberByAccessToken(headers.authorization)
      },
      {
        headers: authorizationHeader,
        detail: {
          tags: ['Auth'],
          summary: '내 정보 조회',
          description: 'Access Token을 통해 내 정보를 조회합니다.',
        }
      }
    )
))

export default router
