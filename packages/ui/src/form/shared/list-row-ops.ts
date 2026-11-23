/**
 * 数组行容器共用机制（oas-form-list / oas-array-table 同源）。
 *
 * 两个组件是同一份语义的两种承载（行容器 + 行模板克隆 + name 索引化 + 行操作），
 * 这里集中三件事，避免「一套契约两处实现、只修一处」：
 * 1. `indexedRowName` / `applyRowNaming`：name 索引化与重编号（`{index}` 占位优先，否则 list name 前缀）；
 * 2. 行值深拷贝 / 值交换：**读写一律走内核通道**（`readFormControlValue` / `writeFormControlValue`），
 *    没有内核可用时退化为「同结构按文档序逐字段复制」（模板克隆结构一致，位置即对应）；
 * 3. 内层数组行数收敛：行值里带了内层数组时，先把内层行容器补齐/收敛到目标行数，再写叶子值。
 *
 * upload 例外：文件体不可序列化，读值是派生只读摘要（`[{name,size,type}]`），写回只会清掉回显，
 * 与 schema-form 快照回填同一判据——行复制/交换一律跳过该 tag。
 */
import { readFormControlValue, writeFormControlValue } from '../form/index.js'

/** 行 wrapper 标记（schema-form 的 DOM 契约依赖它，两个容器都必须满足） */
export const ROW_ATTR = 'data-oas-form-list-item'
/** 数组容器标记（schema-form 按它索引数组路径） */
export const ARRAY_ATTR = 'data-schema-array-key'

const INDEX_PLACEHOLDER = '{index}'
const UPLOAD_TAG = 'oas-upload'
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

/** name 索引化：`{index}` 占位优先，否则 list name 前缀，否则原样 */
export function indexedRowName(tplName: string, index: number, listName: string): string {
  if (tplName.includes(INDEX_PLACEHOLDER)) return tplName.split(INDEX_PLACEHOLDER).join(String(index))
  if (listName !== '') return `${listName}.${index}.${tplName}`
  return tplName
}

/** 行内带 name 的字段记录（重编号用；tplName 为模板原始 name） */
export interface NamedRowField {
  el: Element
  tplName: string
}

/** 行重编号：已有行按新索引重派生 name（值不动） */
export function applyRowNaming(items: NamedRowField[][], listName: string): void {
  items.forEach((named, index) => {
    for (const record of named) {
      const next = indexedRowName(record.tplName, index, listName)
      if (record.el.getAttribute('name') !== next) record.el.setAttribute('name', next)
    }
  })
}

/** 行 wrapper（容器的直接子行，文档序） */
export function rowWrappers(container: ParentNode): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`:scope > [${ROW_ATTR}]`))
}

/** 容器内直接行数 */
export function rowCount(container: ParentNode): number {
  return container.querySelectorAll(`:scope > [${ROW_ATTR}]`).length
}

/**
 * 行数收敛到目标值：容器实现 `setRowCount` 时走它（可增可减），否则退回 `rows` 属性（只增）。
 * 用于「行值里带了内层数组」的复制/交换场景——内层行必须先存在，叶子值才有落点。
 */
export function setContainerRowCount(container: Element, target: number): void {
  const sized = container as Element & { setRowCount?: (count: number) => void }
  if (typeof sized.setRowCount === 'function') {
    sized.setRowCount(target)
    return
  }
  if (container.getAttribute('rows') !== String(target)) container.setAttribute('rows', String(target))
}

/** 值 → 内核字符串语义（数字/布尔转字符串，数组/对象出 JSON 串，空值出空串） */
export function serializeLeafValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    const json = JSON.stringify(value)
    return typeof json === 'string' ? json : ''
  } catch {
    return ''
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 属性选择器转义（路径里的 `\` 与 `"` 都可能出现，先转义反斜杠再转义引号） */
function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function fieldByName(row: ParentNode, name: string): HTMLElement | null {
  return row.querySelector<HTMLElement>(`[name="${escapeAttrValue(name)}"]`)
}

function listByPath(row: ParentNode, path: string): HTMLElement | null {
  for (const list of row.querySelectorAll<HTMLElement>(`[${ARRAY_ATTR}]`)) {
    if (list.getAttribute('name') === path) return list
  }
  return null
}

function isWritableField(el: HTMLElement | null): el is HTMLElement {
  return el !== null && el.tagName.toLowerCase() !== UPLOAD_TAG
}

/**
 * 写控件值：优先走内核 writer 注册表；该 tag 未注册 writer（多数基础控件只注册了 reader）
 * 时回落 `value` 属性——与 schema-form 快照回填同一判据，否则写入静默丢失。
 */
function writeFieldValue(element: HTMLElement, value: string): void {
  if (writeFormControlValue(element, value)) return
  element.setAttribute('value', value)
}

/** 行内可复制字段（排除内层数组容器自身的 name） */
function fieldElements(row: ParentNode): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>('[name]')).filter((el) => !el.hasAttribute(ARRAY_ATTR))
}

