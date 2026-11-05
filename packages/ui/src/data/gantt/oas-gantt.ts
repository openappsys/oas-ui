import { OASElement } from '@oas-ui/core/oas-element'
import { parseJsonArray } from '../../shared/json-array.js'
import {
  formatToken,
  getWeekStart,
  isoWeek,
  parseISODate,
  resolveLocale,
  startOfDay,
  toISODate,
} from '../../form/calendar/date-grid.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'
// 服务端行窗口协议（windowed 模式）：与宿主交换行区间/时间范围的共享契约（类型 + 纯工具），
// 与 oas-table 同源同语义；emit 用字面量 'window-request' / 'range-request'（api:scan 解析锚点）
import {
  expandWindow,
  parseIsoDayMs,
  rangeCovered,
  readWindowedMode,
  sameWindow,
  windowCovered,
  WINDOW_MARGIN,
  ROW_WINDOW_EVENT,
  RANGE_WINDOW_EVENT,
  type RangeRequestDetail,
  type WindowRequestDetail,
  type WindowRequestReason,
} from '../../shared/window-data.js'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
// slot 模板双形态克隆（静态 HTML 在 template.content；Vue 等 CSR 直插元素 childNodes）
import { cloneSlotContent } from '../../shared/slot-template.js'
// 共享资源池（pool 属性 opt-in 时消费）：运行时 import 只带进 pool 纯数据结构模块（零组件/零 i18n），
// 与 oas-resource 的 helper 子路径共享同一份 globalThis 状态（写入互见）；ResourcePool 为值导入
// 仅供 resourcePool property 的 instanceof 校验（同模块，零 bundle 增量）
import { getSharedResourcePool, ResourcePool } from '../resource/pool/index.js'
// 资源负荷计算（show-resource-load 属性 opt-in 时消费）：本体居 shared/（纯函数零依赖），
// 与 `data/resource/load` Pro helper 入口共用同一份实现（见 shared/resource-load.ts 头注释）
import { computeResourceLoad } from '../../shared/resource-load.js'
import type { ResourceLoadResult } from '../../shared/resource-load.js'

/** 编译期一致性：emit 用的字面量（拼 `oas-` 前缀）须与共享契约常量一致 */
const _ROW_WINDOW_EVENT_CHECK: typeof ROW_WINDOW_EVENT = 'oas-window-request'
const _RANGE_WINDOW_EVENT_CHECK: typeof RANGE_WINDOW_EVENT = 'oas-range-request'
void _ROW_WINDOW_EVENT_CHECK
void _RANGE_WINDOW_EVENT_CHECK

// ===== 模块拆分（纯机械迁移，零行为 / 零公开 API 变更）=====
// - gantt-style.ts：STYLE 样式字符串（scoped CSS）
// - gantt-types.ts：数据契约类型 + 内部结构类型（纯类型，零运行时）
// - gantt-utils.ts：模块级纯函数与常量（清洗 / 日期数学 / 标签抽稀 / 基线 / 冲突 / 诊断）
// - gantt-helpers.ts：类方法抽出的无状态纯函数（本文件方法仅薄转发，调用点不变）
// 公开导入面经本文件 re-export 保持稳定（index.ts / ssr.ts / 子模块的导入路径不变）。
import { STYLE } from './gantt-style.js'
import type {
  DatedConstraint,
  DragCtx,
  DragMode,
  GanttBaseline,
  GanttDependenciesChangeDetail,
  GanttDependency,
  GanttExpandChangeDetail,
  GanttHistoryChangeDetail,
  GanttLevelDetail,
  GanttLevelOptions,
  GanttLevelResult,
  GanttMajorGroup,
  GanttProgressChangeDetail,
  GanttReparentDetail,
  GanttRescheduleDetail,
  GanttResource,
  GanttResourceConflict,
  GanttResourceConflictDetail,
  GanttRow,
  GanttScale,
  GanttScaleChangeDetail,
  GanttSelectionChangeDetail,
  GanttTask,
  GanttTaskAddDetail,
  GanttTaskChangeDetail,
  GanttTaskClickDetail,
  GanttTaskRenderDetail,
  GanttTasksChangeDetail,
  TG,
  TimeUnit,
} from './gantt-types.js'
import {
  DAY_MS,
  DEP_TYPES,
  MARQUEE_THRESHOLD,
  SCALES,
  SCALE_COL,
  SCALE_MIN_COL,
  SCALE_PAD_END,
  SCALE_PAD_START,
  SCALE_STRIDES,
  SNAP_MAX_DAYS,
  addLocalDays,
  buildMajorGroups,
  computeResourceConflicts,
  computeVariance,
  escId,
  formatEffortCell,
  ganttRenderDiag,
  localWallClockMs,
  parseTaskDate,
  parseWorkdays,
  pickVisibleLabels,
  sanitizeDeps,
  sanitizeLag,
  sanitizeTasks,
  stableStringify,
  taskBaselines,
} from './gantt-utils.js'
import {
  addUnits,
  canReparent,
  childStructure,
  constraintOf,
  criticalPathIds,
  deadlineConflictIds,
  dependencyCyclicNodes,
  endMsOfTask,
  fmtDay,
  fmtEnd,
  fmtIso,
  groupTasksByProject,
  groupTasksByResource,
  isDescendantOf,
  isInteractiveTarget,
  isWholeDayTask,
  linkType,
  loadBucketStartMs,
  loadUnit,
  majorLabel,
  minorLabel,
  plannedRatio,
  poolResourceText,
  shiftByDuration,
  shiftWindows,
  startMsOfTask,
  taskSnapshot,
  upPoint,
  writeBarSelectionState,
  writeRowSelectionState,
} from './gantt-helpers.js'
// 超配自动排程避让纯引擎（Z2）：判据与 computeResourceConflicts 同源，本文件仅薄封装
//（守卫 + 事件序 + updateTasks 应用），实现见 gantt-level.ts
import { levelGanttConflicts } from './gantt-level.js'

export {
  computeResourceConflicts,
  computeVariance,
  estimateLabelWidth,
  ganttRenderDiag,
  pickVisibleLabels,
  taskBaselines,
} from './gantt-utils.js'
export type {
  GanttBaseline,
  GanttBaselineVariance,
  GanttDependenciesChangeDetail,
  GanttDependency,
  GanttExpandChangeDetail,
  GanttHistoryChangeDetail,
  GanttLevelCalendar,
  GanttLevelDetail,
  GanttLevelMoved,
  GanttLevelOptions,
  GanttLevelResult,
  GanttLevelSkipped,
  GanttLevelUnresolved,
  GanttProgressChangeDetail,
  GanttReparentDetail,
  GanttRescheduleDetail,
  GanttResource,
  GanttResourceConflict,
  GanttResourceConflictDetail,
  GanttScale,
  GanttScaleChangeDetail,
  GanttSelectionChangeDetail,
  GanttTask,
  GanttTaskAddDetail,
  GanttTaskChangeDetail,
  GanttTaskClickDetail,
  GanttTaskRenderDetail,
  GanttTasksChangeDetail,
} from './gantt-types.js'

