import Elysia from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { PORT } from './utils/common'
import { logger } from './utils/logger'
import { isValidAccessToken } from './utils/auth'
import { UnauthorizedError, errorCollection } from './utils/error'
import { prisma } from './utils/prisma'
import { MemberStatus } from '@prisma/client'

import websocket from './routers/websocket'
import authRouter from './routers/auth'
import usersRouter from './routers/members'
import roomsRouter from './routers/rooms'

const app = new Elysia()
  .error(errorCollection)
  .onError(({ error, code, set }) => {
    logger.error(error)
    switch (code) {
      case 'VALIDATION': {
        // @ts-ignore
        if (error.validator.schema.required.includes('authorization')) {
          return set.status = 'Unauthorized'
        }
      }
    }
  })
  .onRequest(({ request }) => {
    const url = request.url.replace(`http://localhost:${PORT}`, '')
    logger.http(`${request.method} ${url}`)
  })
  .onBeforeHandle(({ headers }) => {
    if (headers.authorization) {
      if (!isValidAccessToken(headers.authorization)) {
        throw new UnauthorizedError('Invalid access token')
      }
    }
  })
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'App:ple Chat API',
        version: '1.0.0',
        description: 'App:ple Chat API 문서입니다.'
      },
      tags: [
        { name: 'Auth', description: 'Token이 발급되면 Header에 직접 넣어서 요청을 보내야 합니다. Token의 유효기간은 2시간입니다.' },
        { name: 'Members', description: 'Member는 사용자 객체입니다.' },
        { name: 'Rooms', description: 'Room은 채팅방 객체입니다.' },
        { name: 'Messages', description: 'Message는 채팅 메시지 객체입니다.' }
      ]
    }
  }))
  .use(websocket)
  .use(authRouter)
  .use(usersRouter)
  .use(roomsRouter)

app.listen(PORT, async () => {
  logger.info(`🚀 App:ple Chat API is running on http://localhost:${PORT}`)
  await prisma.member.updateMany({
    data: { status: MemberStatus.OFFLINE }
  })
})
