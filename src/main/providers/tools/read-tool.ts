/**
 * 文件读取工具定义（Function Calling）
 *
 * 注意：Responses API 和 Chat Completions API 的格式不同
 * - Responses API: { type: 'function', name: string, description: string, parameters: {...} }
 * - Chat Completions API: { type: 'function', function: { name: string, description: string, parameters: {...} } }
 */

/**
 * Responses API 格式的文件读取工具定义
 */
export const readToolDefinition = {
  type: 'function' as const,
  name: 'read',
  description: `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The filePath parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
- You can read image files using this tool.`,
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'The absolute path to the file to read'
      },
      offset: {
        type: 'number',
        description: 'The line number to start reading from (0-based). Optional, defaults to 0.'
      },
      limit: {
        type: 'number',
        description: 'The number of lines to read (defaults to 2000). Optional.'
      }
    },
    required: ['filePath']
  }
}
