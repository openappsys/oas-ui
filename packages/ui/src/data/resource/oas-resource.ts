import { OASElement } from '@oas-ui/core'
import {
  addMonthsClamped,
  formatToken,
  getWeekStart,
  isoWeek,
  parseISODate,
  resolveLocale,
  startOfDay,
  toISODate,
} from '../../form/calendar/date-grid.js'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
  /* 默认高度走 token；height 属性存在时由 update() 写本自定义属性（写宿主自定义属性而非 height 内联）。
     宿主自身 height 内联优先级高于本 :host 规则，故宿主内联高度天然优先且组件从不触碰它 */
  height: var(--oas-resource-height, 320px);
  /* 泳道条间距由「行高 − 条高」推导并钳非负（单段时合计 = 行高）。
     声明在 :host 上才可被宿主内联/token 覆盖（元素自身声明会压过继承值）；段数/段序为内部量不落变量 */
  --oas-resource-lane-gap: max(
    0px,
    (var(--oas-resource-row-height, 36px) - var(--oas-resource-bar-height, 20px)) / 2
  );
}
:host([hidden]) {
  display: none;
}
.wrap {
  position: relative;
  height: 100%;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  overflow: hidden;
  box-sizing: border-box;
}
.scroller {
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  /* 横向虚拟化在滚动期重建窗口内的刻度/负载列（DOM 增删）会触发浏览器滚动锚定，
     把滚轮增量逐帧放大成加速循环；与 oas-virtual-list 同口径禁用锚定 */
  overflow-anchor: none;
}
.scroller[hidden] {
  display: none !important;
}
.canvas {
  min-width: 100%;
}
.row {
  display: flex;
  align-items: stretch;
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid var(--oas-color-border);
}
.row:last-child {
  border-bottom: none;
}
.name {
  flex: none;
  width: var(--oas-resource-name-width, 160px);
  position: sticky;
  inset-inline-start: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding-inline: var(--oas-space-2);
  background: var(--oas-color-bg);
  border-inline-end: 1px solid var(--oas-color-border);
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--oas-color-text-primary);
  user-select: none;
}
.head .name {
  color: var(--oas-color-text-secondary-strong);
}
.hist-head .name {
  color: var(--oas-color-text-secondary-strong);
  font-weight: 600;
}
.head .name,
.hist-head .name {
  background: var(--oas-resource-header-bg, var(--oas-color-bg));
}
.track {
  position: relative;
  flex: none;
  box-sizing: border-box;
}
.lane .track {
  /* 重叠任务按段堆叠：段高 = 条高，段间与上下留 gap（gap 派生见 :host 的 --oas-resource-lane-gap）；
     段数/段序不落 CSS 变量（内部量，避免泄漏进公开 token 表）——轨道高度与条的 top 由渲染层按段数内联写入。
     不设 overflow:hidden：条不越界由 gap 钳非负（max(0px, …)）保障；焦点环现为纯 inset
     box-shadow（全在条内），裁剪与环无关，保持不裁剪以免条几何/贴边条受裁剪影响 */
}
.ticks {
  position: relative;
  flex: none;
  height: var(--oas-resource-header-height, 32px);
  box-sizing: border-box;
}
.tick {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
  border-inline-start: 1px solid var(--oas-color-border);
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}
/* 首列去左分隔线：用 .first（= period 索引 0）而非 :first-child——横向虚拟化后
   窗口起点可能是中部列，DOM 首元素不再等于时间轴首列，:first-child 会误去中部列的分隔线 */
