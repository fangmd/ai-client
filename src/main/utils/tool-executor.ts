import { exec } from 'child_process'
import { promisify } from 'util'
import { logInfo, logError, logWarn, logDebug } from './logger'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

/**
 * 获取系统默认的 shell 路径
 */
function getDefaultShell(): string {
  // 优先使用环境变量中的 SHELL
  if (process.env.SHELL) {
    logDebug('Using shell from environment', { shell: process.env.SHELL })
    return process.env.SHELL
  }

  // 根据操作系统返回默认 shell
  const platform = os.platform()
  if (platform === 'darwin') {
    // macOS 默认使用 zsh
    return '/bin/zsh'
  } else if (platform === 'linux') {
    // Linux 通常使用 bash
    return '/bin/bash'
  } else if (platform === 'win32') {
    // Windows 使用 cmd
    return process.env.COMSPEC || 'cmd.exe'
  }

  // 回退到 sh
  return '/bin/sh'
}

/**
 * 命令执行结果
 */
export interface CommandExecutionResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  command: string
  workingDirectory: string
  executionTime: number // 执行时间（毫秒）
  error?: string // 错误信息（如果有）
}

/**
 * 命令白名单（允许的命令前缀）
 *  'cp', 'mv', 'rm',
 */
const ALLOWED_COMMAND_PREFIXES = [
  'ls',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'which',
  'pwd',
  'cd',
  'mkdir',
  'touch',
  'sw_vers',
  'git',
  'npm',
  'pnpm',
  'yarn',
  'node',
  'python',
  'python3',
  'echo',
  'date',
  'whoami',
  'uname',
  'df',
  'du',
  'ps',
  'top',
  'kill',
  'killall',
  'curl',
  'wget',
  'ping'
  // 添加更多安全命令...
]

/**
 * 禁止的命令（危险操作）
 */
const FORBIDDEN_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'format',
  'mkfs',
  'dd',
  'shutdown',
  'reboot',
  'halt',
  'poweroff'
  // 添加更多危险命令...
]

/**
 * 最大执行时间（毫秒）
 */
const MAX_EXECUTION_TIME = 30000 // 30秒

/**
 * 最大输出长度（字符）
 */
const MAX_OUTPUT_LENGTH = 10000

/**
 * 执行终端命令
 */
export async function executeTerminalCommand(
  command: string,
  workingDirectory?: string
): Promise<CommandExecutionResult> {
  const startTime = Date.now()

  // 1. 安全验证
  if (!validateCommand(command)) {
    throw new Error(`Command not allowed: ${command}`)
  }

  // 2. 确定工作目录
  let cwd: string
  if (workingDirectory) {
    // 展开 ~ 为用户主目录（支持 ~ 和 ~/path 格式）
    const expandedPath = workingDirectory.startsWith('~')
      ? workingDirectory.replace(/^~/, os.homedir())
      : workingDirectory
    cwd = path.resolve(expandedPath)
  } else {
    cwd = os.homedir()
  }

  // 3. 验证工作目录（必须在用户目录下）
  if (!isPathAllowed(cwd)) {
    throw new Error(`Working directory not allowed: ${cwd}`)
  }

  // 获取系统默认 shell
  const shell = getDefaultShell()

  logInfo('Executing terminal command', {
    command,
    workingDirectory: cwd,
    shell
  })

  try {
    // 4. 执行命令（带超时，明确指定 shell）
    const { stdout, stderr } = await Promise.race([
      execAsync(command, {
        cwd,
        maxBuffer: MAX_OUTPUT_LENGTH,
        timeout: MAX_EXECUTION_TIME,
        shell // 明确指定 shell 路径
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Command execution timeout')), MAX_EXECUTION_TIME)
      )
    ])

    const executionTime = Date.now() - startTime

    // 5. 截断输出（防止过长）
    const truncatedStdout = truncateOutput(stdout)
    const truncatedStderr = truncateOutput(stderr)

    const result: CommandExecutionResult = {
      success: true,
      exitCode: 0,
      stdout: truncatedStdout,
      stderr: truncatedStderr,
      command,
      workingDirectory: cwd,
      executionTime
    }

    logInfo('Terminal command executed successfully', {
      command,
      executionTime,
      outputLength: truncatedStdout.length
    })

    return result
  } catch (error: any) {
    const executionTime = Date.now() - startTime
    const exitCode = error.code || 1

    const result: CommandExecutionResult = {
      success: false,
      exitCode,
      stdout: '',
      stderr: truncateOutput(error.stderr || error.message),
      command,
      workingDirectory: cwd,
      executionTime,
      error: error.message
    }

    logError('Terminal command execution failed', {
      command,
      workingDirectory: cwd,
      shell,
      error: error.message,
      errorCode: error.code,
      exitCode,
      errorName: error.name,
      stack: error.stack
    })

    return result
  }
}

/**
 * 验证命令是否允许执行
 */
function validateCommand(command: string): boolean {
  // 1. 检查禁止的命令
  const normalizedCommand = command.trim().toLowerCase()
  for (const forbidden of FORBIDDEN_COMMANDS) {
    if (normalizedCommand.includes(forbidden.toLowerCase())) {
      logWarn('Forbidden command detected', { command, forbidden })
      return false
    }
  }

  // 2. 检查命令前缀
  const firstWord = command.trim().split(/\s+/)[0]
  const isAllowed = ALLOWED_COMMAND_PREFIXES.some((prefix) => firstWord.startsWith(prefix))

  if (!isAllowed) {
    logWarn('Command not in whitelist', { command, firstWord })
  }

  return isAllowed
}

/**
 * 验证路径是否允许访问
 */
function isPathAllowed(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath)
  const homeDir = os.homedir()

  // 只允许访问用户目录及其子目录
  return (
    resolvedPath.startsWith(homeDir) ||
    resolvedPath.startsWith('/tmp') ||
    resolvedPath.startsWith(process.cwd())
  )
}

/**
 * 截断输出内容
 */
function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_LENGTH) {
    return output
  }

  return (
    output.substring(0, MAX_OUTPUT_LENGTH) +
    `\n\n[Output truncated. Total length: ${output.length} characters]`
  )
}
