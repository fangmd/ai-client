import { Snowflake } from 'nodejs-snowflake'

// Initialize snowflake
const uid = new Snowflake({})

/**
 * Generate a unique BigInt ID using Snowflake algorithm
 * @returns {bigint} A unique BigInt ID
 */
export function generateUUID(): BigInt {
  return uid.getUniqueID()
}
