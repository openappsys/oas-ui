/**
 * oas-gantt 类型：数据契约（公开 export 类型，经 oas-gantt.ts re-export 保持导入面稳定）
 * + 组件内部结构类型（TG / GanttRow / TimeUnit / GanttMajorGroup / DragMode / DragCtx /
 * DatedConstraint）。纯类型模块，零运行时（从 oas-gantt.ts 机械迁移，零行为变更）。
 */
/** 甘特任务（数据契约：扁平 `parent` 指针为主；嵌套 `children` 输入在清洗层自动拍平兼容） */
/** gantt 资源日历（逐资源工作日/假期/班次）；只影响 auto-schedule 的工作日吸附 */
export interface GanttResource {
  id: string
  name?: string
  /** 工作日（0=周日…6=周六）；缺省沿用全局 workdays，[] 表示不可用 */
  workdays?: number[]
  /** 资源假期（YYYY-MM-DD）；与全局 holidays 取并集 */
  holidays?: string[]
  /** 班次窗口（小时级展示/宿主排程使用；空数组表示该资源不可用） */
  shifts?: Array<{ start: string; end: string }>
}

export interface GanttTask {
  id?: string
  /** 任务名（必填，缺失丢弃） */
  name: string
  /** 开始 'YYYY-MM-DD'（hour 档支持 'YYYY-MM-DD HH:mm'） */
  start: string
  /** 结束；缺省 = 里程碑（单点） */
  end?: string
  /** 类型；缺省推导：有子 = summary、无 end = milestone、其余 task */
  type?: 'task' | 'milestone' | 'summary'
  /** 进度 0-100（越界 clamp；缺省 0） */
  progress?: number
  /** 父任务 id（扁平指针；悬空按根渲染并告警一次） */
  parent?: string
  /** 嵌套子任务（兼容输入通道；清洗层拍平为 parent 指针） */
  children?: GanttTask[]
  /** 依赖（id 指向其他任务；type 缺省 fs） */
  dependencies?: GanttDependency[]
  /**
   * 条色覆盖（走 CSS 变量解析，写入条元素 `--oas-gantt-bar-color`）：只作用于**普通任务条**底色
   * 与其进度/进度手柄（bar-progress 同步取该 token）。milestone 走 `--oas-gantt-milestone-color`
   * 语义色、summary 走 `--oas-gantt-summary-bg` 语义色，均不受 task.color 影响（形态色即语义，
   * 不随单任务数据漂移）。
   */
  color?: string
  /**
   * 排程约束模式（opt-in；缺省 = 无约束，排程行为与旧版一致）：
   * - asap  越早越好（等同无约束，清洗层直接丢弃）
   * - snet  不早于 constraintDate（start ≥ 约束日，只前推不提前）
   * - mso   固定于 constraintDate（依赖不得前推；数据偏离约束日时由排程拉回）
   * - fnlt  不晚于 constraintDate（不自动移动，仅参与违约判定 → `.conflict`）
   * snet/mso/fnlt 必须携带合法 constraintDate，否则整体丢弃并告警一次。
   */
  constraint?: 'asap' | 'snet' | 'mso' | 'fnlt'
  /** 约束日期 'YYYY-MM-DD'（hour 档可带 'HH:mm'）；缺失/非法时约束整体丢弃 */
  constraintDate?: string
  /** 任务级禁拖 / 禁改自身（时间/进度/顺序/被依赖写入）；可作他任务前置与重排前/后同级目标 */
  disabled?: boolean
  /** summary 初始展开（缺省全展开，显式 false 为收起例外；expanded 属性受控优先——见 effectiveExpandedSet） */
  expanded?: boolean
  /** 所属项目键（配合 group-by-project 自动生成项目根摘要） */
  project?: string
  /** 分配的 gantt 资源 id（配合 resources 属性使用逐资源工作日/假期） */
  resources?: string[]
  /** 截止日（'YYYY-MM-DD'；hour 档可带时刻）；结束晚于截止日时标 .conflict 并渲染截止标记 */
  deadline?: string
  /** 多个截止日（可选；与 deadline 合并，去重并只保留合法日期） */
  deadlines?: string[]
  /** 基线计划（对比用；由宿主保存，组件只读）：start 必填；end 缺省 = 单点；progress 为基线进度 0-100。
   *  等价于 `baselines: [{ id: 'default', ... }]` 的单条写法（清洗层归一，不 deprecate）；
   *  两通道并存时 `baselines` 优先 */
  baseline?: { start: string; end?: string; progress?: number }
  /**
   * 多基线（opt-in 数据扩展）：清洗层逐条校验（id 必填非空、start 必填合法、end/progress 非法丢弃），
   * 全部无效时整组不落；单 `baseline` 字段会归一为 `[{ id: 'default', ...baseline }]`。
   * 渲染取数走 `baseline-id` 属性（缺省第一条）。
   */
  baselines?: GanttBaseline[]
  /**
   * 工时估算（单位：天，可为小数如 2.5；**纯展示数据**，不参与排程/布局/依赖计算）。
   * `show-effort` 开启时在行标签区右列显示；缺失/非有限显示空。索引签名本已允许透传，
   * 此处显式声明并纳入清洗层（非有限数值丢弃）。
   */
  effort?: number
  [key: string]: unknown
}

