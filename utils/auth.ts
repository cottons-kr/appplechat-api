import type { Member } from '@prisma/client'
import { logger } from './logger'
import { t } from 'elysia'
import { prisma } from './prisma'
import { BadRequestError, NotFoundError } from './error'

interface Token {
  member: Member
  expiresAt: number
}

export async function getMemberByAccessToken(token: string) {
  const tokenData = tokenMap.get(token)
  if (!isValidAccessToken(token) || !tokenData) {
    throw new BadRequestError('Invalid access token')
  }
  const member = await prisma.member.findUnique({
    where: { uuid: tokenData.member.uuid },
    omit: { password: true }
  })
  if (!member) {
    throw new NotFoundError('Member not found')
  }
  return member
}

export function createAccessToken(member: Member) {
  const token = Math.random().toString(36).substring(2)
  const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 7)
  tokenMap.set(token, { member, expiresAt })
  saveAccessTokens()
  
  return { token, expiresAt }
}

export function isValidAccessToken(token: string) {
  const tokenData = tokenMap.get(token)
  if (!tokenData) return false
  if (tokenData.expiresAt <= Date.now()) {
    tokenMap.delete(token)
    return false
  }
  return true
}

export function removeAccessToken(token: string) {
  tokenMap.delete(token)
  saveAccessTokens()
}

export async function saveAccessTokens() {
  const json = JSON.stringify(Array.from(tokenMap.entries()))
  await Bun.write('accessTokens.json', json)
  logger.info(`Saved ${tokenMap.size} access tokens`)
}

export async function loadAccessTokens() {
  const json = await Bun.file('accessTokens.json', { type: 'application/json' }).text()
  const entries = JSON.parse(json) as [string, Token][]
  tokenMap.clear()
  for (const [token, data] of entries) {
    tokenMap.set(token, data)
  }
  logger.info(`Loaded ${entries.length} access tokens`)
}

const tokenMap = new Map<string, Token>()

loadAccessTokens()
  .catch(error => {
    logger.error(`Failed to load access tokens: ${error.message}`)
  })


export const authorizationHeader = t.Object({
  authorization: t.String()
})
