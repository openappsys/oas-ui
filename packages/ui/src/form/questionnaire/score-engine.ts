/**
 * 问卷评分引擎（`score-rules`）——表达式规则列表求和，复用 schema-form 的受限表达式轨。
 *
 * 数据契约（**规则列表形态**，本库选定并冻结）：
 * ```json
 * [
 *   { "when": "{satisfaction} >= 4", "score": 5 },
 *   { "when": "{recommend} == \"yes\"", "score": 3 }
 * ]
 * ```
 * - 每条规则 = 条件表达式 + 分值；条件成立则把 `score` 累加进总分，不成立计 0；
 * - 「字段分值映射」形态（字段路径 → 每选项分值）**不单独提供**：它等价于若干条
 *   `{ when: "{字段} == \"选项\"", score: n }`，规则列表一种形态即可覆盖，避免两套语义。
 *
 * 约束：
 * - 表达式读取**跨步全量答案**（含隐藏 / 已跳过步——面板常驻、值保留）；题型由宿主组合
 *   （rate / scale / 选项组等既有件），引擎只做汇总，不渲染、不做题型分派；
 * - 非法规则（非对象 / `when` 非非空字符串 / `score` 非有限数值）跳过并返回告警文案，
 *   单条坏规则不连坐整份评分；
 * - 表达式求值抛错（宿主函数）按条件不成立处理；浮点累加按 1e-6 取整，避免
 *   `0.1 + 0.2` 式的展示噪声。
 */
import { compileExpression, evaluateCondition, type ExprProgram } from '../schema-form/expr/index.js'

/** 一条已编译的评分规则 */
export interface CompiledScoreRule {
  index: number
  source: string
  program: ExprProgram
  score: number
  deps: string[]
  dynamic: boolean
}

export interface CompiledScoreRules {
  rules: CompiledScoreRule[]
  warnings: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 编译规则列表（原始 JSON 值进，已编译规则 + 告警出） */
export function compileScoreRules(raw: unknown): CompiledScoreRules {
  const out: CompiledScoreRules = { rules: [], warnings: [] }
  if (raw === undefined || raw === null) return out
  if (!Array.isArray(raw)) {
    out.warnings.push('score-rules 必须是数组（[{ when, score }]），已忽略')
    return out
  }
  raw.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      out.warnings.push(`score-rules 第 ${index + 1} 条不是对象，已忽略`)
      return
    }
    const { when, score } = entry
    if (typeof when !== 'string' || when.trim() === '') {
      out.warnings.push(`score-rules 第 ${index + 1} 条的 when 必须是非空表达式字符串，已忽略`)
      return
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      out.warnings.push(`score-rules 第 ${index + 1} 条的 score 必须是有限数值，已忽略`)
      return
    }
    const compiled = compileExpression(when)
    if (!compiled.program) {
      out.warnings.push(`score-rules 第 ${index + 1} 条的表达式编译失败（${compiled.error}），已忽略`)
      return
    }
    out.rules.push({
      index,
      source: when,
      program: compiled.program,
      score,
      deps: compiled.deps,
      dynamic: compiled.dynamic,
    })
  })
  return out
}

/** 浮点累加归一（1e-6 取整）：避免二进制浮点残差进入展示 */
function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** 按当前答案求和；单条求值抛错按条件不成立处理 */
export function computeScore(
  rules: readonly CompiledScoreRule[],
  values: Record<string, unknown>,
): { score: number; failed: string[] } {
  let score = 0
  const failed: string[] = []
  for (const rule of rules) {
    let matched: boolean
    try {
      matched = evaluateCondition(rule.program, { values })
    } catch (error) {
      failed.push(`score-rules 第 ${rule.index + 1} 条求值失败（${String(error)}），已按不成立处理`)
      continue
    }
    if (matched) score += rule.score
  }
  return { score: tidy(score), failed }
}
