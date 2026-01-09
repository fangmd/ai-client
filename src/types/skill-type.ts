/**
 * 技能元数据
 */
export interface SkillInfo {
  /** 技能名称（从目录名获取） */
  name: string
  /** 技能文件路径 */
  location: string
  /** 技能描述（可选，可以从 Markdown 内容中提取） */
  description?: string
}

/**
 * Skill 工具参数
 */
export interface SkillToolParams {
  /** 技能名称 */
  name: string
}
