import log from "electron-log/renderer"

export const logInfo = (...params: any[]) => {
  log.info(...params)
  // console.info(...params)
}

export const logError = (...params: any[]) => {
  log.error(...params)
  // console.error(...params)
}

export const logWarn = (...params: any[]) => {
  log.warn(...params)
  // console.warn(...params)
}

export const logDebug = (...params: any[]) => {
  log.debug(...params)
  // console.debug(...params)
}
