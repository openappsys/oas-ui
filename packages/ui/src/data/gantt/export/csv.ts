/**
 * gantt 任务导出为 CSV（Pro helper 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`@oas-ui/ui/data/gantt/export`（`import { toCsv }`）；
 *   运行闭包不含 oas-gantt 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 日期运算不涉及（原样输出字符串），无时区/DST 语义。
 */

import type { GanttTask } from '../oas-gantt.js'

/** 导出列：key 为任务字段名；label 为表头文本（缺省用 key） */
export interface GanttExportColumn {
  key: string
  label?: string
}

/** 拍平行（DFS 前序：父在前、子随后，与 gantt 清洗层 flattenInput 同序同 parent 语义） */
interface FlatRow {
  task: GanttTask
  /** 生效父指针：来自嵌套时为最近带 id 祖先；顶层为 null */
  parent: string | null
  /** 是否来自嵌套拍平（parent !== null 时为 true，与 flattenInput 一致） */
  fromNest: boolean
  /** 是否带嵌套 children（决定 type 推导 summary） */
  hasChildren: boolean
}

function flattenTasks(v: unknown, out: FlatRow[], parent: string | null): void {
  if (!Array.isArray(v)) return
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const task = item as GanttTask
    const hasChildren = Array.isArray(task.children)
    out.push({ task, parent, fromNest: parent !== null, hasChildren })
    if (hasChildren) {
      const pid = typeof task.id === 'string' && task.id !== '' ? task.id : null
      flattenTasks(task.children, out, pid)
    }
  }
}

const VALID_TYPES = new Set(['task', 'milestone', 'summary'])

/** type 推导（与清洗层一致）：显式合法值优先；否则有子 = summary、无 end = milestone、其余 task */
function resolveType(row: FlatRow): 'task' | 'milestone' | 'summary' {
  const explicit = row.task.type
  if (explicit === 'task' || explicit === 'milestone' || explicit === 'summary') return explicit
  if (row.hasChildren) return 'summary'
  const end = row.task.end
  if (typeof end !== 'string' || end.trim() === '') return 'milestone'
  return 'task'
}

/** progress 输出：有限数字 clamp 0-100 取整（与清洗层口径一致）；缺省/非法回 0 */
function progressText(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '0'
  return String(Math.min(100, Math.max(0, Math.round(v))))
}

/** 生效父指针文本：嵌套行取最近带 id 祖先（无则空）；顶层行取显式 parent 字段（字符串才有值） */
function parentText(row: FlatRow): string {
  if (row.parent !== null) return row.parent
  if (row.fromNest) return ''
  return typeof row.task.parent === 'string' ? row.task.parent : ''
}

/** 数组单元格：元素为对象时取其 string id，其余 String()；用 `|` 拼接（仅自定义列会走到这里） */
function arrayText(v: unknown[]): string {
  return v
    .map((item) => {
      if (typeof item === 'object' && item !== null) {
        const id = (item as { id?: unknown }).id
        return typeof id === 'string' ? id : JSON.stringify(item)
      }
      return String(item)
    })
    .join('|')
}

/** 任意字段 → 单元格文本：字符串原样；数值/布尔 String；数组 `|` 拼 id；对象 JSON；空值空串 */
function cellText(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return arrayText(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return ''
}

/** 默认列（顺序固定）：id,name,start,end,type,progress,parent,project */
const DEFAULT_COLUMNS = ['id', 'name', 'start', 'end', 'type', 'progress', 'parent', 'project'] as const

/** CSV 转义：含分隔符/引号/换行则加引号并把引号翻倍 */
function escapeCell(text: string, delimiter: string): string {
  if (!text.includes(delimiter) && !text.includes('"') && !text.includes('\n') && !text.includes('\r')) {
    return text
  }
  return `"${text.replaceAll('"', '""')}"`
}

/**
 * 任务数组 → CSV 文本。
 *
 * - 先按 gantt 清洗层同款顺序拍平嵌套 children（深度优先前序，父在前子在后）。
 * - 默认列 `id,name,start,end,type,progress,parent,project`；milestone 的 end 回退 start；
 *   type 缺省推导（有子 = summary、无 end = milestone、其余 task）。
 * - resources / dependencies 等数组字段**只在自定义列时输出**（`|` 拼接元素 id），默认列不含。
 * - 转义：单元格含分隔符/引号/换行时加引号、引号翻倍；行以 `\n` 连接且文本以换行结尾。
 * - `bom: true` 在文本头追加 `\uFEFF`（Excel 直开 UTF-8 不乱码），缺省不加。
 * - `delimiter` 缺省 `','`；空串回落默认；多字符（如 ';'）允许。
 * - 非 object 项跳过；缺 id/name/start 的行按空单元格输出（helper 不做清洗层丢弃，保持数据忠实）。
 */
export function toCsv(
  tasks: GanttTask[],
  opts?: { delimiter?: string; columns?: Array<string | GanttExportColumn>; bom?: boolean },
): string {
  const delimiter = typeof opts?.delimiter === 'string' && opts.delimiter !== '' ? opts.delimiter : ','
  const columns: Array<string | GanttExportColumn> =
    opts?.columns && opts.columns.length > 0 ? opts.columns : [...DEFAULT_COLUMNS]

  const flat: FlatRow[] = []
  flattenTasks(tasks, flat, null)

  const keys = columns.map((c) => (typeof c === 'string' ? c : c.key))
  const headers = columns.map((c) => (typeof c === 'string' ? c : (c.label ?? c.key)))

  const lines = [headers.map((h) => escapeCell(h, delimiter)).join(delimiter)]
  for (const row of flat) {
    const t = row.task
    const type = resolveType(row)
    const start = typeof t.start === 'string' ? t.start : ''
    const cells = keys.map((key) => {
      switch (key) {
        case 'id':
          return typeof t.id === 'string' ? t.id : ''
        case 'name':
          return typeof t.name === 'string' ? t.name : ''
        case 'start':
          return start
        case 'end': {
          const end = typeof t.end === 'string' ? t.end : ''
          return type === 'milestone' && end === '' ? start : end
        }
        case 'type':
          return type
        case 'progress':
          return progressText(t.progress)
        case 'parent':
          return parentText(row)
        case 'project':
          return typeof t.project === 'string' ? t.project : ''
        default:
          return cellText(t[key])
      }
    })
    lines.push(cells.map((c) => escapeCell(c, delimiter)).join(delimiter))
  }
  const body = lines.join('\n') + '\n'
  return opts?.bom === true ? '\uFEFF' + body : body
}
