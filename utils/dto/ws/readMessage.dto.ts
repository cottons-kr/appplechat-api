import type { JSONSchemaType } from 'ajv'

export interface WebsocketReadMessageDto {
  uuid: string
  messageId: string
}

export const websocketReadMessageDtoSchema: JSONSchemaType<WebsocketReadMessageDto> = {
  type: 'object',
  properties: {
    uuid: { type: 'string' },
    messageId: { type: 'string' }
  },
  required: ['uuid', 'messageId'],
  additionalProperties: false
}
