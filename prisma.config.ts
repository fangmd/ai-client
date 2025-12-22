import { defineConfig } from 'prisma/config'
import path from 'path'

// 数据库文件路径
// 在开发环境中使用 prisma 目录下的 dev.db
// 在生产环境中，路径会在运行时通过 Prisma Client 初始化时设置
const dbPath = path.join(process.cwd(), 'prisma', 'ai.db')
const databaseUrl = `file:${dbPath}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})
