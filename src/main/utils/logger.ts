import log from 'electron-log/main'
import path from 'path'

export function initializeLogger(userDataPath: string) {
  log.transports.file.level = 'debug'
  log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}'
  log.transports.console.level = 'debug'
  log.transports.file.resolvePathFn = () => path.join(userDataPath, 'logs/main.log')
  log.transports.file.maxSize = 1024 * 1024 * 10 // 10MB
  log.initialize()
  log.info('Log initialize success.')
}

export const logInfo = (...params: any[]) => {
  log.info(...params)
}

export const logError = (...params: any[]) => {
  log.error(...params)
}

export const logWarn = (...params: any[]) => {
  log.warn(...params)
}

export const logDebug = (...params: any[]) => {
  log.debug(...params)
}
