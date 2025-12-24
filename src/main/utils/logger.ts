import log from 'electron-log/main'
import path from 'path'
import { inspect } from 'util'

// 日志格式化配置
const INSPECT_OPTIONS = {
  depth: null, // 无限深度展开
  maxArrayLength: 50, // 数组最多显示50个元素
  maxStringLength: 1000, // 字符串最大长度1000
  colors: false, // 日志文件不需要颜色
  breakLength: 120 // 换行宽度
}

/**
 * 格式化日志参数，深度展开对象和数组
 */
function formatParams(params: any[]): any[] {
  return params.map((param) =>
    typeof param === 'object' && param !== null ? inspect(param, INSPECT_OPTIONS) : param
  )
}

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
  log.info(...formatParams(params))
}

export const logError = (...params: any[]) => {
  log.error(...formatParams(params))
}

export const logWarn = (...params: any[]) => {
  log.warn(...formatParams(params))
}

export const logDebug = (...params: any[]) => {
  log.debug(...formatParams(params))
}
