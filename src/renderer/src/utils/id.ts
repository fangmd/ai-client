import { customAlphabet } from 'nanoid'

// 使用纯数字字符，生成 18 位数字 ID（可安全转为 bigint）
const nanoid = customAlphabet('1234567890', 18)

/**
 * 生成前端临时 bigint ID
 * 使用 nanoid 生成纯数字字符串，然后转为 bigint
 */
export function generateTempId(): bigint {
  return BigInt(nanoid())
}

