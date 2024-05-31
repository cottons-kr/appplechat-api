import { getMemberByAccessToken, isValidAccessToken } from '@/utils/auth'
import { websocketTypingDtoSchema, type WebSocketTypingDto } from '@/utils/dto/ws/typing.dto'
import { logger } from '@/utils/logger'
import { prisma } from '@/utils/prisma'
import { isValidData } from '@/utils/validate'
import { WebSocketEvent, authorizedSocketSet, isValidWebsocketData, memberSocketMap, sendToSocket, socketMap } from '@/utils/websocket'
import { MemberStatus } from '@prisma/client'
import Elysia from 'elysia'

const router = new Elysia()

router.ws('/ws', {
  open: async (ws) => {
    logger.debug(`WebSocket connection opened (ID: ${ws.id})`)
    const token = ws.data.headers.authorization ?? ''
    if (!token || !isValidAccessToken(token)) {
      logger.warn(`Invalid access token (ID: ${ws.id})`)
      ws.close()
    }
    const member = await getMemberByAccessToken(token)
    logger.info(`Member connected (ID: ${ws.id}, UUID: ${member.uuid})`)
    socketMap.set(member.uuid, ws)
    memberSocketMap.set(ws.id, member.uuid)
    authorizedSocketSet.add(ws.id)
    await prisma.member.update({
      where: { uuid: member.uuid },
      data: { status: MemberStatus.ONLINE }
    })
  },
  close: async (ws, code, message) => {
    const memberId = memberSocketMap.get(ws.id)
    if (memberId) {
      socketMap.delete(memberId)
      await prisma.member.update({
        where: { uuid: memberId },
        data: { status: MemberStatus.OFFLINE }
      })
    }
    memberSocketMap.delete(ws.id)
    authorizedSocketSet.delete(ws.id)
    logger.info(`Member disconnected (ID: ${ws.id})`)
    logger.debug(`WebSocket connection closed (ID: ${ws.id}, Code: ${code}, Message: ${message})`)
  },
  message: async (ws, message) => {
    if (!isValidWebsocketData(message)) {
      logger.warn(`Invalid message format (ID: ${ws.id})`)
      logger.debug(`Message: ${message}`)
      return
    }
    const { event, data } = message
    switch (event) {
      case WebSocketEvent.Typing:
      case WebSocketEvent.TypingStop: {
        if (!isValidData(data, websocketTypingDtoSchema)) {
          logger.warn(`Invalid data format (ID: ${ws.id})`)
          return
        }
        const { uuid: memberId, roomId } = data
        const room = await prisma.room.findUnique({
          where: { uuid: roomId },
          include: {
            members: { select: { uuid: true } }
          }
        })
        if (!room) {
          logger.warn(`Room not found (ID: ${ws.id}, UUID: ${roomId})`)
          return
        }
        return sendToSocket(
          event,
          data as WebSocketTypingDto,
          room.members.map(({ uuid }) => uuid).filter(uuid => uuid !== memberId)
        )
      }
    }
  },
})

export default router
