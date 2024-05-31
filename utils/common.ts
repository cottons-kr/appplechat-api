export const PORT = parseInt(Bun.env.PORT ?? '') || 3000

export function createRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length)
}

export function isJSON(str: string) {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

export function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>
}
