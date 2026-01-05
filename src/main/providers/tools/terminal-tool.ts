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
export const terminalToolDefinition = {
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
          "The working directory where the command should be executed. If not specified, defaults to the current user's home directory. The home directory can be obtained via bash using '$HOME' environment variable or 'echo ~' command (e.g., /Users/username on macOS, C:\\Users\\username on Windows, /home/username on Linux)."
      }
    },
    required: ['command']
  }
}