export class OASGantt extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'tasks',
      'scale',
      'expanded',
      'readonly',
      'dates-readonly',
      'progress-readonly',
      'show-today',
      'weekends',
      'holidays',
      'workdays',
      'resources',
      'first-day-of-week',
      'locale',
      'height',
      'row-height',
      'label-position',
      'snap',
      'show-baseline',
      'show-variance',
      'show-float',
      'history',
      'creatable',
      'auto-schedule',
      'show-critical-path',
      // 行斑马纹开关（opt-in，默认关）
      'stripe',
      // 行 hover 底色（默认开；hover="false" 关闭）
      'hover',
      'group-by-project',
      'group-by-resource',
      // 资源池模式（opt-in，默认关）：池驱动资源展示（tooltip 名称/费率）+ 跨任务超配检测
      'pool',
      // 二期 opt-in 扩展（全部默认关：show-effort 工时列 / show-status-line 进度线 +
      // status-date 基准日 / baseline-id 多基线选择——数据通道 baselines 无属性默认取第一条）
      'show-effort',
      'show-status-line',
      'status-date',
      'baseline-id',
      // 资源负荷面板（opt-in，默认关）：图表下方按时间轴对齐的负荷桶条（>100% 走 danger 通道）
      'show-resource-load',
      // windowed（服务端行窗口模式）+ 宿主托管时间范围（契约见 shared/window-data.ts）
      'windowed',
      'total',
      'window-start',
      'range-start',
      'range-end',
    ]
  }

  private _tasks: TG[] = []
  private tasksAttrCache = ''
  /**
   * 组件内部正在写 `tasks` 属性（syncTasksAttr 在场）：属性通道会**同步**触发一次全量 update
   * （基类 attributeChangedCallback），置位期间嵌套 update 末尾的 reschedule 据此判定「外层提交口
   * 稍后会统一派发 oas-tasks-change」→ 跳过自己的 emitTasksChange，保证一次用户操作只发一次
   * oas-tasks-change（属性通道直接改数据 / 运行期开启 auto-schedule 等无外层提交的触发不置位，
   * reschedule 照常补发）。嵌套写回（update 内 reschedule 再 syncTasksAttr）经 prev 恢复语义正确。
   */
  private inInternalWrite = false
  private nextId = 1
  private undoStack: GanttTask[][] = []
  private redoStack: GanttTask[][] = []
  private lastTasksSnapshot: GanttTask[] = []
  private lastTasksSignature = ''
  private historyRestoring = false
  /** `tasks` setter 收到语义相同的受控回写：commitTasks 只刷新基线，不记伪提交 */
  private historyEcho = false
  private readonly historyLimit = 100
  private expandedAttrCache = ''
  /** 展开集合：null = 未受控（数据 expanded 初始化）；expanded 属性出现后受控 */
  private expandedSet: Set<string> | null = null
  private units: TimeUnit[] = []
  /** 主刻度合并组（buildMajorGroups 产物，与 units 同生命周期重建）：renderHeader 窗口切片数据源 */
  private majorGroups: GanttMajorGroup[] = []
  private rows: GanttRow[] = []
  /** rows 的 id → 下标索引（buildRows 末尾重建，见 rebuildRowIndex）：选择路径 O(1) 定位，替代 O(总量) 扫描 */
  private rowIndexById = new Map<string, number>()
  private canvasW = 0
  private lastScale = ''
  private warnedParents = new Set<string>()
  /** 清洗层数据自愈告警去重（key = 任务 id） */
  private warnedSanitize = new Set<string>()
  /** 显式 milestone 与 end/子级并存的数据矛盾告警去重（key = `${id}:${kind}`） */
  private warnedMilestones = new Set<string>()
  private warnedRescheduleCycle = false
  /** 工作日日历缓存（key = workdays + holidays 原文；属性变化即重建） */
  private workCalCache: { key: string; days: Set<number> | null; holidays: Set<string> } | null = null
  /** resources 属性缓存（逐资源日历） */
  private resourceCalCache: { raw: string; map: Map<string, GanttResource> } | null = null
  /** holidays 属性解析缓存（key = 属性原文）：renderGrid 每帧读取，不落缓存会在滚动帧内反复 JSON.parse；属性原文变化即失效，语义与逐次解析一致 */
  private holidayCache: { raw: string; set: Set<string> } | null = null
  /**
   * 辅刻度抽稀可见集缓存（units 引用 + scale + colW 为键）：抽稀决策依赖**全列**标签估宽
   * （如 week 档 W1..W53 宽度不均，窗口切片可能不含最宽标签），先锁全列决策、窗口只取段——
   * 与逐帧全量计算逐像素一致；横向滚动每帧重渲染表头时免去全列 map + 估宽扫描
   */
  private visibleMinorCache: { units: TimeUnit[]; scale: GanttScale; colW: number; set: Set<number> } | null = null
  /** 关键路径任务 id 集合（show-critical-path 开启时计算；关闭为空集，渲染零影响） */
  private criticalIds = new Set<string>()
  private conflictIds = new Set<string>()
  /** pool 模式资源超配冲突对（update 重算；并入 conflictIds 走 .conflict 视觉通道） */
  private resourceConflicts: GanttResourceConflict[] = []
  /** oas-resource-conflict 幂等签名（上次派发的 stableStringify；null = 从未派发）——同一快照不重复派发 */
  private lastConflictSig: string | null = null
  /** windowed 下超配检测跳过告警（实例级一次） */
  private warnedPoolWindowed = false
  /** levelConflicts 守卫告警去重（pool 关 / windowed / 只读，各实例级一次） */
  private warnedLevelNoPool = false
  private warnedLevelWindowed = false
  private warnedLevelReadonly = false
  /** 资源并发超限（>2 任务同资源同时段）devWarn（实例级一次，不逐资源/逐 update 刷屏） */
  private warnedPoolOverCapacity = false
  /** show-float 开启时的总浮时/自由浮时（ms，仅叶子/里程碑；摘要不参与 CPM） */
  private totalFloatMs = new Map<string, number>()
  private freeFloatMs = new Map<string, number>()
  /** buildRows 产物缓存：渲染窗口（滚动每帧）复用，避免万级任务下每帧重建展开集 */
  private expandedSetCache: Set<string> | null = null
  /** 自适应列宽（px）：视口可用宽度内铺下整个窗口时收窄至恰好适配；null = 回落各档基准列宽（无布局环境） */
  private displayColW: number | null = null
  /** 上次 onViewportResize 读到的视口宽：列窗口重算的判据之一（长跨度下列宽被钳位不变，但视口可变宽） */
  private lastViewportW = -1
  /** 上次 onViewportResize 读到的视口高：行窗口重算的判据之一（容器变高须补行窗口，否则底部露白到滚动才补） */
  private lastViewportH = -1
  /**
   * 本实例是否写过 `--oas-gantt-height`（height 属性在场期间由组件接管该自定义属性；与 oas-resource 同协议）。
   * 仅布尔「是否写过」：从未写过（宿主自己内联设 token、无 height 属性）→ 组件绝不动它；
   * 写过又随属性移除 → removeProperty 归零（DSD 快照自写值同样只可能来自「属性当时在场」，移除后必清）。
   * 非法值（属性在场但非 >0 纯数字 / Npx）：不写变量、仅清本实例自写值，宿主 token 不受影响。
   */
  private heightApplied = false
  /**
   * 本实例是否写过 `--oas-gantt-row-height`（与 heightApplied 同协议）。
   * row-height 属性在场且合法（纯数字 ≥20，与 rowHeightPx() 同口径；px 后缀对 row-height 非法）
   * 时组件接管该 token——.row-name 高度即 var(--oas-gantt-row-height)，与网格行高同源，
   * 否则行名高度恒为 CSS 缺省 36px，row-height≠36 时行名与条/条纹错位（每行叠 4px）。
   */
  private rowHeightApplied = false
  private resizeObs: ResizeObserver | null = null
  private dragCtx: DragCtx | null = null
  private reparentCtx: { id: string; byId: Map<string, TG> } | null = null
  private reparentTarget: { id: string; mode: 'before' | 'after' | 'inside' } | null = null
  private dropLineEl: HTMLElement | null = null
  private linkCtx: {
    sourceId: string
    endpoint: 'start' | 'end'
    sx: number
    sy: number
    temp: SVGPathElement
  } | null = null
  private selectedLink: { successor: string; predecessor: string; type: string } | null = null
  private selected = new Set<string>()
  private selectionAnchor: string | null = null
  private renaming = false
  private rowPending: {
    id: string
    x: number
    y: number
    disabled: boolean
    viaHandle: boolean
    /** 起手在任务名文本内：点击仍选中行，拖动交给浏览器做文本选择，不进入重排 */
    textTarget: boolean
    byId: Map<string, TG>
  } | null = null
  /** 空白框选手势（行带 rows / 条相交 bars）：记录起止点与追加语义 */
  private marqueeCtx: {
    kind: 'rows' | 'bars'
    x0: number
    y0: number
    x1: number
    y1: number
    moved: boolean
    additive: boolean
    touch: boolean
  } | null = null
  /** 时间轴空白拖拽建任务手势（creatable 且非只读） */
  private createCtx: { x0: number; y0: number; x1: number; y1: number; moved: boolean; touch: boolean } | null = null
  private marqueeEl: HTMLElement | null = null
  private ganttEl: HTMLElement | null = null
  private activeRowId: string | null = null
  private touchActiveId: string | null = null
  private coarse = false
  private autoScrollRaf = 0
  private autoScrolling = false
  private pointerX = 0
  private pointerY = 0
  private tbody: HTMLElement | null = null
  private theadEl: HTMLElement | null = null
  private sideBody: HTMLElement | null = null
  private sideRows: HTMLElement | null = null
  private barsEl: HTMLElement | null = null
  private linksEl: SVGSVGElement | null = null
  private gridEl: HTMLElement | null = null
  /** 行斑马纹容器（stripe 属性懒创建；render() 重建 innerHTML 后由 renderStripes 的 isConnected 检查自愈） */
  private stripeCanvasEl: HTMLElement | null = null
  /** 行 hover（hover 属性，默认开）：hover 行任务 id（行名/任务条 pointerover 驱动），
   *  时间轴侧由单元素 .row-hover 装饰层跟随（绝对行号定位，虚拟滚动窗口内重建） */
  private hoverKey: string | null = null
  private hoverEl: HTMLElement | null = null
  private innerEl: HTMLElement | null = null
  private todayEl: HTMLElement | null = null
  /** 状态线节点（show-status-line opt-in）：模板常驻 + hidden 控制，开关切换不重建 shadow */
  private statusLineEl: HTMLElement | null = null
  private tooltipEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  /** 资源负荷面板（show-resource-load opt-in；模板常驻 + hidden 控制，开关切换不重建 shadow） */
  private loadPanelEl: HTMLElement | null = null
  /** 负荷计算缓存（签名 = tasks JSON + 粒度/周起/轴区间/池开关与版本）：数据/轴/池变化才重算 */
  private loadCache: { sig: string; result: ResourceLoadResult } | null = null
  /** 宿主注入的资源池实例（resourcePool property，实例隔离通道）：null = 走共享单例（默认） */
  private poolOverride: ResourcePool | null = null
  /** windowed 下负荷渲染跳过告警（实例级一次；对齐 pool 超配检测的 windowed 口径） */
  private warnedLoadWindowed = false
  private winStart = 0
  private winEnd = 0
  /** 横向列窗口 [winColStart, winColEnd)（时间轴列虚拟化，全局列索引；由 computeColWindow 维护） */
  private winColStart = 0
  private winColEnd = 0
  /** onScroll 窗口重建合帧句柄（rAF 节流：同一帧内多次 scroll 只重建一次窗口） */
  private scrollRaf = 0
  /** 合帧重建后是否需 reconcile 拖拽（该帧内至少一次自动滚动触发的 scroll） */
  private scrollRafReconcile = false
  /**
   * windowed 模式解析结果（update() 内 syncTasks 之后重算）：
   * windowed 属性在场且 total 为合法正数才生效（否则回落本地全量模式，行为不变）。
   */
  private _winMode: ReturnType<typeof readWindowedMode> = readWindowedMode(false, 0, 0, 0)
  /** 行窗口请求去重状态（同一期望区间不重复派发；被已装载区间覆盖时重置，之后覆盖情况变化可对同一区间再派） */
  private winReq: { start: number; end: number } | null = null
  /** 首帧行请求标记（init vs data 原因区分；退出 windowed 时重置） */
  private winInitDone = false
  /** range 请求去重状态（语义同行窗口去重，坐标系为 epoch ms） */
  private rangeReq: { startMs: number; endMs: number } | null = null
  /** 首帧 range 请求标记（init vs data 原因区分） */
  private rangeInitDone = false
  /** windowed 下禁用的跨全量能力告警去重（auto-schedule / 关键路径 / 缺 range-* / 层级切片 / 行重排各一次） */
  private warnedWindowedSchedule = false
  private warnedWindowedCritical = false
  private warnedWindowedRange = false
  private warnedWindowedFlat = false
  private warnedWindowedReparent = false
  /** windowed 切片越界（window-start + 装载行数 > total）告警去重（实例级一次） */
  private warnedWindowedOverflow = false
  /** auto-schedule 遇到空日历（shifts: [] / workdays 交集为空）不可排程告警（实例级一次，不逐任务刷屏） */
  private warnedUnschedulable = false

  /** windowed 下行重排禁用告警（一次）：切片内同级 index 对全量无意义，重排由宿主在全量上处理 */
  private warnWindowedReparent(): void {
    if (this.warnedWindowedReparent) return
    this.warnedWindowedReparent = true
    devWarn(
      '[oas-gantt] windowed 模式下行重排（拖拽 / Alt+方向键）已禁用：行序 index 是切片内同级序号，对全量无意义；重排请在宿主侧全量数据上处理',
    )
  }

  /**
   * @apiProperty 甘特任务（公开读/写通道）：读为数组拷贝（含自动分配的 id，嵌套输入已拍平为
   * parent 指针）；写为程序性赋值（序列化进受控 `tasks` 属性并重渲染、派发 oas-tasks-change）。
   */
  get tasks(): GanttTask[] {
    return this._tasks.map((t) => {
      const copy: GanttTask = { ...t }
      if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
      if (copy.baseline) copy.baseline = { ...copy.baseline }
      if (copy.baselines) copy.baselines = copy.baselines.map((b) => ({ ...b }))
      if (copy.deadlines) copy.deadlines = [...copy.deadlines]
      delete copy.children
      return copy
    })
  }
  set tasks(v: GanttTask[]) {
    const next = sanitizeTasks(
      parseJsonArray<GanttTask>(v as unknown),
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    // 受控回写与当前数据语义相同（键序 / undefined 差异不算变化）：不清历史、也不记伪提交
    // （宿主常把 oas-tasks-change 的 tasks 原样写回；旧实现无条件重置，导致 ⌘Z 被一次回写清空）
    this.historyEcho = this.sameTasks(next)
    this._tasks = next
    if (!this.historyEcho) {
      // 外部整体重写视为新基线：清空历史，避免撤销回宿主不认识的旧数据
      // （须在赋值之后调用：resetHistoryState 以当前 tasks 重建签名，否则 commitTasks 会把本次重写记成一次提交）
      this.resetHistoryState()
    }
    // 外部整体重写：收敛幽灵选中/锚点/活动/揭示态由 update() 统一处理（property 与 attribute 一致）；
    // 写回走 commitTasks 单通道（syncTasksAttr 的属性通道已触发一次全量 update，不再手动 update）
    this.commitTasks()
  }

  /** 语义判等：两边都走清洗结果，忽略键序 / undefined 差异（同 scheduler sameEvents 口径） */
  private sameTasks(next: TG[]): boolean {
    return stableStringify(this._tasks) === stableStringify(next)
  }

  /** 按 id 单条增量更新（浅合并 patch 后走 sanitize 清洗；找不到或非法 patch 返回 false） */
  updateTask(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    // 非法 end（非空串且解析失败）显式拒绝：否则清洗层静默丢弃 end，task 会被悄悄降级成 milestone
    if (patch.end !== undefined && patch.end !== '' && !parseTaskDate(patch.end)) return false
    // patch.children 契约告警：清洗层会把 children 拍平，但这里只取单条清洗结果——patch 携带的
    // 子条目被静默丢弃。数据契约以扁平 parent 指针为准，不支持 patch children（告警一次防宿主误用）。
    if (patch.children !== undefined)
      this.warnOnce(
        `patch-children:${id}`,
        '[oas-gantt] updateTask 的 patch.children 已忽略（数据契约以扁平 parent 指针为准，不支持 patch children；层级请改用 parent 指针或整体重写 tasks）',
      )
    const merged = { ...this._tasks[idx]!, ...patch, id }
    const [clean] = sanitizeTasks(
      [merged],
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    if (!clean) return false
    clean.id = id
    this._tasks = [...this._tasks.slice(0, idx), clean, ...this._tasks.slice(idx + 1)]
    this.commitTasks()
    return true
  }

  /** 滚动到指定任务行（虚拟滚动下委托内部视口，目标行垂直居中）；找不到为空操作。
   *  命名避开 DOM 内建 Element.scrollTo（签名不兼容会崩宿主 property 通道，同 prefix/blur 先例）。
   *  windowed 边界：组件只持有已装载切片，rowIndexById 只含切片内任务——目标未装载时静默 no-op
   *  （宿主应先按 oas-window-request 回填窗口再调用）；定位坐标按绝对行号（absRowTop），
   *  切片内命中即正确，无需宿主换算。 */
  scrollToTask(id: string): void {
    // 重建窗口会清 bars/links，先终止进行中的拖拽/重排/连线，防陈旧锚点
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    const idx = this.rowIndexById.get(id) ?? -1
    if (idx < 0 || !this.tbody) return
    const vh = this.viewportH()
    this.tbody.scrollTop = Math.max(0, this.absRowTop(idx) - vh / 2 + this.rowHeightPx() / 2)
    this.renderWindow()
  }

  /** 滚动到指定日期（水平居中）；非法日期忽略。RTL 走真实浏览器 scrollLeft 负值模型
   *  （0 在画布最右、向左滚为负；-maxScroll 为最左）——LTR 正值公式在 RTL 下会把视口
   *  钉在画布左端（与时间轴镜像方向相反），目标永远落不在视口内。
   *  末尾同步 renderWindow() + syncHeaderOffset()：命令式滚动（含 scrollToToday）返回即已
   *  渲染目标列窗口**且表头偏移已同步**，不等异步 scroll → rAF 合帧（与 oas-resource 同口径，
   *  消 1 帧滞后）——表头 transform 只在 onScroll 里更新，漏同步会错位一帧（错位量 = 整段
   *  滚动位移）；用户滚动路径仍走 onScroll 的 rAF 合帧（同帧多次滚动只重建一次，不因本改动退化） */
  scrollToDate(date: string): void {
    const d = parseTaskDate(date)
    if (!d || !this.tbody) return
    const p = this.mirrorX(this.xOf(d.getTime()))
    const half = this.tbody.clientWidth / 2
    if (isRtl(this)) {
      const maxScroll = Math.max(0, this.tbody.scrollWidth - this.tbody.clientWidth)
      // 视口左缘 L 钳在 [0, maxScroll]，scrollLeft = L − maxScroll ∈ [−maxScroll, 0]
      const left = Math.min(Math.max(p - half, 0), maxScroll)
      this.tbody.scrollLeft = left - maxScroll
    } else {
      this.tbody.scrollLeft = Math.max(0, p - half)
    }
    this.renderWindow()
    this.syncHeaderOffset()
  }

  /** 滚动到今天 */
  scrollToToday(): void {
    this.scrollToDate(toISODate(new Date()))
  }

  private allocId(used: Set<string>): string {
    let id = `gt${this.nextId++}`
    while (used.has(id)) id = `gt${this.nextId++}`
    return id
  }

  /** 清洗层数据自愈告警（同 key 只告一次，防受控循环刷屏） */
  private warnOnce(key: string, msg: string): void {
    if (this.warnedSanitize.has(key)) return
    this.warnedSanitize.add(key)
    devWarn(msg)
  }

  /** milestone 数据矛盾告警（同任务同类型只告一次；key 含类型，形态变化时重新提示） */
  private warnMilestone(id: string, kind: string, msg: string): void {
    const key = `${id}:${kind}`
    if (this.warnedMilestones.has(key)) return
    this.warnedMilestones.add(key)
    devWarn(msg)
  }

  /**
   * 写回 `tasks` 属性（组件内部唯一写出口）。setAttribute 会**同步**触发基类
   * attributeChangedCallback → 一次全量 update()（属性通道），故调用方**不要再手动 update()**——
   * 旧实现 syncTasksAttr 后又手动 update 一次（双跑），auto-schedule 的 reschedule 内再
   * sync+update，一次拖拽全量重渲染 4 跑。事件由调用方在写回之后按各自契约派发。
   */
  private syncTasksAttr(): void {
    this.tasksAttrCache = JSON.stringify(this._tasks)
    const prev = this.inInternalWrite
    this.inInternalWrite = true
    try {
      this.setAttribute('tasks', this.tasksAttrCache)
    } finally {
      this.inInternalWrite = prev
    }
  }

  private emitTasksChange(): void {
    this.emit('tasks-change', { tasks: this.tasks } satisfies GanttTasksChangeDetail)
  }

  /** 当前任务快照（深拷贝依赖/基线/截止日数组） */
  private snapshotTasks(): GanttTask[] {
    return this.tasks
  }

  private resetHistoryState(): void {
    this.undoStack = []
    this.redoStack = []
    if (!this.historyOn()) {
      this.lastTasksSnapshot = []
      this.lastTasksSignature = ''
      return
    }
    this.lastTasksSnapshot = this.snapshotTasks()
    this.lastTasksSignature = JSON.stringify(this._tasks)
  }

  private emitHistoryChange(action: GanttHistoryChangeDetail['action']): void {
    this.emit('history-change', {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      action,
    } satisfies GanttHistoryChangeDetail)
  }

  /** 是否可撤销 */
  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** 是否可重做 */
  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** 撤销最近一次任务数据提交；返回是否实际撤销 */
  undo(): boolean {
    if (!this.historyOn()) return false
    const previous = this.undoStack.pop()
    if (!previous) return false
    this.redoStack.push(this.snapshotTasks())
    this.restoreTasksSnapshot(previous)
    this.emitHistoryChange('undo')
    return true
  }

  /** 重做最近一次撤销；返回是否实际重做 */
  redo(): boolean {
    if (!this.historyOn()) return false
    const next = this.redoStack.pop()
    if (!next) return false
    this.undoStack.push(this.snapshotTasks())
    this.restoreTasksSnapshot(next)
    this.emitHistoryChange('redo')
    return true
  }

  /** 清空撤销/重做历史（不改变当前任务） */
  clearHistory(): void {
    this.resetHistoryState()
    this.emitHistoryChange('clear')
  }

  private restoreTasksSnapshot(snapshot: GanttTask[]): void {
    this.historyRestoring = true
    try {
      this._tasks = snapshot.map((task) => {
        const copy: GanttTask = { ...task }
        if (copy.dependencies) copy.dependencies = copy.dependencies.map((d) => ({ ...d }))
        if (copy.baseline) copy.baseline = { ...copy.baseline }
        if (copy.baselines) copy.baselines = copy.baselines.map((b) => ({ ...b }))
        if (copy.deadlines) copy.deadlines = [...copy.deadlines]
        copy.id = task.id ?? ''
        return copy as TG
      })
      this.lastTasksSnapshot = this.snapshotTasks()
      this.lastTasksSignature = JSON.stringify(this._tasks)
      this.syncTasksAttr()
    } finally {
      this.historyRestoring = false
    }
    this.emitTasksChange()
  }

  /**
   * 创作通道统一写回出口：反射属性 + 重渲染 + 派发 oas-tasks-change（一次提交一次事件）。
   * 重渲染由 syncTasksAttr 的属性通道同步触发（一次全量 update），此处不再手动 update；
   * update 末尾 auto-schedule 的 reschedule 若联动改期，其 oas-tasks-change 被判别旗标抑制
   * （inInternalWrite），最终由本出口统一派发一次（含联动后的最终数据）。
   */
  private commitTasks(): void {
    const echo = this.historyEcho
    this.historyEcho = false
    if (this.historyOn() && !this.historyRestoring) {
      const signature = JSON.stringify(this._tasks)
      if (echo) {
        // 语义相同的受控回写：只刷新基线签名（键序可能变了），不追加撤销栈——
        // 否则一次等价回写会让 ⌘Z 撤到“看起来没变化”的重复快照
        this.lastTasksSnapshot = this.snapshotTasks()
        this.lastTasksSignature = signature
      } else {
        if (this.lastTasksSignature !== '' && signature !== this.lastTasksSignature) {
          this.undoStack.push(this.lastTasksSnapshot)
          if (this.undoStack.length > this.historyLimit) this.undoStack.shift()
          this.redoStack = []
          this.emitHistoryChange('change')
        }
        this.lastTasksSnapshot = this.snapshotTasks()
        this.lastTasksSignature = signature
      }
    }
    this.syncTasksAttr()
    this.emitTasksChange()
  }

  /** 让 id 的父级展开以显示新增子级：受控时补入 expanded 集合并回写属性；未受控时若该父级带
   *  数据级 `expanded:false`（显式收起）则置 true（否则新子级隐形、无重命名/聚焦反馈） */
  private ensureExpanded(id: string): void {
    if (this.expandedSet) {
      if (this.expandedSet.has(id)) return
      const next = new Set(this.expandedSet)
      next.add(id)
      this.expandedSet = next
      this.expandedAttrCache = JSON.stringify([...next])
      this.setAttribute('expanded', this.expandedAttrCache)
      return
    }
    const t = this._tasks.find((x) => x.id === id)
    if (t && t.expanded === false) t.expanded = true
  }

  private syncTasks(): void {
    const raw = this.getAttr('tasks', '')
    if (raw === this.tasksAttrCache) return
    this.tasksAttrCache = raw
    let parsed: unknown
    try {
      parsed = raw === '' ? [] : JSON.parse(raw)
    } catch {
      parsed = []
    }
    this._tasks = sanitizeTasks(
      parsed,
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    this.resetHistoryState()
  }

  /** expanded 属性同步（JSON 数组受控；属性缺席回落数据 expanded 初始集合） */
  private syncExpanded(): void {
    const raw = this.getAttr('expanded', '')
    if (raw === '') {
      if (this.expandedAttrCache !== '') {
        this.expandedAttrCache = ''
        this.expandedSet = null
      }
      return
    }
    if (raw === this.expandedAttrCache) return
    this.expandedAttrCache = raw
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = []
    }
    this.expandedSet = new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [])
  }

  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    if (own) return own
    return resolveLocale(this)
  }

  private scaleMode(): GanttScale {
    const raw = this.getAttr('scale', '')
    return (SCALES as string[]).includes(raw) ? (raw as GanttScale) : 'day'
  }

  private colW(): number {
    return this.displayColW ?? SCALE_COL[this.scaleMode()]
  }

  /**
   * 自适应列宽：窗口单位数 × 基准列宽超过视口可用宽时，收窄列宽让整个窗口尽量铺满
   * （下限为各档 SCALE_MIN_COL，防超大跨度被压成亚像素或标签无处安放；低于下限宁可行内滚动）；
   * 可用宽度不可得（happy-dom 等无布局环境）回落基准列宽。
   * 数据跨度小时任务不再被起始留白推挤到右缘、今日线/里程碑随之可见。
   */
  private computeColW(): void {
    const scale = this.scaleMode()
    const base = SCALE_COL[scale]
    const avail = this.tbody?.clientWidth ?? 0
    if (avail <= 0 || this.units.length === 0) {
      this.displayColW = null
      return
    }
    const fit = avail / this.units.length
    this.displayColW = Math.min(base, Math.max(SCALE_MIN_COL[scale], fit))
  }

  /**
   * 视口尺寸变化（含首次观测到真实宽/高）：列窗口重算不得只依赖自适应列宽变化——
   * 长跨度下 displayColW 被钳在 SCALE_MIN_COL 不动，容器变宽时列宽不变但视口变宽，
   * 只比较列宽会早退跳过 computeColWindow/表头重切片 → 时间轴右侧露白。
   * 容器变高同理：行窗口由视口高决定，只比较宽度会早退跳过 renderWindow → 底部露白
   * 直到滚动才补。改比较「视口宽 + 视口高 + displayColW」三快照，任一变化才重排重渲染
   * （RO 抖动下宽高均不变时仍零成本早退）。
   */
  private onViewportResize(): void {
    if (!this.tbody) return
    // 列宽重排会重建 bars 层：进行中的拖拽先终止（否则 ctx.bar 悬在脱离 DOM 的旧节点上，
    // 视觉断线且回滚落在死节点上）；吸附步进基准（snap=列宽）随之失效，取消是唯一一致路径
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    const w = this.tbody.clientWidth
    const h = this.tbody.clientHeight
    const beforeW = this.lastViewportW
    const beforeH = this.lastViewportH
    const beforeColW = this.displayColW
    this.lastViewportW = w
    this.lastViewportH = h
    this.computeColW()
    if (w === beforeW && h === beforeH && this.displayColW === beforeColW) return
    this.canvasW = this.units.length * this.colW()
    if (this.innerEl) this.innerEl.style.width = `${this.canvasW}px`
    this.computeColWindow()
    this.renderHeader()
    this.renderWindow()
    this.renderResourceLoad()
    this.requestWindowIfNeeded('resize')
    this.requestRangeIfNeeded('resize')
  }

  /** 行高（px）：方法名避开 row-height 属性的 camelCase（rowHeight）——同名会被宿主 property
   *  赋值遮蔽（实例自有属性覆盖原型方法），内部 this.rowHeightPx() 即抛 TypeError */
  private rowHeightPx(): number {
    const n = Number(this.getAttr('row-height', '36'))
    return Number.isFinite(n) && n >= 20 ? n : 36
  }

  /** height 属性原值：空串 / 纯空白（SFC 空绑定）视为**未设置** → null；其余返回 trim 后原值 */
  private heightAttrValue(): string | null {
    if (!this.hasAttr('height')) return null
    const raw = this.getAttr('height', '').trim()
    return raw === '' ? null : raw
  }

  /** height 像素值：接受纯数字或带 `px` 后缀；非法 / 缺失回落 320（= --oas-gantt-height token 缺省）。
   *  getAttr('height','320') 字面量同时是 api:scan 的 attr 默认值提取锚点，勿移除；
   *  viewportH() 在无布局环境（happy-dom）靠本兜底，fallback 语义保留 */
  private heightPx(): number {
    const raw = this.heightAttrValue()
    if (raw != null) {
      const n = Number(raw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) return n
    }
    const fallback = Number(this.getAttr('height', '320').replace(/px$/i, '').trim())
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 320
  }

  /** 条旁标签位置：缺省 none——行名列已承载名称，条旁再渲染同名文本属重复信息。
   *  方法名避开 label-position 属性的 camelCase（labelPosition），防 property 赋值遮蔽原型方法 */
  private labelPositionMode(): 'inside' | 'right' | 'left' | 'none' {
    const raw = this.getAttr('label-position', '')
    if (raw === 'inside' || raw === 'right' || raw === 'left') return raw
    return 'none'
  }

  private snapOn(): boolean {
    return this.getAttr('snap', '') !== 'false'
  }

  private baselineOn(): boolean {
    return this.hasAttr('show-baseline')
  }

  private varianceOn(): boolean {
    return this.hasAttr('show-variance') && this.getAttr('show-variance', '') !== 'false'
  }

  private historyOn(): boolean {
    return this.hasAttr('history') && this.getAttr('history', '') !== 'false'
  }

  private groupByProjectOn(): boolean {
    return this.hasAttr('group-by-project') && this.getAttr('group-by-project', '') !== 'false'
  }

  private groupByResourceOn(): boolean {
    return this.hasAttr('group-by-resource') && this.getAttr('group-by-resource', '') !== 'false'
  }

  private showFloatOn(): boolean {
    return this.hasAttr('show-float') && this.getAttr('show-float', '') !== 'false'
  }

  /** 依赖联动排程开关（缺省关）：属性存在即开；显式 "false" 视作关（防宿主布尔绑定取值意外开启） */
  private autoScheduleOn(): boolean {
    return this.hasAttr('auto-schedule') && this.getAttr('auto-schedule', '') !== 'false'
  }

  /** 关键路径开关（防宿主布尔绑定写成 show-critical-path="false" 仍开启，同 auto-schedule） */
  private showCriticalPathOn(): boolean {
    return this.hasAttr('show-critical-path') && this.getAttr('show-critical-path', '') !== 'false'
  }

  /** 行斑马纹开关（缺省关）：属性存在即开；显式 "false" 视作关（防宿主布尔绑定意外开启，同 auto-schedule） */
  private stripeOn(): boolean {
    return this.hasAttr('stripe') && this.getAttr('stripe', '') !== 'false'
  }

  /** 工时列开关（opt-in 缺省关；显式 "false" 视作关，同 stripe） */
  private effortOn(): boolean {
    return this.hasAttr('show-effort') && this.getAttr('show-effort', '') !== 'false'
  }

  /** 资源池开关（opt-in 缺省关；显式 "false" 视作关，同 stripe）：池驱动资源展示 + 跨任务超配检测 */
  private poolOn(): boolean {
    return this.hasAttr('pool') && this.getAttr('pool', '') !== 'false'
  }

  /**
   * 当前生效资源池（实例感知取池）：宿主经 resourcePool property 注入实例优先（实例隔离通道），
   * 缺省回落进程共享单例（getSharedResourcePool，向后兼容默认）。池的全部消费点
   * （tooltip 资源名 / 超配冲突 / 负荷面板）一律经本方法取池，禁止直呼 getSharedResourcePool。
   */
  private effectivePool(): ResourcePool {
    return this.poolOverride ?? getSharedResourcePool()
  }

  /** 资源负荷面板开关（opt-in 缺省关；显式 "false" 视作关，同 stripe） */
  private showResourceLoadOn(): boolean {
    return this.hasAttr('show-resource-load') && this.getAttr('show-resource-load', '') !== 'false'
  }

  /** 状态线开关（opt-in 缺省关）：开启后渲染状态竖线 + 条内计划进度刻度（G2 两渲染共用一个开关） */
  private statusLineOn(): boolean {
    return this.hasAttr('show-status-line') && this.getAttr('show-status-line', '') !== 'false'
  }

  /**
   * 状态基准日（ms）：status-date 属性（'YYYY-MM-DD'，hour 档可带时刻）非法/缺省回落**当天**
   * （与 today-line 同口径 startOfDay(new Date())；SSR 下为服务器当天——需要快照确定性的宿主请显式传 status-date）。
   */
  private statusDateMs(): number {
    const parsed = parseTaskDate(this.getAttr('status-date', ''))
    return parsed ? parsed.getTime() : startOfDay(new Date()).getTime()
  }

  /** 多基线选择（baseline-id 属性）：缺省/空白回落第一条；未命中回落第一条（update() 实例级告警一次） */
  private baselineIdValue(): string {
    return this.getAttr('baseline-id', '').trim()
  }

  /** 选中任务的展示基线：baselines（含单 baseline 归一）内按 baseline-id 取，未命中/缺省取第一条；无基线返回 null */
  private pickBaseline(row: GanttRow): GanttBaseline | null {
    const bases = taskBaselines(row.task)
    if (bases.length === 0) return null
    const want = this.baselineIdValue()
    if (want !== '') {
      const hit = bases.find((b) => b.id === want)
      if (hit) return hit
    }
    return bases[0]!
  }

  /** 基线差值文案（实际 end 相对基线 end：晚/早 N 天或一致） */
  private baselineDeltaText(row: GanttRow, baselineEndMs: number): string {
    const days = Math.round((row.endMs - baselineEndMs) / DAY_MS)
    if (days === 0) return this.t('gantt.baselineSame')
    return this.t(days > 0 ? 'gantt.baselineLater' : 'gantt.baselineEarlier', { count: Math.abs(days) })
  }

  /** 今日线开关（方法名避开 show-today 属性的 camelCase，防 property 赋值遮蔽原型方法） */
  private showTodayOn(): boolean {
    return this.getAttr('show-today', '') !== 'false'
  }

  private weekendsOn(): boolean {
    return this.getAttr('weekends', '') !== 'false'
  }

  /** 假日集合（按属性原文缓存；调用方只读不写——isWorkingDay/renderGrid/workCalendar 均只查询） */
  private holidaySet(): Set<string> {
    const raw = this.getAttr('holidays', '')
    const cached = this.holidayCache
    if (cached && cached.raw === raw) return cached.set
    let set: Set<string>
    if (!raw) {
      set = new Set()
    } else {
      try {
        const parsed: unknown = JSON.parse(raw)
        set = new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
      } catch {
        set = new Set()
      }
    }
    this.holidayCache = { raw, set }
    return set
  }

  /**
   * 工作日日历快照（workdays + holidays 原文为 key 缓存，属性不变即复用——
   * 排程循环内逐次 JSON.parse 属性在大规模数据下开销可观）。
   * days 为 null 表示 workdays 未开启/非法 → 不限制（全周工作）。
   */
  private workCalendar(): { days: Set<number> | null; holidays: Set<string> } {
    const key = `${this.getAttr('workdays', '')}\u0000${this.getAttr('holidays', '')}`
    const cached = this.workCalCache
    if (cached && cached.key === key) return cached
    const next = { key, days: parseWorkdays(this.getAttr('workdays', '')), holidays: this.holidaySet() }
    this.workCalCache = next
    return next
  }

  /** 工作日判定：周几 ∈ workdays 且非 holidays。workdays 缺省/非法/空 → 恒 true（零行为） */
  private resourceCalendars(): Map<string, GanttResource> {
    const raw = this.getAttr('resources', '')
    const cached = this.resourceCalCache
    if (cached && cached.raw === raw) return cached.map
    const map = new Map<string, GanttResource>()
    let parsed: unknown
    try {
      parsed = raw === '' ? [] : JSON.parse(raw)
    } catch {
      parsed = []
    }
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) continue
        const record = item as Record<string, unknown>
        if (typeof record.id !== 'string' || record.id.trim() === '') continue
        const resource: GanttResource = { id: record.id.trim() }
        if (typeof record.name === 'string' && record.name.trim() !== '') resource.name = record.name.trim()
        if (Array.isArray(record.workdays)) {
          resource.workdays = [
            ...new Set(
              record.workdays.filter(
                (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6,
              ),
            ),
          ]
        }
        if (Array.isArray(record.holidays)) {
          resource.holidays = [
            ...new Set(
              record.holidays
                .filter((x): x is string => typeof x === 'string' && !!parseTaskDate(x))
                .map((x) => toISODate(parseTaskDate(x)!)),
            ),
          ]
        }
        if (Array.isArray(record.shifts)) {
          resource.shifts = record.shifts
            .filter(
              (s): s is { start: string; end: string } =>
                typeof s === 'object' &&
                s !== null &&
                typeof (s as Record<string, unknown>).start === 'string' &&
                typeof (s as Record<string, unknown>).end === 'string',
            )
            .map((s) => ({ start: s.start, end: s.end }))
        }
        map.set(resource.id, resource)
      }
    }
    this.resourceCalCache = { raw, map }
    return map
  }

  private taskCalendar(task?: GanttTask): { days: Set<number> | null; holidays: Set<string> } {
    const base = this.workCalendar()
    if (!task?.resources?.length) return base
    const resources = this.resourceCalendars()
    let days = base.days ? new Set(base.days) : null
    const holidays = new Set(base.holidays)
    for (const id of task.resources) {
      const resource = resources.get(id)
      if (!resource) continue
      if (resource.shifts && resource.shifts.length === 0) days = new Set()
      if (resource.workdays !== undefined) {
        const own = new Set(resource.workdays)
        days = days ? new Set([...days].filter((day) => own.has(day))) : own
      }
      for (const holiday of resource.holidays ?? []) holidays.add(holiday)
    }
    return { days, holidays }
  }

  private isWorkingDay(ms: number, task?: GanttTask): boolean {
    const { days, holidays } = this.taskCalendar(task)
    const d = new Date(ms)
    // 假日恒为非工作日（与 workdays 是否开启无关）；workdays 缺省则不限制周几
    if (holidays.has(toISODate(d))) return false
    if (!days) return true
    return days.has(d.getDay())
  }

  /**
   * 吸附到「当天或之后」的下一个工作日（逐日前进，上限 SNAP_MAX_DAYS 天防死循环）。
   * workdays 未开启 → 原值返回（零行为）；上限内找不到工作日（几乎不可达）→ 原值返回（宁可不移动）。
   */
  private snapToWorkingDay(ms: number, task?: GanttTask): number {
    const { days, holidays } = this.taskCalendar(task)
    // 无 workdays 且无假日 → 全周皆工作日，无需求吸附
    if (!days && holidays.size === 0) return ms
    let cur = ms
    for (let i = 0; i < SNAP_MAX_DAYS; i++) {
      if (this.isWorkingDay(cur, task)) return cur
      // 日历日推进（毫秒 +24h 跨 DST 会把 00:00 推成 01:00 / 23:00，吸附结果落不到本地零点）
      cur = addLocalDays(cur, 1)
    }
    return ms
  }

  private shiftWindows(task?: GanttTask): Array<{ start: number; end: number }> | null {
    return shiftWindows(task, this.resourceCalendars())
  }

  /** hour 档按资源班次吸附起点：班次内保留，班次间/班次后落到下一个班次起点 */
  private snapToShift(ms: number, task?: GanttTask): number {
    if (this.scaleMode() !== 'hour') return ms
    const windows = this.shiftWindows(task)
    if (!windows || windows.length === 0) return ms
    const d = new Date(ms)
    const minute = d.getHours() * 60 + d.getMinutes()
    if (windows.some((w) => minute >= w.start && minute < w.end)) return ms
    const y = d.getFullYear()
    const mo = d.getMonth()
    const day = d.getDate()
    // 班次起点按本地墙钟落位：DST 切换日「零点 + 分钟数」会差 1 小时（09:00 → 10:00 / 08:00）
    for (const w of windows) {
      if (minute < w.start) return localWallClockMs(y, mo, day, w.start)
    }
    return localWallClockMs(y, mo, day + 1, windows[0]!.start)
  }

  private constraintOf(t: TG): { mode: DatedConstraint; ms: number; endMs: number; dateOnly: boolean } | null {
    return constraintOf(t)
  }

  private weekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  /** 日期只读（方法名避开 dates-readonly 属性的 camelCase，防 property 赋值遮蔽原型方法） */
  private datesReadonlyOn(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('dates-readonly')
  }

  /** 进度只读（方法名避开 progress-readonly 属性的 camelCase，同上） */
  private progressReadonlyOn(): boolean {
    return this.hasAttr('readonly') || this.hasAttr('progress-readonly')
  }

  // ===== 时间轴模型 =====

  /** 按 scale 步进 n 个单位（month/quarter/year 走日历运算防月末溢出；day/week 走日历日防 DST 漂移；
   *  hour 按绝对小时——跨跳变时本地标签自然跳过一个/重复一小时，是时间轴的正确语义） */
  private static addUnits(d: Date, scale: GanttScale, n: number): Date {
    return addUnits(d, scale, n)
  }

  /**
   * 宿主托管时间范围（range-start / range-end，ISO 日期）：
   * range-end **含当日**（与任务 end / 本地 endMsOf / oas-resource 托管轴同口径），
   * 返回半开区间 [startMs, endMs)，endMs = range-end **次日** 00:00——直接用当日 00:00 会让
   * hour 档轴尾停在 range-end 当日 00:00 + pad（当日大半无列）。
   * 任一缺失/非法/颠倒（end < start）→ null（回落 rows 派生口径）。
   */
  private hostRangeMs(): { startMs: number; endMs: number } | null {
    const s = parseIsoDayMs(this.getAttr('range-start', ''))
    const e = parseIsoDayMs(this.getAttr('range-end', ''))
    if (s === null || e === null || e < s) return null
    // 次日零点按日历日推进：e + DAY_MS 跨 DST 会停在 23:00/01:00，轴尾与末档边界跟着错位
    return { startMs: s, endMs: addLocalDays(e, 1) }
  }

  private buildUnits(): void {
    const scale = this.scaleMode()
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    // 宿主托管范围（range-*）优先：windowed 下组件只持有部分行，rows min/max 不是全量时间范围；
    // 缺 range-* 时告警一次并回落 rows 派生（轴会随装载窗口重锚，文档建议宿主提供范围）
    const host = this.hostRangeMs()
    if (host) {
      minMs = host.startMs
      maxMs = host.endMs
    } else {
      if (this._winMode.windowed && !this.warnedWindowedRange) {
        this.warnedWindowedRange = true
        devWarn(
          '[oas-gantt] windowed 模式未提供 range-start/range-end，时间轴范围回落已装载数据派生（滚动超出后会重锚）；建议宿主托管轴范围',
        )
      }
      for (const r of this.rows) {
        if (r.startMs < minMs) minMs = r.startMs
        if (r.endMs > maxMs) maxMs = r.endMs
      }
    }
    if (!Number.isFinite(minMs)) {
      const now = Date.now()
      minMs = now
      maxMs = now
    }
    const min = new Date(minMs)
    let anchor: Date
    switch (scale) {
      case 'hour':
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate(), min.getHours())
        break
      case 'day':
        anchor = startOfDay(min)
        break
      case 'week': {
        const ws = this.weekStart()
        const diff = (min.getDay() + 7 - ws) % 7
        anchor = new Date(min.getFullYear(), min.getMonth(), min.getDate() - diff)
        break
      }
      case 'month':
        anchor = new Date(min.getFullYear(), min.getMonth(), 1)
        break
      case 'quarter':
        anchor = new Date(min.getFullYear(), Math.floor(min.getMonth() / 3) * 3, 1)
        break
      case 'year':
        anchor = new Date(min.getFullYear(), 0, 1)
        break
    }
    const padStart = SCALE_PAD_START[scale]
    const padEnd = SCALE_PAD_END[scale]
    const locale = this.effectiveLocale()
    let cursor = OASGantt.addUnits(anchor, scale, -padStart)
    const endBound = OASGantt.addUnits(new Date(maxMs), scale, padEnd + 1).getTime()
    const units: TimeUnit[] = []
    let guard = 0
    while (cursor.getTime() < endBound && guard++ < 5000) {
      const next = OASGantt.addUnits(cursor, scale, 1)
      units.push({
        startMs: cursor.getTime(),
        endMs: next.getTime(),
        major: this.majorLabel(cursor, scale, locale),
        minor: this.minorLabel(cursor, scale, locale),
      })
      cursor = next
    }
    this.units = units
    this.majorGroups = buildMajorGroups(units)
    this.canvasW = units.length * this.colW()
    ganttRenderDiag.unitBuilds++ // 仅内部诊断（见 ganttRenderDiag）
  }

  private majorLabel(d: Date, scale: GanttScale, locale: string): string {
    return majorLabel(d, scale, locale)
  }

  private minorLabel(d: Date, scale: GanttScale, locale: string): string {
    return minorLabel(d, scale, locale)
  }

  /** 时间 → LTR 画布 x（px）：单位索引 + 单位内比例（月/季/年不等长按比例内插） */
  private xOf(ms: number): number {
    const units = this.units
    const colW = this.colW()
    if (units.length === 0) return 0
    if (ms <= units[0]!.startMs) return 0
    const last = units[units.length - 1]!
    if (ms >= last.endMs) return units.length * colW
    let lo = 0
    let hi = units.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ms < units[mid]!.endMs) hi = mid
      else lo = mid + 1
    }
    const u = units[lo]!
    const frac = (ms - u.startMs) / (u.endMs - u.startMs)
    return (lo + frac) * colW
  }

  /** LTR x → 渲染坐标（RTL 镜像：改距右缘） */
  private mirrorX(x: number): number {
    return isRtl(this) ? this.canvasW - x : x
  }

  /** 时间区间的左缘 x → 物理 left（RTL 需再减宽度：镜像的是区间右缘，非左缘） */
  private mirrorCellLeft(xStart: number, width: number): number {
    return isRtl(this) ? this.canvasW - xStart - width : xStart
  }

  // ===== 渲染模型（行树 + 摘要聚合）=====

  private groupTasksByProject(tasks: TG[]): TG[] {
    return groupTasksByProject(tasks)
  }

  private groupTasksByResource(tasks: TG[]): TG[] {
    return groupTasksByResource(tasks, this.resourceCalendars())
  }

  private buildRows(): void {
    const tasks = this.groupByResourceOn()
      ? this.groupTasksByResource(this._tasks)
      : this.groupByProjectOn()
        ? this.groupTasksByProject(this._tasks)
        : this._tasks
    // 日期助手（windowed 扁平分支与树形分支共用）
    const startMsOf = (t: TG): number => parseTaskDate(t.start)?.getTime() ?? 0
    // 里程碑口径（全局统一）：显式 type:"milestone" 优先（带 end 也算，渲染/聚合/连线锚点一致忽略 end），
    // 其次推导「无 end 且无子级」
    const isMilestoneTask = (t: TG): boolean => t.type === 'milestone' || !t.end
    const endMsOf = (t: TG): number => {
      if (isMilestoneTask(t)) return startMsOf(t)
      const e = parseTaskDate(t.end!)
      if (!e) return startMsOf(t)
      // 日精度 end 含当日（区间右缘 = 次日 00:00）；带时间精度按原值
      return t.end!.length > 10 ? e.getTime() : addLocalDays(e.getTime(), 1)
    }
    // windowed 要求**扁平行切片**（与 oas-table 同式）：切片即行序——不递归 children、不受 expanded
    // 影响，绝对行号/loaded 全按扁平行计。含层级/展开语义请在宿主侧展平后喂入：本地递归展开会让
    // 行序（rows）与切片长度（_tasks.length）错位 → 覆盖判定误吞请求、滚动范围内空白且不派发。
    if (this._winMode.windowed) {
      if (!this.warnedWindowedFlat && tasks.some((t) => t.parent != null)) {
        this.warnedWindowedFlat = true
        devWarn(
          '[oas-gantt] windowed 模式要求扁平行切片（tasks 即行序，不递归 children、不受 expanded 影响，绝对行号按扁平行计）；含层级/展开语义请在宿主侧展平后喂入',
        )
      }
      this.expandedSetCache = new Set()
      this.rows = tasks.map((t) => {
        const isMilestone = isMilestoneTask(t)
        const s = startMsOf(t)
        return {
          task: t,
          depth: 0,
          startMs: s,
          endMs: Math.max(endMsOf(t), s),
          progress: typeof t.progress === 'number' ? t.progress : 0,
          isSummary: t.type === 'summary' && !isMilestone,
          isMilestone,
          hasChildren: false,
          posinset: 1,
          setsize: 1,
        }
      })
      this.rebuildRowIndex()
      ganttRenderDiag.rowBuilds++ // 仅内部诊断（见 ganttRenderDiag）
      return
    }
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    const childMap = new Map<string, string[]>()
    const roots: TG[] = []
    // 父指针成环（A.parent=B、B.parent=A）：环内任务全部互为子级、无根可达 → 整图空白。
    // 全局三色标记（未访问/在途/已定）线性定环：沿 parent 上溯撞到「在途」节点即环，把该节点按根处理
    // （不再挂到父下）并告警一次。已定节点后续直接复用，整体 O(n)，不因深链退化。
    const color = new Map<string, 1 | 2>()
    const broken = new Set<string>()
    for (const t of tasks) {
      if (color.has(t.id)) continue
      const stack: TG[] = []
      let cur: TG | undefined = t
      while (cur && cur.parent && byId.has(cur.parent) && !color.has(cur.id)) {
        color.set(cur.id, 1)
        stack.push(cur)
        cur = byId.get(cur.parent)
      }
      if (cur && cur.parent && byId.has(cur.parent) && color.get(cur.id) === 1) {
        broken.add(cur.id)
        const key = `cycle:${cur.id}`
        if (!this.warnedParents.has(key)) {
          this.warnedParents.add(key)
          devWarn(`[oas-gantt] parent 指针成环，任务 "${cur.id}" 已断环按根节点渲染`)
        }
      }
      for (const n of stack) color.set(n.id, 2)
    }
    for (const t of tasks) {
      if (t.parent && byId.has(t.parent) && !broken.has(t.id)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      } else {
        if (t.parent && !byId.has(t.parent) && !this.warnedParents.has(t.parent)) {
          this.warnedParents.add(t.parent)
          devWarn(`[oas-gantt] parent "${t.parent}" 不存在，任务 "${t.id}" 已按根节点渲染`)
        }
        roots.push(t)
      }
    }

    // 摘要聚合（递归后代 min/max + 工期加权进度；叶子 = 自身）
    const agg = new Map<string, { startMs: number; endMs: number; progress: number }>()
    const aggregate = (id: string): { startMs: number; endMs: number; progress: number } => {
      const memo = agg.get(id)
      if (memo) return memo
      const t = byId.get(id)!
      const childIds = childMap.get(id) ?? []
      if (childIds.length === 0) {
        const r = {
          startMs: startMsOf(t),
          endMs: Math.max(endMsOf(t), startMsOf(t)),
          progress: typeof t.progress === 'number' ? t.progress : 0,
        }
        agg.set(id, r)
        return r
      }
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      let weighted = 0
      let totalDays = 0
      for (const cid of childIds) {
        const c = aggregate(cid)
        if (c.startMs < min) min = c.startMs
        if (c.endMs > max) max = c.endMs
        const days = Math.max((c.endMs - c.startMs) / DAY_MS, 0.5)
        weighted += c.progress * days
        totalDays += days
      }
      const r = { startMs: min, endMs: max, progress: totalDays > 0 ? Math.round(weighted / totalDays) : 0 }
      agg.set(id, r)
      return r
    }

    // 同级全集（含折叠子级）：供 treeitem aria-posinset/setsize。用**生效父级**分组——
    // 悬空 parent / 断环节点的任务在树里归根，其同级应为根集合，而非原始 parent 的分组。
    const sibList = new Map<string, string[]>()
    sibList.set(
      '',
      roots.map((r) => r.id),
    )
    for (const [pid, ids] of childMap) sibList.set(pid, ids)
    const posIndex = new Map<string, number>()
    for (const ids of sibList.values()) ids.forEach((id, i) => posIndex.set(id, i + 1))
    const posKey = (t: TG, depth: number): string => (depth === 0 ? '' : (t.parent ?? ''))

    const expanded = this.effectiveExpandedSet(childMap, tasks)
    // 缓存：后续渲染窗口（含滚动每帧）直接复用，避免万级任务下每帧重建展开集（O(n) → O(1)）
    this.expandedSetCache = expanded
    const rows: GanttRow[] = []
    const walk = (t: TG, depth: number): void => {
      const childIds = childMap.get(t.id) ?? []
      const hasChildren = childIds.length > 0
      // 形态判定：显式 milestone 优先，但「有子级」恒为摘要（子级承载聚合语义，形态与聚合必须一致）
      const isMilestone = isMilestoneTask(t) && !hasChildren
      // 数据矛盾告警（同任务同类型只告一次，受控反复重写不刷屏）；文案必须与实际形态一致
      if (t.type === 'milestone') {
        if (hasChildren) {
          this.warnMilestone(
            t.id,
            'children',
            `[oas-gantt] 任务 "${t.id}" 声明 type:"milestone" 但有子任务，已按摘要渲染`,
          )
        } else if (t.end) {
          this.warnMilestone(
            t.id,
            'end',
            `[oas-gantt] 任务 "${t.id}" 显式声明 type:"milestone" 但携带 end，已按里程碑渲染（end 忽略）`,
          )
        }
      }
      const isSummary = hasChildren || (t.type === 'summary' && !isMilestone)
      const a = aggregate(t.id)
      const sib = sibList.get(posKey(t, depth)) ?? [t.id]
      rows.push({
        task: t,
        depth,
        startMs: a.startMs,
        endMs: a.endMs,
        progress: a.progress,
        isSummary,
        isMilestone,
        hasChildren,
        posinset: posIndex.get(t.id) ?? 1,
        setsize: sib.length,
      })
      if (hasChildren && expanded.has(t.id)) for (const cid of childIds) walk(byId.get(cid)!, depth + 1)
    }
    for (const r of roots) walk(r, 0)
    this.rows = rows
    this.rebuildRowIndex()
    ganttRenderDiag.rowBuilds++ // 仅内部诊断（见 ganttRenderDiag）
  }

  /**
   * 行 id → rows 下标索引（buildRows 末尾一次性重建）：选择相关路径（行点选 Shift 连选、
   * 键盘 ↑/↓ 连选、scrollToTask、windowed 键盘越界请求）原本各自 `rows.findIndex` /
   * `rows.map(...).indexOf(...)`——万级任务下每次选择都是 O(总量) 扫描。索引只在 buildRows
   * 重建（rows 仅在该处整体替换），选择变化不触碰它，故查询恒为 O(1)。
   */
  private rebuildRowIndex(): void {
    const index = new Map<string, number>()
    for (let i = 0; i < this.rows.length; i++) index.set(this.rows[i]!.task.id, i)
    this.rowIndexById = index
  }

  /** 生效展开集合：受控属性优先；未受控时缺省全展开（数据 expanded:false 为显式收起的例外） */
  private effectiveExpandedSet(childMap: Map<string, string[]>, tasks: TG[] = this._tasks): Set<string> {
    if (this.expandedSet) return this.expandedSet
    const set = new Set<string>()
    for (const t of tasks) {
      if (t.expanded !== false && (childMap.has(t.id) || t.type === 'summary')) set.add(t.id)
    }
    return set
  }

  /** 当前展开集合（toggle 用）：优先取 buildRows 缓存；未受控且无缓存时从数据构建
   *  （id 索引 Set 保证万级任务 O(n)——some 线性扫描会 O(n²)） */
  private currentExpandedSet(): Set<string> {
    if (this.expandedSet) return this.expandedSet
    if (this.expandedSetCache) return this.expandedSetCache
    const ids = new Set(this._tasks.map((t) => t.id))
    const childMap = new Map<string, string[]>()
    for (const t of this._tasks) {
      if (t.parent && ids.has(t.parent)) {
        const list = childMap.get(t.parent!) ?? []
        list.push(t.id)
        childMap.set(t.parent!, list)
      }
    }
    return new Set(this.effectiveExpandedSet(childMap))
  }

  private toggleExpand(id: string): void {
    const set = this.currentExpandedSet()
    const next = new Set(set)
    const willExpand = !set.has(id)
    if (willExpand) next.add(id)
    else next.delete(id)
    this.expandedSet = next
    this.expandedAttrCache = JSON.stringify([...next])
    this.setAttribute('expanded', this.expandedAttrCache)
    this.update()
    this.emit('expand-change', { id, expanded: willExpand } satisfies GanttExpandChangeDetail)
  }

  // ===== windowed：服务端行窗口协议（oas-window-request / oas-range-request） =====

  /**
   * 行 i（rows 数组下标）的画布 top（px）：windowed 下按**绝对行号**定位
   * （rows 承载 [window-start, window-start+len) 切片，画布坐标系是全量 total 行）。
   */
  private absRowTop(i: number): number {
    return (this._winMode.windowed ? this._winMode.windowStart + i : i) * this.rowHeightPx()
  }

  /**
   * 行 i 是否斑马纹行（stripe 属性开启时按**全量绝对行号**奇偶判定，与 table/list 同口径；
   * windowed 按 window-start 偏移——按窗口局部序/nth-child 着色会在滚动后整体错位）。
   */
  private isStripeRow(i: number): boolean {
    const abs = this._winMode.windowed ? this._winMode.windowStart + i : i
    return abs % 2 === 1
  }

  /** 画布总行数（滚动域/连线画布/网格/今日线高度基准）：windowed = 全量 total；本地 = rows 数 */
  private layoutRows(): number {
    return this._winMode.windowed ? this._winMode.total : this.rows.length
  }

  /**
   * 按可视行窗口计算期望区间并按需派发 `oas-window-request`（detail `{ start, end, reason }`，
   * 半开、绝对行下标）。去重语义：同一期望区间不重复派发；期望区间被已装载区间覆盖时
   * 重置去重状态（之后覆盖情况变化可对同一区间再派）。
   * 时机：update（init/data）、滚动合帧（scroll）、视口 resize（resize）。
   */
  private requestWindowIfNeeded(reason: WindowRequestReason): void {
    const mode = this._winMode
    if (!mode.windowed || !this.tbody) return
    const vis = computeVirtualWindow(this.tbody.scrollTop, this.viewportH(), this.rowHeightPx(), mode.total, 6)
    const need = expandWindow(vis.start, vis.end, mode.total, WINDOW_MARGIN)
    if (windowCovered(need, mode.loaded)) {
      this.winReq = null
      return
    }
    if (sameWindow(need, this.winReq)) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.winReq = { start: need.start, end: need.end }
    this.emit('window-request', { start: need.start, end: need.end, reason } satisfies WindowRequestDetail)
  }

  /**
   * windowed 下键盘移动越出已装载切片（切片末行 ↓ / 切片首行 ↑）：派发 `oas-window-request`
   * （need 覆盖目标绝对行 ±margin，reason=scroll），宿主回填后目标行可达——不得静默无响应。
   * 目标越出全量边界（<0 / ≥total）或 need 已被装载覆盖时零行为。
   */
  private requestKeyboardWindow(row: GanttRow, forward: boolean): void {
    const mode = this._winMode
    if (!mode.windowed) return
    const idx = this.rowIndexById.get(row.task.id) ?? -1
    if (idx < 0) return
    const target = mode.windowStart + idx + (forward ? 1 : -1)
    if (target < 0 || target >= mode.total) return
    const need = expandWindow(target, target + 1, mode.total, WINDOW_MARGIN)
    if (windowCovered(need, mode.loaded)) return
    // 已有在途请求覆盖目标 → 不重派（宿主回填后即可达，非静默）
    const pending = this.winReq
    if (pending !== null && pending.start <= need.start && need.end <= pending.end) return
    if (sameWindow(need, this.winReq)) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.winReq = { start: need.start, end: need.end }
    this.emit('window-request', { start: need.start, end: need.end, reason: 'scroll' } satisfies WindowRequestDetail)
  }

  /**
   * 轴由宿主托管（提供 range-start/range-end）时按需派发 `oas-range-request`
   * （detail `{ startMs, endMs, reason }`）：可视时间窗前后各扩 1 个视口宽得到 need，
   * `!rangeCovered(need, axis)` 时派发，同 need 去重。非托管（无 range-*）零行为。
   * 视口时间宽 = 视口列数 × 平均单位 ms（month/quarter 不等长按均值近似，端点评估无需精确）。
   */
  private requestRangeIfNeeded(reason: WindowRequestReason): void {
    const units = this.units
    if (!this.hostRangeMs() || units.length === 0) return
    const from = Math.min(Math.max(this.winColStart, 0), units.length - 1)
    const to = Math.min(Math.max(this.winColEnd, from + 1), units.length)
    const visStartMs = units[from]!.startMs
    const visEndMs = units[to - 1]!.endMs
    const viewportMs = (this.viewportW() / this.colW()) * this.avgUnitMs()
    const need = { startMs: Math.floor(visStartMs - viewportMs), endMs: Math.ceil(visEndMs + viewportMs) }
    const axis = { startMs: units[0]!.startMs, endMs: units[units.length - 1]!.endMs }
    if (rangeCovered(need, axis)) {
      this.rangeReq = null
      return
    }
    if (this.rangeReq !== null && this.rangeReq.startMs === need.startMs && this.rangeReq.endMs === need.endMs) return
    // 先记后派：监听器同步回填时去重状态已就位
    this.rangeReq = { ...need }
    this.emit('range-request', { startMs: need.startMs, endMs: need.endMs, reason } satisfies RangeRequestDetail)
  }

  // ===== 生命周期 =====

  /** 缓存节点引用 + 幂等注册滚动同步（render 与水合路径共用） */
  private bind(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1
    this.coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
    this.ganttEl = this.shadow.querySelector('.gantt')
    this.tbody = this.shadow.querySelector('.tbody')
    this.theadEl = this.shadow.querySelector('.thead')
    this.sideBody = this.shadow.querySelector('.side-body')
    this.sideRows = this.shadow.querySelector('.side-rows')
    this.sideRows?.setAttribute('aria-multiselectable', 'true')
    this.barsEl = this.shadow.querySelector('.bars')
    this.linksEl = this.shadow.querySelector('svg.links')
    this.gridEl = this.shadow.querySelector('.grid-canvas')
    this.innerEl = this.shadow.querySelector('.inner')
    this.todayEl = this.shadow.querySelector('.today-line')
    this.statusLineEl = this.shadow.querySelector('.status-line')
    this.tooltipEl = this.shadow.querySelector('.tooltip')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.loadPanelEl = this.shadow.querySelector('.load-panel')
    this.tbody?.addEventListener('scroll', this.onScroll, { passive: true })
    // 空白拖拽（框选 / 建任务）：左侧列表与时间轴各一个落点入口
    this.sideBody?.addEventListener('pointerdown', this.onSidePointerDown)
    this.tbody?.addEventListener('pointerdown', this.onTbodyPointerDown)
    // 空白双击新建（creatable 通道）：左侧列表与时间轴各一个落点入口
    this.sideBody?.addEventListener('dblclick', this.onSideDblClick)
    this.tbody?.addEventListener('dblclick', this.onTbodyDblClick)
    // 行 hover（默认开）：行名列表 / 时间轴分别委托 pointerover/leave（行名与条每帧重建，委托挂在稳定容器上）
    this.sideBody?.addEventListener('pointerover', this.onSidePointerOver)
    this.sideBody?.addEventListener('pointerleave', this.onHoverPointerLeave)
    this.tbody?.addEventListener('pointerover', this.onTbodyPointerOver)
    this.tbody?.addEventListener('pointerleave', this.onHoverPointerLeave)
    // 连线：删除键 + 点空白清选中（函数引用稳定，重复 bind 幂等）
    document.addEventListener('keydown', this.docLinkKey)
    document.addEventListener('click', this.docLinkClick)
    document.addEventListener('keydown', this.docBarDragKey)
    // 首次观测到真实视口宽后自适应列宽（custom element 首连时 clientWidth 可能仍为 0）
    if (typeof ResizeObserver !== 'undefined' && this.tbody) {
      this.resizeObs?.disconnect()
      this.resizeObs = new ResizeObserver(() => this.onViewportResize())
      this.resizeObs.observe(this.tbody)
    }
    this.onCleanup(() => {
      this.tbody?.removeEventListener('scroll', this.onScroll)
      this.sideBody?.removeEventListener('pointerdown', this.onSidePointerDown)
      this.tbody?.removeEventListener('pointerdown', this.onTbodyPointerDown)
      this.sideBody?.removeEventListener('dblclick', this.onSideDblClick)
      this.tbody?.removeEventListener('dblclick', this.onTbodyDblClick)
      this.sideBody?.removeEventListener('pointerover', this.onSidePointerOver)
      this.sideBody?.removeEventListener('pointerleave', this.onHoverPointerLeave)
      this.tbody?.removeEventListener('pointerover', this.onTbodyPointerOver)
      this.tbody?.removeEventListener('pointerleave', this.onHoverPointerLeave)
      // 断开即摘除装饰层节点：重连不重建 shadow，只置空引用会让旧层永久留在画布上（假高亮，
      // 且下次 hover 再建一个 → 同时两个层；回归见 oas-gantt.test.ts「④ 断开重连」）
      this.hoverEl?.remove()
      this.hoverKey = null
      this.hoverEl = null
      this.resizeObs?.disconnect()
      this.resizeObs = null
      this.dragCtx = null
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf)
        this.scrollRaf = 0
      }
      this.scrollRafReconcile = false
      this.cancelReparent()
      this.cancelLink()
      this.cancelMarquee()
      this.stopAutoScroll()
      this.unbindRowPending()
      document.removeEventListener('keydown', this.docLinkKey)
      document.removeEventListener('click', this.docLinkClick)
      document.removeEventListener('keydown', this.docBarDragKey)
    })
  }

  /** 断开重连：重挂一次性监听（bind 幂等），否则新加的 document 监听在路由缓存摘挂后永久失效 */
  protected override onReconnect(): void {
    this.bind()
  }

  private onScroll = (): void => {
    if (!this.tbody) return
    const auto = this.autoScrolling
    this.autoScrolling = false
    // 用户滚动（非自动滚动）→ 终止进行中的交互（坐标/锚点失效）；自动滚动则保持拖拽并在重建后重定位
    if (!auto) {
      if (this.dragCtx) this.cancelDrag()
      this.cancelReparent()
      this.cancelLink()
      this.cancelMarquee()
    }
    // 表头平移 / 侧列纵向同步 / tooltip 隐藏保持同步时机（不依赖窗口重建）
    this.syncHeaderOffset()
    if (this.sideBody) this.sideBody.scrollTop = this.tbody.scrollTop
    this.hideTooltip()
    // 窗口重建 rAF 合帧：同一帧内多次 scroll 只跑一次 renderWindow（回调内读最新 scroll 位置，
    // 中间帧的滚动位置不会丢）。自动滚动帧内至少一次 auto scroll → 重建后需 reconcile 重锚拖拽
    if (auto) this.scrollRafReconcile = true
    if (!this.scrollRaf) this.scrollRaf = requestAnimationFrame(this.flushScrollWindow)
  }

  /** onScroll 的合帧下半段：窗口重建 + windowed/range 请求评估 + （自动滚动帧）拖拽重锚 */
  private flushScrollWindow = (): void => {
    this.scrollRaf = 0
    const reconcile = this.scrollRafReconcile
    this.scrollRafReconcile = false
    if (!this.tbody) return
    this.renderWindow()
    this.requestWindowIfNeeded('scroll')
    this.requestRangeIfNeeded('scroll')
    if (reconcile) this.reconcileDrag()
  }

  /**
   * 表头横向对齐：把表头内容按其与内容层 `.inner` 的实际像素差平移。
   * 比 `thead.scrollLeft = tbody.scrollLeft` 更稳——`thead` 在 RTL 下 content 不可滚（scrollLeft 恒 0），
   * 旧写法致 RTL 表头与列/条错位（默认即错位满量）；按 rect 差平移对 LTR/RTL/任意滚动模型一致。
   */
  private syncHeaderOffset(): void {
    if (!this.theadEl || !this.innerEl) return
    // 读相位：所有 getBoundingClientRect 一次取完，之后才进入写相位。
    // scroll 事件里同步调用（不跑 rAF），读写交错会让每次写脏掉 layout、下一次读强制同步布局。
    const innerLeft = this.innerEl.getBoundingClientRect().left
    const dx = innerLeft - this.theadEl.getBoundingClientRect().left
    const tracks = this.shadow.querySelectorAll<HTMLElement>('.load-track')
    // 资源负荷面板桶层与图表内容层同源平移（同一 rect 差公式，RTL/任意滚动模型一致）；
    // 各 .load-row 结构完全一致（同 flex 模板 + 同行名列宽、同行高），.load-track 左缘逐行同值
    // → 只读一次参照 rect 求 dxTrack，循环内纯写 transform（旧写法逐行读 rect ×2 交错写，
    // 每次 scroll 都是 O(资源行数) forced reflow）。
    const dxTrack = tracks.length > 0 ? innerLeft - tracks[0]!.getBoundingClientRect().left : 0
    // 写相位
    for (const h of this.shadow.querySelectorAll<HTMLElement>('.head-major, .head-minor')) {
      h.style.transform = `translateX(${dx}px)`
    }
    // 面板自身重建（renderResourceLoad）末尾也会调本方法自同步
    for (const track of tracks) {
      const inner = track.querySelector<HTMLElement>('.load-inner')
      if (!inner) continue
      inner.style.transform = `translateX(${dxTrack}px)`
    }
  }

  // ===== 拖拽自动滚动（拖到视口边缘自动滚；窗口重建后 reconcile 保持拖拽稳定）=====

  private startAutoScroll(): void {
    if (this.autoScrollRaf) return
    if (!this.dragCtx && !this.reparentCtx && !this.linkCtx) return
    this.autoScrollRaf = requestAnimationFrame(this.autoScrollTick)
  }

  private stopAutoScroll(): void {
    if (this.autoScrollRaf) {
      cancelAnimationFrame(this.autoScrollRaf)
      this.autoScrollRaf = 0
    }
    this.autoScrolling = false
  }

  private autoScrollTick = (): void => {
    this.autoScrollRaf = 0
    const tb = this.tbody
    if (!tb || (!this.dragCtx && !this.reparentCtx && !this.linkCtx)) return
    const r = tb.getBoundingClientRect()
    if (r.height <= 0) {
      this.stopAutoScroll()
      return
    }
    const band = 28
    const maxStep = 24
    const clamp = (v: number): number => Math.max(-maxStep, Math.min(maxStep, Math.ceil(v)))
    let dy = 0
    let dx = 0
    if (this.pointerY < r.top + band) dy = clamp(-((r.top + band - this.pointerY) / band) * maxStep)
    else if (this.pointerY > r.bottom - band) dy = clamp(((this.pointerY - (r.bottom - band)) / band) * maxStep)
    if (this.pointerX < r.left + band) dx = clamp(-((r.left + band - this.pointerX) / band) * maxStep)
    else if (this.pointerX > r.right - band) dx = clamp(((this.pointerX - (r.right - band)) / band) * maxStep)
    // 行重排拖拽发生在左侧栏（物理左缘恒在带内）→ 横向自动滚动无意义且会把时间轴误拉走
    if (this.reparentCtx) dx = 0
    const maxTop = tb.scrollHeight - tb.clientHeight
    if (dy < 0 && tb.scrollTop <= 0) dy = 0
    if (dy > 0 && tb.scrollTop >= maxTop) dy = 0
    // 横向合法域随书写方向：LTR [0, limit]，RTL [-limit, 0]（0 = 画布最右）。
    // 贴缘意图为「物理方向」（贴右缘→视口右移），两侧一致，**不按 RTL 翻号**。
    const limit = tb.scrollWidth - tb.clientWidth
    const minLeft = isRtl(this) ? -limit : 0
    const maxLeft = isRtl(this) ? 0 : limit
    if (dx < 0 && tb.scrollLeft <= minLeft) dx = 0
    if (dx > 0 && tb.scrollLeft >= maxLeft) dx = 0
    if (dy === 0 && dx === 0) {
      this.stopAutoScroll()
      return
    }
    const beforeTop = tb.scrollTop
    const beforeLeft = tb.scrollLeft
    this.autoScrolling = true
    if (dy) tb.scrollTop = Math.max(0, Math.min(maxTop, beforeTop + dy))
    if (dx) tb.scrollLeft = Math.max(minLeft, Math.min(maxLeft, beforeLeft + dx))
    if (tb.scrollTop === beforeTop && tb.scrollLeft === beforeLeft) this.autoScrolling = false
    this.autoScrollRaf = requestAnimationFrame(this.autoScrollTick)
  }

  /** 自动滚动触发窗口重建后，重新锚定进行中的拖拽（条 / 连线临时线 / 行落点） */
  private reconcileDrag(): void {
    if (this.dragCtx) {
      const el = this.barsEl?.querySelector<HTMLElement>(`.bar[data-id="${escId(this.dragCtx.id)}"]`)
      if (el) this.dragCtx.bar = el
      this.applyBarDragVisual(this.pointerX)
    } else if (this.linkCtx) {
      const ctx = this.linkCtx
      if (!ctx.temp.isConnected) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        t.setAttribute('class', 'temp-link')
        this.linksEl?.appendChild(t)
        ctx.temp = t
      }
      this.updateLinkTemp(this.pointerX, this.pointerY)
    } else if (this.reparentCtx) {
      this.updateReparentTarget(this.pointerX, this.pointerY)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="gantt" part="gantt">
        <div class="side" part="side">
          <div class="side-head" part="side-head"></div>
          <div class="side-body" part="side-body">
            <div class="side-inner">
              <div class="side-rows" role="tree"></div>
            </div>
          </div>
        </div>
        <div class="main" part="main">
          <div class="thead" part="thead">
            <div class="head-major"></div>
            <div class="head-minor"></div>
          </div>
          <div class="tbody" part="tbody">
            <div class="inner">
              <div class="grid-canvas"></div>
              <svg class="links"></svg>
              <div class="bars"></div>
              <div class="today-line" aria-hidden="true" hidden></div>
              <div class="status-line" aria-hidden="true" hidden></div>
            </div>
          </div>
        </div>
        <div class="tooltip" hidden></div>
        <div class="empty" hidden></div>
      </div>
      <div class="load-panel" part="load-panel" role="img" hidden></div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.gantt')) return false
    if (!this.shadow.querySelector('.tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.historyOn()) {
      this.undoStack = []
      this.redoStack = []
      this.lastTasksSnapshot = []
      this.lastTasksSignature = ''
    } else if (this.lastTasksSignature === '') {
      this.resetHistoryState()
    }
    // 拖拽中数据被外部重写 → 终止拖拽回滚（受控纪律：外部数据为准）
    if (this.dragCtx) this.cancelDrag()
    this.cancelReparent()
    this.cancelLink()
    this.cancelMarquee()
    this.unbindRowPending()
    this.rowPending = null
    this.syncTasks()
    // windowed 模式解析：windowed 属性在场且 total 为合法正数才生效
    //（total 为 0 / 非法 → 回落本地全量模式，行为不变）；退出 windowed 时重置去重/首帧标记
    this._winMode = readWindowedMode(
      this.hasAttr('windowed'),
      Number(this.getAttr('total', '')),
      Number(this.getAttr('window-start', '0')),
      this._tasks.length, // windowed 扁平切片口径：切片即行序，rows.length ≡ _tasks.length
    )
    if (!this._winMode.windowed) {
      // 退出 windowed：清去重态 + 首帧标记（重进同 need 必须重新 init，不得被旧去重态吞成静默）
      this.winReq = null
      this.winInitDone = false
    } else if (this._winMode.loaded.end > this._winMode.total && !this.warnedWindowedOverflow) {
      // 切片越界（window-start + 装载行数 > total）：越界行按 total 夹取不渲染（渲染窗口在 total 上算）。
      // 实例级告警一次，对齐 table / tree / resource / list 的切片越界契约——否则宿主会误以为切片全部生效。
      this.warnedWindowedOverflow = true
      const overflow = this._winMode.loaded.end - this._winMode.total
      devWarn(
        `[oas-gantt] windowed 切片超出全量范围（window-start ${this._winMode.windowStart} + 装载 ${this._tasks.length} 行 > total ${this._winMode.total}），越界 ${overflow} 行不在窗口内（按 total 夹取不渲染）`,
      )
    }
    // 无托管轴（range-* 缺失/非法/颠倒）：清 range 去重态 + 首帧标记（移除再挂回重新 init）
    if (this.hostRangeMs() === null) {
      this.rangeReq = null
      this.rangeInitDone = false
    }
    const prunedSel = this.pruneStateToTasks()
    this.syncExpanded()
    // 高度协议（与 oas-resource 同协议）：height 属性在场且为合法长度（纯数字 / Npx，>0）时，
    // 把高度写进**组件自有自定义属性** --oas-gantt-height（.gantt 规则高度即 var(--oas-gantt-height, 320px)）。
    // 属性为空串/空白/未提供/被移除/非法时：**只有本实例此前写过**（heightApplied）才 removeProperty
    // 归零——移除后回落 token 缺省 320 或宿主 CSS，DSD 快照自写值不残留；
    // 从未写过时绝不动宿主自己内联设的 --oas-gantt-height（① token 通道：宿主内联 token 生效）。
    // 关键：组件**从不触碰宿主自身的 height 内联**——宿主内联 height 优先级更高，天然优先。
    const heightRaw = this.heightAttrValue()
    if (heightRaw != null) {
      const n = Number(heightRaw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) {
        this.style.setProperty('--oas-gantt-height', `${n}px`)
        this.heightApplied = true
      } else if (this.heightApplied) {
        // 非法值 → 清除自写值回落（token 缺省 320 / 宿主 CSS 优先）
        this.style.removeProperty('--oas-gantt-height')
        this.heightApplied = false
      }
    } else if (this.heightApplied) {
      this.style.removeProperty('--oas-gantt-height')
      this.heightApplied = false
    }
    // 行高协议（与 height 协议同构）：row-height 属性在场且合法（纯数字 ≥20，与 rowHeightPx() 同口径）
    // 时写 --oas-gantt-row-height（.row-name 高度 = var(--oas-gantt-row-height) 与网格行高同源）；
    // 从未写过时绝不动宿主自己内联设的 token。px 后缀对 row-height 非法（rowHeightPx 同样回落 36）。
    // 注意：getAttr 不带字面量第二实参——api:scan 以最后一个字面量默认值为准，'36' 锚点在 rowHeightPx()。
    if (this.hasAttr('row-height')) {
      const raw = this.getAttr('row-height').trim()
      const n = Number(raw)
      if (raw !== '' && Number.isFinite(n) && n >= 20) {
        this.style.setProperty('--oas-gantt-row-height', `${n}px`)
        this.rowHeightApplied = true
      } else if (this.rowHeightApplied) {
        this.style.removeProperty('--oas-gantt-row-height')
        this.rowHeightApplied = false
      }
    } else if (this.rowHeightApplied) {
      this.style.removeProperty('--oas-gantt-row-height')
      this.rowHeightApplied = false
    }
    this.toggleAttribute('data-rtl', isRtl(this))
    this.buildRows()
    // 摘要行带 constraint 无意义（日期派生）→ 告警一次
    for (const r of this.rows) {
      if (r.hasChildren && r.task.constraint) {
        this.warnOnce(
          `constraint-summary:${r.task.id}`,
          `[oas-gantt] 摘要任务 "${r.task.id}" 的 constraint 已忽略（摘要日期由子级派生）`,
        )
      }
      if (r.hasChildren && (r.task.deadline || (r.task.deadlines?.length ?? 0) > 0)) {
        this.warnOnce(
          `deadline-summary:${r.task.id}`,
          `[oas-gantt] 摘要任务 "${r.task.id}" 的 deadline 已忽略（摘要日期由子级派生）`,
        )
      }
    }
    // baseline-id 校验（多基线 opt-in）：显式指定但在全部任务的 baselines 中都不存在 →
    // 渲染路径已静默回落第一条，这里实例级告警一次帮宿主发现 id 拼写错误（对齐 devWarn 惯例）
    const wantBaseline = this.baselineIdValue()
    if (wantBaseline !== '') {
      const known = new Set<string>()
      for (const t of this._tasks) for (const b of taskBaselines(t)) known.add(b.id)
      if (!known.has(wantBaseline)) {
        this.warnOnce(
          `baseline-id:${wantBaseline}`,
          `[oas-gantt] baseline-id "${wantBaseline}" 在任何任务的 baselines 中都不存在，已回落每任务第一条基线`,
        )
      }
    }
    // 关键路径：critical 仅 show-critical-path 开启时算；conflict（违约）在 show-critical-path 或 auto-schedule 开启时都算（违约应可见）。
    // windowed 下组件只持有已装载切片，CPM/违约判定需要完整依赖图——部分数据上计算会得到错误
    // 结果（未装载前置/后继缺失），跳过并 devWarn 一次（宿主可在服务端计算后自行标注/过滤）。
    const cpOn = this.showCriticalPathOn()
    const confOn = cpOn || this.autoScheduleOn()
    const floatOn = this.showFloatOn()
    const needCpm = cpOn || confOn || floatOn
    if (this._winMode.windowed && (confOn || floatOn)) {
      if ((cpOn || floatOn) && !this.warnedWindowedCritical) {
        this.warnedWindowedCritical = true
        devWarn(
          '[oas-gantt] windowed 模式下关键路径/违约/浮时判定需要全量数据，已跳过本地计算（部分数据上会得到错误结果）；请宿主在全量数据上计算后自行标注',
        )
      }
      this.criticalIds = new Set()
      // 空日历判定是纯本地（资源日历 + workdays 交集），不需要全量依赖图，windowed 下同样有效；
      // conflict 口径与非 windowed 一致：仅 auto-schedule / show-critical-path 开启时标注
      this.conflictIds = new Set([...this.deadlineConflictIds(), ...(confOn ? this.unschedulableIds() : [])])
      this.totalFloatMs = new Map()
      this.freeFloatMs = new Map()
    } else {
      const cp = needCpm ? this.criticalPathIds() : null
      this.criticalIds = cpOn && cp ? cp.critical : new Set()
      this.conflictIds = new Set([
        ...(confOn && cp ? cp.conflict : []),
        ...this.deadlineConflictIds(),
        ...(confOn ? this.unschedulableIds() : []),
      ])
      this.totalFloatMs = floatOn && cp ? cp.totalFloat : new Map()
      this.freeFloatMs = floatOn && cp ? cp.freeFloat : new Map()
    }
    // 资源池超配检测（pool opt-in，默认关零开销）：windowed 下组件只持有已装载切片，跨任务
    // 全量判定会漏报/误报 → 跳过并 devWarn 一次（对齐关键路径/违约的 windowed 口径）；
    // 检测只对池内已登记资源生效，冲突对并入 conflictIds 复用 .conflict 视觉通道。
    const poolOn = this.poolOn()
    if (poolOn && this._winMode.windowed) {
      if (!this.warnedPoolWindowed) {
        this.warnedPoolWindowed = true
        devWarn(
          '[oas-gantt] windowed 模式下资源超配检测需要全量数据，已跳过（切片上判定会漏报）；请宿主在全量数据上自行判定',
        )
      }
      this.resourceConflicts = []
    } else if (poolOn) {
      const registeredIds = new Set<string>()
      for (const r of this.effectivePool().list()) {
        if (typeof r.id === 'string' && r.id !== '') registeredIds.add(r.id)
      }
      this.resourceConflicts = computeResourceConflicts(this._tasks, registeredIds, (resourceId, peak) => {
        // 并发超限 >2：dev 告警一次（实例级去重；事件通道仍逐快照携带全量冲突对）
        if (this.warnedPoolOverCapacity) return
        this.warnedPoolOverCapacity = true
        devWarn(
          `[oas-gantt] 资源池超配：资源 "${resourceId}" 同时段被 ${peak} 个任务并发占用（>2），建议拆分或错峰排期`,
        )
      })
    } else {
      this.resourceConflicts = []
    }
    for (const c of this.resourceConflicts) {
      this.conflictIds.add(c.taskA)
      this.conflictIds.add(c.taskB)
    }
    // oas-resource-conflict（幂等）：同一快照不重复派发；数据/池变化重算后签名变化才发
    //（含消解发空数组——宿主据此清徽章）。pool 关闭不派发任何事件（opt-in 零副作用）且重置
    // 签名——重新开启时按新快照重发首帧。
    if (!poolOn) {
      this.lastConflictSig = null
    } else {
      const conflictSig = stableStringify(this.resourceConflicts)
      if (conflictSig !== this.lastConflictSig) {
        this.lastConflictSig = conflictSig
        this.emit('resource-conflict', {
          conflicts: this.resourceConflicts.map((c) => ({ ...c })),
        } satisfies GanttResourceConflictDetail)
      }
    }
    const scale = this.scaleMode()
    if (this.lastScale === '') {
      this.lastScale = scale // 首次吸收不派发
    } else if (this.lastScale !== scale) {
      this.lastScale = scale
      this.emit('scale-change', { scale } satisfies GanttScaleChangeDetail)
    }
    this.buildUnits()
    this.computeColW()
    this.canvasW = this.units.length * this.colW()
    // 画布高度按 layoutRows()（windowed = 全量 total，滚动域覆盖未装载行占位）
    const layoutCount = this.layoutRows()
    if (this.innerEl) {
      this.innerEl.style.width = `${this.canvasW}px`
      this.innerEl.style.height = `${layoutCount * this.rowHeightPx()}px`
    }
    const sideInner = this.shadow.querySelector<HTMLElement>('.side-inner')
    if (sideInner) sideInner.style.height = `${Math.max(layoutCount * this.rowHeightPx(), 1)}px`
    // 空态只按本地模式判定：windowed 下 tasks 空 = 「尚未装载」（全量意义上数据存在），不误显空态
    const isEmpty = !this._winMode.windowed && this._tasks.length === 0
    if (this.emptyEl) {
      this.emptyEl.hidden = !isEmpty
      if (isEmpty) {
        const tpl = this.querySelector('template[slot="empty"]')
        if (tpl instanceof HTMLTemplateElement) {
          this.emptyEl.innerHTML = ''
          this.emptyEl.appendChild(cloneSlotContent(tpl))
        } else {
          this.emptyEl.textContent = this.t('gantt.empty')
        }
      }
    }
    if (this.tbody) this.tbody.style.visibility = isEmpty ? 'hidden' : ''
    const sideLabel = this.shadow.querySelector('.side-rows')
    if (sideLabel) {
      sideLabel.setAttribute('aria-label', this.t('gantt.listLabel'))
      // 行位 ARIA 走 treeitem 合法属性（posinset/setsize/level，见 renderSideRows）：
      // tree / treeitem 不接受 aria-rowcount / aria-rowindex（axe aria-allowed-attr），
      // 全量口径由行上的 setsize 承载，不再在容器写 rowcount。
      sideLabel.removeAttribute('aria-rowcount')
    }
    // 列窗口先于表头切片计算（表头/网格都按窗口渲染；renderWindow 内会再算一次，幂等）
    this.computeColWindow()
    this.renderHeader()
    this.renderSideHead()
    this.renderWindow()
    this.renderToday()
    this.renderStatusLine()
    this.renderResourceLoad()
    this.syncHeaderOffset()
    // 数据重写后收敛出的选中变化统一在此补发（property/attribute 两通道一致）
    if (prunedSel) this.emitSelectionChange()
    // auto-schedule：每次 update 后规整（幂等——无违约时零改动零事件）；
    // 覆盖挂载即开/运行期开启，以及运行期改 workdays/holidays/整体重写 tasks 等场景。
    // windowed 下禁用（依赖图不完整，部分数据上排程会得到错误结果）→ 跳过并 devWarn 一次
    if (this.autoScheduleOn()) {
      if (this._winMode.windowed) {
        if (!this.warnedWindowedSchedule) {
          this.warnedWindowedSchedule = true
          devWarn(
            '[oas-gantt] windowed 模式下 auto-schedule 需要完整依赖图，已跳过联动排程（部分数据上排程会得到错误结果）；请宿主在服务端完成排程后回填数据',
          )
        }
      } else {
        this.reschedule()
      }
    }
    // windowed / range 请求评估（update 触发：init / data；滚动与 resize 在各自路径评估）。
    // init 标志只在**对应模式激活**时置位：非激活的 update 不得把它写成 true——否则退出
    // windowed / 移除 range-* 后重进会被旧标志吞成 reason=data（首帧 init 丢失）。
    this.requestWindowIfNeeded(this.winInitDone ? 'data' : 'init')
    if (this._winMode.windowed) this.winInitDone = true
    this.requestRangeIfNeeded(this.rangeInitDone ? 'data' : 'init')
    if (this.hostRangeMs() !== null) this.rangeInitDone = true
  }

  /**
   * 数据收敛：剪掉指向已不存在任务的选中/锚点/活动行/揭示态。
   * 返回选中集合是否被剪（供 update() 补发 selection-change）。三通道共用：
   * property setter、attribute（syncTasks）、removeTasks 都经 update()。
   */
  private pruneStateToTasks(): boolean {
    const ids = new Set(this._tasks.map((t) => t.id))
    let prunedSel = false
    for (const id of this.selected) {
      if (!ids.has(id)) {
        prunedSel = true
        break
      }
    }
    if (prunedSel) this.selected = new Set([...this.selected].filter((id) => ids.has(id)))
    if (this.selectionAnchor && !ids.has(this.selectionAnchor)) this.selectionAnchor = null
    if (this.activeRowId && !ids.has(this.activeRowId)) this.activeRowId = null
    if (this.touchActiveId && !ids.has(this.touchActiveId)) this.touchActiveId = null
    return prunedSel
  }

  /**
   * 双层刻度表头（上层主刻度相邻同标签合并 + 下层辅刻度逐格）。
   * 横向列虚拟化：只渲染 [winColStart, winColEnd) 窗口内的格——主刻度保留「与窗口相交」的组
   * （组跨 [gStart,gEnd)，相交判据 gStart < winColEnd && gEnd > winColStart）；
   * left/width 仍按全局列索引写（表头容器经 syncHeaderOffset 整体平移，平移基准不变）。
   */
  private renderHeader(): void {
    const major = this.shadow.querySelector('.head-major')
    const minor = this.shadow.querySelector('.head-minor')
    if (!major || !minor) return
    const colW = this.colW()
    major.innerHTML = ''
    minor.innerHTML = ''
    const frag1 = document.createDocumentFragment()
    const frag2 = document.createDocumentFragment()
    const from = this.winColStart
    const to = this.winColEnd
    // 主刻度取预计算分组（buildUnits 时点，见 buildMajorGroups）：组有序不相交 → endCol 单调递增，
    // 二分定位首个与窗口相交的组（endCol > from），顺序输出直到 startCol >= to——
    // 相交判据与旧全列扫描逐格一致（startCol < to && endCol > from），每帧成本
    // O(log 组数 + 窗口内组数)，不再随总列数线性（1M 列目标：10 年 day 档滚动帧不再扫 3658 列）
    const groups = this.majorGroups
    let lo = 0
    let hi = groups.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (groups[mid]!.endCol > from) hi = mid
      else lo = mid + 1
    }
    for (let g = lo; g < groups.length; g++) {
      const grp = groups[g]!
      if (grp.startCol >= to) break
      const cell = document.createElement('div')
      cell.className = 'unit'
      cell.textContent = grp.label
      cell.style.left = `${this.mirrorCellLeft(grp.startCol * colW, (grp.endCol - grp.startCol) * colW)}px`
      cell.style.width = `${(grp.endCol - grp.startCol) * colW}px`
      frag1.appendChild(cell)
    }
    // 辅刻度抽稀：列宽不足以容纳标签 + 间隙时按 N 取一显示（保留全部格线，只隐藏文本），
    // 防止窄容器下双位日号/月号首尾相接成一团。决策按全列标签计算并缓存（见 visibleMinorCache），
    // 窗口内逐格查集——与旧实现逐帧全量计算产物完全一致
    const scale = this.scaleMode()
    let cache = this.visibleMinorCache
    if (!cache || cache.units !== this.units || cache.scale !== scale || cache.colW !== colW) {
      cache = {
        units: this.units,
        scale,
        colW,
        set: new Set(
          pickVisibleLabels(
            this.units.map((u) => u.minor),
            colW,
            SCALE_STRIDES[scale],
          ),
        ),
      }
      this.visibleMinorCache = cache
    }
    const visible = cache.set
    for (let k = from; k < to; k++) {
      const cell = document.createElement('div')
      cell.className = 'unit'
      if (visible.has(k)) {
        cell.textContent = this.units[k]!.minor
      } else {
        cell.classList.add('blank')
      }
      // 轴首格不画左缘线（窗口切片后首个渲染格可能是轴中段 → 按全局索引判定，不能用 :first-child）
      if (k === 0) cell.classList.add('axis-start')
      cell.style.left = `${this.mirrorCellLeft(k * colW, colW)}px`
      cell.style.width = `${colW}px`
      frag2.appendChild(cell)
    }
    major.appendChild(frag1)
    minor.appendChild(frag2)
  }

  /** 虚拟窗口：只渲染可视行（+buffer）与可视列（+buffer）——名称列、任务条、依赖连线、背景列/表头全部窗口化 */
  private renderWindow(): void {
    if (!this.tbody || !this.innerEl) return
    const rowH = this.rowHeightPx()
    // 行虚拟化窗口在 layoutRows()（windowed = 全量 total）上算；windowed 再与已装载切片
    // 求交得**局部渲染窗口**（winStart/winEnd 保持 rows 数组下标语义），定位走 absRowTop（绝对行号）
    const win = computeVirtualWindow(this.tbody.scrollTop, this.viewportH(), rowH, this.layoutRows(), 6)
    if (this._winMode.windowed) {
      const ws = this._winMode.windowStart
      const len = this.rows.length
      this.winStart = Math.min(Math.max(win.start - ws, 0), len)
      this.winEnd = Math.min(Math.max(win.end - ws, 0), len)
    } else {
      this.winStart = win.start
      this.winEnd = win.end
    }
    // 列窗口变化（横向滚动/视口宽变）→ 表头与负荷桶层按新窗口重切片；纵向滚动窗口不变则跳过重建
    const prevColStart = this.winColStart
    const prevColEnd = this.winColEnd
    this.computeColWindow()
    if (this.winColStart !== prevColStart || this.winColEnd !== prevColEnd) {
      this.renderHeader()
      // 负荷面板桶条列窗口同步重切片（面板 hidden/空态时内部短路；行骨架不动，只换桶层）
      this.renderLoadBuckets()
    }
    this.renderSideRows()
    this.renderStripes()
    this.renderRowHover()
    this.renderBars()
    this.renderGrid()
    this.renderLinks()
    this.renderToday()
    this.renderStatusLine()
  }

  private viewportH(): number {
    // happy-dom 无布局：clientHeight 为 0 时回落 height 属性值
    return this.tbody && this.tbody.clientHeight > 10 ? this.tbody.clientHeight : this.heightPx()
  }

  private viewportW(): number {
    // happy-dom 无布局：clientWidth 为 0 时回落画布全宽（窗口覆盖全部列，无测量环境行为不变）
    return this.tbody && this.tbody.clientWidth > 10 ? this.tbody.clientWidth : this.canvasW
  }

  /**
   * 横向列窗口：复用 computeVirtualWindow（轴无关），按 scrollLeft/clientWidth/列宽切窗口。
   * RTL 下 scrollLeft 为负值模型（0 在画布最右、向左滚为负），取绝对值后与 LTR 的
   * 「距画布起点距离」同构 → 同一窗口数学。
   */
  private computeColWindow(): void {
    const win = computeVirtualWindow(
      Math.abs(this.tbody?.scrollLeft ?? 0),
      this.viewportW(),
      this.colW(),
      this.units.length,
      4,
    )
    this.winColStart = win.start
    this.winColEnd = win.end
  }

  // ===== 资源负荷面板（show-resource-load，opt-in 默认关） =====

  private loadUnit(): 'day' | 'week' | 'month' {
    return loadUnit(this.scaleMode())
  }

  /**
   * 负荷计算（签名缓存）：基于全量 `this._tasks` 一次计算（虚拟行窗口不影响——行窗口只裁渲染，
   * 不裁统计口径）。签名含 tasks JSON / 粒度 / 周起始 / 轴区间（取 buildUnits 产物，from/to 与
   * 时间轴两端对齐）/ pool 开关与版本——数据或轴变化才重算。
   */
  private loadResult(): ResourceLoadResult | null {
    const units = this.units
    if (units.length === 0) return null
    const unit = this.loadUnit()
    const weekStart = this.weekStart()
    const poolOn = this.poolOn()
    const poolVersion = poolOn ? this.effectivePool().version : 0
    const from = toISODate(new Date(units[0]!.startMs))
    const to = toISODate(new Date(units[units.length - 1]!.endMs - 1))
    const sig = `${JSON.stringify(this._tasks)}\u0000${unit}\u0000${weekStart}\u0000${from}\u0000${to}\u0000${poolOn}:${poolVersion}`
    const cached = this.loadCache
    if (cached && cached.sig === sig) return cached.result
    const result = computeResourceLoad(this._tasks, {
      unit,
      from,
      to,
      weekStart,
      pool: poolOn ? this.effectivePool().list() : undefined,
    })
    this.loadCache = { sig, result }
    return result
  }

  private loadBucketStartMs(result: ResourceLoadResult, i: number): number {
    return loadBucketStartMs(result, i)
  }

  /**
   * 渲染负荷面板（update / 视口 resize 时调用；滚动路径只走 syncHeaderOffset 平移 + 列窗口
   * 变化时 renderLoadBuckets 重切片，不重建行骨架）：
   * - 行名列宽 = 左侧列表 token（--oas-gantt-list-width）→ 桶条与图表时间轴逐列对齐；
   * - 桶条定位/宽度走 xOf（复用 update() 时的 units/colW 轴参数，不重算），RTL 经 mirrorCellLeft 镜像；
   * - 桶高 ∝ 负荷%（覆盖日数/桶天数，≤100%；>100% 加 .over 走 danger 通道）；
   * - 桶条**横向列虚拟化**（renderLoadBuckets）：只渲染可视列窗口相交的桶（对齐表头列窗口，
   *   5000 桶×行全量 DOM 不再出现）；.load-inner 宽度仍 = canvasW 撑起总宽（spacer），
   *   cell left/width 按全局像素写（容器经 syncHeaderOffset 整体平移，平移基准不变）；
   * - 空态（无任务/无 resources 引用）走 i18n 空态文案；windowed 跳过并 devWarn 一次。
   */
  private renderResourceLoad(): void {
    const panel = this.loadPanelEl
    if (!panel) return
    if (!this.showResourceLoadOn()) {
      panel.hidden = true
      panel.innerHTML = ''
      return
    }
    // windowed：组件只持有已装载切片，负荷统计在切片上会少算 → 不渲染 + devWarn 一次
    //（对齐 pool 超配检测 / 关键路径的 windowed 口径：跨全量能力不在部分数据上给错误结论）
    if (this._winMode.windowed) {
      if (!this.warnedLoadWindowed) {
        this.warnedLoadWindowed = true
        devWarn(
          '[oas-gantt] windowed 模式下资源负荷需要全量数据，已跳过渲染（切片上统计会少算）；请宿主在全量数据上计算后自行展示',
        )
      }
      panel.hidden = true
      panel.innerHTML = ''
      return
    }
    const result = this.loadResult()
    const rows = result?.resources ?? []
    panel.hidden = false
    panel.innerHTML = ''
    const head = document.createElement('div')
    head.className = 'load-head'
    head.textContent = this.t('gantt.resourceLoad')
    panel.appendChild(head)
    if (!result || rows.length === 0 || result.bucketDays.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'load-empty'
      empty.textContent = this.t('gantt.resourceLoadEmpty')
      panel.appendChild(empty)
      panel.setAttribute('aria-label', this.t('gantt.resourceLoad'))
      return
    }
    // aria 摘要（读屏走摘要，面板不进 Tab 序）：N 个资源 · 峰值最高的资源与百分比（同 % 取首个）
    let peakRow = rows[0]!
    let peakPct = -1
    for (const row of rows) {
      const peakIdx = row.buckets.indexOf(row.peak)
      const days = result.bucketDays[peakIdx] ?? 0
      const pct = days > 0 ? (row.peak / days) * 100 : 0
      if (pct > peakPct) {
        peakPct = pct
        peakRow = row
      }
    }
    panel.setAttribute(
      'aria-label',
      this.t('gantt.resourceLoadAria', {
        count: rows.length,
        name: peakRow.name ?? peakRow.id,
        percent: Math.round(peakPct),
      }),
    )
    const body = document.createElement('div')
    body.className = 'load-body'
    // 溢出时可键盘滚动（WCAG 2.1.1 scrollable-region-focusable）：可聚焦的是滚动区本身，
    // 面板摘要仍由 role="img" 的 aria-label 承担；仅真实溢出时聚焦才有意义，但 tabindex 常驻无害。
    body.tabIndex = 0
    body.setAttribute('role', 'region')
    body.setAttribute('aria-label', this.t('gantt.resourceLoad'))
    for (const row of rows) {
      const rowEl = document.createElement('div')
      rowEl.className = 'load-row'
      rowEl.setAttribute('part', 'load-row')
      const name = document.createElement('span')
      name.className = 'load-name'
      name.textContent = row.name ?? row.id
      rowEl.appendChild(name)
      const track = document.createElement('div')
      track.className = 'load-track'
      const inner = document.createElement('div')
      inner.className = 'load-inner'
      // spacer：窗口化后只渲染窗口内桶条，inner 总宽仍 = 画布全宽（撑起横向滚动条长度）
      inner.style.width = `${this.canvasW}px`
      track.appendChild(inner)
      rowEl.appendChild(track)
      body.appendChild(rowEl)
    }
    panel.appendChild(body)
    this.renderLoadBuckets()
    this.syncHeaderOffset()
  }

  /**
   * 负荷桶条列窗口重切片（renderResourceLoad 面板重建 / renderWindow 列窗口滑动共用）：
   * 只渲染与可视列窗口 [winColStart, winColEnd) 时间域相交的桶——桶 startMs 单调（loadBucketStartMs
   * 按日/周/月历推进）→ 二分定位首个相交桶（bucketEnd > winStartMs），顺序输出到桶起点越过窗口
   * 右界（对齐表头列窗口 renderHeader 的「二分 + 顺序输出」模式，每帧 O(log 桶数 + 窗口桶数)）。
   * 无测量环境（happy-dom：viewportW 回落画布全宽）→ 窗口覆盖全部列 → 输出与全量渲染逐节点一致。
   * 行骨架不动（只清 .load-inner 桶层），行序 == DOM 序 == loadResult().resources 序。
   */
  private renderLoadBuckets(): void {
    const panel = this.loadPanelEl
    if (!panel || panel.hidden) return
    const result = this.loadResult()
    const rows = result?.resources ?? []
    if (!result || rows.length === 0 || result.bucketDays.length === 0) return
    const units = this.units
    if (units.length === 0) return
    const bucketCount = result.bucketDays.length
    // 列窗口 → 时间窗口：桶与窗口的相交判据走时间域（半开 [start, end)），与像素域相交等价
    //（xOf 单调；首桶可早于轴首被 clamp 到 x=0，时间域判据同样保留它——bucketEnd > winStartMs）
    const winStartMs = units[this.winColStart]!.startMs
    const endCol = Math.min(this.winColEnd, units.length)
    const winEndMs = endCol >= units.length ? units[units.length - 1]!.endMs : units[endCol]!.startMs
    let lo = 0
    let hi = bucketCount
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.loadBucketStartMs(result, mid + 1) > winStartMs) hi = mid
      else lo = mid + 1
    }
    const inners = panel.querySelectorAll<HTMLElement>('.load-inner')
    for (let r = 0; r < inners.length; r++) {
      const row = rows[r]
      const inner = inners[r]!
      if (!row) break
      inner.innerHTML = ''
      const frag = document.createDocumentFragment()
      for (let i = lo; i < bucketCount; i++) {
        const startMs = this.loadBucketStartMs(result, i)
        if (startMs >= winEndMs) break
        const load = row.buckets[i]!
        if (load <= 0) continue
        const days = result.bucketDays[i] ?? 0
        if (days <= 0) continue
        const endMs = this.loadBucketStartMs(result, i + 1)
        const x = this.xOf(startMs)
        const width = Math.max(this.xOf(endMs) - x, 0)
        const pct = (load / days) * 100
        const cell = document.createElement('span')
        cell.className = 'load-cell'
        if (load > days) cell.classList.add('over')
        cell.style.left = `${this.mirrorCellLeft(x, width)}px`
        cell.style.width = `${width}px`
        // 高 ∝ 负荷%：封顶 100%（超配信息由 .over 颜色通道 + title 数值承载，不改几何上限）
        cell.style.height = `${Math.min(100, Math.round(pct))}%`
        cell.title = `${Math.round(pct)}%`
        frag.appendChild(cell)
      }
      inner.appendChild(frag)
    }
  }

  /**
   * 工时列表头（show-effort opt-in）：开启时表头变两列（名称占位 | 工时），列头 i18n
   * `gantt.effort`（locale 切换经 update() 即时刷新）；关闭时表头清空——既有空表头形态逐节点不变。
   * 与行内 .effort 单元格共用列模板（--oas-gantt-effort-width），右缘对齐。
   */
  private renderSideHead(): void {
    const head = this.shadow.querySelector<HTMLElement>('.side-head')
    if (!head) return
    head.innerHTML = ''
    if (!this.effortOn()) {
      head.classList.remove('has-effort')
      return
    }
    head.classList.add('has-effort')
    const name = document.createElement('span')
    name.className = 'head-name'
    name.setAttribute('aria-hidden', 'true')
    head.appendChild(name)
    const effort = document.createElement('span')
    effort.className = 'head-effort'
    effort.textContent = this.t('gantt.effort')
    head.appendChild(effort)
  }

  /** 左列名称树（窗口行） */
  private renderSideRows(): void {
    const container = this.sideRows
    if (!container) return
    // 重建前若焦点在行上（键盘跨窗口导航等触发重建），重建后补回焦点（浏览器 scroll 事件异步、会二次重建）
    const hadRowFocus =
      this.shadow.activeElement instanceof HTMLElement && this.shadow.activeElement.classList.contains('row-name')
    // 重建会销毁重命名输入框（部分引擎不触发 blur）→ 复位防卡死
    this.renaming = false
    container.innerHTML = ''
    const rowH = this.rowHeightPx()
    const expanded = this.currentExpandedSet()
    const rowTpl = this.querySelector('template[slot="row"]')
    const prevActive = this.activeRowId
    const inWindow = this.rows.slice(this.winStart, this.winEnd).some((r) => r.task.id === prevActive)
    const activeId = inWindow ? prevActive : (this.rows[this.winStart]?.task.id ?? null)
    this.activeRowId = activeId
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const el = document.createElement('div')
      el.className = 'row-name'
      el.dataset.key = row.task.id
      el.setAttribute('role', 'treeitem')
      el.setAttribute('aria-level', String(row.depth + 1))
      if (this._winMode.windowed) {
        // windowed：posinset/setsize 按**全量**（total）与绝对行号（1 基）——切片局部序号会向
        // 辅助技术报错位置。treeitem 不接受 aria-rowindex（行位由 posinset/setsize 表达）。
        const abs = this._winMode.windowStart + i + 1
        el.setAttribute('aria-posinset', String(abs))
        el.setAttribute('aria-setsize', String(this._winMode.total))
        el.removeAttribute('aria-rowindex')
      } else {
        el.setAttribute('aria-posinset', String(row.posinset))
        el.setAttribute('aria-setsize', String(row.setsize))
        el.removeAttribute('aria-rowindex')
      }
      el.style.top = `${this.absRowTop(i)}px`
      el.style.setProperty('--indent', `${8 + row.depth * 16}px`)
      el.setAttribute('part', 'row-name')
      // 行斑马纹（stripe 属性）：绝对行号奇数行行名同步底色（与时间轴条纹同口径）
      if (this.stripeOn() && this.isStripeRow(i)) el.setAttribute('data-stripe', '')
      el.tabIndex = row.task.id === activeId ? 0 : -1
      // 选中态：与局部 patch 同一写入函数（syncSelection），两条路径产物恒一致
      this.writeRowSelectionState(el, this.selected.has(row.task.id))
      el.addEventListener('focus', () => this.setActiveRow(row.task.id))
      // 关键路径标记（show-critical-path 开启时 criticalIds 非空；关闭时空集 → 零影响）
      if (this.criticalIds.has(row.task.id)) el.classList.add('critical')
      if (this.conflictIds.has(row.task.id)) el.classList.add('conflict')
      if (row.task.disabled === true) {
        el.setAttribute('disabled', '')
        el.setAttribute('aria-disabled', 'true')
      }
      if (!this._winMode.windowed) {
        // 行重排手柄：pointerdown 事件冒泡到行，走 onRowPointerDown 的统一入口
        // （自带 e.button/多 ctx 互斥守卫 + 判拖阈值），避免自建 handler 漏守卫与误触发。
        // 细指针悬停/聚焦显形，粗指针常显；windowed 下不出手柄（行重排已禁用）。
        const drag = document.createElement('span')
        drag.className = 'row-drag'
        drag.setAttribute('aria-hidden', 'true')
        drag.textContent = '⋮⋮'
        el.appendChild(drag)
      }
      if (row.hasChildren) {
        const expandedNow = expanded.has(row.task.id)
        el.setAttribute('aria-expanded', String(expandedNow))
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = 'toggle'
        toggle.setAttribute('aria-expanded', String(expandedNow))
        toggle.setAttribute('aria-label', this.t(expandedNow ? 'gantt.collapse' : 'gantt.expand'))
        toggle.textContent = expandedNow ? '−' : '+'
        toggle.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleExpand(row.task.id)
        })
        el.appendChild(toggle)
      }
      const name = document.createElement('span')
      name.className = 'name'
      if (rowTpl instanceof HTMLTemplateElement) {
        // 行名列自定义模板：宿主可渲染「负责人」等任意列/控件（[data-task-name] 自动填任务名）
        name.appendChild(cloneSlotContent(rowTpl))
        name.querySelectorAll<HTMLElement>('[data-task-name]').forEach((n) => {
          n.textContent = row.task.name
        })
      } else {
        name.textContent = row.task.name
        if (!this.hasAttr('readonly') && row.task.disabled !== true) {
          name.addEventListener('dblclick', (e) => {
            e.stopPropagation()
            this.startRename(row, name)
          })
        }
      }
      el.appendChild(name)
      // 偏差徽标（show-variance）：取数走 pickBaseline（baseline-id 选择 + 单 baseline 归一）
      const rowBaseline = this.pickBaseline(row)
      if (this.varianceOn() && rowBaseline) {
        const variance = computeVariance([row.task], this.baselineIdValue() || undefined)[0]
        if (variance) {
          const badge = document.createElement('span')
          badge.className = 'variance'
          badge.dataset.startDelta = String(variance.startDelta)
          badge.dataset.endDelta = String(variance.endDelta)
          badge.dataset.durationDelta = String(variance.durationDelta)
          if (variance.progressDelta != null) badge.dataset.progressDelta = String(variance.progressDelta)
          if (variance.endDelta > 0) badge.dataset.late = ''
          else if (variance.endDelta < 0) badge.dataset.early = ''
          badge.textContent = `Δ${variance.endDelta > 0 ? '+' : ''}${variance.endDelta}d`
          const bEnd = rowBaseline.end ?? rowBaseline.start
          const baseEnd = parseTaskDate(bEnd)
          badge.title = baseEnd ? this.baselineDeltaText(row, baseEnd.getTime()) : badge.textContent
          badge.setAttribute('aria-label', badge.title)
          el.appendChild(badge)
        }
      }
      // 行内新建（creatable）：只读与任务级禁用行不出按钮
      if (this.hasAttr('creatable') && !this.hasAttr('readonly') && row.task.disabled !== true) {
        const add = document.createElement('button')
        add.type = 'button'
        add.className = 'row-add'
        add.setAttribute('aria-label', this.t(row.hasChildren ? 'gantt.addChild' : 'gantt.addTask'))
        add.textContent = '＋'
        add.addEventListener('click', (e) => {
          e.stopPropagation()
          this.onRowAdd(row)
        })
        el.appendChild(add)
      }
      // 工时单元格（show-effort opt-in）：追加为行尾最后一个节点，右缘与表头工时列对齐；
      // effort 缺失/非法显示空（清洗层已过滤，这里双保险）；关闭时不出节点——单列形态不变。
      // 可读名：裸数字对读屏不成话 → aria-label 走 i18n 带单位文案（gantt.effortValue，
      // 与 resource 行头「成本 N」前缀方案对齐）；空值不加 label（不产出可读名碎片）
      if (this.effortOn()) {
        const effort = document.createElement('span')
        effort.className = 'effort'
        const text = formatEffortCell(row.task.effort)
        effort.textContent = text
        if (text !== '') effort.setAttribute('aria-label', this.t('gantt.effortValue', { value: text }))
        el.appendChild(effort)
      }
      el.addEventListener('pointerdown', (e) => this.onRowPointerDown(e as PointerEvent, row))
      el.addEventListener('keydown', (e) => this.onRowKeyDown(e as KeyboardEvent, row))
      frag.appendChild(el)
    }
    container.appendChild(frag)
    // 仅当原活动行仍在窗口内才补回焦点（跨窗口的键盘导航）；用户手动滚动致活动行出窗不抢焦点
    if (hadRowFocus && prevActive && prevActive === activeId) {
      container.querySelector<HTMLElement>(`.row-name[data-key="${escId(activeId)}"]`)?.focus({ preventScroll: true })
    }
  }

  /** 任务条层（窗口行）：task / milestone / summary 三形态 + 手柄 + 标签 + task-render 通道 */
  private renderBars(): void {
    const container = this.barsEl
    if (!container) return
    container.innerHTML = ''
    const rowH = this.rowHeightPx()
    const colW = this.colW()
    const rtl = isRtl(this)
    const tplTask = this.querySelector('template[slot="task"]')
    const roDates = this.datesReadonlyOn()
    const roProgress = this.progressReadonlyOn()
    // 计划进度刻度锚点（show-status-line 开启才消费；闸门后短路——默认路径不解析 status-date）
    const statusOn = this.statusLineOn()
    const statusMs = statusOn ? this.statusDateMs() : 0
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      const disabled = row.task.disabled === true
      const bar = document.createElement('div')
      bar.className = 'bar'
      bar.dataset.id = row.task.id
      bar.setAttribute('part', 'bar')
      // 选中态：与局部 patch 同一写入函数（syncSelection），两条路径产物恒一致
      this.writeBarSelectionState(bar, this.selected.has(row.task.id))
      if (this.criticalIds.has(row.task.id)) bar.classList.add('critical')
      if (this.conflictIds.has(row.task.id)) bar.classList.add('conflict')
      // 触屏：点条揭示连线点（无 hover，重建后按记录恢复）
      if (this.coarse) {
        if (this.touchActiveId === row.task.id) bar.classList.add('touch-active')
        bar.addEventListener('pointerdown', () => this.revealDots(row.task.id))
      }
      bar.style.top = `${this.absRowTop(i) + (rowH - (row.isSummary ? 8 : 22)) / 2}px`
      if (row.task.color) bar.style.setProperty('--oas-gantt-bar-color', row.task.color)
      if (disabled) {
        bar.setAttribute('disabled', '')
        bar.setAttribute('aria-disabled', 'true')
      }

      if (row.isMilestone) {
        bar.classList.add('milestone')
        const center = this.mirrorX(this.xOf(row.startMs) + colW / 2)
        bar.style.left = `${center - 8}px`
        bar.style.width = '16px'
        const dia = document.createElement('span')
        dia.className = 'dia'
        dia.style.left = '50%'
        bar.appendChild(dia)
        // 计划进度刻度（里程碑按二值：status 时刻已到 1 / 未到 0；未开 show-status-line 不渲染）
        if (statusOn) {
          const tick = document.createElement('span')
          tick.className = 'plan-tick'
          tick.setAttribute('aria-hidden', 'true')
          const ratio = this.plannedRatio(row, statusMs)
          // data-plan-ratio（0-1，两位精度）：宿主可消费的机器可读值；样式定位用逻辑属性
          // inset-inline-start（min() 钳右缘防 2px 溢出——.bar overflow:visible，milestone 需要它）
          tick.dataset.planRatio = String(Math.round(ratio * 100) / 100)
          tick.style.insetInlineStart = `min(calc(100% - 2px), ${ratio * 100}%)`
          bar.appendChild(tick)
        }
        bar.setAttribute('role', 'button')
        bar.tabIndex = 0
        bar.setAttribute(
          'aria-label',
          this.t('gantt.milestoneAria', { name: row.task.name, date: this.fmtDay(row.startMs) }),
        )
      } else {
        const x1 = this.xOf(row.startMs)
        const x2 = this.xOf(row.endMs)
        const w = Math.max(x2 - x1, 2)
        bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        bar.style.width = `${w}px`
        if (row.isSummary) {
          bar.classList.add('summary')
        } else {
          const pos = this.labelPositionMode()
          if (pos !== 'none') bar.classList.add(`label-${pos}`)
          bar.setAttribute('role', 'button')
          bar.tabIndex = 0
          bar.setAttribute(
            'aria-label',
            this.t('gantt.taskAria', {
              name: row.task.name,
              start: this.fmtDay(row.startMs),
              end: this.fmtDay(row.endMs - 1),
              progress: row.progress,
            }),
          )
          const prog = document.createElement('span')
          prog.className = 'bar-progress'
          prog.style.width = `${row.progress}%`
          bar.appendChild(prog)
          // 条旁/条内标签：仅 label-position 显式开启时渲染（缺省 none，避免与行名重复）
          if (pos !== 'none') {
            const label = document.createElement('span')
            label.className = 'bar-label'
            if (tplTask instanceof HTMLTemplateElement) {
              label.appendChild(cloneSlotContent(tplTask))
              const bound = label.querySelector<HTMLElement>('[data-task-name]')
              if (bound) bound.textContent = row.task.name
            } else {
              label.textContent = row.task.name
            }
            bar.appendChild(label)
          }
          // 手柄（只读/禁用态不出手柄，视觉即语义）
          if (!roDates && !disabled) {
            const hs = document.createElement('span')
            hs.className = 'handle handle-start'
            bar.appendChild(hs)
            const he = document.createElement('span')
            he.className = 'handle handle-end'
            bar.appendChild(he)
          }
          if (!roProgress && !disabled && row.task.end) {
            const ph = document.createElement('span')
            ph.className = 'progress-handle'
            ph.style.insetInlineStart = `${row.progress}%`
            bar.appendChild(ph)
          }
        }
      }

      // 条内计划进度刻度（show-status-line opt-in）：普通任务条内按 planned% 画窄竖刻度
      //（status-date 时刻在 [start, end] 的时间流逝占比，clamp 0-1；纯展示、不染色不告警）。
      // summary 不画（聚合条无单一进度语义）；milestone 在上方分支按二值画。
      if (statusOn && !row.isSummary && !row.isMilestone) {
        const tick = document.createElement('span')
        tick.className = 'plan-tick'
        tick.setAttribute('aria-hidden', 'true')
        const ratio = this.plannedRatio(row, statusMs)
        // data-plan-ratio（0-1，两位精度）：宿主可消费的机器可读值（同 total-float 数据属性惯例）
        tick.dataset.planRatio = String(Math.round(ratio * 100) / 100)
        // 2px 刻度钳在条内（.bar overflow:visible，100% 定位会溢出 2px → min() 收到右缘内）
        tick.style.insetInlineStart = `min(calc(100% - 2px), ${ratio * 100}%)`
        bar.appendChild(tick)
      }

      // 浮时：仅 show-float 开启时渲染（数据属性供宿主消费，标签为视觉提示）
      if (!row.isSummary && this.showFloatOn() && this.totalFloatMs.has(row.task.id)) {
        const totalDays = Math.round(this.totalFloatMs.get(row.task.id)! / DAY_MS)
        const freeDays = Math.round(this.freeFloatMs.get(row.task.id)! / DAY_MS)
        bar.dataset.totalFloat = String(totalDays)
        bar.dataset.freeFloat = String(freeDays)
        bar.classList.add('has-float')
        const text = this.t('gantt.floatSummary', { total: totalDays, free: freeDays })
        // 条旁 label-right/left：并入同一标签，避免两个绝对定位标签叠印；
        // 条内 label-inside：任务名在条内，浮时仍放条外（不受窄条截断，且不叠印）。
        const existingLabel = bar.querySelector<HTMLElement>('.bar-label')
        if (existingLabel && !bar.classList.contains('label-inside')) {
          const inline = document.createElement('span')
          inline.className = 'float-inline'
          inline.setAttribute('aria-hidden', 'true')
          inline.textContent = text
          existingLabel.appendChild(inline)
        } else {
          const fl = document.createElement('span')
          fl.className = 'float-label'
          fl.setAttribute('part', 'float')
          fl.setAttribute('aria-hidden', 'true')
          fl.textContent = text
          bar.appendChild(fl)
        }
      }

      // 基线对比条（计划 vs 实际）：置于实际条之下，只读展示；取数走 pickBaseline
      //（baseline-id 属性选择，缺省/未命中回落第一条；含单 baseline 字段归一）
      const barBaseline = this.pickBaseline(row)
      if (this.baselineOn() && barBaseline && !row.isMilestone) {
        const b = barBaseline
        const bs = parseTaskDate(b.start)?.getTime()
        const beParsed = b.end ? parseTaskDate(b.end)?.getTime() : undefined
        if (bs !== undefined) {
          const be = beParsed !== undefined ? (b.end!.length > 10 ? beParsed : addLocalDays(beParsed, 1)) : bs
          const bx1 = this.xOf(bs)
          const bEnd = Math.max(be, bs)
          const bw = Math.max(this.xOf(bEnd) - bx1, 2)
          const barH = row.isSummary ? 8 : 22
          const bl = document.createElement('div')
          bl.className = 'baseline'
          bl.dataset.id = row.task.id
          bl.setAttribute('part', 'baseline')
          bl.style.top = `${this.absRowTop(i) + (rowH - barH) / 2 + barH + 2}px`
          bl.style.left = `${this.mirrorX(bx1) - (rtl ? bw : 0)}px`
          bl.style.width = `${bw}px`
          bl.title = this.baselineDeltaText(row, bEnd)
          const variance = computeVariance([row.task], this.baselineIdValue() || undefined)[0]
          if (variance) {
            bl.dataset.startDelta = String(variance.startDelta)
            bl.dataset.endDelta = String(variance.endDelta)
            bl.dataset.durationDelta = String(variance.durationDelta)
            if (variance.progressDelta != null) bl.dataset.progressDelta = String(variance.progressDelta)
          }
          if (b.progress !== undefined) {
            const bp = document.createElement('span')
            bp.className = 'baseline-progress'
            bp.style.width = `${b.progress}%`
            bl.appendChild(bp)
          }
          frag.appendChild(bl)
        }
      }
      // 截止标记：横向位置 = deadline 日期，纵向贯穿行高；超出截止日的条另加 .conflict
      const deadlineValues = [
        ...new Set([...(row.task.deadline ? [row.task.deadline] : []), ...(row.task.deadlines ?? [])]),
      ]
      for (let di = 0; di < deadlineValues.length; di++) {
        const dlMs = parseTaskDate(deadlineValues[di]!)?.getTime()
        if (dlMs === undefined) continue
        const dl = document.createElement('span')
        dl.className = 'deadline'
        dl.dataset.id = row.task.id
        dl.dataset.deadlineIndex = String(di)
        dl.setAttribute('part', 'deadline')
        dl.setAttribute('role', 'img')
        const deadlineText = this.t('gantt.deadline', { date: this.fmtDay(dlMs) })
        dl.setAttribute('aria-label', deadlineText)
        dl.title = deadlineText
        dl.style.left = `${this.mirrorX(this.xOf(dlMs))}px`
        dl.style.top = `${this.absRowTop(i)}px`
        dl.style.height = `${rowH}px`
        frag.appendChild(dl)
      }

      // 连线点（拖拽建依赖）：仅非只读态渲染，悬停显现（disabled 任务可作**前置**，故仍渲染）
      // 里程碑 start==end，两点几何重合易误判类型 → 只出「完成端」单点（fs 惯例）
      if (!this.hasAttr('readonly')) {
        for (const ep of row.isMilestone ? (['end'] as const) : (['start', 'end'] as const)) {
          const dot = document.createElement('span')
          dot.className = `link-dot link-${ep}`
          dot.dataset.id = row.task.id
          dot.setAttribute('part', 'link-dot')
          dot.setAttribute('aria-hidden', 'true')
          dot.addEventListener('pointerdown', (e) => {
            e.stopPropagation()
            this.onLinkDotPointerDown(e as PointerEvent, row, i, ep)
          })
          dot.addEventListener('click', (e) => e.stopPropagation()) // 防冒泡到条触发 task-click
          bar.appendChild(dot)
        }
      }
      this.bindBar(bar, row)
      frag.appendChild(bar)
      this.emit('task-render', { task: this.taskSnapshot(row.task), element: bar } satisfies GanttTaskRenderDetail)
    }
    container.appendChild(frag)
  }

  private fmtDay(ms: number): string {
    return fmtDay(ms)
  }

  private taskSnapshot(t: TG): GanttTask {
    return taskSnapshot(t)
  }

  private bindBar(bar: HTMLElement, row: GanttRow): void {
    bar.addEventListener('click', () => {
      this.emit('task-click', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('dblclick', () => {
      this.emit('task-dblclick', { id: row.task.id, task: this.taskSnapshot(row.task) } satisfies GanttTaskClickDetail)
    })
    bar.addEventListener('pointerdown', (e) => this.onBarPointerDown(e as PointerEvent, row, bar))
    bar.addEventListener('keydown', (e) => this.onBarKeyDown(e as KeyboardEvent, row))
    bar.addEventListener('mouseenter', () => this.showTooltip(row, bar))
    bar.addEventListener('mouseleave', () => this.hideTooltip())
  }

  // ===== 拖拽三件套（改期 / 拉伸 / 进度）：pointer 序列，收口（pointerup）一次性写回 + 派发 =====
  //
  // move/up/cancel 统一挂 document（冒泡终点）：setPointerCapture 在部分引擎对合成指针不生效
  // （实测 Firefox），capture 失败后拖出条元素的指针事件不再经过条本身——document 层监听在
  // 两个引擎都是可靠路径；capture 仅保留为指针快速移出窗口时的视觉辅助，不作事件依赖。

  private docPointerMove = (e: PointerEvent): void => {
    if (this.dragCtx) this.onBarPointerMove(e)
  }
  private docPointerUp = (e: PointerEvent): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.onBarPointerUp(e)
  }
  private docPointerCancel = (): void => {
    if (!this.dragCtx) return
    this.unbindDocDrag()
    this.cancelDrag()
  }

  private bindDocDrag(): void {
    document.addEventListener('pointermove', this.docPointerMove)
    document.addEventListener('pointerup', this.docPointerUp)
    document.addEventListener('pointercancel', this.docPointerCancel)
  }

  private unbindDocDrag(): void {
    document.removeEventListener('pointermove', this.docPointerMove)
    document.removeEventListener('pointerup', this.docPointerUp)
    document.removeEventListener('pointercancel', this.docPointerCancel)
  }

  // ===== 行拖拽改父子 / 重排（左侧名称列）=====

  private docReparentMove = (e: PointerEvent): void => {
    if (this.reparentCtx) this.onReparentMove(e)
  }
  private docReparentUp = (): void => {
    this.onReparentUp()
  }
  private docReparentCancel = (): void => {
    this.cancelReparent()
  }
  private docReparentKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.cancelReparent()
  }

  private bindDocReparent(): void {
    document.addEventListener('pointermove', this.docReparentMove)
    document.addEventListener('pointerup', this.docReparentUp)
    document.addEventListener('pointercancel', this.docReparentCancel)
    document.addEventListener('keydown', this.docReparentKey)
  }

  private unbindDocReparent(): void {
    document.removeEventListener('pointermove', this.docReparentMove)
    document.removeEventListener('pointerup', this.docReparentUp)
    document.removeEventListener('pointercancel', this.docReparentCancel)
    document.removeEventListener('keydown', this.docReparentKey)
  }

  private onRowPointerDown(e: PointerEvent, row: GanttRow): void {
    if (e.button !== 0 || this.reparentCtx || this.dragCtx || this.linkCtx || this.rowPending) return
    if (
      (e.target as HTMLElement).closest(
        '.toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
      )
    )
      return
    // 先待定：位移阈值才进入重排，否则收口视作点击（多选）。readonly 允许多选，仅拖拽重排被禁止。
    this.rowPending = {
      id: row.task.id,
      x: e.clientX,
      y: e.clientY,
      disabled: row.task.disabled === true,
      // 手柄起手：判拖阈值后进重排；纯点按（未达阈值）不进选择，避免「点手柄改了选中」
      viaHandle: (e.target as HTMLElement).classList.contains('row-drag'),
      textTarget: !!(e.target as HTMLElement).closest('.name'),
      byId: new Map(this._tasks.map((t) => [t.id, t])),
    }
    this.bindRowPending()
  }

  private onReparentMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.updateReparentTarget(e.clientX, e.clientY)
    this.startAutoScroll()
  }

  private updateReparentTarget(clientX: number, clientY: number): void {
    const ctx = this.reparentCtx
    const side = this.sideBody
    if (!ctx || !side) return
    const rect = side.getBoundingClientRect()
    const rowH = this.rowHeightPx()
    const y = clientY - rect.top + side.scrollTop
    // 指针 y 对应**画布绝对行**（windowed 下含 window-start 偏移），换算回 rows 局部下标找目标行
    const absIdx = Math.max(0, Math.min(this.layoutRows() - 1, Math.floor(y / rowH)))
    const idx = absIdx - (this._winMode.windowed ? this._winMode.windowStart : 0)
    const target = this.rows[idx]
    if (!target) return
    const localY = y - absIdx * rowH
    const x = isRtl(this) ? rect.right - clientX : clientX - rect.left
    const indent = 8 + target.depth * 16
    let mode: 'before' | 'after' | 'inside' = localY < rowH / 2 ? 'before' : 'after'
    // 指针越过目标缩进一定量 → 落为目标子级（右半区下压生效）
    if (x > indent + 24 && rowH - localY > 8) mode = 'inside'
    // disabled 目标禁止 drop-inside（改其结构归属，进而改派生聚合）；前/后同级插入只改父级子序，不动 disabled 自身
    if (!this.canReparent(ctx.id, target.task.id, ctx.byId) || (target.task.disabled === true && mode === 'inside')) {
      this.reparentTarget = null
      this.hideDropLine()
      return
    }
    this.reparentTarget = { id: target.task.id, mode }
    this.showDropLine(idx, target, mode, rowH)
  }

  private onReparentUp(): void {
    this.stopAutoScroll()
    const ctx = this.reparentCtx
    const target = this.reparentTarget
    this.reparentCtx = null
    this.reparentTarget = null
    this.unbindDocReparent()
    this.hideDropLine()
    if (!ctx || !target) return
    this.applyReparent(ctx.id, target.id, target.mode)
  }

  private cancelReparent(): void {
    this.stopAutoScroll()
    if (!this.reparentCtx) return
    this.reparentCtx = null
    this.reparentTarget = null
    this.unbindDocReparent()
    this.hideDropLine()
  }

  private canReparent(dragId: string, targetId: string, byId: Map<string, TG>): boolean {
    return canReparent(dragId, targetId, byId)
  }

  private isDescendantOf(node: TG, ancestorId: string, byId: Map<string, TG>): boolean {
    return isDescendantOf(node, ancestorId, byId)
  }

  private showDropLine(idx: number, target: GanttRow, mode: 'before' | 'after' | 'inside', rowH: number): void {
    const container = this.sideRows
    if (!container) return
    if (!this.dropLineEl || !this.dropLineEl.isConnected) {
      const el = document.createElement('div')
      el.className = 'drop-line'
      container.appendChild(el)
      this.dropLineEl = el
    }
    const line = this.dropLineEl
    const indent = 8 + target.depth * 16 + (mode === 'inside' ? 16 : 0)
    line.style.top = `${this.absRowTop(mode === 'after' ? idx + 1 : idx)}px`
    line.style.insetInlineStart = `${indent}px`
    line.style.height = mode === 'inside' ? `${rowH}px` : '2px'
    line.dataset.mode = mode
  }

  private hideDropLine(): void {
    this.dropLineEl?.remove()
    this.dropLineEl = null
  }

  /** 应用重排：改 parent + 同级顺序，写回并派发 oas-reparent / oas-tasks-change */
  private applyReparent(dragId: string, targetId: string, mode: 'before' | 'after' | 'inside'): void {
    const tasks = this._tasks
    if (!tasks.some((t) => t.id === dragId) || !tasks.some((t) => t.id === targetId)) return
    const dragged = tasks.find((t) => t.id === dragId)!
    const beforeSig = tasks.map((t) => `${t.id}:${t.parent ?? ''}`).join('|')
    const rest = tasks.filter((t) => t.id !== dragId)
    const byId = new Map(rest.map((t) => [t.id, t]))
    const tIdx = rest.findIndex((t) => t.id === targetId)
    const target = rest[tIdx]!
    let parent: string | null = null
    let insertAt: number
    if (mode === 'inside') {
      parent = target.id
      let last = tIdx
      for (let i = tIdx + 1; i < rest.length; i++) {
        if (this.isDescendantOf(rest[i]!, target.id, byId)) last = i
      }
      insertAt = last + 1
    } else {
      parent = target.parent ?? null
      insertAt = mode === 'before' ? tIdx : tIdx + 1
    }
    if (parent) dragged.parent = parent
    else delete dragged.parent
    rest.splice(insertAt, 0, dragged)
    // 零变化（原地放下 / 顺序与父子均未变）不写回、不派发
    if (rest.map((t) => `${t.id}:${t.parent ?? ''}`).join('|') === beforeSig) return
    this._tasks = rest
    let index = 0
    for (const t of rest) {
      if (t.id === dragId) break
      if ((t.parent ?? null) === parent) index++
    }
    this.syncTasksAttr()
    this.emitTasksChange()
    this.emit('reparent', { id: dragId, parent, index } satisfies GanttReparentDetail)
  }

  // ===== 多选 / 批量 / 行内重命名 / 行键盘重排 =====

  /**
   * @apiProperty 选中任务 id 集合（多选）：读为数组拷贝；写为程序性赋值（重渲染选中态 + 派发 oas-selection-change）。
   */
  get selection(): string[] {
    return [...this.selected]
  }
  set selection(ids: string[]) {
    const next = new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [])
    const same = next.size === this.selected.size && [...next].every((id) => this.selected.has(id))
    this.selected = next
    this.selectionAnchor = null
    this.syncSelection()
    if (!same) this.emitSelectionChange()
  }

  /**
   * @apiProperty 资源池实例（实例隔离通道，JS-only property 不进 attribute）：写入宿主自建的
   * `ResourcePool`（`createResourcePool()`）后，池的全部消费面——tooltip 资源名 / 跨任务超配
   * 冲突 / 负荷面板——改从该实例取数，写后立即重算资源相关面（不经手动 update）；写 `null` /
   * `undefined` / 非实例值恢复共享单例（`getSharedResourcePool()`，默认通道，向后兼容）。
   * 读为当前生效池（注入实例引用相等；未注入时为共享池包装，语义等价 `getSharedResourcePool()`）。
   */
  get resourcePool(): ResourcePool {
    return this.effectivePool()
  }
  set resourcePool(pool: ResourcePool | null) {
    // 容错口径：仅 ResourcePool 实例生效（跨副本的类身份不同——结构守卫不可用，
    // instanceof 对同副本实例是准确的；跨副本注入走共享单例本身即天然互通）
    this.poolOverride = pool instanceof ResourcePool ? pool : null
    this.requestUpdate()
  }

  /** 批量删除任务（连同其后代）；找不到即忽略 */
  removeTasks(ids: string[]): void {
    const known = new Set(this._tasks.map((t) => t.id))
    const set = new Set(ids.filter((x) => typeof x === 'string' && known.has(x)))
    if (set.size === 0) return
    let changed = true
    while (changed) {
      changed = false
      for (const t of this._tasks) {
        if (t.parent && set.has(t.parent) && !set.has(t.id)) {
          set.add(t.id)
          changed = true
        }
      }
    }
    this._tasks = this._tasks.filter((t) => !set.has(t.id))
    // 清洗其他任务里指向被删 id 的悬空依赖（受影响后继补发 dependencies-change）
    const affected: TG[] = []
    for (const t of this._tasks) {
      if (t.dependencies?.some((d) => set.has(d.id))) {
        const next = t.dependencies.filter((d) => !set.has(d.id))
        t.dependencies = next.length > 0 ? next : undefined
        affected.push(t)
      }
    }
    this.syncTasksAttr()
    this.emitTasksChange()
    for (const t of affected) {
      this.emit('dependencies-change', {
        taskId: t.id,
        dependencies: (t.dependencies ?? []).map((d) => ({ ...d })),
      } satisfies GanttDependenciesChangeDetail)
    }
  }

  // ===== 命令式创作通道（新增 / 移动 / 复制 / 依赖 / 批量 / 缩放）=====

  /**
   * 新增任务（命令式创作通道）：返回新任务 id；非法输入返回 ''（零改动、零事件）。
   * 缺省：name 走 i18n `gantt.newTask`、start 为今天、非里程碑补 end = start（1 天含端）；
   * 显式 id 与现有冲突时自动避让；parent 不存在按根处理。
   * 位置：opts.before 插到该 id 前、opts.after 插到其后，否则挂到 parent 子树（最后后代）之后 / 根级末尾。
   * 写回经 sanitizeTasks 清洗；派发 oas-tasks-change 与 oas-task-add（detail { id, task }）。
   */
  addTask(
    task: Partial<GanttTask> = {},
    opts: { parent?: string | null; before?: string; after?: string } = {},
  ): string {
    const ids = new Set(this._tasks.map((t) => t.id))
    const candidate: Record<string, unknown> = { ...task }
    delete candidate.children
    const explicitId = typeof task.id === 'string' && task.id !== '' && !ids.has(task.id) ? task.id : undefined
    candidate.id = explicitId ?? this.allocId(new Set(ids))
    // 非法 end（非空串且解析失败）显式拒绝（与 updateTask/updateTasks 同口径），避免静默降级为里程碑
    if (task.end !== undefined && task.end !== '' && !parseTaskDate(task.end)) return ''
    if (typeof candidate.name !== 'string' || candidate.name === '') candidate.name = this.t('gantt.newTask')
    const start = typeof task.start === 'string' && task.start !== '' ? task.start : toISODate(new Date())
    candidate.start = start
    if (task.end === undefined && task.type !== 'milestone') candidate.end = start
    const parentRaw = opts.parent !== undefined ? opts.parent : (task.parent ?? null)
    const parentId = typeof parentRaw === 'string' && parentRaw !== '' && ids.has(parentRaw) ? parentRaw : undefined
    if (parentId) candidate.parent = parentId
    else delete candidate.parent
    const [clean] = sanitizeTasks(
      [candidate],
      (used) => this.allocId(used),
      (key, msg) => this.warnOnce(key, msg),
    )
    if (!clean) return ''
    const id = clean.id
    const idxOf = (tid: string): number => this._tasks.findIndex((t) => t.id === tid)
    const beforeIdx = opts.before !== undefined ? idxOf(opts.before) : -1
    const afterIdx = opts.after !== undefined ? idxOf(opts.after) : -1
    let insertAt = this._tasks.length
    if (beforeIdx >= 0) {
      insertAt = beforeIdx
    } else if (afterIdx >= 0) {
      insertAt = afterIdx + 1
    } else if (parentId) {
      // 挂到 parent 子树（其最后一个后代）之后，保持同级顺序
      const byId = new Map(this._tasks.map((t) => [t.id, t]))
      let last = idxOf(parentId)
      this._tasks.forEach((t, i) => {
        if (i > last && this.isDescendantOf(t, parentId, byId)) last = i
      })
      insertAt = last + 1
    }
    this._tasks = [...this._tasks.slice(0, insertAt), clean, ...this._tasks.slice(insertAt)]
    if (parentId) this.ensureExpanded(parentId)
    this.commitTasks()
    this.emit('task-add', { id, task: this.taskSnapshot(clean) } satisfies GanttTaskAddDetail)
    return id
  }

  /**
   * 移动任务到指定父级（opts.parent 省略保持原父级、null 移为根级）下的第 index 位
   * （index 省略追加到该父级子级末尾，越界钳制）。
   * 目标父级不合法（自身 / 其后代 / 不存在）或结果零变化 → false（零写回零事件）。
   * 成功派发 oas-reparent（detail { id, parent, index }，index 为移动后同级序号）。
   */
  moveTask(id: string, opts: { parent?: string | null; index?: number } = {}): boolean {
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const node = byId.get(id)
    if (!node) return false
    let parent: string | null
    if (opts.parent === undefined) {
      parent = node.parent ?? null
    } else if (opts.parent === null) {
      parent = null
    } else {
      const p = opts.parent
      const pNode = byId.get(p)
      // 防环：目标为自身，或目标落在自身子树内（会形成父指针环）
      if (!pNode || p === id || this.isDescendantOf(pNode, id, byId)) return false
      parent = p
    }
    const beforeSig = this._tasks.map((t) => `${t.id}:${t.parent ?? ''}`).join('|')
    const rest = this._tasks.filter((t) => t.id !== id)
    if (parent) node.parent = parent
    else delete node.parent
    const siblings = rest.filter((t) => (t.parent ?? null) === parent)
    const rawIdx = opts.index === undefined ? siblings.length : Math.floor(opts.index)
    const idx = Number.isFinite(rawIdx) ? Math.max(0, Math.min(rawIdx, siblings.length)) : siblings.length
    let insertAt = rest.length
    if (idx < siblings.length) {
      const anchor = siblings[idx]!.id
      insertAt = rest.findIndex((t) => t.id === anchor)
    } else if (siblings.length > 0) {
      const lastId = siblings[siblings.length - 1]!.id
      insertAt = rest.findIndex((t) => t.id === lastId) + 1
    }
    rest.splice(insertAt, 0, node)
    // 零变化（顺序与父子均未变）不写回、不派发
    if (rest.map((t) => `${t.id}:${t.parent ?? ''}`).join('|') === beforeSig) return false
    this._tasks = rest
    let index = 0
    for (const t of rest) {
      if (t.id === id) break
      if ((t.parent ?? null) === parent) index++
    }
    this.commitTasks()
    this.emit('reparent', { id, parent, index } satisfies GanttReparentDetail)
    return true
  }

  /**
   * 复制任务及其全部后代（深拷贝、各自新 id，父指针映射到新 id），紧跟原子树之后插入，返回新根 id；
   * id 不存在 → null。opts.id / opts.name 覆盖根克隆（id 冲突自动避让）；opts.parent 覆盖根父级
   * （未给则沿用原父级）。派发 oas-tasks-change 与 oas-task-add（新根）。
   */
  duplicateTask(id: string, opts: { id?: string; name?: string; parent?: string | null } = {}): string | null {
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const root = byId.get(id)
    if (!root) return null
    const childMap = new Map<string, TG[]>()
    for (const t of this._tasks) {
      if (t.parent) {
        const list = childMap.get(t.parent) ?? []
        list.push(t)
        childMap.set(t.parent, list)
      }
    }
    // DFS 收集子树（seen 守卫防 parent 成环时无限递归）
    const subtree: TG[] = []
    const seen = new Set<string>()
    const collect = (t: TG): void => {
      if (seen.has(t.id)) return
      seen.add(t.id)
      subtree.push(t)
      for (const c of childMap.get(t.id) ?? []) collect(c)
    }
    collect(root)
    const used = new Set(this._tasks.map((t) => t.id))
    const idMap = new Map<string, string>()
    for (const t of subtree) {
      let nid: string
      if (t === root && typeof opts.id === 'string' && opts.id !== '' && !used.has(opts.id)) nid = opts.id
      else nid = this.allocId(used)
      used.add(nid)
      idMap.set(t.id, nid)
    }
    const parentRaw = opts.parent !== undefined ? opts.parent : (root.parent ?? null)
    // 与 addTask 一致：父级必须存在，否则按根处理（不留悬空父指针）
    const rootParent = typeof parentRaw === 'string' && parentRaw !== '' && byId.has(parentRaw) ? parentRaw : null
    const clones: TG[] = subtree.map((t) => {
      const clone: TG = { ...t, id: idMap.get(t.id)! }
      // 依赖深拷贝：子树内的前置 id 映射到克隆 id（避免与原体串联），子树外保留原 id
      if (clone.dependencies)
        clone.dependencies = clone.dependencies.map((d) => ({ ...d, id: idMap.get(d.id) ?? d.id }))
      if (clone.baseline) clone.baseline = { ...clone.baseline }
      if (clone.baselines) clone.baselines = clone.baselines.map((b) => ({ ...b }))
      delete clone.children
      if (t === root) {
        if (rootParent) clone.parent = rootParent
        else delete clone.parent
        if (typeof opts.name === 'string' && opts.name !== '') clone.name = opts.name
      } else if (t.parent && idMap.has(t.parent)) {
        clone.parent = idMap.get(t.parent)!
      }
      return clone
    })
    let lastIdx = this._tasks.findIndex((t) => t.id === id)
    this._tasks.forEach((t, i) => {
      if (idMap.has(t.id) && i > lastIdx) lastIdx = i
    })
    const insertAt = lastIdx + 1
    this._tasks = [...this._tasks.slice(0, insertAt), ...clones, ...this._tasks.slice(insertAt)]
    const newRoot = clones[0]!
    this.commitTasks()
    this.emit('task-add', { id: newRoot.id, task: this.taskSnapshot(newRoot) } satisfies GanttTaskAddDetail)
    return newRoot.id
  }

  /**
   * 新增依赖（后继 taskId 依赖 dep.id）：type 缺省 fs；lag（天，可负）可选，缺省不写（等价 0）。
   * 同源同型已存在返回 false（不重复；lag 不参与去重键）。
   * 非法（任务/目标不存在、自身依赖）返回 false。成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  addDependency(taskId: string, dep: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number }): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    if (!this._tasks.some((t) => t.id === dep.id) || dep.id === taskId) return false
    const type = dep.type && DEP_TYPES.has(dep.type) ? dep.type : 'fs'
    const deps = task.dependencies ?? []
    if (deps.some((d) => d.id === dep.id && (d.type ?? 'fs') === type)) return false
    const entry: GanttDependency = { id: dep.id, type }
    // lag 安全域收口（与 sanitizeDeps 同一函数）：越域/非法 → 丢弃为无 lag（等价 0），依赖保留
    const lag = sanitizeLag(dep.lag)
    if (lag !== undefined) entry.lag = lag
    else if (dep.lag !== undefined)
      this.warnOnce(
        `lag:${taskId}`,
        `[oas-gantt] addDependency 的 lag=${String(dep.lag)} 非法或超出安全域（|lag×天| ≤ 1e12 ms），已按 0 处理`,
      )
    const next: GanttDependency[] = [...deps.map((d) => ({ ...d })), entry]
    task.dependencies = next
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 删除依赖：dep.type 给出只删该 (id,type)；未给出删该 id 的全部类型。找不到返回 false。
   * 成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  removeDependency(taskId: string, dep: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf' }): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    const deps = task.dependencies ?? []
    const hasType = dep.type !== undefined
    const next = deps.filter((d) => (hasType ? !(d.id === dep.id && (d.type ?? 'fs') === dep.type) : d.id !== dep.id))
    if (next.length === deps.length) return false
    task.dependencies = next.length > 0 ? next : undefined
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 改写依赖：from 找不到 / to.id 不存在或指向自身 / 无实际变化（含 lag）→ false。
   * to.type 缺省继承 from.type（再缺省 fs）；to.lag 缺省继承 from.lag（缺省不写，等价 0）；
   * 归一后 lag 为 0/缺省时**不落 `lag: 0` 键**（保持依赖对象干净，读回为「无 lag」）。
   * 重写后与既有依赖重复（同 id+type，lag 不参与去重键）则去重（保留一条）。
   * 成功派发 oas-tasks-change 与 oas-dependencies-change。
   */
  updateDependency(
    taskId: string,
    from: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number },
    to: { id: string; type?: 'fs' | 'ss' | 'ff' | 'sf'; lag?: number },
  ): boolean {
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return false
    const deps = task.dependencies ?? []
    const fromType = from.type && DEP_TYPES.has(from.type) ? from.type : 'fs'
    const idx = deps.findIndex((d) => d.id === from.id && (d.type ?? 'fs') === fromType)
    if (idx < 0) return false
    if (!this._tasks.some((t) => t.id === to.id) || to.id === taskId) return false
    const toType = to.type && DEP_TYPES.has(to.type) ? to.type : fromType
    // lag 安全域收口（与 sanitizeDeps 同一函数）：to.lag 越域/非法 → 回退继承原 lag（既有缺省语义）
    const cleanLag = sanitizeLag(to.lag)
    if (to.lag !== undefined && cleanLag === undefined)
      this.warnOnce(
        `lag:${taskId}`,
        `[oas-gantt] updateDependency 的 lag=${String(to.lag)} 非法或超出安全域（|lag×天| ≤ 1e12 ms），已回退继承原 lag`,
      )
    const toLag = cleanLag !== undefined ? cleanLag : deps[idx]!.lag
    const replaced: GanttDependency[] = deps.map((d, i) => {
      if (i !== idx) return { ...d }
      const e: GanttDependency = { id: to.id, type: toType }
      // lag 归一：0 或未给（继承到 0/缺省）时不落 `lag: 0` 键，保持依赖对象干净（sig/去重逻辑不变）
      if (toLag !== undefined && toLag !== 0) e.lag = toLag
      return e
    })
    const dedupSeen = new Set<string>()
    const next = replaced.filter((d) => {
      const key = `${d.id}|${d.type ?? 'fs'}`
      if (dedupSeen.has(key)) return false
      dedupSeen.add(key)
      return true
    })
    const sig = (arr: GanttDependency[]): string => arr.map((d) => `${d.id}|${d.type ?? 'fs'}|${d.lag ?? 0}`).join(',')
    if (sig(next) === sig(deps)) return false
    task.dependencies = next
    this.commitTasks()
    this.emit('dependencies-change', {
      taskId,
      dependencies: next.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  /**
   * 批量浅合并（逐条：id 不存在跳过；end 给非空且解析失败跳过该条；其余走 sanitize 单条清洗，
   * 与 updateTask 同一合法性口径）。多条只做一次 update() 与一次 oas-tasks-change；
   * 返回生效条数，0 条零事件零渲染。
   */
  updateTasks(patches: Array<{ id: string } & Partial<GanttTask>>): number {
    if (!Array.isArray(patches) || patches.length === 0) return 0
    const next = [...this._tasks]
    let applied = 0
    for (const patch of patches) {
      if (!patch || typeof patch.id !== 'string') continue
      const idx = next.findIndex((t) => t.id === patch.id)
      if (idx < 0) continue
      if (patch.end !== undefined && patch.end !== '' && !parseTaskDate(patch.end)) continue
      const merged = { ...next[idx]!, ...patch, id: patch.id }
      const [clean] = sanitizeTasks(
        [merged],
        (used) => this.allocId(used),
        (key, msg) => this.warnOnce(key, msg),
      )
      if (!clean) continue
      clean.id = patch.id
      next[idx] = clean
      applied++
    }
    if (applied === 0) return 0
    this._tasks = next
    this.commitTasks()
    return applied
  }

  /**
   * 超配自动排程避让（pool opt-in，手动触发；纯引擎见 gantt-level.ts）：对当前任务的池内
   * 资源冲突做「整体后移受害者」迭代，直到无冲突或达 maxIter（缺省 500，达上限 truncated:true
   * 且 unresolved 如实返回，不静默）。判据与超配检测同源（computeResourceConflicts 扫描线 +
   * 同款半开区间谓词，相切不算、日精度 end 含端）；受害者排序：disabled / 资源日历 days 空集 /
   * constraint==='mso' 永不让位，有 deadline 者后让位（都有按最晚 deadline 后让位），startMs
   * 晚者先让位，输入序靠后者先让位。平移 day 步进保墙钟时刻（DST 不漂移）、保工期；工作日
   * 吸附放收敛后最终落点（workdays + holidays + 资源日历逐日前进，上限同款），吸附后复检
   * 一次交叠，复检不过继续迭代。里程碑 / summary / 池外资源不参与（skipped 如实回报）。
   *
   * 应用与事件：有移动时先派发 `oas-level`（detail 带 moved/unresolved/truncated），随后经
   * updateTasks 一次提交（= 一条 undo + 一次 oas-tasks-change，数据写回 `.conflict` 视觉
   * 通道随下一次 update 重算缩小）；零移动 = 零写入零事件零 history（幂等，可安全重复调用）。
   * 守卫（devWarn 一次 + 空结果）：pool 关（避让以池内资源冲突为对象）/ windowed（切片上
   * 避让会得到错误结果）/ readonly / dates-readonly（只读态禁止改排期）。
   *
   * @returns 避让结果；moved 已应用到组件数据（宿主无需再写回），纯数据诊断见 skipped
   */
  levelConflicts(options: GanttLevelOptions = {}): GanttLevelResult {
    const empty: GanttLevelResult = { moved: [], unresolved: [], truncated: false, skipped: [] }
    if (!this.poolOn()) {
      if (!this.warnedLevelNoPool) {
        this.warnedLevelNoPool = true
        devWarn('[oas-gantt] levelConflicts 需要 pool 属性开启（避让以池内资源冲突为对象）；本次调用返回空结果')
      }
      return empty
    }
    if (this._winMode.windowed) {
      if (!this.warnedLevelWindowed) {
        this.warnedLevelWindowed = true
        devWarn(
          '[oas-gantt] windowed 模式下超配避让需要全量数据，已跳过（切片上避让会得到错误结果）；请宿主在全量数据上自行排程',
        )
      }
      return empty
    }
    if (this.datesReadonlyOn()) {
      if (!this.warnedLevelReadonly) {
        this.warnedLevelReadonly = true
        devWarn('[oas-gantt] readonly / dates-readonly 只读态下超配避让不可用（禁止改排期）；本次调用返回空结果')
      }
      return empty
    }
    const registeredIds = new Set<string>()
    for (const r of this.effectivePool().list()) {
      if (typeof r.id === 'string' && r.id !== '') registeredIds.add(r.id)
    }
    const result = levelGanttConflicts(this._tasks, registeredIds, (task) => this.taskCalendar(task), options)
    if (result.moved.length === 0) return result
    // 事件序契约：oas-level（应用前）→ oas-tasks-change（updateTasks 一次提交）
    this.emit('level', {
      moved: result.moved.map((m) => ({ ...m })),
      unresolved: result.unresolved.map((u) => ({ ...u })),
      truncated: result.truncated,
    } satisfies GanttLevelDetail)
    this.updateTasks(result.moved.map((m) => ({ id: m.id, start: m.start, end: m.end })))
    return result
  }

  /** 向更细一档步进（写 scale 属性，既有回调派发 oas-scale-change）；最细档 no-op */
  zoomIn(): void {
    const i = SCALES.indexOf(this.scaleMode())
    if (i > 0) this.setAttribute('scale', SCALES[i - 1]!)
  }

  /** 向更粗一档步进；最粗档 no-op */
  zoomOut(): void {
    const i = SCALES.indexOf(this.scaleMode())
    if (i >= 0 && i < SCALES.length - 1) this.setAttribute('scale', SCALES[i + 1]!)
  }

  /**
   * 缩放以容纳全部任务：取**最细且**能满足「跨度按该档单位折算的列数 × 该档最小列宽 ≤ 可用宽」的档
   * （全任务可见前提下尽量保留细节）；都不满足取最粗档 year。写 scale 属性后滚动定位到最早任务；无任务 no-op。
   * 可用宽取 tbody.clientWidth（无布局环境为 0 → 回落最粗档）。
   * windowed 边界：rows 只是已装载切片，本方法按切片 min/max 派生范围——不代表全量时间范围，
   * 切片不含全量边界时选档偏细；windowed 下建议宿主提供 range-* 托管轴并自行选择档位。
   */
  fit(): void {
    if (this.rows.length === 0) return
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const r of this.rows) {
      if (r.startMs < minMs) minMs = r.startMs
      if (r.endMs > maxMs) maxMs = r.endMs
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return
    const spanMs = Math.max(1, maxMs - minMs)
    const avail = this.tbody?.clientWidth ?? 0
    const unitMs: Record<GanttScale, number> = {
      hour: DAY_MS / 24,
      day: DAY_MS,
      week: 7 * DAY_MS,
      month: 30 * DAY_MS,
      quarter: 91 * DAY_MS,
      year: 365 * DAY_MS,
    }
    // 从最细档起找首个「容得下」的档（越细列越多，先满足者为最细可视档）
    let chosen: GanttScale | null = null
    for (let i = 0; i < SCALES.length; i++) {
      const s = SCALES[i]!
      if ((spanMs / unitMs[s]) * SCALE_MIN_COL[s] <= avail) {
        chosen = s
        break
      }
    }
    this.setAttribute('scale', chosen ?? SCALES[SCALES.length - 1]!)
    this.scrollToDate(toISODate(new Date(minMs)))
  }

  private emitSelectionChange(): void {
    this.emit('selection-change', { ids: this.selection } satisfies GanttSelectionChangeDetail)
  }

  private writeRowSelectionState(el: HTMLElement, on: boolean): void {
    return writeRowSelectionState(el, on)
  }

  private writeBarSelectionState(el: HTMLElement, on: boolean): void {
    return writeBarSelectionState(el, on)
  }

  /**
   * 选择变化局部更新（**增量路径**）：只 patch 窗口内（已渲染行/条）受影响元素的选中态，
   * 复用缓存 rows / units / criticalIds——不重跑 `buildRows`（O(总量) 行树 + 摘要聚合）、
   * `buildUnits`（O(轴长) 刻度）、`criticalPathIds`（O(V+E) CPM），也不重建 DOM 节点。
   * 窗口外行的选中态由建行时按 `this.selected` 写入，无需在此处理。
   * 调用方（selection setter / 行点选 / 框选 / 键盘连选 / 删所选）改完 `this.selected` 后调用，
   * 随后自行派发 `oas-selection-change`（事件语义与旧实现一致）。
   */
  private syncSelection(): void {
    const sel = this.selected
    this.sideRows?.querySelectorAll<HTMLElement>('.row-name').forEach((el) => {
      this.writeRowSelectionState(el, sel.has(el.dataset.key ?? ''))
    })
    this.barsEl?.querySelectorAll<HTMLElement>('.bar').forEach((el) => {
      this.writeBarSelectionState(el, sel.has(el.dataset.id ?? ''))
    })
  }

  private onRowClick(id: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): void {
    // 行序定位走恒定索引（rebuildRowIndex）：旧实现对每次点选做 `rows.map(...)` + `indexOf`，
    // 万级任务下每个选择动作都是 O(总量) 分配/扫描（仅选择变化不该有这种成本）
    if (e.shiftKey && this.selectionAnchor) {
      const a = this.rowIndexById.get(this.selectionAnchor) ?? -1
      const b = this.rowIndexById.get(id) ?? -1
      if (a >= 0 && b >= 0) {
        const [s, t2] = a < b ? [a, b] : [b, a]
        // 区间连选：只物化区间内 id（O(区间)），不整表 map
        this.selected = new Set(this.rows.slice(s, t2 + 1).map((r) => r.task.id))
      } else {
        // 锚点已不可见（折叠/被过滤/被删）→ 退化为单选并重设锚点，避免空区间
        this.selected = new Set([id])
        this.selectionAnchor = id
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (this.selected.has(id)) this.selected.delete(id)
      else this.selected.add(id)
      this.selectionAnchor = id
    } else {
      this.selected = new Set([id])
      this.selectionAnchor = id
    }
    this.syncSelection()
    this.setActiveRow(id)
    this.emitSelectionChange()
  }

  private focusRow(id: string): void {
    let el = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"]`)
    if (!el) {
      // 目标行未在虚拟窗口内 → 先滚到它再聚焦
      this.scrollToTask(id)
      el = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"]`)
    }
    this.setActiveRow(id)
    el?.focus()
  }

  /** roving：活动行是唯一 tab 停靠点 */
  private setActiveRow(id: string): void {
    this.activeRowId = id
    this.sideRows?.querySelectorAll<HTMLElement>('.row-name').forEach((n) => {
      n.tabIndex = n.dataset.key === id ? 0 : -1
    })
  }

  private startRename(row: GanttRow, nameEl: HTMLElement): void {
    if (this.renaming || this.hasAttr('readonly') || row.task.disabled === true) return
    const input = document.createElement('input')
    input.className = 'rename-input'
    input.value = row.task.name
    input.setAttribute('aria-label', this.t('gantt.rename'))
    this.renaming = true
    const finish = (commit: boolean): void => {
      if (!this.renaming) return
      this.renaming = false
      const v = input.value.trim()
      if (commit && v && v !== row.task.name) {
        const t = this._tasks.find((x) => x.id === row.task.id)
        if (t) {
          t.name = v
          input.replaceWith(nameEl)
          this.syncTasksAttr()
          this.emitTasksChange()
        }
        return
      }
      input.replaceWith(nameEl)
    }
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        finish(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        finish(false)
      }
    })
    input.addEventListener('blur', () => finish(true))
    nameEl.replaceWith(input)
    input.focus()
    input.select()
  }

  // ===== 行内新建（creatable）=====

  /** 行内「＋」：摘要行加子级、叶子行在其后加同级；新建后聚焦并进入行内重命名 */
  private onRowAdd(row: GanttRow): void {
    // 新任务起点继承所在行的开始日（而非「今天」），避免建在用户视线之外/数据区之外
    const seed = typeof row.task.start === 'string' && row.task.start !== '' ? { start: row.task.start } : {}
    const newId = row.hasChildren
      ? this.addTask(seed, { parent: row.task.id })
      : this.addTask(seed, { parent: row.task.parent ?? null, after: row.task.id })
    if (newId) this.enterRename(newId)
  }

  /** 新建后聚焦目标行并进入行内重命名（目标行未在窗口内时 focusRow 先滚动重建窗口） */
  private enterRename(id: string): void {
    this.focusRow(id)
    // 行定位走恒定索引（rebuildRowIndex；focusRow 滚动重建窗口后同样已刷新），
    // 替代 rows.find 的 O(总量) 线性扫描
    const row = this.rows[this.rowIndexById.get(id) ?? -1]
    const nameEl = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"] .name`)
    if (row && nameEl) this.startRename(row, nameEl)
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    return isInteractiveTarget(target)
  }

  /** 双击左侧列表空白：按今天新建根级任务并进入重命名（仅 creatable 且非只读） */
  private onSideDblClick = (e: MouseEvent): void => {
    if (!this.hasAttr('creatable') || this.hasAttr('readonly')) return
    if (this.isInteractiveTarget(e.target)) return
    const id = this.addTask({})
    if (id) this.enterRename(id)
  }

  /**
   * 由客户端 x 求落点日期（ms）。用 `.inner` 容器 rect（内容层，已包含横向滚动量）做逆变换，
   * 与 `bar.left = mirrorX(xOf(...))` 精确互逆，LTR/RTL 与任意滚动都对齐；无布局/无单位时回落 null。
   */
  private dateAtClientX(clientX: number): number | null {
    const inner = this.innerEl
    if (!inner || this.units.length === 0) return null
    const r = inner.getBoundingClientRect()
    if (r.width <= 0) return null
    const physical = clientX - r.left
    const x = isRtl(this) ? this.canvasW - physical : physical
    const i = Math.min(Math.max(Math.floor(x / this.colW()), 0), this.units.length - 1)
    return this.units[i]?.startMs ?? null
  }

  /** 双击时间轴空白：按落点日期新建任务并进入重命名（仅 creatable 且非只读） */
  private onTbodyDblClick = (e: MouseEvent): void => {
    if (!this.hasAttr('creatable') || this.hasAttr('readonly')) return
    if (this.isInteractiveTarget(e.target)) return
    if (!this.tbody || this.units.length === 0) return
    const ms = this.dateAtClientX(e.clientX)
    if (ms === null) return
    const id = this.addTask({ start: toISODate(new Date(ms)) })
    if (id) this.enterRename(id)
  }

  // ===== 空白拖拽：框选多任务（marquee）/ 拖拽建任务（creatable）=====
  //
  // 两个手势互斥且与拖条/拖行/连线点/双击建任务互斥：
  // - `.side-body` 空白 → 行带框选
  // - `.tbody` 空白 → creatable 且非只读时建任务（C），否则条相交框选（B）
  // move/up/cancel 挂 document（自建 bind/unbind，与 rowPending 模式一致）；覆盖层 `.marquee` 纯装饰。

  private onSidePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    if (this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    const target = e.target
    if (target instanceof Element && target.closest('.row-name, .toggle, .rename-input, .row-add')) return
    this.beginMarquee('rows', e)
  }

  private onTbodyPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    if (this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    // 触屏：时间轴空白拖与二维滚动冲突（touch-action 手势起始即定夺）→ 留给原生滚动；
    // 触屏建任务走行尾「＋」/ 双击空白，框选走左侧列表（.side-body touch-action:none）
    if (e.pointerType === 'touch' || this.coarse) return
    if (this.isInteractiveTarget(e.target)) return
    if (this.hasAttr('creatable') && !this.hasAttr('readonly')) this.beginCreate(e)
    else this.beginMarquee('bars', e)
  }

  private beginMarquee(kind: 'rows' | 'bars', e: PointerEvent): void {
    this.marqueeCtx = {
      kind,
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      moved: false,
      additive: e.ctrlKey || e.metaKey,
      touch: e.pointerType === 'touch',
    }
    this.bindDocMarquee()
  }

  private beginCreate(e: PointerEvent): void {
    this.createCtx = {
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      moved: false,
      touch: e.pointerType === 'touch',
    }
    this.bindDocMarquee()
  }

  private docMarqueeMove = (e: PointerEvent): void => {
    // 触屏抖动大：放大判拖阈值（与行重排一致），避免点按被误判为框选/建任务
    const m = this.marqueeCtx
    if (m) {
      const thr = m.touch ? 12 : MARQUEE_THRESHOLD
      if (!m.moved && Math.abs(e.clientX - m.x0) + Math.abs(e.clientY - m.y0) > thr) m.moved = true
      if (!m.moved) return
      m.x1 = e.clientX
      m.y1 = e.clientY
      this.updateMarqueeVisual(m.x0, m.y0, e.clientX, e.clientY)
      return
    }
    const c = this.createCtx
    if (c) {
      const thr = c.touch ? 12 : MARQUEE_THRESHOLD
      if (!c.moved && Math.abs(e.clientX - c.x0) + Math.abs(e.clientY - c.y0) > thr) c.moved = true
      if (!c.moved) return
      c.x1 = e.clientX
      c.y1 = e.clientY
      this.updateMarqueeVisual(c.x0, c.y0, e.clientX, e.clientY)
    }
  }

  private docMarqueeUp = (e: PointerEvent): void => {
    const m = this.marqueeCtx
    const c = this.createCtx
    this.marqueeCtx = null
    this.createCtx = null
    this.unbindDocMarquee()
    this.removeMarquee()
    if (m) {
      const p = this.upPoint(e, m.x1, m.y1)
      m.x1 = p.x
      m.y1 = p.y
      this.finishMarquee(m)
    } else if (c) {
      const p = this.upPoint(e, c.x1, c.y1)
      c.x1 = p.x
      c.y1 = p.y
      this.finishCreate(c)
    }
  }

  private docMarqueeCancel = (): void => {
    this.cancelMarquee()
  }

  private docMarqueeEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && (this.marqueeCtx || this.createCtx)) {
      e.stopPropagation()
      this.cancelMarquee()
    }
  }

  private bindDocMarquee(): void {
    document.addEventListener('pointermove', this.docMarqueeMove)
    document.addEventListener('pointerup', this.docMarqueeUp)
    document.addEventListener('pointercancel', this.docMarqueeCancel)
    document.addEventListener('keydown', this.docMarqueeEsc)
  }

  private unbindDocMarquee(): void {
    document.removeEventListener('pointermove', this.docMarqueeMove)
    document.removeEventListener('pointerup', this.docMarqueeUp)
    document.removeEventListener('pointercancel', this.docMarqueeCancel)
    document.removeEventListener('keydown', this.docMarqueeEsc)
  }

  /** 取消空白拖拽：移除覆盖层 + 解绑（零选择/零建任务） */
  private cancelMarquee(): void {
    this.marqueeCtx = null
    this.createCtx = null
    this.unbindDocMarquee()
    this.removeMarquee()
  }

  private removeMarquee(): void {
    this.marqueeEl?.remove()
    this.marqueeEl = null
  }

  private upPoint(e: PointerEvent, fx: number, fy: number): { x: number; y: number } {
    return upPoint(e, fx, fy)
  }

  /** 覆盖层几何：以 `.gantt`（position: relative + overflow: hidden）为参照系，纯装饰不拦指针 */
  private updateMarqueeVisual(x0: number, y0: number, x1: number, y1: number): void {
    const gantt = this.ganttEl
    if (!gantt) return
    if (!this.marqueeEl || !this.marqueeEl.isConnected) {
      const el = document.createElement('div')
      el.className = 'marquee'
      el.setAttribute('aria-hidden', 'true')
      gantt.appendChild(el)
      this.marqueeEl = el
    }
    const r = gantt.getBoundingClientRect()
    // 扣掉 .gantt 边框（绝对定位参照 padding box）
    const baseX = r.left + gantt.clientLeft
    const baseY = r.top + gantt.clientTop
    this.marqueeEl.style.left = `${Math.min(x0, x1) - baseX}px`
    this.marqueeEl.style.top = `${Math.min(y0, y1) - baseY}px`
    this.marqueeEl.style.width = `${Math.abs(x1 - x0)}px`
    this.marqueeEl.style.height = `${Math.abs(y1 - y0)}px`
  }

  /** 行带框选命中：窗口内行 rowTop..rowTop+rowH 与 [y0,y1] 相交（client 坐标） */
  private rowsInRect(y0: number, y1: number): string[] {
    const side = this.sideBody
    if (!side) return []
    const rect = side.getBoundingClientRect()
    const rowH = this.rowHeightPx()
    const top = Math.min(y0, y1)
    const bottom = Math.max(y0, y1)
    const out: string[] = []
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]
      if (!row) continue
      const rt = rect.top + this.absRowTop(i) - side.scrollTop
      if (rt + rowH > top && rt < bottom) out.push(row.task.id)
    }
    return out
  }

  /** 条相交框选命中：各 `.bar` 的 client rect 与矩形相交者 */
  private barsInRect(x0: number, y0: number, x1: number, y1: number): string[] {
    const minX = Math.min(x0, x1)
    const maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1)
    const maxY = Math.max(y0, y1)
    const out: string[] = []
    this.barsEl?.querySelectorAll<HTMLElement>('.bar').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.right > minX && r.left < maxX && r.bottom > minY && r.top < maxY) {
        const id = el.dataset.id
        if (id) out.push(id)
      }
    })
    return out
  }

  private finishMarquee(m: {
    kind: 'rows' | 'bars'
    x0: number
    y0: number
    x1: number
    y1: number
    moved: boolean
    additive: boolean
  }): void {
    // 未拖动 = 空白单击：普通手势清空选择（追加手势不动）
    if (!m.moved) {
      if (!m.additive && this.selected.size > 0) {
        this.selected = new Set()
        this.selectionAnchor = null
        this.syncSelection()
        this.emitSelectionChange()
      }
      return
    }
    const hits = m.kind === 'rows' ? this.rowsInRect(m.y0, m.y1) : this.barsInRect(m.x0, m.y0, m.x1, m.y1)
    const next = m.additive ? new Set([...this.selected, ...hits]) : new Set(hits)
    // 同值不派发（与 selection setter 一致）
    const same = next.size === this.selected.size && [...next].every((id) => this.selected.has(id))
    if (same) return
    this.selected = next
    this.selectionAnchor = null
    this.syncSelection()
    this.emitSelectionChange()
  }

  private finishCreate(c: { x0: number; y0: number; x1: number; y1: number; moved: boolean }): void {
    // 未拖动 = 空白单击：清空选择（与左侧列表一致）
    if (!c.moved) {
      if (this.selected.size > 0) {
        this.selected = new Set()
        this.selectionAnchor = null
        this.syncSelection()
        this.emitSelectionChange()
      }
      return
    }
    const a = this.dateAtClientX(c.x0)
    const b = this.dateAtClientX(c.x1)
    if (a === null || b === null) return
    const id = this.addTask({ start: toISODate(new Date(Math.min(a, b))), end: toISODate(new Date(Math.max(a, b))) })
    if (id) this.enterRename(id)
  }

  private onRowKeyDown(e: KeyboardEvent, row: GanttRow): void {
    // toggle 按钮 / 重命名输入框 / 行尾新建钮自身按键不被行劫持（否则无法键盘折叠 / 输入 / 激活新建）
    if (
      (e.target as HTMLElement).closest(
        '.toggle, .rename-input, .row-add, input, select, textarea, button, [contenteditable], [data-no-row-drag]',
      )
    )
      return
    const id = row.task.id
    const ro = this.hasAttr('readonly')
    // RTL 镜像：缩进/展开在逻辑方向（与 oas-tree 一致）
    const rtl = isRtl(this)
    const kIndent = rtl ? 'ArrowLeft' : 'ArrowRight'
    const kOutdent = rtl ? 'ArrowRight' : 'ArrowLeft'
    if (e.altKey) {
      if (ro || row.task.disabled === true) return
      if (e.key === 'ArrowUp') return this.altReparent(e, id, 'before')
      if (e.key === 'ArrowDown') return this.altReparent(e, id, 'after')
      if (e.key === kIndent) return this.altReparent(e, id, 'indent')
      if (e.key === kOutdent) return this.altReparent(e, id, 'outdent')
      return
    }
    // 相邻行定位走恒定索引（rebuildRowIndex）：旧实现每次按键都 `rows.map(...)` 物化全量 id 表
    // （万级任务下 Shift+↑/↓ 连选每按一次都是 O(总量) 分配）
    const idx = this.rowIndexById.get(id) ?? -1
    // APG tree：→ 展开或进首个子级；← 折叠或回焦父级（RTL 镜像）
    if (e.key === kIndent && !e.shiftKey) {
      if (row.hasChildren) {
        e.preventDefault()
        if (!this.currentExpandedSet().has(id)) this.toggleExpand(id)
        // 展开后焦点保持在该项；若已展开则进入首个子级
        // （toggleExpand → update 重建 rows 与 rowIndexById，此处取的是重建后的恒定索引）
        const i = this.rowIndexById.get(id) ?? -1
        const child = i >= 0 ? this.rows[i + 1] : undefined
        if (this.currentExpandedSet().has(id) && child && child.depth > row.depth) this.focusRow(child.task.id)
        else this.focusRow(id)
      }
      return
    }
    if (e.key === kOutdent && !e.shiftKey) {
      if (row.hasChildren && this.currentExpandedSet().has(id)) {
        e.preventDefault()
        this.toggleExpand(id)
        this.focusRow(id)
      } else if (row.task.parent) {
        e.preventDefault()
        this.focusRow(row.task.parent)
      }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const nextId = this.rows[idx + (e.key === 'ArrowDown' ? 1 : -1)]?.task.id
      if (nextId) {
        if (e.shiftKey) {
          this.selected.add(id)
          this.selected.add(nextId)
          this.syncSelection()
          this.emitSelectionChange()
        }
        this.focusRow(nextId)
      } else if (this._winMode.windowed) {
        // windowed：切片末端/首端继续走 → 请求装载相邻区间（宿主回填后焦点可达，不得静默无响应）
        this.requestKeyboardWindow(row, e.key === 'ArrowDown')
      }
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      this.onRowClick(id, e)
      return
    }
    if (e.key === 'F2') {
      if (ro || row.task.disabled === true) return
      e.preventDefault()
      const nameEl = this.sideRows?.querySelector<HTMLElement>(`.row-name[data-key="${escId(id)}"] .name`)
      if (nameEl) this.startRename(row, nameEl)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation() // 无论是否处理，都不冒泡到 document 级连线删除
      if (ro || row.task.disabled === true) return
      if (this.selected.size > 0 && this.selected.has(id)) {
        // disabled 任务不被批量删除（disabled 只锁自身数据；程序性 removeTasks 仍保留全权）
        const targets = [...this.selected].filter((sid) => this._tasks.find((t) => t.id === sid)?.disabled !== true)
        if (targets.length === 0) return
        e.preventDefault()
        this.removeTasks(targets)
      }
    }
  }

  private altReparent(e: KeyboardEvent, id: string, dir: 'before' | 'after' | 'indent' | 'outdent'): void {
    e.preventDefault()
    // windowed：行重排禁用（切片内同级 index 对全量无意义，宿主在全量上处理）
    if (this._winMode.windowed) {
      this.warnWindowedReparent()
      return
    }
    const byId = new Map(this._tasks.map((t) => [t.id, t]))
    const cur = byId.get(id)
    if (!cur) return
    const siblings = this._tasks.filter((t) => (t.parent ?? null) === (cur.parent ?? null))
    const si = siblings.findIndex((t) => t.id === id)
    if (dir === 'indent') {
      const prev = siblings[si - 1]
      // 不缩进为 disabled 任务的子级（对齐指针路径的 drop-inside 守卫）
      if (prev && prev.disabled !== true) this.applyReparent(id, prev.id, 'inside')
      return
    }
    if (dir === 'outdent') {
      if (cur.parent) {
        const parent = byId.get(cur.parent)
        if (parent) this.applyReparent(id, parent.id, 'after')
      }
      return
    }
    const target = siblings[si + (dir === 'before' ? -1 : 1)]
    if (target) this.applyReparent(id, target.id, dir)
  }

  private docRowPendingMove = (e: PointerEvent): void => {
    const p = this.rowPending
    if (!p) return
    // 触屏手指抖动大：放大判拖阈值，避免点按被误判为重排
    const thr = e.pointerType === 'touch' ? 12 : 4
    if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > thr) {
      this.unbindRowPending()
      this.rowPending = null
      // 起手在任务名文本：让浏览器继续完成文本选择，不抢成行重排；点击（未超阈值）仍走行选中
      if (p.textTarget) return
      // windowed：行重排禁用（切片内同级 index 对全量无意义，宿主在全量上处理）
      if (this._winMode.windowed) {
        this.warnWindowedReparent()
        return
      }
      // 只读 / 禁用：不重排（选择在 pointerup 处理；拖动的指针不移不触选择）
      if (this.hasAttr('readonly') || p.disabled) return
      this.reparentCtx = { id: p.id, byId: p.byId }
      this.bindDocReparent()
      this.onReparentMove(e)
    }
  }
  private docRowPendingUp = (e: PointerEvent): void => {
    const p = this.rowPending
    this.unbindRowPending()
    this.rowPending = null
    // 手柄起手或任务已被并发重写移除（幽灵 id）→ 不触发选择
    if (p && !p.viaHandle && this._tasks.some((t) => t.id === p.id)) this.onRowClick(p.id, e)
  }
  private docRowPendingCancel = (): void => {
    this.unbindRowPending()
    this.rowPending = null
  }

  private bindRowPending(): void {
    document.addEventListener('pointermove', this.docRowPendingMove)
    document.addEventListener('pointerup', this.docRowPendingUp)
    document.addEventListener('pointercancel', this.docRowPendingCancel)
  }
  private unbindRowPending(): void {
    document.removeEventListener('pointermove', this.docRowPendingMove)
    document.removeEventListener('pointerup', this.docRowPendingUp)
    document.removeEventListener('pointercancel', this.docRowPendingCancel)
  }

  private revealDots(id: string): void {
    this.touchActiveId = id
    this.barsEl?.querySelectorAll('.bar.touch-active').forEach((el) => el.classList.remove('touch-active'))
    this.barsEl?.querySelector(`.bar[data-id="${escId(id)}"]`)?.classList.add('touch-active')
  }

  private clearTouchActive(): void {
    if (!this.touchActiveId) return
    this.touchActiveId = null
    this.barsEl?.querySelectorAll('.bar.touch-active').forEach((el) => el.classList.remove('touch-active'))
  }

  // ===== 依赖连线交互编辑（拖拽建依赖 + 选中删除）=====

  private docLinkMove = (e: PointerEvent): void => {
    this.onLinkMove(e)
  }
  private docLinkUp = (e: PointerEvent): void => {
    this.onLinkUp(e)
  }
  private docLinkCancel = (): void => {
    this.cancelLink()
  }
  private docLinkEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.cancelLink()
  }
  private docLinkKey = (e: KeyboardEvent): void => {
    // 仅当组件自身持有焦点时响应，避免劫持宿主页面（含其他组件内输入）的 Backspace/Delete
    if (document.activeElement !== this) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedLink) {
      if (this.removeSelectedLink()) e.preventDefault()
    }
  }
  private docLinkClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    const onHit = path.some((n) => (n as Element)?.classList?.contains?.('link-hit'))
    if (!onHit) this.clearLinkSelection()
    // 点条/连线点以外的空白 → 收起触屏揭示态
    if (!path.some((n) => (n as Element)?.classList?.contains?.('bar'))) this.clearTouchActive()
  }
  /** 条拖拽的 Esc 兜底（document 级）：自动滚动每帧重建条会丢焦点，条内 keydown 不再触发 */
  private docBarDragKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragCtx) this.cancelDrag()
  }

  private bindDocLink(): void {
    document.addEventListener('pointermove', this.docLinkMove)
    document.addEventListener('pointerup', this.docLinkUp)
    document.addEventListener('pointercancel', this.docLinkCancel)
    document.addEventListener('keydown', this.docLinkEsc)
  }

  private unbindDocLink(): void {
    document.removeEventListener('pointermove', this.docLinkMove)
    document.removeEventListener('pointerup', this.docLinkUp)
    document.removeEventListener('pointercancel', this.docLinkCancel)
    document.removeEventListener('keydown', this.docLinkEsc)
  }

  private onLinkDotPointerDown(e: PointerEvent, row: GanttRow, rowIndex: number, endpoint: 'start' | 'end'): void {
    if (
      e.button !== 0 ||
      this.hasAttr('readonly') ||
      this.linkCtx ||
      this.dragCtx ||
      this.reparentCtx ||
      this.rowPending
    )
      return
    const rowH = this.rowHeightPx()
    const sx = this.mirrorX(this.xOf(endpoint === 'end' ? row.endMs : row.startMs))
    const sy = this.absRowTop(rowIndex) + rowH / 2
    const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    temp.setAttribute('class', 'temp-link')
    temp.setAttribute('aria-hidden', 'true')
    temp.setAttribute('d', `M ${sx} ${sy} L ${sx} ${sy}`)
    this.linksEl?.appendChild(temp)
    this.linkCtx = { sourceId: row.task.id, endpoint, sx, sy, temp }
    this.bindDocLink()
  }

  private onLinkMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.updateLinkTemp(e.clientX, e.clientY)
    this.startAutoScroll()
  }

  private updateLinkTemp(clientX: number, clientY: number): void {
    const ctx = this.linkCtx
    const svg = this.linksEl
    if (!ctx || !svg) return
    const r = svg.getBoundingClientRect()
    ctx.temp.setAttribute('d', `M ${ctx.sx} ${ctx.sy} L ${clientX - r.left} ${clientY - r.top}`)
  }

  private onLinkUp(e: PointerEvent): void {
    this.stopAutoScroll()
    const ctx = this.linkCtx
    this.linkCtx = null
    this.unbindDocLink()
    ctx?.temp.remove()
    if (!ctx) return
    const target = this.barUnder(e.clientX, e.clientY)
    if (!target || target.row.task.id === ctx.sourceId) return
    const type = this.linkType(ctx.endpoint, target.endpoint)
    // 复用 addDependency：一致的校验/去重 + tasks-change/dependencies-change + auto-schedule 联动
    this.addDependency(target.row.task.id, { id: ctx.sourceId, type })
  }

  private cancelLink(): void {
    this.stopAutoScroll()
    if (!this.linkCtx) return
    this.linkCtx.temp.remove()
    this.linkCtx = null
    this.unbindDocLink()
  }

  private linkType(src: 'start' | 'end', tgt: 'start' | 'end'): GanttDependency['type'] {
    return linkType(src, tgt)
  }

  /** 命中指针下的任务条（就近取可视窗口内条形，回避 elementFromPoint 的 happy-dom 缺口） */
  private barUnder(clientX: number, clientY: number): { row: GanttRow; endpoint: 'start' | 'end' } | null {
    if (!this.barsEl) return null
    const rtl = isRtl(this)
    for (let i = this.winStart; i < this.winEnd; i++) {
      const row = this.rows[i]!
      if (row.task.disabled === true) continue
      const el = this.barsEl.querySelector<HTMLElement>(`.bar[data-id="${escId(row.task.id)}"]`)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        // RTL 下条起始点落在物理右侧：左半 = end
        const leftHalf = clientX < r.left + r.width / 2
        return { row, endpoint: leftHalf === !rtl ? 'start' : 'end' }
      }
    }
    return null
  }

  private selectLink(successor: string, predecessor: string, type: string): void {
    this.clearLinkSelection()
    this.selectedLink = { successor, predecessor, type }
    this.focus({ preventScroll: true })
    this.linksEl
      ?.querySelector<SVGPathElement>(
        `.link-hit[data-from="${escId(successor)}"][data-to="${escId(predecessor)}"][data-type="${type}"]`,
      )
      ?.classList.add('selected')
  }

  private clearLinkSelection(): void {
    if (!this.selectedLink) return
    this.selectedLink = null
    this.linksEl?.querySelectorAll('.link-hit.selected').forEach((el) => el.classList.remove('selected'))
  }

  private removeSelectedLink(): boolean {
    const sel = this.selectedLink
    if (!sel) return false
    const succ = this._tasks.find((t) => t.id === sel.successor)
    if (!succ || succ.disabled === true) return false
    const deps = (succ.dependencies ?? []).filter((d) => !(d.id === sel.predecessor && (d.type ?? 'fs') === sel.type))
    succ.dependencies = deps.length > 0 ? deps : undefined
    this.clearLinkSelection()
    this.syncTasksAttr()
    this.emitTasksChange()
    this.emit('dependencies-change', {
      taskId: succ.id,
      dependencies: deps.map((d) => ({ ...d })),
    } satisfies GanttDependenciesChangeDetail)
    return true
  }

  private onBarPointerDown(e: PointerEvent, row: GanttRow, bar: HTMLElement): void {
    if (e.button !== 0 || this.dragCtx || this.reparentCtx || this.linkCtx || this.rowPending) return
    const target = e.target as HTMLElement
    // 条标签是可选中的文本；从标签拖动不应改期，改期从条体/两端手柄开始
    if (target.closest('.bar-label')) return
    let mode: DragMode = 'move'
    if (target.classList.contains('handle-start')) mode = 'resize-start'
    else if (target.classList.contains('handle-end')) mode = 'resize-end'
    else if (target.classList.contains('progress-handle')) mode = 'progress'
    else if (row.isSummary) return // 摘要条不可拖（时间派生自子级）
    if (row.task.disabled === true) return
    if (mode !== 'progress' && this.datesReadonlyOn()) return
    if (mode === 'progress' && this.progressReadonlyOn()) return
    this.dragCtx = {
      id: row.task.id,
      mode,
      startX: e.clientX,
      startScrollLeft: this.tbody?.scrollLeft ?? 0,
      origStartMs: row.startMs,
      origEndMs: row.endMs,
      origProgress: row.progress,
      datetime: row.task.start.length > 10,
      touch: e.pointerType === 'touch',
      bar,
    }
    try {
      bar.setPointerCapture(e.pointerId)
    } catch {
      /* 环境不支持 capture：事件流走 document 层兜底路径 */
    }
    this.bindDocDrag()
  }

  private onBarPointerMove(e: PointerEvent): void {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.applyBarDragVisual(e.clientX)
    this.startAutoScroll()
  }

  private applyBarDragVisual(clientX: number): void {
    const ctx = this.dragCtx
    if (!ctx) return
    const colW = this.colW()
    const rtl = isRtl(this)
    // 位移 = 指针位移 + 横向滚动增量（自动滚动期间指针可静止）：条才随指针走、可拖出视口边缘
    const scrollDelta = (this.tbody?.scrollLeft ?? 0) - ctx.startScrollLeft
    let dx = clientX - ctx.startX + scrollDelta
    if (rtl) dx = -dx
    // 触屏死区：手指抖动不推进（防误改期）
    if (ctx.touch && Math.abs(clientX - ctx.startX) < 6 && Math.abs(scrollDelta) < 1) dx = 0
    if (ctx.mode === 'progress') {
      const barW = Math.max(this.xOf(ctx.origEndMs) - this.xOf(ctx.origStartMs), 1)
      const next = Math.min(100, Math.max(0, ctx.origProgress + (dx / barW) * 100))
      ctx.newProgress = Math.round(next)
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.newProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.newProgress}%`
      return
    }
    const shiftUnits = this.snapOn() ? Math.round(dx / colW) : dx / colW
    let newStartMs: number
    let newEndMs: number
    if (this.snapOn()) {
      // 整格平移：日历安全（month/quarter/year 不产生月末幻影日期）
      newStartMs = this.addUnitsMs(ctx.origStartMs, Math.round(shiftUnits))
      newEndMs = this.addUnitsMs(ctx.origEndMs, Math.round(shiftUnits))
      if (ctx.mode === 'move') {
        const dur = ctx.origEndMs - ctx.origStartMs
        newEndMs = newStartMs + dur
      } else if (ctx.mode === 'resize-start') {
        newEndMs = ctx.origEndMs
      } else {
        newStartMs = ctx.origStartMs
      }
    } else {
      const delta = shiftUnits * this.avgUnitMs()
      newStartMs = ctx.origStartMs + delta
      newEndMs = ctx.origEndMs + delta
      if (ctx.mode === 'resize-start') newEndMs = ctx.origEndMs
      if (ctx.mode === 'resize-end') newStartMs = ctx.origStartMs
    }
    const minSpan = this.snapOn() ? this.addUnitsMs(ctx.origStartMs, 1) - ctx.origStartMs : this.avgUnitMs()
    // 最短跨度钳制的边界须夹在原跨度内：任务本身短于 1 个刻度单元时（如 month 档 4 天任务），
    // 裸用 origEnd−minSpan / origStart+minSpan 会落到原区间之外 → 零位移也改写、真实拖拽反向跳。
    if (ctx.mode === 'resize-start') {
      const bound = Math.max(ctx.origEndMs - minSpan, ctx.origStartMs)
      if (newStartMs > bound) newStartMs = bound
    }
    if (ctx.mode === 'resize-end') {
      const bound = Math.min(ctx.origStartMs + minSpan, ctx.origEndMs)
      if (newEndMs < bound) newEndMs = bound
    }
    ctx.newStartMs = newStartMs
    ctx.newEndMs = newEndMs
    // 视觉更新（不重建 DOM）
    if (ctx.mode === 'move' || ctx.mode === 'resize-start') {
      if (ctx.bar.classList.contains('milestone')) {
        const center = this.mirrorX(this.xOf(newStartMs) + colW / 2)
        ctx.bar.style.left = `${center - 8}px`
      } else {
        const endRef = ctx.mode === 'move' ? newEndMs : ctx.origEndMs
        const x1 = this.xOf(newStartMs)
        const x2 = this.xOf(endRef)
        const w = Math.max(x2 - x1, 2)
        ctx.bar.style.left = `${this.mirrorX(x1) - (rtl ? w : 0)}px`
        if (ctx.mode === 'resize-start') ctx.bar.style.width = `${w}px`
      }
    }
    if (ctx.mode === 'resize-end') {
      const x1 = this.xOf(ctx.origStartMs)
      const x2 = this.xOf(newEndMs)
      const w = Math.max(x2 - x1, 2)
      ctx.bar.style.width = `${w}px`
      // RTL 下 left = mirrorX(起点) − 宽度：改宽须同步 left，否则被抓手柄（终点=物理左缘）不动、起点漂移
      if (rtl) ctx.bar.style.left = `${this.mirrorX(x1) - w}px`
    }
  }

  /** 按 scale 日历步进 n 个单位（snap 对齐用）；n = 0 必须恒等，否则零位移点按会被锚到月首而静默改期 */
  private addUnitsMs(ms: number, n: number): number {
    if (n === 0) return ms
    return OASGantt.addUnits(new Date(ms), this.scaleMode(), n).getTime()
  }

  private avgUnitMs(): number {
    if (this.units.length === 0) return DAY_MS
    return (this.units[this.units.length - 1]!.endMs - this.units[0]!.startMs) / this.units.length
  }

  private onBarPointerUp(_e: PointerEvent): void {
    this.stopAutoScroll()
    const ctx = this.dragCtx
    this.dragCtx = null
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const next = ctx.newProgress
      if (next === undefined || next === ctx.origProgress) return
      this.commitProgress(ctx.id, next)
      return
    }
    const newStart = ctx.newStartMs ?? ctx.origStartMs
    const newEnd = ctx.newEndMs ?? ctx.origEndMs
    if (newStart === ctx.origStartMs && newEnd === ctx.origEndMs) return
    this.commitDates(ctx.id, newStart, newEnd, ctx.datetime, ctx.origStartMs, ctx.origEndMs)
  }

  /** 取消拖拽：视觉回滚、零事件零写回、无孤儿 ctx */
  private cancelDrag(): void {
    this.stopAutoScroll()
    const ctx = this.dragCtx
    this.dragCtx = null
    this.unbindDocDrag()
    if (!ctx) return
    if (ctx.mode === 'progress') {
      const fill = ctx.bar.querySelector<HTMLElement>('.bar-progress')
      const handle = ctx.bar.querySelector<HTMLElement>('.progress-handle')
      if (fill) fill.style.width = `${ctx.origProgress}%`
      if (handle) handle.style.insetInlineStart = `${ctx.origProgress}%`
      return
    }
    if (ctx.bar.classList.contains('milestone')) {
      const center = this.mirrorX(this.xOf(ctx.origStartMs) + this.colW() / 2)
      ctx.bar.style.left = `${center - 8}px`
      return
    }
    const x1 = this.xOf(ctx.origStartMs)
    const x2 = this.xOf(ctx.origEndMs)
    const w = Math.max(x2 - x1, 2)
    ctx.bar.style.left = `${this.mirrorX(x1) - (isRtl(this) ? w : 0)}px`
    ctx.bar.style.width = `${w}px`
  }

  /** 写回改期：内部更新 + 属性反射 + task-change（old/new）+ tasks-change */
  private commitDates(
    id: string,
    newStartMs: number,
    newEndMs: number,
    datetime: boolean,
    oldStartMs: number,
    oldEndMs: number,
  ): void {
    const task = this._tasks.find((t) => t.id === id)
    if (!task) return
    // 里程碑只写 start；契约 start == end（渲染只出单点），end 数据串按含端语义
    // （endMs 为区间右缘 exclusive，日精度 -1ms 回到含端日）。
    // 仅当显式 type:"milestone" **且数据本就带矛盾 end** 时，才把 end 归一为 start——
    // 否则前移越过残留 end 会写出 start>end 的非法区间；无 end 的里程碑不凭空添 end
    // （添了会触发组件自身的「milestone 携带 end」矛盾告警）。
    const explicitMilestone = task.type === 'milestone'
    const milestone = explicitMilestone || !task.end
    const start = this.fmtIso(newStartMs, datetime)
    const endStr = milestone ? start : this.fmtEnd(newEndMs, datetime)
    const patch: Partial<GanttTask> = milestone
      ? explicitMilestone && task.end
        ? { start, end: start }
        : { start }
      : { start, end: endStr }
    if (!this.applyPatch(id, patch)) return
    // applyPatch 内部经 update()→reschedule() 可能已按约束/工作日订正数据 →
    // 事件 payload 取**订正后终值**（与 task 快照一致），oldStart/oldEnd 仍为拖动前原点
    const finalTask = this._tasks.find((t) => t.id === id)!
    this.emit('task-change', {
      id,
      task: this.taskSnapshot(finalTask),
      oldStart: this.fmtIso(oldStartMs, datetime),
      oldEnd: milestone ? this.fmtIso(oldStartMs, datetime) : this.fmtEnd(oldEndMs, datetime),
      start: finalTask.start,
      end: finalTask.end ?? finalTask.start,
    } satisfies GanttTaskChangeDetail)
  }

  private commitProgress(id: string, progress: number): void {
    if (!this.applyPatch(id, { progress })) return
    this.emit('progress-change', {
      id,
      task: this.taskSnapshot(this._tasks.find((t) => t.id === id)!),
      progress,
    } satisfies GanttProgressChangeDetail)
  }

  /** 内部写回单条 + 属性反射 + 重渲染 + tasks-change（收口路径唯一出口） */
  private applyPatch(id: string, patch: Partial<GanttTask>): boolean {
    const idx = this._tasks.findIndex((t) => t.id === id)
    if (idx < 0) return false
    this._tasks[idx] = { ...this._tasks[idx]!, ...patch, id }
    this.commitTasks()
    return true
  }

  private fmtIso(ms: number, datetimeHint: boolean): string {
    return fmtIso(ms, datetimeHint, this.effectiveLocale())
  }

  private fmtEnd(ms: number, datetimeHint: boolean): string {
    return fmtEnd(ms, datetimeHint, this.effectiveLocale())
  }

  // ===== 依赖联动排程（auto-schedule）=====
  //
  // 前置 d → 后继 t（t.dependencies 含 { id: d.id, type }），约束语义：
  //   fs: t.start ≥ d.end  /  ss: t.start ≥ d.start  /  ff: t.end ≥ d.end  /  sf: t.end ≥ d.start
  // 仅当违反时把 t **向后推迟**（不提前），保持 t 工期不变（日精度 end 含端，口径与 buildRows 的 endMs 一致）。
  // 迭代松弛直到无变化或达上限（成环不死循环）；跳过 disabled、有子级的摘要（日期派生）、前置不存在者。

  private startMsOfTask(t: TG): number {
    return startMsOfTask(t)
  }

  private endMsOfTask(t: TG): number {
    return endMsOfTask(t)
  }

  private isWholeDayTask(t: TG): boolean {
    return isWholeDayTask(t)
  }

  private shiftByDuration(ms: number, duration: number, wholeDay: boolean): number {
    return shiftByDuration(ms, duration, wholeDay)
  }

  private childStructure(byId: Map<string, TG>): { childMap: Map<string, string[]>; hasChildren: Set<string> } {
    return childStructure(this._tasks, byId)
  }

  private dependencyCyclicNodes(byId: Map<string, TG>): Set<string> {
    return dependencyCyclicNodes(byId)
  }

  private criticalPathIds(): {
    critical: Set<string>
    conflict: Set<string>
    totalFloat: Map<string, number>
    freeFloat: Map<string, number>
  } {
    return criticalPathIds(this._tasks)
  }

  /** 不可排程任务集：任务日历显式为空（资源 shifts: [] / workdays 交集为空）。
   *  这类任务 auto-schedule 保持原日期（见 reschedule 守卫），必须用 .conflict 标记让「冻结」可见；
   *  摘要行日期派生不参与。判定是纯本地的（资源日历 + workdays），windowed 下同样有效 */
  private unschedulableIds(): Set<string> {
    const out = new Set<string>()
    const hasChildren = new Set<string>()
    for (const t of this._tasks) if (t.parent) hasChildren.add(t.parent)
    for (const t of this._tasks) {
      if (hasChildren.has(t.id)) continue
      const days = this.taskCalendar(t).days
      if (days !== null && days.size === 0) out.add(t.id)
    }
    return out
  }

  private deadlineConflictIds(): Set<string> {
    return deadlineConflictIds(this._tasks)
  }

  /** 连线 lag 提示文案（aria-label 末尾）：lag>0 作「滞后」、lag<0 作「提前」，0 不附 */
  private lagSuffixText(lag: number): string {
    if (lag === 0) return ''
    const n = Math.abs(lag)
    return `（${this.t(lag > 0 ? 'gantt.lagSuffix' : 'gantt.leadSuffix', { count: n })}）`
  }

  /**
   * 写回任务起点（保持工期）：里程碑只写 start；显式 milestone 携带矛盾 end 时把 end 归一为 start
   * （与 commitDates 同口径）。返回是否真的改动了数据串（未变则该次排程不算 dirty，防迭代空转）。
   *
   * 整日任务的工期是「日历日数」而非绝对毫秒：`duration` 由 endMs - startMs 得到，跨 DST 会带
   * ±1 小时（如 2 天 = 47h）。直接 `startMsNew + duration` 会写出 23:00/01:00 的时刻字符串，
   * 故整日任务按日历日推进 end（时间精度任务仍按绝对毫秒）。
   */
  private writeStartKeepingDuration(t: TG, startMsNew: number, duration: number): boolean {
    const datetime = typeof t.start === 'string' && t.start.length > 10
    const wholeDay = this.isWholeDayTask(t)
    const startStr = this.fmtIso(startMsNew, datetime)
    // 写回域守卫：结果必须能被 parseTaskDate（parseISODate 只收 4 位年）回读，否则
    // `el.tasks = el.tasks` 这类回写会在清洗层静默丢任务。lag 上限之外的第二道防线——
    // 边界年份（如 9999）叠加合法 lag 仍可能写出 5 位年份；此时跳过本次写回，保持数据可回读。
    if (!parseTaskDate(startStr)) return false
    const milestone = t.type === 'milestone' || !t.end
    if (milestone) {
      if (t.start === startStr) return false
      t.start = startStr
      if (t.end) t.end = startStr
      return true
    }
    const endEdge = wholeDay ? addLocalDays(startMsNew, Math.round(duration / DAY_MS)) : startMsNew + duration
    const endStr = this.fmtEnd(endEdge, datetime)
    if (!parseTaskDate(endStr)) return false
    if (t.start === startStr && t.end === endStr) return false
    t.start = startStr
    t.end = endStr
    return true
  }

  /**
   * 依赖约束松弛：返回被联动改期的任务 id（未开 auto-schedule 或零改动 → []，零事件）。
   * 命中多个前置时逐条满足（取最靠后约束）；收口 syncTasksAttr（属性通道同步触发一次全量
   * update 完成联动重渲染，**不再内嵌 update**——旧实现 sync+update 嵌套在触发它的 update 里，
   * 一次拖拽全量重渲染 4 跑）+ 派发 oas-reschedule。
   *
   * oas-tasks-change 契约（一次用户操作只发一次）：由**外层提交口**（commitTasks / applyPatch /
   * applyReparent / removeTasks 等经 syncTasksAttr 的路径，inInternalWrite 判别）统一派发一次
   * （含联动后最终数据），本方法在其在场时只发 oas-reschedule；属性通道直接改数据 / 运行期开启
   * auto-schedule 等无外层提交的触发，由本方法补发 tasks-change。
   * 事件序统一为「oas-reschedule → oas-tasks-change」（属性通道与提交口一致；拖动收口随后还有
   * oas-task-change）。
   *
   * 约束（opt-in）与工作日日历（workdays，opt-in）在此生效：
   * - snet 取约束下限（只前推）；mso 固定在约束日（依赖不得前推，数据偏离则拉回）；fnlt 不自动移动（仅违约判定）。
   * - workdays 开启时，前推落点吸附到下一个工作日（fs/ss 吸附起点；ff/sf 吸附对应 end 再派生 start）。
   *   工期仍按**日历日**计（本组件不压缩非工作日的工期跨度），仅起点/端点落位避开非工作日。
   * - 依赖成环时只让位**环内**节点（保持现网日期），环外节点照常排程；环内节点作前置用其当前日期（best-effort）。
   */
  private reschedule(): string[] {
    if (!this.autoScheduleOn()) return []
    const tasks = this._tasks
    if (tasks.length === 0) return []
    const byId = new Map<string, TG>()
    for (const t of tasks) byId.set(t.id, t)
    // 依赖环内节点让位：环内排程无解（互相前推会推远数据），保持现网日期；告警一次
    const cyclic = this.dependencyCyclicNodes(byId)
    if (cyclic.size > 0 && !this.warnedRescheduleCycle) {
      this.warnedRescheduleCycle = true
      devWarn('[oas-gantt] 依赖成环：环内任务已跳过联动排程（请先修正依赖）')
    }
    // 与 buildRows 同源树结构：断环节点（parent 成环被归根者）不计入其原父级的子级
    const { childMap, hasChildren } = this.childStructure(byId)
    // 生效区间（摘要取后代聚合，与 buildRows 一致）——供前置约束用
    const aggMemo = new Map<string, { startMs: number; endMs: number }>()
    const visiting = new Set<string>()
    const agg = (id: string): { startMs: number; endMs: number } => {
      const memo = aggMemo.get(id)
      if (memo) return memo
      const t = byId.get(id)!
      const kids = childMap.get(id) ?? []
      if (kids.length === 0 || visiting.has(id)) {
        const s = this.startMsOfTask(t)
        const r = { startMs: s, endMs: Math.max(this.endMsOfTask(t), s) }
        aggMemo.set(id, r)
        return r
      }
      visiting.add(id)
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const k of kids) {
        const a = agg(k)
        if (a.startMs < min) min = a.startMs
        if (a.endMs > max) max = a.endMs
      }
      visiting.delete(id)
      const r = { startMs: min, endMs: max }
      aggMemo.set(id, r)
      return r
    }
    const invalidateAgg = (id: string): void => {
      let cur: string | undefined = id
      const seen = new Set<string>()
      while (cur && !seen.has(cur)) {
        seen.add(cur)
        aggMemo.delete(cur)
        cur = byId.get(cur)?.parent
      }
    }
    const changed = new Set<string>()
    const maxIter = tasks.length * 2 + 8
    for (let iter = 0; iter < maxIter; iter++) {
      let dirty = false
      for (const t of tasks) {
        if (t.disabled === true || hasChildren.has(t.id) || cyclic.has(t.id)) continue
        const startMs = this.startMsOfTask(t)
        const duration = this.endMsOfTask(t) - startMs
        // 整日任务：工期按日历日计（跨 DST 的绝对毫秒差是 23/25 小时的倍数，不能直接做日加减）
        const wholeDay = this.isWholeDayTask(t)
        const con = this.constraintOf(t)
        // mso：固定锚点——依赖不得前推；数据偏离约束日则拉回约束日（保持工期），且不再吸附
        if (con && con.mode === 'mso') {
          if (startMs === con.ms) continue
          if (this.writeStartKeepingDuration(t, con.ms, duration)) {
            changed.add(t.id)
            invalidateAgg(t.id)
            dirty = true
          }
          continue
        }
        // 显式空日历（资源 shifts: [] / workdays 交集为空）= 资源不可用、不可排程：
        // 吸附上限内找不到工作日时 snap 原样返回，会把任务排进不可用日——
        // 宁可不移动（保持原日期）也不落非法日；snet 下限同样被守卫跳过；mso 显式锚点在
        // 上游已处理，不受此守卫影响。不可排程任务经 unschedulableIds 并入违约集打 .conflict
        // 标记（生产环境 devWarn 静默时仍可见）；下游任务按冻结日期排程（锚点是原日期）
        {
          const calDays = this.taskCalendar(t).days
          if (calDays !== null && calDays.size === 0) {
            if (!this.warnedUnschedulable) {
              this.warnedUnschedulable = true
              devWarn(
                '[oas-gantt] auto-schedule：任务日历为空（资源 shifts: [] 或 workdays 交集为空），不可排程的任务保持原日期并以 conflict 标出',
              )
            }
            continue
          }
        }
        let required = startMs
        for (const d of t.dependencies ?? []) {
          const pred = byId.get(d.id)
          if (!pred) continue
          const type = d.type ?? 'fs'
          const pa = agg(pred.id)
          // lag（天，可负 = 提前/允许重叠）× DAY_MS 叠加到约束端点；缺省 0
          const lagMs = (typeof d.lag === 'number' && Number.isFinite(d.lag) ? d.lag : 0) * DAY_MS
          // 端点落在非工作日 → 吸附到下一个工作日；ff/sf 吸附对应 end 后派生 start（工期不变）
          const need =
            type === 'fs'
              ? this.snapToWorkingDay(pa.endMs + lagMs, t)
              : type === 'ss'
                ? this.snapToWorkingDay(pa.startMs + lagMs, t)
                : type === 'ff'
                  ? this.shiftByDuration(this.snapToWorkingDay(pa.endMs + lagMs, t), -duration, wholeDay)
                  : this.shiftByDuration(this.snapToWorkingDay(pa.startMs + lagMs, t), -duration, wholeDay)
          if (need > required) required = need
        }
        // snet：约束下限（只前推不提前）。约束优先：先取 max 再吸附，故吸附结果不会早于约束日
        if (con && con.mode === 'snet' && con.ms > required) required = con.ms
        if (!(required > startMs)) continue // 只推不提前（fnlt 不在此移动：仅参与违约判定）
        required = this.snapToWorkingDay(required, t)
        required = this.snapToShift(required, t)
        if (!(required > startMs)) continue
        if (this.writeStartKeepingDuration(t, required, duration)) {
          changed.add(t.id)
          invalidateAgg(t.id)
          dirty = true
        }
      }
      if (!dirty) break
    }
    if (changed.size === 0) return []
    const ids = [...changed]
    this.syncTasksAttr()
    // 一次用户操作只发一次 oas-tasks-change：内部写回路径由外层提交口统一派发（最终数据），
    // 此处只发 oas-reschedule；无外层提交的触发（属性通道改数据 / 运行期开启）在此补发。
    // 先 reschedule 后 tasks-change：属性通道与提交口事件序统一（提交口的 tasks-change 在嵌套
    // update 返回后由 commitTasks 派发，同样紧随 reschedule）。
    this.emit('reschedule', { ids } satisfies GanttRescheduleDetail)
    if (!this.inInternalWrite) this.emitTasksChange()
    return ids
  }

  private onBarKeyDown(e: KeyboardEvent, row: GanttRow): void {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.shiftKey) {
      // 条上 Delete/Backspace 不应冒泡到 document 去删已选连线（与行内行为一致）
      e.stopPropagation()
      return
    }
    if (e.key === 'Escape' && this.dragCtx) {
      e.stopPropagation()
      this.cancelDrag()
      return
    }
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !e.shiftKey) return
    if (row.task.disabled === true || row.isSummary || this.datesReadonlyOn()) return
    e.preventDefault()
    const dir = (e.key === 'ArrowRight' ? 1 : -1) * (isRtl(this) ? -1 : 1)
    const datetime = row.task.start.length > 10
    // 整体平移：以 start 的单元步长求位移。两端各自 addUnitsMs 在 month/quarter/year 档会各自吸附到月首，
    // 短任务（<1 单元）会被压成 start>end 的非法值；用同一位移量则工期不变、恒合法。
    const deltaMs = this.addUnitsMs(row.startMs, dir) - row.startMs
    this.commitDates(row.task.id, row.startMs + deltaMs, row.endMs + deltaMs, datetime, row.startMs, row.endMs)
  }

  // ===== 依赖连线（SVG 单画布覆盖层，窗口行内绘制）=====

  private renderLinks(): void {
    const svg = this.linksEl
    if (!svg) return
    const totalH = this.layoutRows() * this.rowHeightPx()
    svg.setAttribute('width', String(this.canvasW))
    svg.setAttribute('height', String(totalH))
    svg.innerHTML =
      '<defs><marker id="oas-gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>'
    if (this.rows.length === 0) return
    const rowH = this.rowHeightPx()
    const rowIdx = new Map<string, number>()
    for (let i = this.winStart; i < this.winEnd; i++) rowIdx.set(this.rows[i]!.task.id, i)
    const frag = document.createDocumentFragment()
    const ns = 'http://www.w3.org/2000/svg'
    const ro = this.hasAttr('readonly')
    for (let i = this.winStart; i < this.winEnd; i++) {
      const t = this.rows[i]!
      for (const dep of t.task.dependencies ?? []) {
        const fromIdx = rowIdx.get(dep.id)
        const toIdx = rowIdx.get(t.task.id)
        if (fromIdx === undefined || toIdx === undefined) continue
        const from = this.rows[fromIdx]!
        const to = this.rows[toIdx]!
        const type = dep.type ?? 'fs'
        // 端点：fs 前置任务完成点→后继任务起始点；ss 起始点→起始点；ff 完成点→完成点；sf 起始点→完成点
        const fromX = type === 'fs' || type === 'ff' ? this.xOf(from.endMs) : this.xOf(from.startMs)
        const toX = type === 'fs' || type === 'ss' ? this.xOf(to.startMs) : this.xOf(to.endMs)
        const y1 = this.absRowTop(fromIdx) + rowH / 2
        const y2 = this.absRowTop(toIdx) + rowH / 2
        const x1 = this.mirrorX(fromX)
        const x2 = this.mirrorX(toX)
        // 折线：水平出 14px → 垂直 → 水平进；终点空间不足时收在中间（箭头仍随路径）
        const out = x2 >= x1 + 28 ? x2 - 14 : Math.max(x1, x2) + 14
        const d = `M ${x1} ${y1} L ${out} ${y1} L ${out} ${y2} L ${x2} ${y2}`
        const lag = typeof dep.lag === 'number' && Number.isFinite(dep.lag) ? dep.lag : 0
        // 命中路径仅对非只读且**后继未禁用**者渲染（禁用任务不被依赖写入，故其入边不可选删）；可见线仍画
        if (!ro && t.task.disabled !== true) {
          const hit = document.createElementNS(ns, 'path')
          hit.setAttribute('class', 'link-hit')
          hit.setAttribute('d', d)
          hit.setAttribute('data-from', t.task.id)
          hit.setAttribute('data-to', dep.id)
          hit.setAttribute('data-type', type)
          if (lag !== 0) hit.setAttribute('data-lag', String(lag))
          hit.setAttribute('role', 'button')
          hit.setAttribute('tabindex', '0')
          hit.setAttribute(
            'aria-label',
            `${this.t('gantt.linkDelete')}: ${from.task.name} → ${to.task.name}${this.lagSuffixText(lag)}`,
          )
          hit.addEventListener('click', (e) => {
            e.stopPropagation()
            this.selectLink(t.task.id, dep.id, type)
          })
          hit.addEventListener('keydown', (e) => {
            const k = e.key
            if (k === 'Enter' || k === ' ' || k === 'Delete' || k === 'Backspace') {
              e.preventDefault()
              e.stopPropagation()
              this.selectLink(t.task.id, dep.id, type)
              this.removeSelectedLink()
              // 命中路径随重建移除会让焦点落到 body → 交回组件，保持键盘可达
              const bar = this.barsEl?.querySelector<HTMLElement>(`.bar[data-id="${escId(t.task.id)}"]`)
              ;(bar ?? this).focus({ preventScroll: true })
            }
          })
          frag.appendChild(hit)
        }
        const path = document.createElementNS(ns, 'path')
        path.setAttribute('class', 'link')
        path.setAttribute('aria-hidden', 'true')
        path.setAttribute('d', d)
        path.setAttribute('data-from', t.task.id)
        path.setAttribute('data-to', dep.id)
        path.setAttribute('data-type', type)
        path.setAttribute('marker-end', 'url(#oas-gantt-arrow)')
        frag.appendChild(path)
        if (lag !== 0) {
          const label = document.createElementNS(ns, 'text')
          label.setAttribute('class', 'link-label')
          label.setAttribute('aria-hidden', 'true')
          label.setAttribute('x', String(out))
          label.setAttribute('y', String((y1 + y2) / 2))
          label.setAttribute('text-anchor', 'middle')
          label.setAttribute('dominant-baseline', 'middle')
          label.textContent = `${lag > 0 ? '+' : ''}${lag}`
          frag.appendChild(label)
        }
      }
    }
    svg.appendChild(frag)
    // 重渲染后按选中态回填高亮；目标连线已不在（过滤/数据变）则清掉武装态（防「不可见却可删」）
    if (this.selectedLink) {
      const sel = this.selectedLink
      const hit = svg.querySelector(
        `.link-hit[data-from="${escId(sel.successor)}"][data-to="${escId(sel.predecessor)}"][data-type="${sel.type}"]`,
      )
      if (hit) hit.classList.add('selected')
      else this.selectedLink = null
    }
  }

  /**
   * 行斑马纹层（stripe 属性，opt-in）：窗口内绝对行号为奇数的行画整行底色，与左侧行名
   * （data-stripe → .row-name[data-stripe] 背景）同口径。条纹容器插在 .grid-canvas 之前
   * （层级在下 → 周末/假日格只透出工作日部分），随滚动帧按窗口重建/清理（无残影）；
   * 关闭时容器一并移除（零额外 DOM）。条纹 top 走 absRowTop（绝对行号）→ 滚动/变高/切片
   * 后奇偶稳定。width 取画布全宽：列虚拟化下条纹不属于任何列，只随数据画布变宽。
   */
  private renderStripes(): void {
    const inner = this.innerEl
    const grid = this.gridEl
    if (!inner || !grid) return
    // render() 重建 innerHTML 后旧引用失联 → 以 isConnected 自愈重建
    let canvas = this.stripeCanvasEl
    if (canvas && !canvas.isConnected) canvas = this.stripeCanvasEl = null
    if (!this.stripeOn()) {
      canvas?.remove()
      this.stripeCanvasEl = null
      return
    }
    if (!canvas) {
      canvas = document.createElement('div')
      canvas.className = 'stripe-canvas'
      canvas.setAttribute('aria-hidden', 'true')
      inner.insertBefore(canvas, grid)
      this.stripeCanvasEl = canvas
    }
    canvas.innerHTML = ''
    const rowH = this.rowHeightPx()
    const frag = document.createDocumentFragment()
    for (let i = this.winStart; i < this.winEnd; i++) {
      if (!this.isStripeRow(i)) continue
      const stripe = document.createElement('div')
      stripe.className = 'stripe'
      stripe.style.top = `${this.absRowTop(i)}px`
      stripe.style.height = `${rowH}px`
      stripe.style.width = `${this.canvasW}px`
      frag.appendChild(stripe)
    }
    canvas.appendChild(frag)
  }

  /** 行 hover 开关：默认开；hover="false" 关闭（左侧行名经 --_row-hover-bg 透明化，时间轴不建层） */
  private hoverOn(): boolean {
    return this.getAttr('hover', '') !== 'false'
  }

  private setHoverRow(key: string | null): void {
    if (this.hoverKey === key) return
    this.hoverKey = key
    this.renderRowHover()
  }

  /** 行 hover（左侧行名委托）：pointerover 落在 .row-name 上 → 点亮该行；触控（pointerType=touch）不响应 */
  private onSidePointerOver = (e: PointerEvent): void => {
    if (!this.hoverOn() || e.pointerType === 'touch') return
    const name = e.target instanceof Element ? e.target.closest('.row-name') : null
    if (name instanceof HTMLElement && name.dataset.key) this.setHoverRow(name.dataset.key)
  }

  /** 行 hover（时间轴委托）：pointerover 落在任务条上 → 点亮条所在行 */
  private onTbodyPointerOver = (e: PointerEvent): void => {
    if (!this.hoverOn() || e.pointerType === 'touch') return
    const bar = e.target instanceof Element ? e.target.closest('.bar') : null
    if (bar instanceof HTMLElement && bar.dataset.id) this.setHoverRow(bar.dataset.id)
  }

  /** 指针离开行名列表/时间轴视口 → 清除 hover 行（容器 pointerleave 不冒泡，两侧各挂一份） */
  private onHoverPointerLeave = (): void => {
    this.setHoverRow(null)
  }

  /**
   * 行 hover 时间轴装饰层（单元素，随 renderWindow 每帧重建定位）：hover 行在窗口内 → 按绝对行号
   * 定位（top=absRowTop、height=行高、width=画布全宽）；滚出窗口 → 移除层但保留 hoverKey（滚回即恢复）；
   * hover 行被数据删除 / hover="false" → 状态与层一并清除。层插在 .grid-canvas 之前（条纹之上、
   * 周末/假日列之下），DOM 序与 .stripe-canvas 同法自愈（isConnected 重建）。
   */
  private renderRowHover(): void {
    const inner = this.innerEl
    if (!inner) return
    let el = this.hoverEl
    if (el && !el.isConnected) el = this.hoverEl = null
    if (!this.hoverOn()) {
      this.hoverKey = null
      el?.remove()
      this.hoverEl = null
      return
    }
    const key = this.hoverKey
    const idx = key === null ? undefined : this.rowIndexById.get(key)
    if (idx === undefined || idx < this.winStart || idx >= this.winEnd) {
      // 行不存在（数据删改）→ 清状态；行滚出窗口 → 只藏层（保留态，滚回恢复）
      if (idx === undefined) this.hoverKey = null
      el?.remove()
      this.hoverEl = null
      return
    }
    if (!el) {
      el = document.createElement('div')
      el.className = 'row-hover'
      el.setAttribute('aria-hidden', 'true')
      this.hoverEl = el
    }
    // 绘制序自愈：同为 absolute 无 z-index → DOM 序即绘制序，契约是「条纹 < hover < 周末/假日列」。
    // 层必须**紧贴 .grid-canvas 之前**，且不能依赖创建时机——运行期开 stripe 时条纹容器会插到
    // .grid-canvas 之前（落在已存在的层之后），若这里只按创建时插一次，条纹就会压住 hover 层
    // （自定义 --oas-gantt-row-hover-bg 时奇数行 hover 静默失效；回归见「⑤ 运行期开启 stripe」）
    if (el.nextSibling !== this.gridEl) inner.insertBefore(el, this.gridEl)
    el.style.top = `${this.absRowTop(idx)}px`
    el.style.height = `${this.rowHeightPx()}px`
    el.style.width = `${this.canvasW}px`
  }

  /** 周末/假日列高亮（day/hour 档；week+ 档跨度大不高亮） */
  private renderGrid(): void {
    const grid = this.gridEl
    if (!grid) return
    grid.innerHTML = ''
    const scale = this.scaleMode()
    if (scale !== 'day' && scale !== 'hour') return
    if (this.rows.length === 0) return
    const colW = this.colW()
    const totalH = this.layoutRows() * this.rowHeightPx()
    const holidays = this.holidaySet()
    const weekends = this.weekendsOn()
    const frag = document.createDocumentFragment()
    // 横向列虚拟化：周末/假日格只渲染窗口列（left 仍按全局 x 写，滚动由容器原生位移承载）
    for (let k = this.winColStart; k < this.winColEnd; k++) {
      const u = this.units[k]!
      const d = new Date(u.startMs)
      const iso = toISODate(d)
      const isHoliday = holidays.has(iso)
      const isWeekend = weekends && (d.getDay() === 0 || d.getDay() === 6)
      if (!isHoliday && !isWeekend) continue
      const cell = document.createElement('div')
      cell.className = `cell${isHoliday ? ' holiday' : ' weekend'}`
      cell.style.left = `${this.mirrorCellLeft(this.xOf(u.startMs), colW)}px`
      cell.style.width = `${colW}px`
      cell.style.height = `${totalH}px`
      frag.appendChild(cell)
    }
    grid.appendChild(frag)
  }

  /** 今日线（show-today 默认开；today 在范围内才渲染；装饰层 aria-hidden） */
  private renderToday(): void {
    const line = this.todayEl
    if (!line) return
    const todayMs = startOfDay(new Date()).getTime()
    const inRange =
      this.units.length > 0 && todayMs >= this.units[0]!.startMs && todayMs < this.units[this.units.length - 1]!.endMs
    if (!this.showTodayOn() || !inRange || this.rows.length === 0) {
      line.hidden = true
      return
    }
    line.hidden = false
    line.style.left = `${this.mirrorX(this.xOf(todayMs))}px`
    line.style.height = `${this.layoutRows() * this.rowHeightPx()}px`
    line.setAttribute('title', this.t('gantt.today'))
  }

  /**
   * 状态线（show-status-line opt-in，默认关；status-date 在范围内才渲染；装饰层 aria-hidden）。
   * 渲染路径与 today-line 同构（同 xOf/mirrorX/高度算式），独立 token
   * `--oas-gantt-status-line-color`（缺省 warning 色族）；title 用归一化日期原文（无新 i18n key）。
   * status-date 缺省/非法回落当天——SSR 下为服务器当天，需确定性的宿主请显式传 status-date。
   */
  private renderStatusLine(): void {
    const line = this.statusLineEl
    if (!line) return
    // 开关先行（闸门后短路）：关闭态不解析 status-date、不计算范围，默认路径零新增开销
    if (!this.statusLineOn()) {
      line.hidden = true
      return
    }
    const statusMs = this.statusDateMs()
    const inRange =
      this.units.length > 0 && statusMs >= this.units[0]!.startMs && statusMs < this.units[this.units.length - 1]!.endMs
    if (!inRange || this.rows.length === 0) {
      line.hidden = true
      return
    }
    line.hidden = false
    line.style.left = `${this.mirrorX(this.xOf(statusMs))}px`
    line.style.height = `${this.layoutRows() * this.rowHeightPx()}px`
    line.title = toISODate(new Date(statusMs))
  }

  private plannedRatio(row: GanttRow, statusMs: number): number {
    return plannedRatio(row, statusMs)
  }

  // ===== tooltip（单例浮层：名称 + 区间 + 进度；template[slot=tooltip] 覆盖内容）=====

  private poolResourceText(t: TG): string {
    return poolResourceText(t, this.effectivePool())
  }

  private showTooltip(row: GanttRow, bar: HTMLElement): void {
    const tip = this.tooltipEl
    if (!tip) return
    const tpl = this.querySelector('template[slot="tooltip"]')
    if (tpl instanceof HTMLTemplateElement) {
      tip.innerHTML = ''
      tip.appendChild(cloneSlotContent(tpl))
      const nameEl = tip.querySelector<HTMLElement>('[data-task-name]')
      if (nameEl) nameEl.textContent = row.task.name
      const rangeEl = tip.querySelector<HTMLElement>('[data-task-range]')
      if (rangeEl) rangeEl.textContent = this.rangeText(row)
      const progEl = tip.querySelector<HTMLElement>('[data-task-progress]')
      if (progEl) progEl.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
      // 资源池绑定点（pool opt-in）：模板内 [data-task-resources] 填池资源文本；关闭时清空防残留
      const resEl = tip.querySelector<HTMLElement>('[data-task-resources]')
      if (resEl) resEl.textContent = this.poolOn() ? this.poolResourceText(row.task) : ''
    } else {
      tip.innerHTML = ''
      const name = document.createElement('div')
      name.className = 'tip-name'
      name.textContent = row.task.name
      tip.appendChild(name)
      const range = document.createElement('div')
      range.className = 'tip-line'
      range.textContent = row.isMilestone
        ? `${this.t('gantt.milestone')} · ${this.fmtDay(row.startMs)}`
        : this.rangeText(row)
      tip.appendChild(range)
      if (!row.isMilestone && row.task.end) {
        const prog = document.createElement('div')
        prog.className = 'tip-line'
        prog.textContent = this.t('gantt.tooltipProgress', { progress: row.progress })
        tip.appendChild(prog)
      }
      // 资源池展示行（pool opt-in，默认关零节点）：池内取名称/费率；池未登记 id 忽略（与超配检测同口径）
      const resText = this.poolResourceText(row.task)
      if (this.poolOn() && resText !== '') {
        const res = document.createElement('div')
        res.className = 'tip-line'
        res.textContent = resText
        tip.appendChild(res)
      }
    }
    tip.hidden = false
    // 定位：条上方居中（宿主视口内夹取）；无布局环境（rect 全 0）时回落原点不炸
    const hostRect = this.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const tipW = tip.offsetWidth || 180
    const tipH = tip.offsetHeight || 56
    let left = barRect.left - hostRect.left + barRect.width / 2 - tipW / 2
    let top = barRect.top - hostRect.top - tipH - 6
    if (top < 0) top = barRect.top - hostRect.top + barRect.height + 6
    left = Math.max(4, Math.min(left, Math.max(hostRect.width - tipW - 4, 4)))
    tip.style.left = `${Math.max(0, left)}px`
    tip.style.top = `${Math.max(0, top)}px`
  }

  private rangeText(row: GanttRow): string {
    return this.t('gantt.tooltipRange', { start: this.fmtDay(row.startMs), end: this.fmtDay(row.endMs - 1) })
  }

  private hideTooltip(): void {
    if (this.tooltipEl) this.tooltipEl.hidden = true
  }

  override disconnectedCallback(): void {
    this.dragCtx = null
    this.unbindDocDrag()
    super.disconnectedCallback()
  }
}
