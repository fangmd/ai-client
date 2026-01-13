import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { app } from 'electron'
import { logInfo, logError, logWarn } from './logger'
import type { SkillInfo } from '@/types'

const readFileAsync = promisify(fs.readFile)
const readdirAsync = promisify(fs.readdir)
const statAsync = promisify(fs.stat)

/**
 * 获取技能目录路径
 */
function getSkillsDirectory(): string {
  // 开发模式下使用项目根目录的 resources/skills
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'resources', 'skills')
  }
  // 生产模式下使用应用路径下的 resources/skills
  return path.join(app.getAppPath(), 'resources', 'skills')
}

/**
 * 从目录名提取技能名称
 */
function getSkillNameFromDirectory(dirName: string): string {
  return dirName
}

/**
 * 读取技能文件内容
 */
async function readSkillFile(filePath: string): Promise<string | null> {
  try {
    const content = await readFileAsync(filePath, 'utf-8')
    return content.trim()
  } catch (error) {
    logError('Failed to read skill file', {
      filePath,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

/**
 * 从 Markdown 内容中提取描述（可选）
 * 从 "概述" 章节中提取内容作为描述
 */
function extractDescription(content: string): string | undefined {
  const lines = content.split('\n')
  
  // 查找 "## 概述" 标题
  let overviewStartIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim()
    if (trimmedLine === '## 概述') {
      overviewStartIndex = i
      break
    }
  }

  // 如果没有找到 "概述" 章节，返回 undefined
  if (overviewStartIndex === -1) {
    return undefined
  }

  // 从概述章节开始，收集内容直到下一个标题（## 开头）或文件结束
  const descriptionLines: string[] = []
  for (let i = overviewStartIndex + 1; i < lines.length; i++) {
    const trimmedLine = lines[i].trim()
    
    // 如果遇到下一个二级标题，停止收集
    if (trimmedLine.startsWith('## ') && trimmedLine !== '## 概述') {
      break
    }
    
    // 跳过空行（但保留已收集内容中的空行）
    if (trimmedLine.length === 0 && descriptionLines.length === 0) {
      continue
    }
    
    descriptionLines.push(lines[i])
  }

  // 清理并合并内容
  const description = descriptionLines
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()

  return description.length > 0 ? description : undefined
}

/**
 * 扫描技能目录，发现所有技能
 */
export async function discoverSkills(): Promise<Record<string, SkillInfo>> {
  const skillsDir = getSkillsDirectory()
  const skills: Record<string, SkillInfo> = {}

  logInfo('Scanning skills directory', { skillsDir })

  try {
    // 检查目录是否存在
    const stats = await statAsync(skillsDir).catch(() => null)
    if (!stats || !stats.isDirectory()) {
      logWarn('Skills directory does not exist', { skillsDir })
      return skills
    }

    // 读取目录内容
    const entries = await readdirAsync(skillsDir)

    for (const entry of entries) {
      const entryPath = path.join(skillsDir, entry)

      try {
        const entryStats = await statAsync(entryPath)

        // 只处理目录
        if (!entryStats.isDirectory()) {
          continue
        }

        // 查找 SKILL.md 文件
        const skillFilePath = path.join(entryPath, 'SKILL.md')
        const skillFileStats = await statAsync(skillFilePath).catch(() => null)

        if (!skillFileStats || !skillFileStats.isFile()) {
          logWarn('SKILL.md not found in directory', { directory: entryPath })
          continue
        }

        // 读取技能文件内容
        const content = await readSkillFile(skillFilePath)
        if (!content) {
          logWarn('Failed to read skill file content', { skillFilePath })
          continue
        }

        // 从目录名获取技能名称
        const skillName = getSkillNameFromDirectory(entry)

        if (!skillName || skillName.trim().length === 0) {
          logWarn('Invalid skill name from directory', { directory: entry })
          continue
        }

        // 提取描述（可选）
        const description = extractDescription(content)

        skills[skillName] = {
          name: skillName,
          location: skillFilePath,
          description
        }

        logInfo('Skill discovered', {
          name: skillName,
          location: skillFilePath,
          hasDescription: !!description
        })
      } catch (error) {
        logError('Error processing skill directory', {
          directory: entryPath,
          error: error instanceof Error ? error.message : String(error)
        })
        continue
      }
    }

    logInfo('Skills discovery completed', {
      skillsDir,
      count: Object.keys(skills).length,
      skills: Object.keys(skills)
    })

    return skills
  } catch (error) {
    logError('Failed to discover skills', {
      skillsDir,
      error: error instanceof Error ? error.message : String(error)
    })
    return skills
  }
}

/**
 * 获取指定技能
 */
export async function getSkill(name: string): Promise<SkillInfo | null> {
  const skills = await discoverSkills()
  return skills[name] || null
}

/**
 * 获取所有技能
 */
export async function getAllSkills(): Promise<Record<string, SkillInfo>> {
  return await discoverSkills()
}

/**
 * 加载技能内容
 */
export async function loadSkillContent(name: string): Promise<string | null> {
  const skill = await getSkill(name)
  if (!skill) {
    return null
  }

  return await readSkillFile(skill.location)
}
