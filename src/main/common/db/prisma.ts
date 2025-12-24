import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logInfo, logError } from '@/main/utils'

const execFileAsync = promisify(execFile)

/**
 * 获取数据库文件路径
 * 在开发模式下使用项目目录，在生产模式下使用 userData 目录
 */
function getDatabasePath(): string {
  let userDataPath: string
  let dbDir: string

  // 开发模式下使用当前项目目录
  if (!app.isPackaged) {
    userDataPath = process.cwd()
    dbDir = path.join(userDataPath, 'prisma')
  } else {
    // 生产模式下使用 userData 目录
    try {
      userDataPath = app.getPath('userData')
    } catch {
      userDataPath = process.cwd()
    }
    dbDir = path.join(userDataPath, 'data')
  }

  // 确保目录存在
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  return path.join(dbDir, 'ai.db')
}

/**
 * 创建 Prisma Client 实例
 * 使用单例模式，确保整个应用只有一个 Prisma Client 实例
 */
function createPrismaClient(): PrismaClient {
  const dbPath = getDatabasePath()
  const databaseUrl = `file:${dbPath}`

  logInfo('Database URL:', databaseUrl)

  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl
  })

  // 开发模式下开启 SQL 日志
  const isDev = !app.isPackaged
  const pC = new PrismaClient({
    adapter,
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
  })

  if (isDev) {
    pC.$on('query', (e) => {
      logInfo('Query:', e.query)
      logInfo('Params:', e.params)
      logInfo('Duration:', e.duration, 'ms')
    })
  }
  return pC
}

/**
 * 配置 SQLite 性能优化选项
 * 包括 WAL 模式、缓存大小等
 */
export async function configureSqliteOptimizations(): Promise<void> {
  try {
    // 启用 WAL 模式，提高并发读写性能
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    logInfo('SQLite WAL mode enabled')

    // 设置缓存大小为 32MB（负数表示 KB）
    await prisma.$executeRawUnsafe('PRAGMA cache_size = -32000')
    logInfo('SQLite cache size set to 32MB')

    // 设置同步模式为 NORMAL（WAL 模式下的推荐设置）
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
    logInfo('SQLite synchronous mode set to NORMAL')

    // 启用外键约束检查
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON')
    logInfo('SQLite foreign keys enabled')
  } catch (error) {
    logError('Failed to configure SQLite optimizations:', error)
  }
}

/**
 * 获取 Prisma schema 文件路径
 */
function getSchemaPath(): string {
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'prisma', 'schema.prisma')
  }
  return path.join(app.getAppPath(), 'prisma', 'schema.prisma')
}

/**
 * 获取 Prisma migrations 目录路径
 */
function getMigrationsPath(): string {
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'prisma', 'migrations')
  }
  // 生产模式下，migrations 应该被打包到应用中
  return path.join(app.getAppPath(), 'prisma', 'migrations')
}

/**
 * 使用 Prisma Migrate 执行数据库迁移
 * 调用 prisma migrate deploy 命令来应用所有待执行的迁移
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const dbPath = getDatabasePath()
    const databaseUrl = `file:${dbPath}`
    const schemaPath = getSchemaPath()
    const migrationsPath = getMigrationsPath()

    // 检查必要文件是否存在
    if (!existsSync(schemaPath)) {
      logError(`Prisma schema not found: ${schemaPath}`)
      throw new Error(`Prisma schema not found: ${schemaPath}`)
    }

    if (!existsSync(migrationsPath)) {
      logInfo(`Migrations directory not found: ${migrationsPath}, skipping migrations`)
      return
    }

    logInfo('Running Prisma Migrate deploy...')
    logInfo(`Database URL: ${databaseUrl}`)
    logInfo(`Schema path: ${schemaPath}`)
    logInfo(`Migrations path: ${migrationsPath}`)

    // 执行 prisma migrate deploy
    // 使用 pnpm exec 来执行 prisma 命令
    const prismaBin = app.isPackaged
      ? path.join(app.getAppPath(), 'node_modules', '.bin', 'prisma')
      : path.join(process.cwd(), 'node_modules', '.bin', 'prisma')

    // 如果找不到 prisma 二进制文件，尝试使用 npx/pnpm
    const command = app.isPackaged && existsSync(prismaBin) ? prismaBin : 'pnpm'
    const args =
      app.isPackaged && existsSync(prismaBin)
        ? ['migrate', 'deploy', '--schema', schemaPath]
        : ['exec', 'prisma', 'migrate', 'deploy', '--schema', schemaPath]

    // 设置环境变量
    // Prisma Migrate 会从 schema.prisma 读取 datasource，但我们可以通过环境变量覆盖
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PRISMA_MIGRATE_SKIP_GENERATE: '1' // 跳过生成客户端，因为我们已经有了
    }

    const { stdout, stderr } = await execFileAsync(command, args, {
      env,
      cwd: app.isPackaged ? app.getAppPath() : process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    if (stdout) {
      logInfo('Migration output:', stdout)
    }
    if (stderr) {
      logInfo('Migration stderr:', stderr)
    }

    logInfo('Database migrations completed successfully')
  } catch (error: any) {
    logError('Failed to initialize database:', error)
    throw error
  }
}

// 导出单例实例
export const prisma = createPrismaClient()

// 应用退出时断开连接
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
