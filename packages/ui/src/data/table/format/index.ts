import type { TableColumn } from '../oas-table.js'
import { registerTableCapability } from '../oas-table-capability.js'
import {
  compileConditionalFormat,
  type ConditionalMatch,
  type ConditionalRule,
  type ConditionalStyle,
} from '../advanced/conditional.js'

interface ConditionalHost extends HTMLElement {
  setCapabilityOptions(name: string, options: unknown): void
  getCapabilityOptions<T = unknown>(name: string): T | undefined
}

/** 条件格式控制器：读取宿主 capability options，在单元格装饰链中应用样式 */
class ConditionalFormatController {
  readonly decorateOrder = 20
  private rules: readonly ConditionalRule[] | null = null
  private matcher: ReturnType<typeof compileConditionalFormat> | null = null

  constructor(private readonly host: ConditionalHost) {}

  /** ReactiveController 生命周期占位（能力仅使用单元格装饰钩子） */
  hostConnected(): void {}

  private syncRules(): void {
    const rules = this.host.getCapabilityOptions<ConditionalRule[]>('format') ?? []
    if (rules === this.rules) return
    this.rules = rules
    this.matcher = compileConditionalFormat(rules)
  }

  decorateCell(td: HTMLTableCellElement, col: TableColumn, row: Record<string, unknown>): void {
    this.syncRules()
    if (!this.matcher) return
    const match = this.matcher(row, col.key, row[col.key])
    if (!match) return
    const target = match.applyTo === 'row' ? td.parentElement : td
    if (target) applyStyle(target, match)
  }
}

function applyStyle(target: HTMLElement, match: ConditionalMatch): void {
  const style: ConditionalStyle = match.style
  if (style.color) target.style.setProperty('color', style.color)
  if (style.backgroundColor) target.style.setProperty('background-color', style.backgroundColor)
  if (style.fontWeight != null) target.style.setProperty('font-weight', String(style.fontWeight))
  if (style.fontStyle) target.style.setProperty('font-style', style.fontStyle)
  if (style.textDecoration) target.style.setProperty('text-decoration', style.textDecoration)
  if (style.className) {
    for (const name of style.className.split(/\s+/)) {
      if (name) target.classList.add(name)
    }
  }
}

/** 设置条件格式规则；传空数组清空。规则按顺序首个命中生效。 */
export function setConditionalFormat(table: HTMLElement, rules: readonly ConditionalRule[]): void {
  ;(table as ConditionalHost).setCapabilityOptions('format', [...rules])
}

/** 读取当前条件格式规则（未设置返回空数组） */
export function getConditionalFormat(table: HTMLElement): ConditionalRule[] {
  return (table as ConditionalHost).getCapabilityOptions<ConditionalRule[]>('format') ?? []
}

registerTableCapability('format', (host) => new ConditionalFormatController(host as ConditionalHost))

export type { ConditionalMatch, ConditionalRule, ConditionalStyle }
