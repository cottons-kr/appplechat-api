import * as winston from 'winston'

const { combine, timestamp, printf, colorize } = winston.format

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
})

const level = () => {
  const env = Bun.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'http'
}

const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(info => {
    if (info.stack) {
      return `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message} \n${info.stack}`
    }
    return `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`
  })
)

const consoleOpts = {
  handleExceptions: true,
  level: Bun.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' })
  )
}

const transports = [
  new winston.transports.Console(consoleOpts),
]

export const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports
})