.ticks .tick.first {
  border-inline-start: none;
}
.bar {
  position: absolute;
  /* top 按段序内联写入（见 renderLanes）：gap + 段序 ×（条高 + gap） */
  height: var(--oas-resource-bar-height, 20px);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-resource-bar-bg, color-mix(in srgb, var(--oas-color-primary) 22%, var(--oas-color-bg)));
  box-sizing: border-box;
  /* 与 MIN_BAR_W 一致：renderLanes 已把最小宽并进 width/left，这里仅兜底（不再能造成越界） */
  min-width: 8px;
  cursor: pointer;
  user-select: none;
}
.bar:hover {
  background: var(--oas-resource-bar-hover-bg, color-mix(in srgb, var(--oas-color-primary) 34%, var(--oas-color-bg)));
}
.bar:focus-visible {
  /* 焦点环：纯 inset box-shadow 双层（不再用 outline）。
     层序（实测 Chromium）：box-shadow 列表中**前者绘制在上**——primary 环带占条缘 0–2px，
     其内侧 2–3px 为 bg 分隔带，3px 起才是条填充色；两带均真实可见，双色环不退化。
     为何不用 outline 画环：outline 与 inset box-shadow 占同一 0–2px 环带时，outline 的绘制层序
     压过 box-shadow（旧实现 outline 2px + inset bg 2px 的 bg 带为死声明，双色环退化成单色 primary）。
     为何 bg 分隔带在 primary **内侧**：light 下 hover 条底 ≈ primary 34% mix，primary 直接压在
     它上面仅 ≈2.81:1（< WCAG 2.2 非文本 3:1）；隔一层 bg 后 primary 两侧邻色均为 --oas-color-bg
     （实测 primary vs bg：light 4.56:1 / dark 10.66:1），故不必再指望 primary 与条底直接对比。
     为何每侧总厚 3px（2px 环 + 1px 分隔）而非 2px+4px：MIN_BAR_W = 8px 的条（month 档单日任务）
     聚焦时仍有 8 − 2×3 = 2px 填充可见；若按 4px 扩散，8px 条左右各 4px 会把条填充完全覆盖
     （填充可见 0px，任务色不可见）。
     环全部落在条内，不依赖与 sticky 名列（z-index 2）的层叠，贴轨道左缘（left=0）的条亦不被
     名列盖住，LTR/RTL 同。outline: none 显式压掉 UA 默认焦点描边（否则条外会多出一圈默认细环） */
  outline: none;
  box-shadow:
    inset 0 0 0 2px var(--oas-color-primary),
    inset 0 0 0 3px var(--oas-color-bg);
}
@media (forced-colors: active) {
  /* 系统高对比模式会禁用 box-shadow，若只留 outline: none 则焦点态无任何可见指示（违反
     WCAG 2.4.7）。回退为 inset outline（负 offset）：几何与双色环一致，且不被 sticky 名列遮挡 */
  .bar:focus-visible {
    outline: 2px solid;
    outline-offset: -2px;
  }
}
.hist-pad {
  flex: none;
  box-sizing: border-box;
}
.load .track {
  height: var(--oas-resource-load-height, 64px);
}
.load-track {
  overflow: hidden;
}
.col {
  position: absolute;
  top: 0;
  height: 100%;
  box-sizing: border-box;
  border-inline-start: 1px solid var(--oas-color-border);
}
/* 首列去左分隔线：同 .ticks（用 .first = period 索引 0，避免窗口化后误去中部列分隔线） */
.load .col.first {
  border-inline-start: none;
}
.pillar {
  position: absolute;
  bottom: 0;
  inset-inline-start: var(--oas-space-1);
  inset-inline-end: var(--oas-space-1);
  min-height: 2px;
  border-radius: var(--oas-radius-xs) var(--oas-radius-xs) 0 0;
  background: var(--oas-resource-load-bg, color-mix(in srgb, var(--oas-color-primary) 45%, var(--oas-color-bg)));
}
.pillar.over {
  background: var(--oas-resource-load-over-bg, var(--oas-color-danger));
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary-strong);
  background: var(--oas-color-bg);
  z-index: 3;
}
.empty[hidden] {
  display: none !important;
}
`

/** 资源（负载视图行）：id 为任务分配的引用键；capacity 缺省回落组件 capacity 属性（最终 1） */
export interface ResourceItem {
  /** 资源 id（必填，重复/空 id 丢弃） */
  id?: string
  /** 资源名（必填，缺失丢弃） */
  name: string
  /** 该资源的并行容量上限（正数；缺省回落 capacity 属性，最终 1） */
  capacity?: number
  [key: string]: unknown
}

/** 资源任务：start/end 为 'YYYY-MM-DD'（日精度，end 含端）；resources 为分配的资源 id 数组 */
export interface ResourceTask {
  /** 任务 id（必填，缺失丢弃） */
  id?: string
  /** 任务名（必填，缺失丢弃） */
  name: string
  /** 开始 'YYYY-MM-DD' */
  start: string
  /** 结束 'YYYY-MM-DD'（含当日） */
  end: string
  /** 分配的资源 id 数组（指向不存在资源的分配被忽略） */
  resources?: string[]
  [key: string]: unknown
}

/** 刻度档：day/week/month（决定直方图 period 粒度与时间轴刻度文案） */
export type ResourceScale = 'day' | 'week' | 'month'

/** task-click 事件载荷 */
export interface ResourceTaskClickDetail {
  id: string
  task: ResourceTask
  resourceId: string
}

/** tasks-change 事件载荷 */
export interface ResourceTasksChangeDetail {
  tasks: ResourceTask[]
}

/** overload 单条超载档 */
export interface ResourceOverloadEntry {
  resourceId: string
  /** period 起始日期 'YYYY-MM-DD' */
  period: string
  load: number
  capacity: number
}

/** overload 事件载荷（每次 update 至多一个事件，聚合全部超载档） */
export interface ResourceOverloadDetail {
  overloads: ResourceOverloadEntry[]
}

/** levelResources 选项 */
export interface LevelResourcesOptions {
  /** 步进粒度（缺省 day） */
  scale?: ResourceScale
  /** 资源未声明 capacity 时的缺省容量（缺省 1） */
  capacity?: number
  /** 迭代上限（缺省 500，达上限即停，返回已移动部分） */
  maxIter?: number
  /** week 档周起始（0=周日 … 6=周六；缺省 1=周一，纯函数无 locale 上下文） */
  weekStart?: number
}

/** 内部清洗后资源模型（capacity: null = 回落组件缺省容量）；白名单外键原样透传 */
interface RS {
  id: string
  name: string
  capacity: number | null
  [key: string]: unknown
}

/** 内部清洗后任务模型（日期已归一为本地日精度、end ≥ start）；白名单外键原样透传 */
interface RT {
  id: string
  name: string
  start: string
  end: string
  resources: string[]
  [key: string]: unknown
}

/** 直方图 period（列） */
interface Period {
  startMs: number
  endMs: number
  label: string
}

/** 任务时间跨度（负载统计与 level 迭代共用） */
interface Span {
  startMs: number
  endMs: number
  index: number
}

/**
 * 泳道条布局缓存单元（横向虚拟化的预计算结果）：一条任务条在画布上的几何与段序。
 * scroll 帧只看它决定「哪些进窗口」，不再做 filter/sort/贪心分段（每帧 O(全量任务) 的开销来源）。
 */
interface LaneEntry {
  /** 稳定 key：`${resId}:${taskId}:${segIndex}`（泳道内唯一，条节点增删/复用的依据） */
  key: string
  /** 任务 id（渲染 data-task-id 与点击定位） */
  taskId: string
  /** span 索引（取任务模型 this._tasks[e.index]） */
  index: number
  /** 段序号（决定条 top 偏移） */
  segIndex: number
  /** 画布坐标左缘（已并入最小宽钳制；物理 left 由 renderLanes 做 RTL 镜像） */
  xStart: number
  /** 条宽 px（已并入最小宽钳制） */
  w: number
}

/** 单资源泳道布局：条几何列表（按任务序）+ 段数（轨道高算式用）+ 横向窗口查询索引 */
interface LaneLayout {
  entries: LaneEntry[]
  /** 段数（≥ 1；重叠任务被分入不同段，段数决定泳道高） */
  segs: number
  /** 按 xStart 升序的 entries 下标（同 xStart 保原序）：窗口查询只对它二分，不再线性扫全部条 */
  order: number[]
  /**
   * 按 order 序、以 xEnd（= xStart + w）为叶值的**区间最大值段树**（扁平数组；叶子在
   * [segTreeSize, 2·segTreeSize)，补齐叶为 SEG_TREE_EMPTY）。用于枚举「xStart < winLeft
   * 且 xEnd ≥ winLeft」的跨窗口长条：只有区间 max ≥ winLeft 的子树才下探（见 cullLane）。
   */
  segTree: Float64Array | null
  /** segTree 叶子起始下标（≥ entries.length 的最小 2 的幂）；entries 为空时为 0 */
  segTreeSize: number
  /** 全量 max(xEnd)：< winLeft 时该泳道必无命中（快路径，无需二分） */
  maxEnd: number
  /** 全量 min(xStart)：> winRight 时该泳道必无命中（快路径，无需二分） */
  minStart: number
}

/** 段树补齐叶哨兵：−Infinity 使补齐叶在任意 winLeft（含首窗负值）下都被剪枝 */
const SEG_TREE_EMPTY = Number.NEGATIVE_INFINITY

const SCALES: ResourceScale[] = ['day', 'week', 'month']
/** 各档列宽（px）：泳道与直方图共用同一横向列宽 */
const SCALE_COL: Record<ResourceScale, number> = { day: 36, week: 90, month: 110 }
/** 泳道条最小宽度（px）：单日任务在 month 档按比例内插可小于此值，钳到该宽度保证可点可读。
 * renderLanes 把它并进 width 与 left（条恒在画布内），CSS min-width 仅作兜底（两处需一致） */
const MIN_BAR_W = 8
/** 横向虚拟窗口两侧预渲染列数（overscan）：滚动中提前铺好视口外一屏，避免边缘露白 */
const COL_BUFFER = 4
/** 纵向行虚拟窗口上下预渲染行数（overscan）：语义同 COL_BUFFER，泳道区/负载区共用 */
const ROW_BUFFER = 4
const DAY_MS = 86_400_000
/** period 构建护栏（防脏数据撑爆循环） */
const MAX_PERIODS = 5000
/** levelResources 缺省迭代上限 */
const DEFAULT_MAX_ITER = 500

/**
 * 变高行虚拟窗口（泳道区用；负载区行定高，直接走 computeVirtualWindow）：
 * 与 computeVirtualWindow 同语义（scrollTop 夹取、buffer 行上下越界预渲染、行索引半开区间），
 * 但行高可变——泳道行高随段数（segs）变化（segs×barH + (segs+1)×gap + 行框线），offsets 为
 * n+1 前缀和（offsets[i] = 行 i 顶，offsets[n] = 总高）。定高输入下与 computeVirtualWindow 逐位等价：
 * start = clamped 所在行 − buffer（= floor(top/ih) − buffer），end = 视口底后首行 + buffer（= ceil((top+vh)/ih) + buffer）。
 */
function computeRowWindowFromOffsets(
  offsets: number[],
  top: number,
  viewport: number,
  count: number,
  buffer = 4,
): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: 0 }
  const vh = Math.max(0, Number.isFinite(viewport) ? viewport : 0)
  const total = offsets[count] ?? 0
  const clamped = Math.min(Math.max(0, Number.isFinite(top) ? top : 0), Math.max(0, total - vh))
  // 首个「行底 offsets[i+1] > clamped」的行 = clamped 所在行
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((offsets[mid + 1] ?? 0) <= clamped) lo = mid + 1
    else hi = mid
  }
  const start = Math.max(0, lo - buffer)
  // 首个「行顶 offsets[i] ≥ clamped + vh」的行 = 视口底之后首行（无则 count）
  const bottom = clamped + vh
  let a = 0
  let b = count
  while (a < b) {
    const mid = (a + b) >> 1
    if ((offsets[mid] ?? 0) < bottom) a = mid + 1
    else b = mid
  }
  const end = Math.min(count, a + buffer)
  return { start, end }
}

/** 资源已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
const RESERVED_RESOURCE_KEYS = new Set(['id', 'name', 'capacity'])
/** 任务已知字段（清洗时按各自口径处理）；此外的键视为宿主自定义字段，原样透传 */
const RESERVED_TASK_KEYS = new Set(['id', 'name', 'start', 'end', 'resources'])

/** 透传白名单外的自定义键时一律跳过的危险键：防 `__proto__` 等原型 setter / 内建键遮蔽 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** 属性读取哨兵：accessor getter 抛异常时返回（与合法的 undefined 值区分，供调用方按无效丢弃） */
const READ_FAILED: unique symbol = Symbol('oas-resource-read-failed')

/**
 * 安全读取对象属性：宿主传入的对象可能带**抛异常的 accessor getter**（`Object.entries`/直接取键
 * 都会同步调用 getter 并冒泡，令 setter 抛未捕获异常）。这里逐键 try/catch，异常返回 READ_FAILED
 * 由调用方按无效丢弃——只丢该键，不影响其余键清洗。异常键的 devWarn 去重由调用方决定。
 */
function safeGet(obj: object, key: string): unknown {
  try {
    return (obj as Record<string, unknown>)[key]
  } catch {
    return READ_FAILED
  }
}

/**
 * 顶层数组探测防抛：`Array.isArray` 走 IsArray 内部方法，**已吊销的 Proxy 会抛 TypeError**
 *（「是不是数组」这一步本身就可能炸，与条目级探测同源）。失败即视为无效输入：返回 false 并
 * 经 onInvalid 走既有无效告警通道（实例级 / 模块级去重），兑现「全链路防抛」；
 * 非数组的正常输入仍静默返回 false（不误报为结构性损坏）。
 */
function isArraySafe(v: unknown, onInvalid?: () => void): v is unknown[] {
  try {
    return Array.isArray(v)
  } catch {
    onInvalid?.()
    return false
  }
}

/** MAX_PERIODS 截断告警去重（levelResources 纯函数路径：模块内仅提示一次，防 maxIter 循环刷屏） */
let periodsTruncWarned = false

/** 抛异常 accessor getter 丢弃告警去重（levelResources 纯函数路径：模块级仅提示一次，无实例可挂） */
let pureAccessorKeyWarned = false

/** 纯函数路径的「抛异常 getter 键丢弃」告警回调（模块级去重一次，无实例上下文） */
function pureAccessorKeyError(): (key: string) => void {
  return (key) => {
    if (pureAccessorKeyWarned) return
    pureAccessorKeyWarned = true
    devWarn(`[oas-resource] 数据含抛异常的自定义键 getter（如「${key}」），已丢弃该键（其余键保留）`)
  }
}

let pureInvalidEntryWarned = false

/** 纯函数路径的「结构性无效条目丢弃」告警回调（模块级去重一次，无实例上下文） */
function pureInvalidEntryError(): () => void {
  return () => {
    if (pureInvalidEntryWarned) return
    pureInvalidEntryWarned = true
    devWarn(`[oas-resource] 输入含结构性不可读条目（如已吊销的 Proxy），已丢弃该条目（其余条目保留）`)
  }
}

/**
 * 自定义键值深拷贝（防抛外壳）：源值可能在写入与读取之间被结构性吊销（revoked Proxy——
 * `typeof` 探测不抛，但 `instanceof` / `Array.isArray` / `Object.keys` / `Object.getPrototypeOf`
 * 等结构性探测一律抛 TypeError），此处兜底返回 READ_FAILED，
 * 由调用方按「无效值」丢弃该键/该元素，兑现「读为拷贝绝不抛未捕获异常」。
 */
function cloneCustom(v: unknown, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): unknown {
  try {
    return cloneCustomInner(v, memo, onKeyError)
  } catch {
    return READ_FAILED
  }
}

/**
 * 自定义键值深拷贝（实现体）：嵌套 plain object / array 逐层递归复制、Date 复制时间戳，
 * 类实例 / Set 等奇异对象与函数原样引用（组件数据契约是 JSON 可序列化面，奇异对象不擅自变形）。
 *
 * 记忆化：WeakMap 记「源对象 → 已建拷贝」（进入时登记、复用不复建）——
 * - 循环安全：再次遇到在拷中的源 → 直接返回其拷贝，拷贝图与源图同构（环闭合在拷贝上），
 *   绝不 RangeError / 栈溢出，也不静默泄漏内部引用；
 * - 共享保持：同一源对象在多处出现（兄弟位置/跨条目）→ 结果中是同一个拷贝引用，不复制成多份。
 * 递归经 cloneCustom 外壳逐层防抛：嵌套深处某层结构吊销时只让该层值无效，不冒泡到顶层调用方。
 */
function cloneCustomInner(v: unknown, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): unknown {
  if (v === null || typeof v !== 'object') return v
  if (v instanceof Date) return new Date(v.getTime())
  const seen = memo ?? new WeakMap<object, unknown>()
  const cached = seen.get(v)
  if (cached !== undefined) return cached
  if (Array.isArray(v)) {
    const out: unknown[] = []
    seen.set(v, out)
    for (const x of v) {
      const c = cloneCustom(x, seen, onKeyError)
      // 数组元素结构性无效（如 revoked Proxy）→ 置 null 占位（保留位序；不把会炸的引用递给宿主）
      out.push(c === READ_FAILED ? null : c)
    }
    return out
  }
  const proto = Object.getPrototypeOf(v)
  if (proto === Object.prototype || proto === null) {
    const out: Record<string, unknown> = {}
    seen.set(v, out)
    // Object.keys 不触发 getter；逐键 safeGet 读值，抛异常键丢弃（只丢该键）
    for (const k of Object.keys(v)) {
      if (UNSAFE_KEYS.has(k)) continue
      const val = safeGet(v, k)
      if (val === READ_FAILED) {
        onKeyError?.(k)
        continue
      }
      const c = cloneCustom(val, seen, onKeyError)
      if (c === READ_FAILED) {
        onKeyError?.(k)
        continue
      }
      out[k] = c
    }
    return out
  }
  return v
}

/**
 * 解析 'YYYY-MM-DD'（非法返回 null；与 gantt 同口径走 parseISODate）。
 * 仅日精度：带时刻输入截断到本地当日 00:00（文档承诺「带时刻输入按日处理」）。
 */
function parseTaskDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const d = parseISODate(s.trim())
  return d ? startOfDay(d) : null
}

/** 本地日历日加减：结果恒为本地 00:00，跨 DST 边界不漂移（毫秒加减会偏移 1 小时） */
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** 日历日差（b − a，忽略时刻/时区偏移；UTC 归一规避 DST 导致的 23/25 小时误差） */
function calendarDaysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / DAY_MS)
}

/** 容量清洗：正有限数才有效，其余回落 null（= 用组件缺省容量） */
function sanitizeCapacity(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
  return v
}

/**
 * 清洗资源数组（纯函数）：非对象/缺 id/缺名/空串丢弃；重复 id 保留首个；
 * capacity 非正有限数 → null（回落组件缺省容量）；白名单外的自定义键原样透传。
 * 逐键读取走 safeGet：宿主对象带抛异常的 accessor getter 时只丢该键（onKeyError 回调，供调用方告警）。
 * 结构性容错（onInvalid 回调）：条目为 revoked Proxy 等 ownKeys / 原型探测都会抛的对象时，
 * 该条整体丢弃、其余保留，绝不抛未捕获异常；**顶层数组本身**为 revoked Proxy 时（Array.isArray 抛）
 * 整体视为无效输入（返回空数组 + 同一告警通道）。
 */
function sanitizeResources(v: unknown, onKeyError?: (key: string) => void, onInvalid?: () => void): RS[] {
  if (!isArraySafe(v, onInvalid)) return []
  const out: RS[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    // 结构性探测：revoked Proxy 连 ownKeys（Object.keys）都不可用（typeof 却恒不抛）——
    // 预取自有键显式探测：失败即结构性无效（onInvalid 告警 + 整条丢弃），不滑进「缺 id 丢弃」静默路径；
    // 成功则复用该键数组做自定义键透传（ownKeys 不双调）
    let ownKeys: string[]
    try {
      ownKeys = Object.keys(item)
    } catch {
      onInvalid?.()
      continue
    }
    // 结构性容错：兜住条目处理全程的残余抛点（嵌套值的 Array.isArray / 原型探测等）
    try {
      const raw = item as Record<string, unknown>
      const id = safeGet(raw, 'id')
      const name = safeGet(raw, 'name')
      if (typeof id !== 'string' || id === '') continue
      if (typeof name !== 'string' || name === '') continue
      if (seen.has(id)) continue
      seen.add(id)
      const cap = safeGet(raw, 'capacity')
      const r: RS = { id, name, capacity: cap === READ_FAILED ? null : sanitizeCapacity(cap) }
      // 自定义字段透传（ResourceItem 的 `[key: string]: unknown` 契约）：白名单外的键原样保留
      for (const k of ownKeys) {
        if (RESERVED_RESOURCE_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
        const val = safeGet(raw, k)
        if (val === READ_FAILED) {
          onKeyError?.(k)
          continue
        }
        r[k] = val
      }
      out.push(r)
    } catch {
      onInvalid?.()
    }
  }
  return out
}

/**
 * 清洗任务数组（纯函数）：非对象/缺 id/缺名/日期不可解析丢弃；重复 id 保留首个（丢弃后续，
 * 与资源同口径，避免点击/事件/moved 按 id 取用时歧义）并告警一次；
 * start/end 归一为本地日精度（带时刻输入截断到当日）；end 早于 start 自愈交换（日精度 end 含当日）；
 * resources 过滤为非空字符串数组并去重（未知资源 id 的分配在渲染/统计层忽略）；
 * 白名单外的自定义键原样透传。逐键读取走 safeGet（抛异常 getter 只丢该键，onKeyError 回调）。
 * 结构性容错（onInvalid 回调）：条目为 revoked Proxy 等 ownKeys 探测都会抛的对象，
 * 或条目内嵌套值结构性不可读（如 resources 数组值已吊销）时，该条整体丢弃、其余保留；
 * **顶层数组本身**为 revoked Proxy 时（Array.isArray 抛）整体视为无效输入（返回空数组 + 同一告警通道）。
 */
function sanitizeTasks(v: unknown, onKeyError?: (key: string) => void, onInvalid?: () => void): RT[] {
  if (!isArraySafe(v, onInvalid)) return []
  const out: RT[] = []
  const seen = new Set<string>()
  let dupWarned = false
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    // 结构性探测（同 sanitizeResources）：revoked Proxy 连 ownKeys（Object.keys）都不可用——
    // 失败即结构性无效（onInvalid 告警 + 整条丢弃）；成功则复用该键数组做自定义键透传
    let ownKeys: string[]
    try {
      ownKeys = Object.keys(item)
    } catch {
      onInvalid?.()
      continue
    }
    // 结构性容错：兜住条目处理全程的残余抛点（嵌套 resources 值的 Array.isArray / 原型探测等）
    try {
      const raw = item as Record<string, unknown>
      const id = safeGet(raw, 'id')
      const name = safeGet(raw, 'name')
      if (typeof id !== 'string' || id === '') continue
      if (typeof name !== 'string' || name === '') continue
      const sd = parseTaskDate(safeGet(raw, 'start'))
      const ed = parseTaskDate(safeGet(raw, 'end'))
      if (!sd || !ed) continue
      if (seen.has(id)) {
        if (!dupWarned) {
          dupWarned = true
          devWarn(`[oas-resource] 重复任务 id "${id}"，已保留首个、丢弃后续`)
        }
        continue
      }
      seen.add(id)
      // 日期颠倒自愈：按渲染语义交换（日精度 end 含当日，故用日历日比较）
      let startDate = sd
      let endDate = ed
      if (endDate.getTime() < startDate.getTime()) {
        const tmp = startDate
        startDate = endDate
        endDate = tmp
      }
      const rawResources = safeGet(raw, 'resources')
      const resources = Array.isArray(rawResources)
        ? [...new Set(rawResources.filter((x): x is string => typeof x === 'string' && x !== ''))]
        : []
      const t: RT = {
        id,
        name,
        start: toISODate(startDate),
        end: toISODate(endDate),
        resources,
      }
      // 自定义字段透传（ResourceTask 的 `[key: string]: unknown` 契约）：白名单外的键原样保留
      for (const k of ownKeys) {
        if (RESERVED_TASK_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
        const val = safeGet(raw, k)
        if (val === READ_FAILED) {
          onKeyError?.(k)
          continue
        }
        t[k] = val
      }
      out.push(t)
    } catch {
      onInvalid?.()
    }
  }
  return out
}

/** 内部模型 → 对外任务拷贝（resources 缺省空数组不落字段；自定义键深拷贝并跳过危险键。
 * memo 由调用方传入时在同一次读内共享——同一源对象在结果中保持同一拷贝引用。
 * onKeyError：嵌套对象里抛异常的 getter 键丢弃时回调（只丢该键）；
 * 深拷贝遇结构性吊销值（revoked Proxy）同样只丢该键、绝不抛。 */
function toPublicTask(t: RT, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): ResourceTask {
  const copy: ResourceTask = { id: t.id, name: t.name, start: t.start, end: t.end }
  if (t.resources.length > 0) copy.resources = [...t.resources]
  for (const k of Object.keys(t)) {
    if (RESERVED_TASK_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
    const v = safeGet(t, k)
    if (v === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    const c = cloneCustom(v, memo, onKeyError)
    if (c === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    copy[k] = c
  }
  return copy
}

/** 内部模型 → 对外资源拷贝（capacity 缺省不落字段；自定义键深拷贝并跳过危险键；memo/onKeyError 语义同 toPublicTask） */
function toPublicResource(r: RS, memo?: WeakMap<object, unknown>, onKeyError?: (key: string) => void): ResourceItem {
  const copy: ResourceItem = { id: r.id, name: r.name }
  if (r.capacity != null) copy.capacity = r.capacity
  for (const k of Object.keys(r)) {
    if (RESERVED_RESOURCE_KEYS.has(k) || UNSAFE_KEYS.has(k)) continue
    const v = safeGet(r, k)
    if (v === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    const c = cloneCustom(v, memo, onKeyError)
    if (c === READ_FAILED) {
      onKeyError?.(k)
      continue
    }
    copy[k] = c
  }
  return copy
}

/** 任务跨度（end 含端 → 右缘次日 00:00，日历步进防 DST 漂移；清洗层保证日期合法，此处防御跳过） */
function spansOf(tasks: RT[]): Span[] {
  const spans: Span[] = []
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!
    const s = parseTaskDate(t.start)
    const e = parseTaskDate(t.end)
    if (!s || !e) continue
    const startMs = s.getTime()
    spans.push({ startMs, endMs: Math.max(addDays(e, 1).getTime(), addDays(s, 1).getTime()), index: i })
  }
  return spans
}

/** 按 scale 步进 n 个 period（全档走本地日历运算防月末溢出与 DST 漂移；period 边界恒为本地 00:00） */
function addPeriods(d: Date, scale: ResourceScale, n: number): Date {
  if (scale === 'day') return addDays(d, n)
  if (scale === 'week') return addDays(d, n * 7)
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/**
 * period 刻度文案：day → MM-dd；week → 周一起始时 W{isoWeek}，否则该档起始日 MM-dd
 * （非周一/周日起始时 ISO 周号会错一周，改用起始日更准确）；month → yyyy-MM
 */
function periodLabel(d: Date, scale: ResourceScale, locale: string, weekStart: number): string {
  if (scale === 'day') return formatToken(d, 'MM-dd', locale)
  if (scale === 'week') return weekStart === 1 ? `W${isoWeek(d)}` : formatToken(d, 'MM-dd', locale)
  return formatToken(d, 'yyyy-MM', locale)
}

/** 首个 period 锚点：day → 当日起点；week → 对齐周起始；month → 当月 1 日 */
function anchorOf(min: Date, scale: ResourceScale, weekStart: number): Date {
  if (scale === 'day') return startOfDay(min)
  if (scale === 'week') {
    const diff = (min.getDay() + 7 - weekStart) % 7
    return new Date(min.getFullYear(), min.getMonth(), min.getDate() - diff)
  }
  return new Date(min.getFullYear(), min.getMonth(), 1)
}

/**
 * 由任务区间推导 period 序列（覆盖 [minMs, maxMs) 的整 period）。
 * 纯函数：locale 仅影响文案（levelResources 复用时用固定值）。
 * 截断时回调 onTruncated 至多一次（去重粒度由调用方定：组件实例级 / 纯函数模块级）。
 */
function buildPeriods(
  minMs: number,
  maxMs: number,
  scale: ResourceScale,
  weekStart: number,
  locale: string,
  onTruncated?: () => void,
): Period[] {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) return []
  const anchor = anchorOf(new Date(minMs), scale, weekStart)
  const periods: Period[] = []
  let cursor = anchor.getTime()
  let guard = 0
  while (cursor < maxMs && guard++ < MAX_PERIODS) {
    const next = addPeriods(new Date(cursor), scale, 1)
    periods.push({
      startMs: cursor,
      endMs: next.getTime(),
      label: periodLabel(new Date(cursor), scale, locale, weekStart),
    })
    cursor = next.getTime()
  }
  if (cursor < maxMs) onTruncated?.()
  return periods
}

/**
 * 负载均衡（纯函数）：保持每任务工期不变，若某资源某 period 超载，
 * 把与该 period 重叠的任务中「开始较晚」者整体后移一个 period（并列取输入序靠后），
 * 迭代至无超载或达 maxIter。返回「被后移的任务数组」（不改入参）；组件不自动调用。
 *
 * 确定性约定：超载档按资源输入序 → period 时序取第一个处理；受害者取重叠任务中
 * startMs 最大者（并列取输入序靠后）。week 档周起始由 opts.weekStart 决定（缺省周一，
 * 纯函数无 locale 上下文；与组件 locale 周起始不同时，周粒度判定可能存在边界差）。
 */
export function levelResources(
  resources: ResourceItem[],
  tasks: ResourceTask[],
  opts: LevelResourcesOptions = {},
): ResourceTask[] {
  const onKeyError = pureAccessorKeyError()
  const rs = sanitizeResources(resources, onKeyError, pureInvalidEntryError())
  const work = sanitizeTasks(tasks, onKeyError, pureInvalidEntryError())
  if (rs.length === 0 || work.length === 0) return []
  const scale: ResourceScale = opts.scale != null && (SCALES as string[]).includes(opts.scale) ? opts.scale : 'day'
  const capDefault = sanitizeCapacity(opts.capacity) ?? 1
  const maxIter =
    typeof opts.maxIter === 'number' && Number.isFinite(opts.maxIter) && opts.maxIter >= 0
      ? Math.floor(opts.maxIter)
      : DEFAULT_MAX_ITER
  const weekStart =
    typeof opts.weekStart === 'number' && Number.isInteger(opts.weekStart) ? ((opts.weekStart % 7) + 7) % 7 : 1

  const capOf = new Map<string, number>()
  for (const r of rs) capOf.set(r.id, r.capacity ?? capDefault)

  const moved = new Set<string>()
  let iter = 0
  for (;;) {
    if (iter >= maxIter) break
    const spans = spansOf(work)
    if (spans.length === 0) break
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const s of spans) {
      if (s.startMs < minMs) minMs = s.startMs
      if (s.endMs > maxMs) maxMs = s.endMs
    }
    const periods = buildPeriods(minMs, maxMs, scale, weekStart, 'en', () => {
      // 纯函数路径模块级去重：levelResources 迭代内反复构建 period，防刷屏
      if (periodsTruncWarned) return
      periodsTruncWarned = true
      devWarn(`[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`)
    })
    if (periods.length === 0) break
    // 找第一个超载档（资源输入序 → period 时序）
    let victimIndex = -1
    let victimPeriod: Period | null = null
    outer: for (const r of rs) {
      const cap = capOf.get(r.id)!
      for (const period of periods) {
        let load = 0
        let best = -1
        let bestStart = -1
        for (const s of spans) {
          const t = work[s.index]!
          if (!t.resources.includes(r.id)) continue
          if (s.startMs < period.endMs && s.endMs > period.startMs) {
            load++
            // 受害者：重叠任务中开始较晚者；并列取输入序靠后
            if (s.startMs >= bestStart) {
              bestStart = s.startMs
              best = s.index
            }
          }
        }
        if (load > cap) {
          victimIndex = best
          victimPeriod = period
          break outer
        }
      }
    }
    if (victimIndex < 0 || !victimPeriod) break
    shiftTaskByOne(work[victimIndex]!, scale)
    moved.add(work[victimIndex]!.id)
    iter++
  }

  // 返回被后移的任务（按输入序，稳定输出）
  const out: ResourceTask[] = []
  for (const t of work) {
    if (moved.has(t.id)) out.push(toPublicTask(t, undefined, onKeyError))
  }
  return out
}

/**
 * 任务整体后移一个 period（原地改副本的 start/end 字符串，工期按日历日保持不变）：
 * day/week 本地日历日平移（跨 DST 不漂移）；month 用 addMonthsClamped 平移开始日所在自然月
 * （月末日期钳到目标月月末，如 01-31 → 02-28/29，不发生 31 号溢出到下下月），工期不变量照保。
 */
function shiftTaskByOne(t: RT, scale: ResourceScale): void {
  const s = parseTaskDate(t.start)!
  const e = parseTaskDate(t.end)!
  const dayCount = calendarDaysBetween(s, e)
  const nextStart = scale === 'month' ? addMonthsClamped(s, 1) : addDays(s, scale === 'week' ? 7 : 1)
  t.start = toISODate(nextStart)
  t.end = toISODate(addDays(nextStart, dayCount))
}

/** 事件委托用的条数据集键（task/resource 双定位：同任务多资源分配时区分点击来源） */
const ATTR_TASK_ID = 'data-task-id'
const ATTR_RESOURCE_ID = 'data-resource-id'

/**
 * 资源负载/泳道视图（data 族，纯视图）：
 * - 左侧资源名列（sticky，横向滚动不随行）
 * - 资源泳道：时间轴由全部任务 start..end 推断，每资源一行画其被分配的任务条
 * - 负载直方图：period（按 scale 归日/周/月）柱高 ∝ 该资源该 period 被分配任务数，load > capacity 加 .over
 * - 泳道与直方图共享同一横向滚动容器与列宽（单滚动容器）
 * - 双向虚拟化：横向 period 列窗口 + 纵向行窗口（泳道/负载两区独立，spacer 占位撑起滚动总高）
 * - MVP 不做排程/平衡引擎自动回写：levelResources 为导出的纯函数，由宿主按需调用
 */
export class OASResource extends OASElement {
  static override get observedAttributes(): string[] {
    return ['resources', 'tasks', 'scale', 'height', 'locale', 'capacity']
  }

  private _resources: RS[] = []
  private _tasks: RT[] = []
  private resourcesAttrCache = ''
  private tasksAttrCache = ''
  private periods: Period[] = []
  private canvasW = 0
  /** 横向虚拟窗口（列索引半开区间 [winColStart, winColEnd)）；视口不可测时回落全量 [0, periods.length) */
  private winColStart = 0
  private winColEnd = 0
  /**
   * 纵向（行）虚拟窗口（行索引半开区间，泳道区/负载区**各自独立**）；视口高不可测时回落全量
   * [0, 资源数)。泳道区行高随段数变化（computeRowWindowFromOffsets），负载区定高行（computeVirtualWindow）。
   */
  private winLaneStart = 0
  private winLaneEnd = 0
  private winLoadStart = 0
  private winLoadEnd = 0
  /** 泳道行高前缀和缓存（syncRowWindow 每次重算；renderLanes 写 spacer 高度复用同一份行模型） */
  private laneRowOffsets: number[] = []
  /** 滚动重渲染的 rAF 句柄（0 = 无挂起帧）；断开连接时取消防泄漏 */
  private scrollRaf = 0
  /**
   * scroller 的尺寸观察器：容器尺寸变化（隐藏→显示 / 窗口缩放 / 侧栏折叠 / splitter 拖动）时
   * 重算列窗口并重渲染。断开连接时 disconnect 防泄漏（bind 幂等重挂）。
   */
  private resizeObs: ResizeObserver | null = null
  /**
   * 泳道条布局预计算缓存（update() 时算好）：资源 id → 条几何 + 段数。
   * scroll 帧与 ResizeObserver 回调只按窗口增删 DOM，不重做 filter/sort/贪心分段。
   */
  private laneLayout = new Map<string, LaneLayout>()
  /**
   * 布局预计算次数（内部诊断计数）：回归用它证明 scroll 帧不触发布局重算/分段。
   * 只在 update()（数据/尺寸/属性变更）里递增，滚动与纯尺寸观察回调均不得递增。
   */
  private laneLayoutBuilds = 0
  /**
   * 窗口帧候选访问计数（**内部诊断，非 API**）：本次 renderLanes 累计访问的条候选 + 段树节点数
   * （二分与结果排序不计）。每帧重置；回归用它证明横向 cull 成本随「窗口内条数」变化、
   * 与该资源总条数解耦（看总数而非看窗口的实现会让它线性增长）。
   */
  private laneCullVisits = 0
  /** 负载统计结果缓存（滚动帧只重渲染窗口，不重算矩阵；overCount 亦随矩阵预算，避免每帧 reduce） */
  private loadRows: Array<{ resource: RS; capacity: number; loads: number[]; overCount: number }> = []
  private maxLoad = 0
  /** 超载签名去重：render+connect 双 update、属性链式触发下保证同一超载态只派发一次 */
  private lastOverloadKey: string | null = null
  /** MAX_PERIODS 截断告警去重（实例级：同一实例只提示一次，不跨实例/用例耦合） */
  private periodsTruncWarned = false
  /** serializePublic 降级告警去重（实例 + tag 粒度）：同一实例同一 tag 只提示一次 */
  private serializeWarnTags = new Set<string>()
  /** 抛异常 accessor getter 丢弃告警去重（实例 + tag 粒度）：同一实例同一 tag 只提示一次 */
  private accessorWarnTags = new Set<string>()
  /** 结构性无效条目丢弃告警去重（实例 + tag 粒度）：同一实例同一 tag 只提示一次 */
  private structuralWarnTags = new Set<string>()
  /**
   * 本实例是否写过 `--oas-resource-height`（height 属性在场期间由组件接管该自定义属性；与 oas-gantt 同协议）。
   * 仅布尔「是否写过」——不是旧实现那种按值猜「宿主原内联」的记忆启发式：
   * - 从未写过（宿主自己用内联 `--oas-resource-height` 设 token、且无 height 属性）→ 组件绝不动它；
   * - 写过又随属性移除 → removeProperty 归零（DSD 快照里的自写值同样只可能来自「属性当时在场」，
   *   水合首帧即 applied，移除后必清，不残留旧高）。
   * 非法值（属性在场但非 >0 纯数字 / Npx）：不写变量、仅清本实例自写值，宿主 token 不受影响。
   */
  private heightApplied = false
  private scrollerEl: HTMLElement | null = null
  private ticksEl: HTMLElement | null = null
  private lanesEl: HTMLElement | null = null
  private loadsEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null

  /**
   * @apiProperty 资源数组（公开读/写通道）：读为拷贝（嵌套 plain object/array 深拷贝——循环安全、
   * 同一引用在**单次读取结果内**保持共享、`Date` 按值复制；类实例/Set 等奇异对象按引用）；
   * 写为程序性赋值（清洗后序列化进受控 `resources` 属性并重渲染；含不可序列化自定义键时 attribute
   * 仅丢弃该键，property 读回仍完整保留）。
   */
  get resources(): ResourceItem[] {
    // 同一次读共享一个 memo：同一源对象（同条目兄弟位置或跨条目）在结果中是同一个拷贝引用
    const memo = new WeakMap<object, unknown>()
    return this._resources.map((r) => toPublicResource(r, memo, this.accessorKeyError('resources')))
  }
  set resources(v: ResourceItem[]) {
    this._resources = sanitizeResources(v, this.accessorKeyError('resources'), this.invalidEntry('resources'))
    // attribute 序列化走公开形态（capacity 缺省不落字段、危险键不落），与 property 读回内容一致
    this.resourcesAttrCache = this.serializePublic(
      'resources',
      // 显式包装：不能 map(toPublicResource) 直传——map 会把 index 塞进 memo 位（非 WeakMap）
      this._resources.map((r) => toPublicResource(r, undefined, this.accessorKeyError('resources'))),
      RESERVED_RESOURCE_KEYS,
    )
    this.setAttribute('resources', this.resourcesAttrCache)
    this.update()
  }

  /**
   * @apiProperty 任务数组（公开读/写通道）：读为拷贝（嵌套 plain object/array 深拷贝——循环安全、
   * 同一引用在**单次读取结果内**保持共享、`Date` 按值复制；类实例/Set 等奇异对象按引用）；
   * 写为程序性赋值（序列化进受控 `tasks` 属性、重渲染并派发 oas-tasks-change；含不可序列化自定义键时
   * attribute 仅丢弃该键，property 读回仍完整保留）。
   */
  get tasks(): ResourceTask[] {
    // 同一次读共享一个 memo（语义同 resources getter）
    const memo = new WeakMap<object, unknown>()
    return this._tasks.map((t) => toPublicTask(t, memo, this.accessorKeyError('tasks')))
  }
  set tasks(v: ResourceTask[]) {
    this._tasks = sanitizeTasks(v, this.accessorKeyError('tasks'), this.invalidEntry('tasks'))
    // attribute 序列化走公开形态（resources 空数组不落字段、危险键不落），与 property 读回内容一致
    // 显式包装：不能 map(toPublicTask) 直传——map 会把 index 塞进 memo 位（非 WeakMap）
    this.tasksAttrCache = this.serializePublic(
      'tasks',
      this._tasks.map((t) => toPublicTask(t, undefined, this.accessorKeyError('tasks'))),
      RESERVED_TASK_KEYS,
    )
    this.setAttribute('tasks', this.tasksAttrCache)
    this.update()
    this.emit('tasks-change', { tasks: this.tasks } satisfies ResourceTasksChangeDetail)
  }

  /**
   * 抛异常 accessor getter 键的丢弃告警回调（实例 + tag 粒度去重）：同一实例同一 tag 仅提示一次，
   * 逐键读取（sanitize / toPublic / cloneCustom 三处）遇 getter 抛异常时调用，只丢该键、不影响其余键。
   */
  private accessorKeyError(tag: string): (key: string) => void {
    return (key) => {
      if (this.accessorWarnTags.has(tag)) return
      this.accessorWarnTags.add(tag)
      devWarn(`[oas-resource] ${tag} 含抛异常的自定义键 getter（如「${key}」），已丢弃该键（其余键保留）`)
    }
  }

  /**
   * 结构性不可读条目的丢弃告警回调（实例 + tag 粒度去重）：同一实例同一 tag 仅提示一次。
   * 清洗层对条目的结构性读取（typeof / ownKeys / 原型探测等，revoked Proxy 会全数抛出）失败时调用——
   * 该条整体丢弃、其余条目保留，与「绝不抛未捕获异常」口径一致。
   */
  private invalidEntry(tag: string): () => void {
    return () => {
      if (this.structuralWarnTags.has(tag)) return
      this.structuralWarnTags.add(tag)
      devWarn(`[oas-resource] ${tag} 含结构性不可读条目（如已吊销的 Proxy），已丢弃该条目（其余条目保留）`)
    }
  }

  /**
   * 公开形态序列化进属性：正常走 JSON.stringify；自定义键含**不可序列化**值（循环引用 / BigInt 等）时
   * 降级为逐键尝试——只丢弃单个不可序列化的自定义键，其余合法自定义键照常保留（已知字段恒可序列化），
   * devWarn 按实例 + tag 去重（同一实例同一 tag 仅提示一次）。绝不抛未捕获异常；
   * 内部模型不移除自定义键，property 读回仍完整可见。
   *
   * 时序边界（与 property 读回的差异非契约冲突）：自定义键值若在**写入之后**才被 revoke，
   * attribute 保留写入当时的序列化快照（序列化发生在写入时点，不回改），而此后 property 读回的
   * 深拷贝会丢弃该键——两者不一致只源于「吊销发生在快照之后」，写入时点的读回仍与 attribute 一致。
   */
  private serializePublic(tag: string, rows: Array<ResourceItem | ResourceTask>, known: Set<string>): string {
    try {
      return JSON.stringify(rows)
    } catch {
      if (!this.serializeWarnTags.has(tag)) {
        this.serializeWarnTags.add(tag)
        devWarn(`[oas-resource] ${tag} 含不可序列化自定义键（如循环引用），写入属性时已丢弃该键（其余键保留）`)
      }
      return JSON.stringify(
        rows.map((row) => {
          const src = row as Record<string, unknown>
          const out: Record<string, unknown> = {}
          for (const k of known) if (src[k] !== undefined) out[k] = src[k]
          for (const [k, val] of Object.entries(src)) {
            if (known.has(k) || UNSAFE_KEYS.has(k)) continue
            try {
              JSON.stringify(val)
            } catch {
              continue // 该键不可序列化：仅丢弃此键（数据仍在 property 读回通道）
            }
            out[k] = val
          }
          return out
        }),
      )
    }
  }

  /** 滚动到指定日期（在时间轴可视区水平居中，扣除 sticky 资源名列宽度）；非法日期/无数据为空操作。RTL 走负值 scrollLeft 模型（同 gantt）。 */
  scrollToDate(date: string): void {
    const d = parseTaskDate(date)
    if (!d || !this.scrollerEl || this.periods.length === 0) return
    const x = this.xOf(d.getTime())
    const p = isRtl(this) ? this.canvasW - x : x
    // 资源名列 sticky 占用视口一隅，居中须在剩余时间轴区域内计算
    const nameW = this.shadow.querySelector<HTMLElement>('.name')?.offsetWidth ?? 0
    const half = Math.max(0, this.scrollerEl.clientWidth - nameW) / 2
    if (isRtl(this)) {
      const maxScroll = Math.max(0, this.scrollerEl.scrollWidth - this.scrollerEl.clientWidth)
      const left = Math.min(Math.max(p - half, 0), maxScroll)
      this.scrollerEl.scrollLeft = left - maxScroll
    } else {
      this.scrollerEl.scrollLeft = Math.max(0, p - half)
    }
    // 命令式滚动立即同步窗口（不等 scroll 的 rAF 帧）：调用返回时目标区已渲染，
    // 宿主/测试可随即读取 DOM。用户滚动仍走 scroll 事件的 rAF 节流。
    this.renderWindow()
  }

  // ===== 属性解析 =====

  private syncResources(): void {
    const raw = this.getAttr('resources', '')
    if (raw === this.resourcesAttrCache) return
    this.resourcesAttrCache = raw
    let parsed: unknown = []
    if (raw !== '') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = []
      }
    }
    this._resources = sanitizeResources(parsed)
  }

  private syncTasks(): void {
    const raw = this.getAttr('tasks', '')
    if (raw === this.tasksAttrCache) return
    this.tasksAttrCache = raw
    let parsed: unknown = []
    if (raw !== '') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = []
      }
    }
    this._tasks = sanitizeTasks(parsed)
  }

  private scale(): ResourceScale {
    const raw = this.getAttr('scale', '')
    return (SCALES as string[]).includes(raw) ? (raw as ResourceScale) : 'day'
  }

  private colW(): number {
    return SCALE_COL[this.scale()]
  }

  /** 组件缺省容量（资源未声明 capacity 时兜底；缺省 1） */
  private defaultCapacity(): number {
    const n = Number(this.getAttr('capacity', '1'))
    return Number.isFinite(n) && n > 0 ? n : 1
  }

  /** height 属性原值：空串 / 纯空白（SFC 空绑定）视为**未设置** → null；其余返回 trim 后原值 */
  private heightAttrValue(): string | null {
    if (!this.hasAttr('height')) return null
    const raw = this.getAttr('height', '').trim()
    return raw === '' ? null : raw
  }

  /** height 像素值：接受纯数字或带 `px` 后缀；非法 / 缺失回落 320（= --oas-resource-height token 缺省）。
   *  update() 仅在**合法值**分支调用本方法（此时 raw != null 且合法 → 返回解析值，兜底分支不参与）；
   *  尾部兜底分支经 getAttr 读取——其 '320' 字面量同时是 api:scan 的 attr 默认值提取锚点，
   *  移除会使 API 表默认值列退化为 —（manifest 的 height.default 依赖该调用点字面量） */
  private heightPx(): number {
    const raw = this.heightAttrValue()
    if (raw != null) {
      const n = Number(raw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) return n
    }
    const fallback = Number(this.getAttr('height', '320').replace(/px$/i, '').trim())
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 320
  }

  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    if (own) return own
    return resolveLocale(this)
  }

  /** 时间 → 画布 x（px）：period 索引 + period 内比例（month 不等长按比例内插） */
  private xOf(ms: number): number {
    const periods = this.periods
    const colW = this.colW()
    if (periods.length === 0) return 0
    if (ms <= periods[0]!.startMs) return 0
    const last = periods[periods.length - 1]!
    if (ms >= last.endMs) return periods.length * colW
    let lo = 0
    let hi = periods.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ms < periods[mid]!.endMs) hi = mid
      else lo = mid + 1
    }
    const p = periods[lo]!
    const frac = (ms - p.startMs) / (p.endMs - p.startMs)
    return (lo + frac) * colW
  }

  /** 时间区间左缘 x → 物理 left（RTL 镜像：改距画布右缘） */
  private mirrorCellLeft(xStart: number, width: number): number {
    return isRtl(this) ? this.canvasW - xStart - width : xStart
  }

  /** 横向视口宽（px）：实测 clientWidth > 10 才有效，否则回落 canvasW。
   * 回落语义 = 虚拟化自动禁用、全量渲染——无布局环境（happy-dom 单测 / 未挂载）口径与旧实现一致 */
  private viewportW(): number {
    const w = this.scrollerEl?.clientWidth ?? 0
    return w > 10 ? w : this.canvasW
  }

  /**
   * 横向虚拟窗口同步：由 scroller 的 scrollLeft / clientWidth 与列宽算出列索引半开区间
   * [winColStart, winColEnd)。视口不可测或画布未溢出视口时回落全量（既有行为不变）；
   * RTL 走规范负值 scrollLeft 模型，取绝对值 = 自初始端滚出距离（轴无关，与 gantt/table 同口径）。
   */
  private syncColWindow(): void {
    const count = this.periods.length
    if (count === 0) {
      this.winColStart = 0
      this.winColEnd = 0
      return
    }
    const vp = this.viewportW()
    const scroller = this.scrollerEl
    if (!scroller || vp >= this.canvasW) {
      this.winColStart = 0
      this.winColEnd = count
      return
    }
    const win = computeVirtualWindow(Math.abs(scroller.scrollLeft), vp, this.colW(), count, COL_BUFFER)
    this.winColStart = win.start
    this.winColEnd = win.end
  }

  // ===== 行窗口（纵向虚拟化）=====

  /**
   * 读组件自定义属性 token 的 px 数值：纯数字或 Npx 才采信；其余形态（em/rem、calc/max 表达式、
   * 不可解析、无值）回落缺省。happy-dom 的 getComputedStyle 不解析 var() → 单测走回落值
   * （与视觉缺省 token 一致）；真机自定义属性计算值保留未求值 token 流（如 max(…)），同样走派生/回落。
   */
  private tokenPx(name: string, fallback: number): number {
    let raw = ''
    try {
      raw = getComputedStyle(this).getPropertyValue(name).trim()
    } catch {
      return fallback
    }
    if (raw === '') return fallback
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) return fallback
    return /^[\d.]+(px)?$/i.test(raw) ? n : fallback
  }

  /** 泳道条高（--oas-resource-bar-height，缺省 20）/ 行高（--oas-resource-row-height，缺省 36）：缺省与 CSS 一致 */
  private barHeightPx(): number {
    return this.tokenPx('--oas-resource-bar-height', 20)
  }
  private rowHeightPx(): number {
    return this.tokenPx('--oas-resource-row-height', 36)
  }
  /** 泳道行间 gap：宿主以 px 字面量覆盖 --oas-resource-lane-gap 时采信；否则按 :host 同式派生
   * （CSS gap = max(0, (rowH − barH) / 2)，用实测/回落 token 派生即与 CSS 计算结果一致） */
  private laneGapPx(): number {
    let raw = ''
    try {
      raw = getComputedStyle(this).getPropertyValue('--oas-resource-lane-gap').trim()
    } catch {
      raw = ''
    }
    const m = /^([\d.]+)px$/i.exec(raw)
    if (m) return Number(m[1])
    return Math.max(0, (this.rowHeightPx() - this.barHeightPx()) / 2)
  }
  /** 表头刻度高（--oas-resource-header-height，缺省 32）/ 负载行轨高（--oas-resource-load-height，缺省 64） */
  private headerHeightPx(): number {
    return this.tokenPx('--oas-resource-header-height', 32)
  }
  private loadHeightPx(): number {
    return this.tokenPx('--oas-resource-load-height', 64)
  }
  /** 行模型高（含 .row 的 1px border-bottom）：spacer 与真实行盒同式，总滚动高不随窗口平移漂移 */
  private laneRowHeight(segs: number): number {
    return segs * this.barHeightPx() + (segs + 1) * this.laneGapPx() + 1
  }
  private loadRowHeight(): number {
    return this.loadHeightPx() + 1
  }

  /** 泳道行高前缀和（offsets[0] = 0，offsets[n] = 总高）：行高 = segs 段轨道高 + 1px 行框线 */
  private buildLaneRowOffsets(): number[] {
    const n = this._resources.length
    const out = new Array<number>(n + 1)
    out[0] = 0
    let acc = 0
    for (let i = 0; i < n; i++) {
      acc += this.laneRowHeight(this.laneLayout.get(this._resources[i]!.id)?.segs ?? 1)
      out[i + 1] = acc
    }
    return out
  }

  /** 区域纵向起点：offsetTop > 0（有布局）取实测（相对滚动内容顶，RTL 不影响纵向坐标）；否则回落估算 */
  private zoneTop(el: HTMLElement | null, estimate: number): number {
    const top = el?.offsetTop ?? 0
    return top > 0 ? top : estimate
  }

  /**
   * 纵向（行）虚拟窗口同步：由 scroller 的 scrollTop / clientHeight 与两区行高模型算出行索引半开区间。
   * 两区独立：泳道区锚 .lanes 顶（表头行之下），负载区锚 .loads 顶（泳道区 + 直方图表头行之下）——
   * 区域起点优先实测 offsetTop（先量再算），不可测（happy-dom / 隐藏容器）回落估算值。
   * 视口高不可测（clientHeight ≤ 10，与列虚拟化的 clientWidth 口径一致）→ 两区都回落全量。
   */
  private syncRowWindow(): void {
    const count = this._resources.length
    const vh = this.scrollerEl?.clientHeight ?? 0
    this.laneRowOffsets = this.buildLaneRowOffsets()
    if (count === 0 || !this.scrollerEl || vh <= 10) {
      this.winLaneStart = 0
      this.winLaneEnd = count
      this.winLoadStart = 0
      this.winLoadEnd = count
      return
    }
    const scrollTop = this.scrollerEl.scrollTop
    const laneTop = this.zoneTop(this.lanesEl, this.headerHeightPx() + 1)
    // 直方图表头行无显式高度（估表头行同量级）；误差远小于 ROW_BUFFER 行的预渲染余量，且真机走实测
    const loadTopEstimate = laneTop + (this.laneRowOffsets[count] ?? 0) + this.headerHeightPx() + 1
    const loadTop = this.zoneTop(this.loadsEl, loadTopEstimate)
    const laneWin = computeRowWindowFromOffsets(this.laneRowOffsets, scrollTop - laneTop, vh, count, ROW_BUFFER)
    this.winLaneStart = laneWin.start
    this.winLaneEnd = laneWin.end
    const loadWin = computeVirtualWindow(scrollTop - loadTop, vh, this.loadRowHeight(), count, ROW_BUFFER)
    this.winLoadStart = loadWin.start
    this.winLoadEnd = loadWin.end
  }

  /**
   * 行占位 spacer（纵向窗口化时撑起「全量行数 × 行高」的滚动总高）：spacer-top 在首行前、
   * spacer-bottom 在末行后，窗内真实行盒夹在其间——容器总高 = spacerTop + 窗内行 + spacerBottom
   * 恒等于全量行模型总高，滚动条长度与滚动位置不随窗口平移抖动；行保持正常流（sticky 名列依赖）。
   * 非窗口化（全量渲染）时移除 spacer：DOM 与既有全量实现一致（含 .row:last-child 语义）。
   */
  private ensureRowSpacers(container: HTMLElement, windowed: boolean): [HTMLElement, HTMLElement] {
    let top: HTMLElement | null = null
    let bottom: HTMLElement | null = null
    for (const el of [...container.children]) {
      if (!(el instanceof HTMLElement) || !el.classList.contains('row-spacer')) continue
      if (el === container.firstElementChild) top = el
      else if (el === container.lastElementChild) bottom = el
      else el.remove() // 位置漂移的残留 spacer（旧快照等），重建
    }
    const make = (): HTMLElement => {
      const sp = document.createElement('div')
      sp.className = 'row-spacer'
      sp.setAttribute('aria-hidden', 'true')
      return sp
    }
    if (!windowed) {
      top?.remove()
      bottom?.remove()
      return [top ?? make(), bottom ?? make()]
    }
    if (!top) {
      top = make()
      container.insertBefore(top, container.firstChild)
    }
    if (!bottom) {
      bottom = make()
      container.appendChild(bottom)
    }
    return [top, bottom]
  }

  /** 首个 endMs > ms 的 period 索引（= 覆盖 ms 的最早 period；periods 按时间连续有序）；越界返回 length */
  private firstPeriodEndingAfter(ms: number): number {
    const periods = this.periods
    let lo = 0
    let hi = periods.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (periods[mid]!.endMs > ms) hi = mid
      else lo = mid + 1
    }
    return lo
  }

  /** 首个 startMs ≥ ms 的 period 索引（覆盖区间右端开界）；越界返回 length */
  private firstPeriodStartingAtOrAfter(ms: number): number {
    const periods = this.periods
    let lo = 0
    let hi = periods.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (periods[mid]!.startMs >= ms) hi = mid
      else lo = mid + 1
    }
    return lo
  }

  // ===== 生命周期 =====

  /** 缓存节点引用 + 幂等注册条激活监听（render 与水合路径共用；重连重挂幂等） */
  private bind(): void {
    this.scrollerEl = this.shadow.querySelector('.scroller')
    this.ticksEl = this.shadow.querySelector('.ticks')
    this.lanesEl = this.shadow.querySelector('.lanes')
    this.loadsEl = this.shadow.querySelector('.loads')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.scrollerEl?.addEventListener('click', this.onScrollerClick)
    this.scrollerEl?.addEventListener('keydown', this.onScrollerKeydown)
    // 双向虚拟（横向列 + 纵向行）：滚动只重渲染窗口内的内容（passive，不与滚动竞争主线程）
    this.scrollerEl?.addEventListener('scroll', this.onScrollerScroll, { passive: true })
    // 容器尺寸变化 → 重算列窗口并重渲染窗口内容（bind 幂等重挂：先断开旧观察器再建新的）。
    // 覆盖「隐藏→显示」（首帧 clientWidth 不可测时 update() 回落全量，RO 在可见后触发即修正）、
    // 「窗口缩放」「侧栏折叠」「splitter 拖动」。无 ResizeObserver（极旧环境）时静默降级。
    this.resizeObs?.disconnect()
    if (typeof ResizeObserver !== 'undefined' && this.scrollerEl) {
      this.resizeObs = new ResizeObserver(() => this.onViewportResize())
      this.resizeObs.observe(this.scrollerEl)
    }
    this.onCleanup(() => {
      this.scrollerEl?.removeEventListener('click', this.onScrollerClick)
      this.scrollerEl?.removeEventListener('keydown', this.onScrollerKeydown)
      this.scrollerEl?.removeEventListener('scroll', this.onScrollerScroll)
      this.resizeObs?.disconnect()
      this.resizeObs = null
      // 断开连接时取消挂起帧：避免帧回调在游离 shadow 上重渲染（泄漏与无谓开销）
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf)
        this.scrollRaf = 0
      }
    })
  }

  /** 滚动 rAF 节流：同帧多次 scroll 只重渲染一次（列窗口 + 下游 ticks/loads/lanes） */
  private onScrollerScroll = (): void => {
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      this.renderWindow()
    })
  }

  /**
   * 容器尺寸变化（ResizeObserver 回调）：列/行窗口都可能随视口尺寸变化，重算并重渲染窗口内容。
   * 窗口均未变（如亚像素滚动、尺寸变化不足以改变窗口）则跳过重渲染，避免无谓重建。
   */
  private onViewportResize(): void {
    this.renderWindow()
  }

  /**
   * 窗口内重渲染：重算列窗口 + 行窗口（泳道区/负载区独立），重建窗口内的刻度/负载列/泳道行。
   * 列窗口未变 → 刻度不重建；行/列窗口均未变则整体跳过——刻度/条绝对定位在画布坐标系内、行随
   * 容器自然平移，无需重渲染（滚动帧退化为空操作）。纵向滚动只重建行窗口内的泳道/负载行：
   * 行按资源 id 键控复用、行内条走 ensureBar 稳定 key → 已聚焦的条不因滚动被替换（焦点保持）。
   * 滚动帧与命令式滚动共用。
   */
  private renderWindow(): void {
    const prevColStart = this.winColStart
    const prevColEnd = this.winColEnd
    const prevLaneStart = this.winLaneStart
    const prevLaneEnd = this.winLaneEnd
    const prevLoadStart = this.winLoadStart
    const prevLoadEnd = this.winLoadEnd
    this.syncColWindow()
    this.syncRowWindow()
    const colChanged = this.winColStart !== prevColStart || this.winColEnd !== prevColEnd
    const rowChanged =
      this.winLaneStart !== prevLaneStart ||
      this.winLaneEnd !== prevLaneEnd ||
      this.winLoadStart !== prevLoadStart ||
      this.winLoadEnd !== prevLoadEnd
    if (!colChanged && !rowChanged) return
    if (colChanged) this.renderTicks()
    this.renderLanes()
    this.renderLoads(this.loadRows, this.maxLoad)
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private onScrollerClick = (e: MouseEvent): void => {
    const target = e.target as Element | null
    const bar = target?.closest?.('.bar[data-task-id]') as HTMLElement | null
    if (!bar || !this.scrollerEl?.contains(bar)) return
    this.activateBar(bar)
  }

  private onScrollerKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const target = e.target as Element | null
    const bar = target?.closest?.('.bar[data-task-id]') as HTMLElement | null
    if (!bar || !this.scrollerEl?.contains(bar)) return
    e.preventDefault()
    this.activateBar(bar)
  }

  private activateBar(bar: HTMLElement): void {
    const taskId = bar.getAttribute(ATTR_TASK_ID) ?? ''
    const resourceId = bar.getAttribute(ATTR_RESOURCE_ID) ?? ''
    const task = this._tasks.find((t) => t.id === taskId)
    if (!task) return
    this.emit('task-click', { id: taskId, task: toPublicTask(task), resourceId } satisfies ResourceTaskClickDetail)
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap" role="group">
        <div class="scroller" part="scroller">
          <div class="canvas">
            <div class="row head">
              <div class="name" aria-hidden="true"></div>
              <div class="ticks"></div>
            </div>
            <div class="lanes"></div>
            <div class="row hist-head">
              <div class="name"></div>
              <div class="hist-pad"></div>
            </div>
            <div class="loads"></div>
          </div>
        </div>
        <div class="empty" hidden></div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.wrap')) return false
    if (!this.shadow.querySelector('.scroller')) return false
    if (!this.shadow.querySelector('.lanes')) return false
    this.bind()
    return true
  }

  // ===== 渲染模型 =====

  protected override update(): void {
    this.syncResources()
    this.syncTasks()
    this.toggleAttribute('data-rtl', isRtl(this))
    const locale = this.effectiveLocale()
    const scale = this.scale()
    const spans = spansOf(this._tasks)
    let minMs = Number.POSITIVE_INFINITY
    let maxMs = Number.NEGATIVE_INFINITY
    for (const s of spans) {
      if (s.startMs < minMs) minMs = s.startMs
      if (s.endMs > maxMs) maxMs = s.endMs
    }
    this.periods =
      spans.length > 0
        ? buildPeriods(minMs, maxMs, scale, getWeekStart(locale), locale, () => {
            if (this.periodsTruncWarned) return
            this.periodsTruncWarned = true
            devWarn(`[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`)
          })
        : []
    this.canvasW = this.periods.length * this.colW()
    this.syncColWindow()

    // 负载统计：每资源每 period 的重叠任务数 + 超载档（资源输入序 → period 时序）。
    // 单趟实现（旧实现是 resources × periods × assigned 三重循环）：先把 span 按资源归档（每条
    // span 只按自身 resources 归一次），再对每资源的每条 span 二分求出其覆盖的 period 索引区间
    // [lo, hi) 并区间累加——输出（loads 数组 / maxLoad / 超载档）与旧三重循环逐字节一致。
    const capDefault = this.defaultCapacity()
    const assignedByRes = new Map<string, Span[]>()
    for (const s of spans) {
      for (const rid of this._tasks[s.index]!.resources) {
        let arr = assignedByRes.get(rid)
        if (!arr) {
          arr = []
          assignedByRes.set(rid, arr)
        }
        arr.push(s)
      }
    }
    // 泳道条布局预计算（排序 + 段堆叠 + 画布几何）：只在 update() 里算一次并缓存，
    // scroll 帧 / 尺寸变化回调只按窗口增删 DOM（见 renderLanes），不再每帧重做 filter/sort/贪心分段。
    this.computeLaneLayout(assignedByRes)
    const periodCount = this.periods.length
    let maxLoad = 0
    const perResourceLoads = this._resources.map((r) => {
      const cap = r.capacity ?? capDefault
      const loads = new Array<number>(periodCount).fill(0)
      const assigned = assignedByRes.get(r.id)
      if (assigned) {
        for (const s of assigned) {
          const lo = this.firstPeriodEndingAfter(s.startMs)
          const hi = this.firstPeriodStartingAtOrAfter(s.endMs)
          for (let i = lo; i < hi; i++) loads[i] = loads[i]! + 1
        }
      }
      // 超载档数随负载矩阵一并预算（旧实现 renderLoads 每帧对整条 loads reduce → 每帧全量开销）
      let overCount = 0
      for (let i = 0; i < periodCount; i++) {
        const load = loads[i]!
        if (load > maxLoad) maxLoad = load
        if (load > cap) overCount++
      }
      return { resource: r, capacity: cap, loads, overCount }
    })
    const overloadEntries: ResourceOverloadEntry[] = []
    for (const row of perResourceLoads) {
      for (let i = 0; i < this.periods.length; i++) {
        const load = row.loads[i]!
        if (load > row.capacity) {
          overloadEntries.push({
            resourceId: row.resource.id,
            period: toISODate(new Date(this.periods[i]!.startMs)),
            load,
            capacity: row.capacity,
          })
        }
      }
    }

    // DOM 增量同步（数据层容器整段重建，骨架与左侧列名不重建）
    // 高度协议（与 oas-gantt 同款）：height 属性在场且为**合法长度**（纯数字或 Npx，>0）时，把高度写进
    // **组件自有自定义属性** --oas-resource-height（:host 规则高度即 var(--oas-resource-height, 320px)），
    // 并置 heightApplied。属性为空串/空白（SFC 空绑定）按**未设置**处理；
    // **非法值不写变量**——仅在本实例此前写过（heightApplied）时 removeProperty 归零，宿主自己设的
    // --oas-resource-height（内联或 class 规则）全程不受影响（非法值绝不写 320 覆盖宿主 token）。
    // 属性被移除时同样只有本实例此前写过才 removeProperty，移除后回落 token 缺省 / 宿主 CSS，
    // 且 DSD 快照自写值不残留；从未写过时绝不动宿主 token。
    // 关键：组件**从不触碰宿主自身的 height 内联**——宿主内联 height 优先级高于 :host 规则，天然优先；
    // 既避免「把宿主真内联误判为组件自写而清除」（DSD 回放态与纯 CSR 无法仅凭值区分），
    // 也无需「接管前快照 / 还原」逻辑。
    const heightRaw = this.heightAttrValue()
    if (heightRaw != null) {
      const n = Number(heightRaw.replace(/px$/i, '').trim())
      if (Number.isFinite(n) && n > 0) {
        this.style.setProperty('--oas-resource-height', `${this.heightPx()}px`)
        this.heightApplied = true
      } else if (this.heightApplied) {
        // 非法值 → 仅清除本实例自写值回落（token 缺省 320 / 宿主 token 优先），不写 320
        this.style.removeProperty('--oas-resource-height')
        this.heightApplied = false
      }
    } else if (this.heightApplied) {
      this.style.removeProperty('--oas-resource-height')
      this.heightApplied = false
    }
    const groupEl = this.shadow.querySelector('[role="group"]')
    if (groupEl) groupEl.setAttribute('aria-label', this.t('resource.label'))
    const histHeadName = this.shadow.querySelector<HTMLElement>('.hist-head .name')
    if (histHeadName) histHeadName.textContent = this.t('resource.load')
    // 表头/刻度容器显式与泳道同宽同位（RTL 镜像定位与横向溢出覆盖都要求 容器宽 = canvasW）
    const histPad = this.shadow.querySelector<HTMLElement>('.hist-pad')
    if (histPad) histPad.style.width = `${this.canvasW}px`
    // 缓存负载结果供滚动帧复用（滚动只换窗口，不重算矩阵）
    this.loadRows = perResourceLoads
    this.maxLoad = maxLoad
    // 行窗口同步：须在 computeLaneLayout 之后（泳道行高模型读段数）、行渲染之前
    this.syncRowWindow()
    this.renderTicks()
    this.renderLanes()
    this.renderLoads(this.loadRows, this.maxLoad)
    const isEmpty = this._resources.length === 0 || this._tasks.length === 0
    if (this.emptyEl) {
      this.emptyEl.hidden = !isEmpty
      if (isEmpty) this.emptyEl.textContent = this.t('resource.empty')
    }
    if (this.scrollerEl) this.scrollerEl.hidden = isEmpty

    // oas-overload：每次 update 至多一个事件聚合全部超载档；签名去重防挂载双 update 重复派发；
    // 无超载复位签名（消除后再次超载可再派发）
    if (overloadEntries.length > 0) {
      const key = JSON.stringify(overloadEntries)
      if (key !== this.lastOverloadKey) {
        this.lastOverloadKey = key
        this.emit('overload', { overloads: overloadEntries } satisfies ResourceOverloadDetail)
      }
    } else {
      this.lastOverloadKey = null
    }
  }

  /** 时间轴刻度（泳道与直方图列宽一致：同一 colW 定位）；容器宽 = canvasW 以对齐泳道与 RTL 镜像。
   * 只建列窗口 [winColStart, winColEnd) 内的刻度（容器宽仍 = canvasW：滚动条长度不随窗口缩水） */
  private renderTicks(): void {
    if (!this.ticksEl) return
    this.ticksEl.innerHTML = ''
    this.ticksEl.style.width = `${this.canvasW}px`
    const colW = this.colW()
    for (let i = this.winColStart; i < this.winColEnd; i++) {
      const tick = document.createElement('div')
      tick.className = 'tick'
      if (i === 0) tick.classList.add('first')
      tick.textContent = this.periods[i]!.label
      tick.style.left = `${this.mirrorCellLeft(i * colW, colW)}px`
      tick.style.width = `${colW}px`
      this.ticksEl.appendChild(tick)
    }
  }

  /**
   * 预计算每资源的条布局（排序 + 段堆叠 + 画布 x/宽/段序 + 稳定 key）。
   * 只在 update() 里跑一次并缓存（laneLayout）——scroll 帧与 ResizeObserver 回调只按窗口增删 DOM。
   * laneLayoutBuilds 为内部诊断计数：回归用它证明 scroll 帧不触发重分段。
   */
  private computeLaneLayout(assignedByRes: Map<string, Span[]>): void {
    this.laneLayoutBuilds++
    const layout = new Map<string, LaneLayout>()
    for (const r of this._resources) {
      const assigned = assignedByRes.get(r.id) ?? []
      // 区间着色（贪心）：重叠区间分入不同段 → 每条给段序号（top 偏移），段数决定泳道高。
      // 保证同泳道任一点只被至多一条任务条覆盖，命中与视觉一致（此前同 y 重叠会点到后绘制条）。
      const segOf = new Map<number, number>()
      const segEnd: number[] = []
      for (const s of [...assigned].sort((a, b) => a.startMs - b.startMs || a.index - b.index)) {
        let seg = segEnd.findIndex((end) => end <= s.startMs)
        if (seg < 0) {
          seg = segEnd.length
          segEnd.push(s.endMs)
        } else {
          segEnd[seg] = s.endMs
        }
        segOf.set(s.index, seg)
      }
      const entries: LaneEntry[] = []
      for (const s of assigned) {
        const t = this._tasks[s.index]!
        // 最小宽度并进几何：单日任务在 month 档（比例内插 w 可 < 8）或 MAX_PERIODS 截断后起点落在
        // 画布外（xOf 对画布外时间返回 canvasW）时，仅靠 CSS min-width 会把条右缘顶出轨道
        //（left 按未钳宽度定位）——这里同步钳 width 与 left，使条恒在画布内；
        // RTL 镜像同数学（xStart ∈ [0, canvasW − w] 时物理 left ∈ [0, canvasW − w]）
        const leftX = this.xOf(s.startMs)
        const w = Math.max(this.xOf(s.endMs) - leftX, MIN_BAR_W)
        const maxX = Math.max(0, this.canvasW - w)
        const xStart = Math.min(Math.max(leftX, 0), maxX)
        const segIndex = segOf.get(s.index) ?? 0
        entries.push({ key: `${r.id}:${t.id}:${segIndex}`, taskId: t.id, index: s.index, segIndex, xStart, w })
      }
      // 横向窗口查询索引（随布局一并预算一次，见 cullLane / LaneLayout）：
      // order = 按 xStart 升序的 entries 下标；segTree = 以 xEnd 为叶值的区间 max 段树。
      // segTree 内存为 Float64Array(2·segTreeSize)：segTreeSize = 2^k（≥ 条数的最小 2 的幂），
      // 每槽 8 字节 → 总量级约 16·2^k 字节（k = ⌈log2 条数⌉，万条约 ~160KB，可忽略）。
      const order = entries.map((_, i) => i)
      order.sort((a, b) => entries[a]!.xStart - entries[b]!.xStart || a - b)
      let segTree: Float64Array | null = null
      let segTreeSize = 0
      let maxEnd = Number.NEGATIVE_INFINITY
      let minStart = Number.POSITIVE_INFINITY
      if (entries.length > 0) {
        segTreeSize = 1
        // 用 *= 而非 <<=：位数大到 2^30 以上时 <<= 会回绕成负数 → 死循环（*= 单调增长必停）
        while (segTreeSize < entries.length) segTreeSize *= 2
        segTree = new Float64Array(2 * segTreeSize).fill(SEG_TREE_EMPTY)
        for (let i = 0; i < entries.length; i++) {
          const e = entries[order[i]!]!
          const end = e.xStart + e.w
          segTree[segTreeSize + i] = end
          if (end > maxEnd) maxEnd = end
          if (e.xStart < minStart) minStart = e.xStart
        }
        for (let k = segTreeSize - 1; k >= 1; k--) {
          segTree[k] = Math.max(segTree[2 * k]!, segTree[2 * k + 1]!)
        }
      }
      layout.set(r.id, { entries, segs: Math.max(segEnd.length, 1), order, segTree, segTreeSize, maxEnd, minStart })
    }
    this.laneLayout = layout
  }

  /**
   * 资源泳道：每资源一行（行名 sticky），行内画其被分配的任务条（重叠条按段堆叠不互相遮挡）。
   *
   * 双窗口正交：横向（列窗口 cull 条）+ 纵向（行窗口只渲染可视行）。
   * - 纵向：只有 [winLaneStart, winLaneEnd) 内的行进 DOM，行按资源 id 键控复用——滚动平移行窗口
   *   只增删进出行，窗口内存活行的节点不替换（其内条走 ensureBar 稳定 key）→ 已聚焦的条不丢焦点。
   *   行窗外的行不进 DOM（其内条同样不可达：与横向虚拟化同类的固有取舍，见下）。
   * - 横向：行内条按列窗口 cull（cullLane），窗口内既有条节点复用（只改属性/样式，不替换节点）。
   *   条几何与 aria-label 来自 update() 预算的 laneLayout，本方法不做 filter/sort/贪心分段。
   * - spacer（.row-spacer）在窗口化时撑起泳道区总高（滚动总高不缩水）；全量渲染（视口不可测 /
   *   行全在窗口）时不插 spacer，DOM 与既有全量实现一致。
   *
   * 边界（固有取舍，不修）：窗口外的行/条不进 DOM → 键盘 Tab 不可达（只能到达可视窗口内的条）。
   */
  private renderLanes(): void {
    if (!this.lanesEl) return
    this.laneCullVisits = 0
    const locale = this.effectiveLocale()
    const colW = this.colW()
    // 列窗口像素范围（两侧各多留 1 列 overscan，避免边缘条被误裁）；cull 在画布坐标系进行（RTL 同）
    const winLeft = this.winColStart * colW - colW
    const winRight = this.winColEnd * colW + colW
    const count = this._resources.length
    const windowed = this.winLaneStart > 0 || this.winLaneEnd < count
    const [spacerTop, spacerBottom] = this.ensureRowSpacers(this.lanesEl, windowed)
    if (windowed) {
      // spacer 高度与行窗口共用同一份行高模型：总高恒 = 全量行模型总高（滚动范围不变）
      const offsets = this.laneRowOffsets.length === count + 1 ? this.laneRowOffsets : this.buildLaneRowOffsets()
      spacerTop.style.height = `${offsets[this.winLaneStart] ?? 0}px`
      spacerBottom.style.height = `${(offsets[count] ?? 0) - (offsets[this.winLaneEnd] ?? 0)}px`
    }
    // 行按资源 id 键控复用（id 清洗后唯一）：窗口内既有行保留（含其条节点 → 焦点保持）；
    // 无 id / 重复 id（旧快照）不可复用，先移除
    const existing = new Map<string, HTMLElement>()
    for (const el of [...this.lanesEl.children]) {
      if (el === spacerTop || el === spacerBottom) continue
      const row = el as HTMLElement
      const id = row.dataset['resourceId'] ?? ''
      if (id === '' || existing.has(id)) {
        row.remove()
        continue
      }
      existing.set(id, row)
    }
    const desired: HTMLElement[] = []
    for (let i = this.winLaneStart; i < this.winLaneEnd; i++) {
      const r = this._resources[i]!
      let row = existing.get(r.id)
      if (row) existing.delete(r.id)
      else {
        row = document.createElement('div')
        row.className = 'row lane'
        row.setAttribute(ATTR_RESOURCE_ID, r.id)
        const name = document.createElement('div')
        name.className = 'name'
        row.appendChild(name)
        const track = document.createElement('div')
        track.className = 'track'
        row.appendChild(track)
      }
      desired.push(row)
    }
    // 离开行窗口的行：移除（被复用的行已从 existing 摘除）
    for (const row of existing.values()) row.remove()
    // 按序 reconcile：行插在 spacerTop 之后 / spacerBottom 之前（非窗口化无 spacer 时从真实首行起——
    // 锚游离 spacer 的 nextElementSibling 会恒为 null，令每次渲染都 move 全部行、破坏焦点保持）
    let ref = this.lanesEl.firstElementChild
    if (ref === spacerTop) ref = ref.nextElementSibling
    for (const node of desired) {
      if (node !== ref) this.lanesEl.insertBefore(node, ref)
      else ref = ref.nextElementSibling
    }
    for (let k = 0; k < desired.length; k++) {
      const r = this._resources[this.winLaneStart + k]!
      const row = desired[k]!
      const name = row.firstElementChild as HTMLElement
      name.textContent = r.name
      const track = row.lastElementChild as HTMLElement
      track.style.width = `${this.canvasW}px`
      const layout = this.laneLayout.get(r.id)
      // 轨道高度按段数内联写算式（段数是内部量，不落 CSS 变量）；gap/条高仍走 token
      // gap 由 :host 声明（恒有值），消费点不再挂不可达 fallback
      const segs = layout?.segs ?? 1
      track.style.height = `calc(${segs} * var(--oas-resource-bar-height, 20px) + ${segs + 1} * var(--oas-resource-lane-gap))`
      // 既有条按稳定 key 建索引（复用不重建）；无 key / 重复 key（旧快照）不可复用，先移除
      const existingBars = new Map<string, HTMLElement>()
      for (const bar of [...track.querySelectorAll<HTMLElement>('.bar')]) {
        const key = bar.dataset['key'] ?? ''
        if (key === '' || existingBars.has(key)) {
          bar.remove()
          continue
        }
        existingBars.set(key, bar)
      }
      const desiredBars: HTMLElement[] = []
      // 横向虚拟 cull：只求与窗口相交的条（帧成本随窗口内条数变化，见 cullLane）
      if (layout) {
        for (const pos of this.cullLane(layout, winLeft, winRight)) {
          desiredBars.push(this.ensureBar(existingBars, r, layout.entries[pos]!, locale))
        }
      }
      // 离开窗口 / 已不存在的条：移除（被复用的条已从 existing 摘除）
      for (const bar of existingBars.values()) bar.remove()
      // 按序 reconcile：新增条插入到正确位置，既有条保持相对顺序（无需移动则原节点不动 → 焦点保持）
      let barRef = track.firstElementChild
      for (const node of desiredBars) {
        if (node !== barRef) track.insertBefore(node, barRef)
        else barRef = barRef.nextElementSibling
      }
    }
  }

  /**
   * 求与像素窗口 [winLeft, winRight] 相交的条（entries 下标，升序）。
   *
   * 与「全量线性扫描相交判断」逐条等价，但帧成本 O(k·log n)（k = 命中窗口的条数），
   * 不随该资源总条数线性增长：
   *   A 段 xStart ∈ [winLeft, winRight]：在按 xStart 升序的 order 上二分出半开区间 [lo, hi)，
   *     区间内每条都必相交（xEnd ≥ xStart ≥ winLeft），直接枚举；
   *   B 段 xStart < winLeft 且 xEnd ≥ winLeft（跨窗口长条）：在 [0, lo) 上做 segTree 区间 max 下探，
   *     只有区间 max ≥ winLeft 的子树才展开（其余整棵剪掉）。
   *
   * 为何不用「xEnd 前缀最大 + 自 hi−1 回扫」：前缀最大会被**远端个别长条整体毒化**——长条（如整趟
   * 工期条）令所有前缀 max ≥ winLeft，回扫便一路走到 0，退化为 O(该资源全部条)，与横向虚拟化目标相反
   *（本文件单测 ⑲ 即该反例：5000 条位于窗口左外侧 + 1 条跨窗长条）。段树的区间 max 剪枝不受这种
   * 单点污染：只有真正可能命中的子树被下探。
   *
   * 命中集合等价性：条 i 相交 ⟺ xStart ≤ winRight ∧ xEnd ≥ winLeft。若 xStart ≥ winLeft 则属 A（i ∈
   * [lo, hi) ⟺ xStart ≤ winRight）；若 xStart < winLeft 则须 xEnd ≥ winLeft，属 B。故 A ∪ B 恰为相交集。
   *
   * laneCullVisits 为内部诊断计数（非 API），在 renderLanes 每帧重置。
   *
   * 固有边界（虚拟化固有，非缺陷）：当同泳道**全部条**都与窗口相交（如整画布长条、或窗口
   * 恰好覆盖整条时间轴）时，输出条数 = 该泳道全部条数——cull 只保证「不相交的条不进输出」，
   * 不保证输出条数与画布总量解耦；此时帧成本退化为该泳道条数的线性，与全量扫描同阶（常数因子更小）。
   */
  private cullLane(layout: LaneLayout, winLeft: number, winRight: number): number[] {
    const { entries, order, segTree, segTreeSize, maxEnd, minStart } = layout
    const n = entries.length
    // 快路径：全量 max(xEnd) < winLeft（无条右伸到窗口）或 min(xStart) > winRight（无条左伸到窗口）
    if (n === 0 || maxEnd < winLeft || minStart > winRight) return []
    // lo = 首个 xStart ≥ winLeft；hi = 首个 xStart > winRight（order 已按 xStart 升序、同值保原序）
    let a = 0
    let b = n
    while (a < b) {
      const mid = (a + b) >> 1
      if (entries[order[mid]!]!.xStart < winLeft) a = mid + 1
      else b = mid
    }
    const lo = a
    b = n
    while (a < b) {
      const mid = (a + b) >> 1
      if (entries[order[mid]!]!.xStart <= winRight) a = mid + 1
      else b = mid
    }
    const hi = a
    const out: number[] = []
    for (let i = lo; i < hi; i++) {
      this.laneCullVisits++
      out.push(order[i]!)
    }
    if (lo > 0 && segTree) {
      // [0, lo) 的段树规范分解（自底向上 ≤ 2·log n 个节点）；只有区间 max ≥ winLeft 的子树下探
      const nodes: number[] = []
      let l = segTreeSize
      let r = segTreeSize + lo
      while (l < r) {
        if (l & 1) nodes.push(l++)
        if (r & 1) nodes.push(--r)
        l >>= 1
        r >>= 1
      }
      while (nodes.length > 0) {
        const node = nodes.pop()!
        this.laneCullVisits++
        if (segTree[node]! < winLeft) continue
        const pos = node - segTreeSize
        if (node >= segTreeSize) {
          // 补齐叶恒为 SEG_TREE_EMPTY（< 任意有限 winLeft）→ 不会走到这里；保险起见仍按真实叶判界
          if (pos < n) out.push(order[pos]!)
          continue
        }
        nodes.push(2 * node, 2 * node + 1)
      }
    }
    // A/B 两段按 xStart 序收集，DOM reconcile 需要 entries 原序（= 改造前全量扫描的产出序）
    out.sort((x, y) => x - y)
    return out
  }

  /**
   * 取（复用或新建）窗口内一条任务条，并同步其几何与可访问名称。
   * 复用路径只改属性/样式、不替换节点 → 聚焦中的条横向滚动后焦点不丢。
   */
  private ensureBar(existing: Map<string, HTMLElement>, r: RS, e: LaneEntry, locale: string): HTMLElement {
    let bar = existing.get(e.key)
    if (bar) {
      existing.delete(e.key)
    } else {
      bar = document.createElement('div')
      bar.className = 'bar'
      bar.setAttribute('role', 'button')
      bar.tabIndex = 0
      bar.dataset['key'] = e.key
      bar.setAttribute('part', 'bar')
    }
    bar.style.left = `${this.mirrorCellLeft(e.xStart, e.w)}px`
    bar.style.width = `${e.w}px`
    bar.style.top = `calc(var(--oas-resource-lane-gap) + ${
      e.segIndex
    } * (var(--oas-resource-bar-height, 20px) + var(--oas-resource-lane-gap)))`
    bar.setAttribute(ATTR_TASK_ID, e.taskId)
    bar.setAttribute(ATTR_RESOURCE_ID, r.id)
    const t = this._tasks[e.index]!
    bar.setAttribute(
      'aria-label',
      this.t('resource.taskAria', {
        name: t.name,
        start: formatToken(parseTaskDate(t.start)!, 'yyyy-MM-dd', locale),
        end: formatToken(parseTaskDate(t.end)!, 'yyyy-MM-dd', locale),
        resource: r.name,
      }),
    )
    return bar
  }

  /**
   * 负载直方图：每资源一行，列 = period，柱高 ∝ load / maxLoad；超载柱加 .over。
   * 纵向虚拟化：只有 [winLoadStart, winLoadEnd) 内的行进 DOM；负载行无焦点/交互态，窗口平移时
   * 窗内行整段重建即可（无键控复用需求）。.row-spacer 与泳道区同口径撑起负载区总高（滚动总高不缩水）。
   * 横向仍按列窗口建列，成本 O(窗内行数 × 窗口列数)。
   */
  private renderLoads(
    rows: Array<{ resource: RS; capacity: number; loads: number[]; overCount: number }>,
    maxLoad: number,
  ): void {
    if (!this.loadsEl) return
    const count = this._resources.length
    const windowed = this.winLoadStart > 0 || this.winLoadEnd < count
    const [spacerTop, spacerBottom] = this.ensureRowSpacers(this.loadsEl, windowed)
    if (windowed) {
      const rowH = this.loadRowHeight()
      spacerTop.style.height = `${this.winLoadStart * rowH}px`
      spacerBottom.style.height = `${(count - this.winLoadEnd) * rowH}px`
    }
    // 窗口内行整段重建（spacer 保留）：行高 = load-height token + 1px 行框线，与 spacer 同式
    for (const el of [...this.loadsEl.children]) {
      if (el === spacerTop || el === spacerBottom) continue
      el.remove()
    }
    const colW = this.colW()
    for (let k = this.winLoadStart; k < this.winLoadEnd; k++) {
      const row = rows[k]
      if (!row) continue
      const rowEl = document.createElement('div')
      rowEl.className = 'row load'
      rowEl.setAttribute(ATTR_RESOURCE_ID, row.resource.id)
      const name = document.createElement('div')
      name.className = 'name'
      name.textContent = row.resource.name
      rowEl.appendChild(name)
      const track = document.createElement('div')
      track.className = 'track load-track'
      track.style.width = `${this.canvasW}px`
      // a11y：整行作为一张图给可访问名称（柱体/列线为装饰，标 aria-hidden）；超载行说明超载档数。
      // overCount 在 update() 里随负载矩阵预算缓存（旧实现每帧对整条 loads reduce）。
      const overCount = row.overCount
      track.setAttribute('role', 'img')
      track.setAttribute(
        'aria-label',
        overCount > 0
          ? this.t('resource.loadOverAria', { resource: row.resource.name, count: overCount })
          : this.t('resource.loadAria', { resource: row.resource.name }),
      )
      // 只建列窗口内的列（轨道宽仍 = canvasW；loads 为全量数组，按全局索引取用）
      for (let i = this.winColStart; i < this.winColEnd; i++) {
        const col = document.createElement('div')
        col.className = 'col'
        if (i === 0) col.classList.add('first')
        col.style.left = `${this.mirrorCellLeft(i * colW, colW)}px`
        col.style.width = `${colW}px`
        col.setAttribute('aria-hidden', 'true')
        const load = row.loads[i]!
        if (load > 0) {
          const pillar = document.createElement('div')
          pillar.className = load > row.capacity ? 'pillar over' : 'pillar'
          pillar.style.height = maxLoad > 0 ? `${(load / maxLoad) * 100}%` : '0'
          pillar.dataset['load'] = String(load)
          pillar.dataset['period'] = toISODate(new Date(this.periods[i]!.startMs))
          pillar.setAttribute('aria-hidden', 'true')
          col.appendChild(pillar)
        }
        track.appendChild(col)
      }
      rowEl.appendChild(track)
      // 行必须插在 spacerBottom 之前（保持 spacer 恒为首/末子节点）；非窗口化无 spacer 在 DOM，直接追加
      if (windowed) this.loadsEl.insertBefore(rowEl, spacerBottom)
      else this.loadsEl.appendChild(rowEl)
    }
  }
}
