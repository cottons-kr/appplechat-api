import type { ServerWebSocket } from 'bun'
import type { ElysiaWS } from 'elysia/ws'
import Ajv, { type Schema } from 'ajv'
import { isJSON } from './common'

export enum WebSocketEvent {
  NewMessage = 'newMessage',
  MessageUpdate = 'messageUpdate',
  MessageRead = 'messageRead',
  MessageEdit = 'messageEdit',
  MessageDelete = 'messageDelete',
  Typing = 'typing',
  TypingStop = 'typingStop',
  NewRoom = 'newRoom',
  RoomUpdate = 'roomUpdate',
}

export interface WebSocketMessage {
  event: WebSocketEvent
  data: unknown
}

export const socketMap = new Map<string, ElysiaWS<ServerWebSocket<any>, any, any>>() // <uuid, ws>
export const memberSocketMap = new Map<string, string>() // <ws.id, uuid>
export const authorizedSocketSet = new Set<string>()

export function getSocketByUUID(uuid: string) {
  if (!socketMap.has(uuid)) {
    return null
  }
  return socketMap.get(uuid)
}

export async function sendToSocket(event: WebSocketEvent, data: any, uuid: string[], ) {
  const sockets = uuid.map(uuid => socketMap.get(uuid)).filter(Boolean)
  const queue = sockets.map(async socket => socket?.send({ event, data }))
  return await Promise.allSettled(queue)
}

export function isValidWebsocketData(data: unknown): data is WebSocketMessage {
  if (typeof data === 'string') {
    if (isJSON(data)) {
      data = JSON.parse(data)
    } else {
      return false
    }
  }
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const ajv = new Ajv()
  const schema: Schema = {
    type: 'object',
    properties: {
      event: {
        type: 'string',
        enum: Object.values(WebSocketEvent)
      },
      data: {
        anyOf: [
          { type: 'object' },
          { type: 'array' },
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
          { type: 'null' }
        ]
      }
    },
    required: ['event', 'data'],
    additionalProperties: false
  }
  const validate = ajv.compile(schema)
  return validate(data)
}
