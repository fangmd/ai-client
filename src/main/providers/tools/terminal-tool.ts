/**
 * 终端工具定义（Function Calling）
 *
 * 注意：Responses API 和 Chat Completions API 的格式不同
 * - Responses API: { type: 'function', name: string, description: string, parameters: {...} }
 * - Chat Completions API: { type: 'function', function: { name: string, description: string, parameters: {...} } }
 */

/**
 * Responses API 格式的终端工具定义
 */
export const terminalToolDefinitionForResponsesAPI = {
  type: 'function' as const,
  name: 'execute_terminal_command',
  description:
    'Execute a terminal command and return the output. Use this tool to run system commands, check file status, run scripts, etc. Be careful with destructive commands.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description:
          'The terminal command to execute (e.g., "ls -la", "cat file.txt", "git status")'
      },
      workingDirectory: {
        type: 'string',
        description:
          'The working directory where the command should be executed. Defaults to user home directory if not specified.'
      }
    },
    required: ['command']
  }
}

/**
 * 默认导出（为了向后兼容，使用 Responses API 格式）
 * 注意：在不同 API 中使用时需要转换格式
 */
export const terminalToolDefinition = terminalToolDefinitionForResponsesAPI
