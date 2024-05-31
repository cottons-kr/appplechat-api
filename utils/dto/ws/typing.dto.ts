import type { JSONSchemaType } from "ajv"

export interface WebSocketTypingDto {
  uuid: string
  roomId: string
}

export const websocketTypingDtoSchema: JSONSchemaType<WebSocketTypingDto> = {
  type: 'object',
  properties: {
    uuid: { type: 'string' },
    roomId: { type: 'string' }
  },
  required: ['uuid', 'roomId'],
  additionalProperties: false
}

