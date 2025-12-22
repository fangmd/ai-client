import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'

/**
 * 获取数据库文件路径
 * 在 Electron 应用中，使用 userData 目录
 */
function getDatabasePath(): string {
  // 在 Electron 主进程中，使用 app.getPath('userData')
  // 在开发环境或非 Electron 环境中，使用当前工作目录
  let userDataPath: string
  try {
    userDataPath = app?.getPath('userData') || process.cwd()
  } catch {
    userDataPath = process.cwd()
  }

  const dbDir = path.join(userDataPath, 'data')

  // 确保目录存在
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  return path.join(dbDir, 'database.db')
}

/**
 * 创建 Prisma Client 实例
 * 使用单例模式，确保整个应用只有一个 Prisma Client 实例
 */
function createPrismaClient(): PrismaClient {
  const dbPath = getDatabasePath()
  const databaseUrl = `file:${dbPath}`

  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
  })

  return new PrismaClient({ adapter })
}

// 导出单例实例
export const prisma = createPrismaClient()

// 应用退出时断开连接
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