/** 多基线条目（show-baseline 渲染与 computeVariance 的取数来源；`baseline` 单字段归一为 id 'default'） */
export interface GanttBaseline {
  /** 基线 id（baselines 内唯一；缺失/空串该条丢弃） */
  id: string
  /** 基线开始 'YYYY-MM-DD'（hour 档可带时刻）；必填，非法整条丢弃 */
  start: string
  /** 基线结束；缺省 = 单点（= start） */
  end?: string
  /** 基线进度 0-100（越界 clamp；缺省不参与进度差） */
  progress?: number
}

/** 基线与当前排期的差值（日精度；正数 = 当前晚于基线/工期更长/进度更多） */
export interface GanttBaselineVariance {
  id: string
  /** 当前开始 − 基线开始（天） */
  startDelta: number
  /** 当前结束 − 基线结束（天） */
  endDelta: number
  /** 当前工期 − 基线工期（天） */
  durationDelta: number
  /** 当前进度 − 基线进度；基线未提供 progress 时为 null */
  progressDelta: number | null
}

/** 依赖关系 */
export interface GanttDependency {
  /** 被依赖任务 id（不存在则该线跳过） */
  id: string
  /** 依赖类型：fs 完成-开始（缺省）/ ss 开始-开始 / ff 完成-完成 / sf 开始-完成 */
  type?: 'fs' | 'ss' | 'ff' | 'sf'
  /** 滞后/提前（天）：正值为 lag（推迟后继），负值为 lead（提前/允许重叠）；缺省 0 */
  lag?: number
}

/** 时间刻度档 */
export type GanttScale = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

/** task-click / task-dblclick 事件载荷 */
export interface GanttTaskClickDetail {
  id: string
  task: GanttTask
}

/** task-change 事件载荷（拖拽/拉伸/键盘改期收口，含旧值） */
export interface GanttTaskChangeDetail {
  id: string
  task: GanttTask
  oldStart: string
  oldEnd: string
  start: string
  end: string
}

/** progress-change 事件载荷 */
export interface GanttProgressChangeDetail {
  id: string
  task: GanttTask
  progress: number
}

/** tasks-change 事件载荷 */
export interface GanttTasksChangeDetail {
  tasks: GanttTask[]
}

/** expand-change 事件载荷 */
export interface GanttExpandChangeDetail {
  id: string
  expanded: boolean
}

/** history-change 事件载荷（undo/redo 与每次可撤销提交后派发） */
export interface GanttHistoryChangeDetail {
  canUndo: boolean
  canRedo: boolean
  action: 'change' | 'undo' | 'redo' | 'clear'
}

/** scale-change 事件载荷 */
export interface GanttScaleChangeDetail {
  scale: GanttScale
}

/** task-render 事件载荷 */
export interface GanttTaskRenderDetail {
  task: GanttTask
  element: HTMLElement
}

/** reparent 事件载荷（行拖拽改父子 / 重排收口）：parent 为 null 表示根级，index 为同级序号 */
export interface GanttReparentDetail {
  id: string
  parent: string | null
  index: number
}

/** dependencies-change 事件载荷（连线拖拽建依赖 / 选中删除）：taskId 为依赖变化的后继任务 */
export interface GanttDependenciesChangeDetail {
  taskId: string
  dependencies: GanttDependency[]
}

/** selection-change 事件载荷（多选集合变化） */
export interface GanttSelectionChangeDetail {
  ids: string[]
}

/** task-add 事件载荷（命令式创作通道新增/复制任务收口）：id 为新任务 id，task 为快照 */
export interface GanttTaskAddDetail {
  id: string
  task: GanttTask
}

/** reschedule 事件载荷（auto-schedule 联动排程收口）：ids 为被联动改期的任务 id 列表 */
export interface GanttRescheduleDetail {
  ids: string[]
}

/**
 * 资源超配冲突对（pool 属性 opt-in 检测产物）：同资源两个任务的时间区间交叠 >0。
 * taskA / taskB 按任务在 tasks 输入序（taskA 在前）；交叠区间按日精度含端日期表达
 * （hour 档任务同样按日期输出——秒级精度交叠对甘特视图无展示意义）。
 *
 * 本通道只做**检测与视觉标注**（.conflict 复用违约视觉通道 + oas-resource-conflict 事件）；
 * 自动排程避让（整体后移受害者消除冲突）由组件 `levelConflicts()` 方法承载（手动触发，
 * 见 GanttLevelResult / GanttLevelDetail）；不做：资源泳道视图（group-by-resource 已承载
 * 资源分组）。负荷可视化（负荷桶条）由 `show-resource-load` 属性承载（shared/resource-load.ts
 * 同一份日桶口径，>100% 即交叠超配）。
 */
