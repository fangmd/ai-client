import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logInfo, logError } from '@/main/utils'

const execFileAsync = promisify(execFile)

// 数据库初始化状态管理
let isInitializing = false
let isInitialized = false

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
 * 配置数据库优化选项
 * 包括 WAL 模式、缓存、同步模式等
 */
async function configureConnectionSettings(client: PrismaClient): Promise<void> {
  try {
    // 设置 busy_timeout（30秒），避免数据库锁定时立即失败
    await client.$executeRawUnsafe('PRAGMA busy_timeout = 30000')
    logInfo('SQLite busy_timeout set to 30 seconds')

    // 启用 WAL 模式（持久化设置，只需设置一次）
    await client.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    logInfo('SQLite WAL mode enabled')

    // 设置缓存大小为 32MB（负数表示 KB）
    await client.$executeRawUnsafe('PRAGMA cache_size = -32000')
    logInfo('SQLite cache size set to 32MB')

    // 设置同步模式为 NORMAL（WAL 模式下的推荐设置）
    await client.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
    logInfo('SQLite synchronous mode set to NORMAL')

    // 启用外键约束检查
    await client.$executeRawUnsafe('PRAGMA foreign_keys = ON')
    logInfo('SQLite foreign keys enabled')
  } catch (error) {
    logError('Failed to configure connection settings:', error)
    throw error
  }
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

  // 注意：不在这里配置连接，而是在 initializeDatabase 完成后统一配置
  // 这样可以避免在数据库迁移期间产生连接冲突

  return pC
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
 * 执行数据库迁移（不创建 Prisma Client 连接）
 */
async function runDatabaseMigrations(): Promise<void> {
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
  const prismaBin = app.isPackaged
    ? path.join(app.getAppPath(), 'node_modules', '.bin', 'prisma')
    : path.join(process.cwd(), 'node_modules', '.bin', 'prisma')

  const command = app.isPackaged && existsSync(prismaBin) ? prismaBin : 'pnpm'
  const args =
    app.isPackaged && existsSync(prismaBin)
      ? ['migrate', 'deploy', '--schema', schemaPath]
      : ['exec', 'prisma', 'migrate', 'deploy', '--schema', schemaPath]

  // 添加 busy_timeout 参数到数据库 URL，避免锁定冲突
  const urlWithTimeout = `${databaseUrl}?busy_timeout=30000`

  // 设置环境变量
  const env = {
    ...process.env,
    DATABASE_URL: urlWithTimeout,
    PRISMA_MIGRATE_SKIP_GENERATE: '1'
  }

  const { stdout, stderr } = await execFileAsync(command, args, {
    env,
    cwd: app.isPackaged ? app.getAppPath() : process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60000 // 60秒超时
  })

  if (stdout) {
    logInfo('Migration output:', stdout)
  }
  if (stderr) {
    logInfo('Migration stderr:', stderr)
  }

  logInfo('Database migrations completed successfully')
}

/**
 * 初始化数据库
 * 分两步执行：1. 运行迁移 2. 创建并配置 Prisma Client
 */
export async function initializeDatabase(): Promise<void> {
  // 防止重复初始化
  if (isInitializing || isInitialized) {
    logInfo('Database already initialized or initializing')
    return
  }

  isInitializing = true

  try {
    // 第一步：执行数据库迁移（不创建 Prisma Client）
    await runDatabaseMigrations()

    // 第二步：标记迁移完成
    isInitialized = true

    // 第三步：现在可以安全地创建和配置 Prisma Client
    const client = getPrismaClient()
    await configureConnectionSettings(client)

    logInfo('Database initialized successfully')
  } catch (error: any) {
    logError('Failed to initialize database:', error)
    isInitialized = false
    throw error
  } finally {
    isInitializing = false
  }
}

// 使用延迟初始化的单例模式
let prismaInstance: PrismaClient | null = null

/**
 * 获取 Prisma Client 实例
 * 使用延迟初始化，确保在数据库迁移完成后再创建连接
 */
export function getPrismaClient(): PrismaClient {
  // 如果正在初始化且尚未完成，警告但继续（用于初始化流程内部调用）
  if (isInitializing && !isInitialized) {
    logInfo('Warning: Accessing database during initialization')
  }

  if (!prismaInstance) {
    prismaInstance = createPrismaClient()

    // 应用退出时断开连接
    if (typeof process !== 'undefined') {
      process.on('beforeExit', async () => {
        if (prismaInstance) {
          await prismaInstance.$disconnect()
        }
      })
    }
  }
  return prismaInstance
}

/**
 * 断开数据库连接
 */
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    logInfo('Disconnecting database...')
    await prismaInstance.$disconnect()
    prismaInstance = null
    isInitialized = false
    logInfo('Database disconnected')
  }
}

// 为了向后兼容，导出 getter
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  }
})
