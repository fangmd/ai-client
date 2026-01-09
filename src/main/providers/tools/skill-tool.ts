import { getAllSkills, loadSkillContent } from '../../utils/skill-loader'
import { logInfo, logError } from '../../utils/logger'
import * as path from 'path'

/**
 * 生成工具描述（包含可用技能列表）
 */
async function generateToolDescription(): Promise<string> {
  const skills = await getAllSkills()
  const skillNames = Object.keys(skills)

  if (skillNames.length === 0) {
    return 'Load a skill to get detailed instructions for a specific task. No skills are currently available.'
  }

  let description = 'Load a skill to get detailed instructions for a specific task.\n'
  description += 'Skills provide specialized knowledge and step-by-step guidance.\n'
  description += 'Use this when a task matches an available skill.\n\n'
  description += '<available_skills>\n'

  for (const skillName of skillNames) {
    const skill = skills[skillName]
    description += `  <skill>\n`
    description += `    <name>${skillName}</name>\n`
    if (skill.description) {
      description += `    <description>${skill.description}</description>\n`
    }
    description += `  </skill>\n`
  }

  description += '</available_skills>'

  return description
}

/**
 * Responses API 格式的 skill 工具定义
 */
export async function getSkillToolDefinition() {
  const description = await generateToolDescription()

  return {
    type: 'function' as const,
    name: 'skill',
    description,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the skill to load (e.g., "test-skill")'
        }
      },
      required: ['name']
    }
  }
}

/**
 * 执行 skill 工具
 */
export async function executeSkillTool(params: { name: string }): Promise<string> {
  const { name } = params

  logInfo('[executeSkillTool] Loading skill', { name })

  try {
    // 加载技能内容
    const content = await loadSkillContent(name)

    if (!content) {
      // 获取所有可用技能名称
      const skills = await getAllSkills()
      const availableSkills = Object.keys(skills)
      const availableList = availableSkills.length > 0 ? availableSkills.join(', ') : 'none'

      const errorMessage = `Skill "${name}" not found. Available skills: ${availableList}`
      logError('[executeSkillTool] Skill not found', { name, availableSkills })
      throw new Error(errorMessage)
    }

    // 获取技能信息以获取基础目录
    const skills = await getAllSkills()
    const skill = skills[name]
    const baseDir = skill ? path.dirname(skill.location) : ''

    // 格式化输出
    const output = [`## Skill: ${name}`, '', `**Base directory**: ${baseDir}`, '', content].join(
      '\n'
    )

    logInfo('[executeSkillTool] Skill loaded successfully', {
      name,
      contentLength: content.length,
      baseDir
    })

    return output
  } catch (error) {
    logError('[executeSkillTool] Failed to load skill', {
      name,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}
