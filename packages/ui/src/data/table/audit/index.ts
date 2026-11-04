import type { TableEditDetail } from '../oas-table.js'
// OASTable 类型仅来自 barrel（类型导入零运行时依赖，不触发注册副作用）
import type { OASTable } from '../index.js'

/** 单条审计记录（一次成功提交的修改） */
export interface TableAuditEntry {
  /** 行 key（row-key 解析结果，与 oas-edit detail.key 同口径） */
  key: string
  /** 列 key */
  column: string
  /** 提交前旧值（字符串形态） */
  oldValue: string
  /** 提交前值的原数据形态（number / boolean / string[]，供精确对照回写） */
  oldRawValue?: unknown
  /** 新值（字符串形态） */
  value: string
  /** 修改时间戳（ms） */
  at: number
}

export interface TableAuditOptions {
  /** 环形记录上限（全表共享一条环，超出淘汰最旧）；缺省 500 */
  limit?: number
}

export interface TableAuditLog {
  /** 某行某列的修改历史（时间升序；返回浅拷贝，宿主原地改不污染日志） */
  getCellHistory(key: string, column: string): TableAuditEntry[]
  /** 某行的跨列修改历史（时间升序；浅拷贝） */
  getRowHistory(key: string): TableAuditEntry[]
  /** 当前记录数 */
  readonly size: number
  /** 清空全部记录 */
  clear(): void
  /** 解除订阅（之后编辑不再记录；已记录数据仍可读） */
  destroy(): void
}

/**
 * table 审计记录器（helper 型 L3，`@oas-ui/ui/data/table/audit`，显式调用创建）。
 *
 * 订阅宿主的 `oas-edit` 事件流，按「行 key × 列」记录每次提交的修改
 * （旧值 → 新值 + 时间戳 + 原始形态），供财务凭证审计 / 医疗记录 / 实验数据等
 * 「谁改了什么」的追溯场景查询。与 `table/history`（撤销栈）正交：审计是观察日志，
 * **不回放、不撤销、不参与编辑链路**；取消（oas-edit-cancel）与未变更提交不产生记录。
 * 存储为内存环形缓冲（默认上限 500 条，可配 limit），**不做持久化**——跨会话审计归宿主落库。
 * 展示层建议：单元格审计浮层用 structural-render 的 bodyCell 挂 hover 自绘（见文档 recipe），
 * 本模块不内置 UI。
 *
 * 语义边界（文档同步）：
 * - **编辑提交通道**：只订阅 `oas-edit`——行内编辑提交才产生记录；range 批量粘贴/填充写
 *   （oas-range-write）等其它写通道 v1 不在审计面。
 * - **受控编辑**（edit-controlled）：提交请求照记（detail 语义不变），实际是否生效以宿主
 *   回写为准——审计记「提交了什么」，不替宿主断言「生效了什么」。
 * - **事件流为真相源**：宿主手工 dispatch 的 `oas-edit` 同样被如实记录（只防御 key/column
 *   非 string 的畸形 detail）；审计完整性归宿主的事件纪律。
 * - 查询返回条目的**浅拷贝**，宿主原地修改不会污染日志。
 *
 * @param host oas-table 元素实例（需已注册 edit 能力才会产生 oas-edit 事件）
 * @param options.limit 环形记录上限（缺省 500；小数取整）
 */
export function createAuditLog(host: OASTable, options: TableAuditOptions = {}): TableAuditLog {
  const rawLimit = options.limit
  const limit = typeof rawLimit === 'number' && Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 500
  const ring: TableAuditEntry[] = []
  const onEdit = (e: Event): void => {
    const d = (e as CustomEvent<TableEditDetail>).detail
    if (!d || typeof d.key !== 'string' || typeof d.column !== 'string') return
    ring.push({
      key: d.key,
      column: d.column,
      oldValue: d.oldValue ?? '',
      oldRawValue: d.oldRawValue,
      value: d.value,
      at: Date.now(),
    })
    if (ring.length > limit) ring.splice(0, ring.length - limit)
  }
  host.addEventListener('oas-edit', onEdit)
  const copy = (e: TableAuditEntry): TableAuditEntry => ({ ...e })
  return {
    getCellHistory(key, column) {
      return ring.filter((e) => e.key === key && e.column === column).map(copy)
    },
    getRowHistory(key) {
      return ring.filter((e) => e.key === key).map(copy)
    },
    get size() {
      return ring.length
    },
    clear() {
      ring.length = 0
    },
    destroy() {
      host.removeEventListener('oas-edit', onEdit)
    },
  }
}

export type { OASTable, TableEditDetail }