export interface GanttResourceConflict {
  /** 任务 A id（tasks 输入序在前） */
  taskA: string
  /** 任务 B id（tasks 输入序在后） */
  taskB: string
  /** 冲突资源 id（池内已登记） */
  resourceId: string
  /** 交叠首日 'YYYY-MM-DD'（含） */
  overlapStart: string
  /** 交叠末日 'YYYY-MM-DD'（含端） */
  overlapEnd: string
}

/** resource-conflict 事件载荷：conflicts 为全量冲突对快照（消解时为空数组） */
export interface GanttResourceConflictDetail {
  conflicts: GanttResourceConflict[]
}

/** ===== 超配自动排程避让（levelConflicts 方法 / gantt-level.ts 纯引擎共享契约）===== */

/** levelConflicts 的逐任务资源日历（与组件 taskCalendar 同构：days 为周几集合 0=周日…6=周六，null = 不限） */
export interface GanttLevelCalendar {
  /** 可工作周几集合（0=周日…6=周六，getDay 口径）；null = 不限制（全周可排）；空集 = 永不可排（该任务永不让位） */
  days: Set<number> | null
  /** 假期日期串集合（'YYYY-MM-DD'）；命中即非工作日（与 workdays 是否开启无关） */
  holidays: Set<string>
}

/** levelConflicts 选项 */
export interface GanttLevelOptions {
  /** 迭代上限（每次 +1 天平移或吸附推进各计一步）；缺省 500（对齐 resource levelResources），达上限 truncated:true */
  maxIter?: number
}

/** 避让移动的单任务终态（start/end 为写回就绪的数据串；hour 档任务保墙钟时刻） */
export interface GanttLevelMoved {
  id: string
  /** 终态开始 'YYYY-MM-DD'（hour 档 'YYYY-MM-DD HH:mm'） */
  start: string
  /** 终态结束（整日任务按日历日保工期推导；时间精度同步平移） */
  end: string
}

/** 避让后仍残留的冲突对（computeResourceConflicts 终检产物如实透传） */
export interface GanttLevelUnresolved {
  taskA: string
  taskB: string
  resourceId: string
}

/** 不参与避让的任务与原因（与检测同口径：里程碑 / summary / 池外资源） */
export interface GanttLevelSkipped {
  id: string
  /** summary=被 parent 指向（聚合形态无资源语义）；milestone=按点处理不触发；off-pool=引用的资源全部未登记；invalid-dates=日期非法/退化（end ≤ start） */
  reason: 'summary' | 'milestone' | 'off-pool' | 'invalid-dates'
}

/** levelConflicts 返回值（纯函数通道与组件方法共用） */
export interface GanttLevelResult {
  /** 被移动任务的终态（按 tasks 输入序；写回后就绪，组件内已应用，宿主纯函数通道自行写回） */
  moved: GanttLevelMoved[]
  /** 终检仍残留的冲突对（双侧永不让位 / 达 maxIter 截断时非空） */
  unresolved: GanttLevelUnresolved[]
  /** 达 maxIter 截断（预算用尽时尚未收敛；unresolved 配合如实反映残留） */
  truncated: boolean
  /** 不参与避让的任务（输入序；无资源引用的普通任务不在此列——检测同样静默忽略） */
  skipped: GanttLevelSkipped[]
}

/** level 事件载荷（组件 levelConflicts 应用前派发；detail 不含 skipped——那是返回值的事前诊断） */
export interface GanttLevelDetail {
  moved: GanttLevelMoved[]
  unresolved: GanttLevelUnresolved[]
  truncated: boolean
}

export type TG = GanttTask & { id: string }

export interface GanttRow {
  task: TG
  depth: number
  startMs: number
  endMs: number
  progress: number
  isSummary: boolean
  isMilestone: boolean
  hasChildren: boolean
  posinset: number
  setsize: number
}

export interface TimeUnit {
  startMs: number
  endMs: number
  major: string
  minor: string
}

/** 主刻度合并组（列区间 [startCol, endCol) 共用同一 major 标签） */
export interface GanttMajorGroup {
  startCol: number
  endCol: number
  label: string
}

export type DragMode = 'move' | 'resize-start' | 'resize-end' | 'progress'

export interface DragCtx {
  id: string
  mode: DragMode
  startX: number
  /** 拖拽起点时的横向滚动位置：自动滚动期间指针可静止，位移须叠加滚动增量，条才会随指针走 */
  startScrollLeft: number
  origStartMs: number
  origEndMs: number
  origProgress: number
  datetime: boolean
  touch: boolean
  bar: HTMLElement
  newStartMs?: number
  newEndMs?: number
  newProgress?: number
}

/** 需携带 constraintDate 方能生效的约束模式 */
export type DatedConstraint = 'snet' | 'mso' | 'fnlt'
