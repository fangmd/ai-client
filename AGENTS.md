
# 数据库

开发过程中不需要生成 migrate，migrate 由人工管理，开发过程只需要修改 schema.prisma 后执行 `pnpm run db:push` 生成客户端代码并且更新数据库表结构
