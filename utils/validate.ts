import Ajv, { type JSONSchemaType } from 'ajv'

export function isValidData<T extends object>(data: any, schema: JSONSchemaType<T>): data is T {
  const ajv = new Ajv()
  const validate = ajv.compile(schema)
  return validate(data)
}