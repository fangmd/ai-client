/**
 * 递归遍历对象，将所有的 BigInt 转换为 String
 */
export function convertBigIntToString(obj: any): any {
  // 处理基础类型
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()

  // 如果不是对象（且不是 null/bigint），直接返回
  if (typeof obj !== 'object') return obj

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => convertBigIntToString(item))
  }

  // 处理普通对象
  const newObj: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      newObj[key] = convertBigIntToString(value)
    }
  }
  return newObj
}