/** 数组路径读取（`users.0.matrix` 这类具体路径；缺返回 undefined） */
function readArrayAt(values: unknown, path: string): unknown[] | null {
  let cursor: unknown = values
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object' || !Object.hasOwn(cursor, segment)) return null
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return Array.isArray(cursor) ? cursor : null
}

function kernelValues(container: Element): Record<string, unknown> | null {
  const form = container.closest('oas-form') as { getValues?: () => Record<string, unknown> } | null
  if (!form || typeof form.getValues !== 'function') return null
  try {
    return form.getValues()
  } catch {
    return null
  }
}

/**
 * 读取数组某行的值（深拷贝：内核字符串语义的快照，之后写入互不影响）。
 * 取不到内核通道（独立使用 / 无 name）时返回 `undefined`，调用方退回结构快照。
 */
export function readRowValue(container: Element, arrayPath: string, index: number): unknown {
  if (arrayPath === '') return undefined
  const values = kernelValues(container)
  if (!values) return undefined
  const array = readArrayAt(values, arrayPath)
  return array ? array[index] : undefined
}

/** 行结构快照（无内核通道时的复制来源）：内层行数 + 文档序字段值 */
export interface RowStructureSnapshot {
  counts: number[]
  values: Array<string | null>
}

export function snapshotRowStructure(row: ParentNode): RowStructureSnapshot {
  const lists = Array.from(row.querySelectorAll<HTMLElement>(`[${ARRAY_ATTR}]`))
  return {
    counts: lists.map((list) => rowCount(list)),
    values: fieldElements(row).map((el) => (el.tagName.toLowerCase() === UPLOAD_TAG ? null : readFormControlValue(el))),
  }
}

export function restoreRowStructure(row: ParentNode, snapshot: RowStructureSnapshot): void {
  const lists = Array.from(row.querySelectorAll<HTMLElement>(`[${ARRAY_ATTR}]`))
  lists.forEach((list, index) => setContainerRowCount(list, snapshot.counts[index] ?? 0))
  // 行数变化后重新取字段：新建行的字段是新元素（前面的快照下标按同构模板仍一一对应）
  const fields = fieldElements(row)
  fields.forEach((el, index) => {
    const value = snapshot.values[index]
    if (value === null || value === undefined) return
    if (!isWritableField(el)) return
    writeFieldValue(el, value)
  })
}

/**
 * 把一份行值写进行 DOM（按绝对路径匹配字段 / 内层数组容器）。
 * 内层数组先按值长度收敛行数，再递归写叶子；字段名不存在（列被自定义 widget 接管等）静默跳过。
 */
export function writeRowValue(row: ParentNode, rowPath: string, value: unknown): void {
  writeNode(row, rowPath, value)
}

function writeNode(row: ParentNode, path: string, value: unknown): void {
  if (value === undefined) return
  const field = fieldByName(row, path)
  if (isWritableField(field)) {
    writeFieldValue(field, serializeLeafValue(value))
    return
  }
  if (Array.isArray(value)) {
    const list = listByPath(row, path)
    if (!list) return
    setContainerRowCount(list, value.length)
    value.forEach((item, index) => writeNode(row, `${path}.${index}`, item))
    return
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (RESERVED_KEYS.has(key)) continue
      writeNode(row, `${path}.${key}`, child)
    }
  }
}

/**
 * 把第 `from` 行的值复制到第 `to` 行（复制语义：JSON 深拷贝，非引用）。
 * 有内核通道走内核值（字符串语义）；否则按结构快照逐字段复制。
 */
export function copyRowValue(container: Element, arrayPath: string, from: number, to: number): void {
  const rows = rowWrappers(container)
  const source = rows[from]
  const target = rows[to]
  if (!source || !target) return
  const value = readRowValue(container, arrayPath, from)
  if (value !== undefined) {
    writeRowValue(target, `${arrayPath}.${to}`, value)
    return
  }
  restoreRowStructure(target, snapshotRowStructure(source))
}

/** 交换两行值（上移/下移：值交换，DOM 顺序不动） */
export function swapRowValues(container: Element, arrayPath: string, a: number, b: number): void {
  const rows = rowWrappers(container)
  const rowA = rows[a]
  const rowB = rows[b]
  if (!rowA || !rowB) return
  const valueA = readRowValue(container, arrayPath, a)
  const valueB = readRowValue(container, arrayPath, b)
  if (valueA !== undefined && valueB !== undefined) {
    writeRowValue(rowA, `${arrayPath}.${a}`, valueB)
    writeRowValue(rowB, `${arrayPath}.${b}`, valueA)
    return
  }
  const snapA = snapshotRowStructure(rowA)
  const snapB = snapshotRowStructure(rowB)
  restoreRowStructure(rowA, snapB)
  restoreRowStructure(rowB, snapA)
}
