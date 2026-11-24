/**
 * 步骤逻辑引擎（`when` / `goto`）——复用 schema-form 的受限表达式轨，不复制 parser。
 *
 * 语义：
 * - `when`：步骤级条件表达式；求值为假 → 该步自动隐藏（头部 / 进度 / 导航 / 取值 / 校验
 *   一律按隐藏处理）。**与宿主手动 `hidden` 正交**：`hidden: true` 恒隐藏（宿主优先），
 *   缺省或 `false` 时才由条件决定；引擎关闭（`conditions="false"`）时 `when` 完全失效。
 * - `goto`：前进时的跳转目标——条件成立则直接跳到 `target`（索引或步骤 key）。条件缺省
 *   视为恒成立；`target` 等于当前步时忽略（防自环）。
 * - 表达式求值失败（未知字段读取得到 `undefined`、宿主函数抛错）按「条件不成立」处理并
 *   返回告警文案，由组件一次性 devWarn —— 不静默通过、也不抛断渲染。
 *
 * 依赖跟踪：编译期从表达式静态收集依赖路径（`deps`），作答变化时用
 * `pathDependencyMatches` 判定哪些条件受影响（复用 schema-form 联动同一套路径判定，
 * 通配与数组重编号口径一致）。使用宿主注册函数（`registerExprFunction`）的表达式无静态
 * 依赖面，按 `dynamic` 全量重算。
 *
 * 本模块是纯函数（无 DOM / 无状态），依赖判定与编译结果均可单测。
 */
import { compileExpression, evaluateCondition, type ExprProgram } from '../schema-form/expr/index.js'
import { canonicalDslPath, pathDependencyMatches } from '../schema-form/compiler/path.js'

/** 步骤跳转规则（`goto` 归一后的对象形态） */
export interface StepGoto {
  /** 条件表达式（缺省 = 恒成立） */
  when?: string
  /** 目标步：0 起索引，或步骤 key */
  target: number | string
}

/** 引擎输入面：只需要读步骤的 key / when / goto（不依赖组件类，避免循环导入） */
export interface StepLogicInput {
  key?: string
  when?: string
  /** 跳转目标：对象形态或 `number` / 步骤 key 简写（简写 = 条件恒成立） */
  goto?: StepGoto | number | string
}

/** 已编译的 `when` 条件 */
export interface CompiledWhen {
  index: number
  source: string
  program: ExprProgram
  deps: string[]
  dynamic: boolean
}

/** 已编译的 `goto` 规则 */
export interface CompiledGoto {
  index: number
  target: number | string
  source: string
  /** null = 无条件（恒成立） */
  program: ExprProgram | null
  deps: string[]
  dynamic: boolean
}

export interface CompiledStepLogic {
  when: CompiledWhen[]
  goto: CompiledGoto[]
  /** 编译期告警（组件一次性 devWarn） */
  warnings: string[]
}

/** 依赖判定输入（when / goto 统一口径） */
export interface DependencyClause {
  index: number
  deps: string[]
  dynamic: boolean
}

/**
 * 编译步骤逻辑。
 * - `enabled === false`（`conditions="false"`）时直接返回空逻辑（引擎关闭，零编译）；
 * - 单条表达式编译失败只降级该条（`when` 降级 = 条件不生效 = 步骤可见；`goto` 降级 = 不跳转），
 *   不影响其它步骤，消除「一处语法错连坐整份问卷」。
 */
export function compileStepLogic(steps: readonly StepLogicInput[], enabled = true): CompiledStepLogic {
  const out: CompiledStepLogic = { when: [], goto: [], warnings: [] }
  if (!enabled) return out
  steps.forEach((step, index) => {
    if (!step || typeof step !== 'object') return
    if (step.when !== undefined) {
      if (typeof step.when !== 'string' || step.when.trim() === '') {
        out.warnings.push(`第 ${index + 1} 步的 when 必须是非空表达式字符串，已忽略`)
      } else {
        const compiled = compileExpression(step.when)
        if (!compiled.program) {
          out.warnings.push(`第 ${index + 1} 步的 when 表达式编译失败（${compiled.error}），已按条件不生效处理`)
        } else {
          out.when.push({
            index,
            source: step.when,
            program: compiled.program,
            deps: compiled.deps,
            dynamic: compiled.dynamic,
          })
        }
      }
    }
    const goto = normalizeGoto(step.goto)
    if (goto === undefined) return
    if (goto === null) {
      out.warnings.push(`第 ${index + 1} 步的 goto 形态非法（需要 { when?, target } 或索引 / 步骤 key），已忽略`)
      return
    }
    if (goto.when === undefined) {
      out.goto.push({ index, target: goto.target, source: '', program: null, deps: [], dynamic: false })
      return
    }
    const compiled = compileExpression(goto.when)
    if (!compiled.program) {
      out.warnings.push(`第 ${index + 1} 步的 goto.when 表达式编译失败（${compiled.error}），已按条件不成立处理`)
      return
    }
    out.goto.push({
      index,
      target: goto.target,
      source: goto.when,
      program: compiled.program,
      deps: compiled.deps,
      dynamic: compiled.dynamic,
    })
  })
  return out
}

/** `goto` 归一：对象形态校验 target；`number` / 非空字符串视为「无条件跳转」简写 */
function normalizeGoto(raw: StepLogicInput['goto']): StepGoto | null | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number') return Number.isFinite(raw) ? { target: raw } : null
  if (typeof raw === 'string') return raw.trim() === '' ? null : { target: raw.trim() }
  if (typeof raw === 'object') {
    const target = (raw as StepGoto).target
    const valid =
      typeof target === 'number' ? Number.isFinite(target) : typeof target === 'string' && target.trim() !== ''
    if (!valid) return null
    const when = (raw as StepGoto).when
    if (when === undefined) return { target }
    if (typeof when !== 'string' || when.trim() === '') return null
    return { target, when }
  }
  return null
}

/**
 * 依赖命中（值变化 → 需要重算的条件索引）：
 * - 变化路径无法归一（空 / 非法）→ 全部条件重算（保守回退）；
 * - 宿主函数轨（`dynamic`）无静态依赖面 → 恒重算；
 * - 其余按 `pathDependencyMatches`（互为前缀 + 通配，与 schema-form 联动同一判据）；
 * - 常量表达式（无依赖、非 dynamic）不受任何值变化影响。
 */
export function affectedSteps(clauses: readonly DependencyClause[], changedPath: string): number[] {
  const canonical = canonicalDslPath(changedPath)
  if (canonical === null) return [...new Set(clauses.map((clause) => clause.index))]
  const out = new Set<number>()
  for (const clause of clauses) {
    if (clause.dynamic) {
      out.add(clause.index)
      continue
    }
    if (clause.deps.some((dep) => pathDependencyMatches(dep, canonical))) out.add(clause.index)
  }
  return [...out]
}

/** 单条条件求值（异常按「不成立」处理，返回 `{ value, error }`） */
export function testCondition(
  clause: { program: ExprProgram },
  values: Record<string, unknown>,
  self?: unknown,
): { value: boolean; error: string | null } {
  try {
    return { value: evaluateCondition(clause.program, { values, self }), error: null }
  } catch (error) {
    return { value: false, error: String(error) }
  }
}
