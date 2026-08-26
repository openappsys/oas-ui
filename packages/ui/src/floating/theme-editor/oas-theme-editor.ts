import { OASElement } from '@oas-ui/core'

export type ThemeTokenType = 'color' | 'number'

export interface ThemeTokenDef {
  /** CSS 变量名，如 --oas-color-primary */
  name: string
  type: ThemeTokenType
  min?: number
  max?: number
  step?: number
}

export interface TokenGroup {
  key: string
  labelKey: string
  tokens: ThemeTokenDef[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
}
.group-title {
  margin: 0 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-text-secondary);
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) 0;
}
.row-label {
  font-size: var(--oas-font-size-sm);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-right {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex-shrink: 0;
}
.control input[type='color'] {
  width: 32px;
  height: var(--oas-control-height-sm);
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  cursor: pointer;
}
.control input[type='number'] {
  width: 72px;
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
}
.unit {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
}
.value {
  min-width: 56px;
  text-align: right;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
`

interface TokenRow {
  def: ThemeTokenDef
  rowEl: HTMLElement
  control: HTMLInputElement
  valueEl: HTMLElement
}

/** 默认 token 集：对应 theme/src/index.css 的语义 token，按组划分 */
const DEFAULT_GROUPS: TokenGroup[] = [
  {
    key: 'color',
    labelKey: 'themeEditor.group.color',
    tokens: [
      '--oas-color-primary',
      '--oas-color-primary-hover',
      '--oas-color-primary-active',
      '--oas-color-success',
      '--oas-color-warning',
      '--oas-color-danger',
      '--oas-color-text-primary',
      '--oas-color-text-secondary',
      '--oas-color-text-disabled',
      '--oas-color-border',
      '--oas-color-border-strong',
      '--oas-color-bg',
      '--oas-color-bg-elevated',
      '--oas-color-bg-hover',
      '--oas-color-bg-disabled',
    ].map((name) => ({ name, type: 'color' as const })),
  },
  {
    key: 'fontSize',
    labelKey: 'themeEditor.group.fontSize',
    tokens: [
      '--oas-font-size-xs',
      '--oas-font-size-sm',
      '--oas-font-size-md',
      '--oas-font-size-lg',
      '--oas-font-size-xl',
    ].map((name) => ({ name, type: 'number' as const, min: 8, max: 48, step: 1 })),
  },
  {
    key: 'space',
    labelKey: 'themeEditor.group.space',
    tokens: [
      '--oas-space-1',
      '--oas-space-2',
      '--oas-space-3',
      '--oas-space-4',
      '--oas-space-5',
      '--oas-space-6',
    ].map((name) => ({ name, type: 'number' as const, min: 0, max: 64, step: 1 })),
  },
  {
    key: 'radius',
    labelKey: 'themeEditor.group.radius',
      tokens: ['--oas-radius-xs', '--oas-radius-sm', '--oas-radius-md', '--oas-radius-lg', '--oas-radius-xl'].map((name) => ({
      name,
      type: 'number' as const,
      min: 0,
      max: 32,
      step: 1,
    })),
  },
  {
    key: 'controlHeight',
    labelKey: 'themeEditor.group.controlHeight',
    tokens: [
      '--oas-control-height-xs',
      '--oas-control-height-sm',
      '--oas-control-height-md',
      '--oas-control-height-lg',
      '--oas-control-height-xl',
    ].map((name) => ({ name, type: 'number' as const, min: 16, max: 80, step: 1 })),
  },
]

const GROUP_LABELS: Record<string, string> = {
  color: 'themeEditor.group.color',
  fontSize: 'themeEditor.group.fontSize',
  space: 'themeEditor.group.space',
  radius: 'themeEditor.group.radius',
  controlHeight: 'themeEditor.group.controlHeight',
  custom: 'themeEditor.group.custom',
}

/**
 * oas-theme-editor —— 主题 token 编辑面板。
 *
 * - 读取宿主（或最近 oas-config-provider）computed style 中的 `--oas-*` 变量，按组展示
 * - 颜色 token 用 color input，数字 token 用 number input（去单位展示，写回带原单位）
 * - 编辑即时写入宿主 CSS 变量（style.setProperty），子树实时继承预览
 * - 位于 oas-config-provider 内部时写入该 provider 元素，实现整个子树继承
 * - `token` 属性自定义要编辑的 token 列表（JSON 字符串数组），缺省读默认集；
 *   变量不存在时跳过；非法 JSON 回退默认集
 *
 * 事件：`oas-change` detail `{ token, value }`
 * 方法：`exportJson()` 导出当前 token 集；`reset()` 清除已写入的内联变量
 */
export class OASThemeEditor extends OASElement {
  static override get observedAttributes(): string[] {
    return ['token']
  }

  private groupsEl: HTMLElement | null = null
  private rows: TokenRow[] = []
  private lastTokenRaw: string | null = null
  private writtenTokens = new Set<string>()

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="editor" role="group" aria-label=""></div>
    `
    this.groupsEl = this.shadow.querySelector('.wrap')
    this.update()
  }

  protected override update(): void {
    const tokenRaw = this.getAttr('token')
    const changed = tokenRaw !== this.lastTokenRaw
    this.lastTokenRaw = tokenRaw
    if (changed) {
      this.rebuild()
    } else {
      this.syncValues()
    }
  }

  /**
   * 导出当前 token 集 JSON（`{ '--oas-*': value }`，值为实时 computed 值）。
   */
  exportJson(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const row of this.rows) {
      const value = this.readValue(row.def.name)
      if (value) out[row.def.name] = value
    }
    return out
  }

  /**
   * 重置：清除本组件写入宿主的内联 CSS 变量，恢复默认主题值。
   */
  reset(): void {
    const root = this.themeRoot()
    for (const name of this.writtenTokens) {
      root.style.removeProperty(name)
    }
    this.writtenTokens.clear()
    this.update()
  }

  private rebuild(): void {
    const groupsEl = this.groupsEl
    if (!groupsEl) return
    groupsEl.innerHTML = ''
    this.rows = []
    groupsEl.setAttribute('aria-label', this.t('themeEditor.label'))
    for (const group of this.resolveGroups()) {
      const rows: TokenRow[] = []
      for (const def of group.tokens) {
        const value = this.readValue(def.name)
        if (!value) continue // 边界：变量不存在跳过
        const row = this.buildRow(def, value)
        if (row) rows.push(row)
      }
      if (rows.length === 0) continue
      this.rows.push(...rows)
      const section = document.createElement('section')
      section.className = 'group'
      section.setAttribute('part', 'group')
      const title = document.createElement('h3')
      title.className = 'group-title'
      title.textContent = this.t(group.labelKey)
      section.appendChild(title)
      const container = document.createElement('div')
      container.className = 'rows'
      for (const r of rows) container.appendChild(r.rowEl)
      section.appendChild(container)
      groupsEl.appendChild(section)
    }
  }

  private buildRow(def: ThemeTokenDef, value: string): TokenRow | null {
    const rowEl = document.createElement('label')
    rowEl.className = 'row'
    rowEl.setAttribute('part', 'row')

    const label = document.createElement('span')
    label.className = 'row-label'
    label.textContent = def.name
    rowEl.appendChild(label)

    const right = document.createElement('span')
    right.className = 'row-right'

    const control = document.createElement('input')
    const valueEl = document.createElement('span')
    valueEl.className = 'value'

    if (def.type === 'color') {
      control.type = 'color'
      control.classList.add('control')
      control.value = this.toHex(value)
      control.addEventListener('input', () => this.applyValue(def, control.value))
      valueEl.textContent = value
      right.appendChild(control)
    } else {
      const num = parseFloat(value)
      if (Number.isNaN(num)) return null
      control.type = 'number'
      control.classList.add('control')
      if (def.min !== undefined) control.min = String(def.min)
      if (def.max !== undefined) control.max = String(def.max)
      if (def.step !== undefined) control.step = String(def.step)
      control.value = String(num)
      const unit = this.extractUnit(value)
      control.addEventListener('input', () => {
        const parsed = parseFloat(control.value)
        if (Number.isNaN(parsed)) return
        this.applyValue(def, `${parsed}${unit}`)
      })
      right.appendChild(control)
      if (unit) {
        const unitEl = document.createElement('span')
        unitEl.className = 'unit'
        unitEl.textContent = unit
        right.appendChild(unitEl)
      }
      valueEl.textContent = value
    }

    right.appendChild(valueEl)
    rowEl.appendChild(right)
    return { def, rowEl, control, valueEl }
  }

  private syncValues(): void {
    for (const row of this.rows) {
      const value = this.readValue(row.def.name)
      if (!value) continue
      row.valueEl.textContent = value
      if (row.def.type === 'color') {
        row.control.value = this.toHex(value)
      } else {
        const num = parseFloat(value)
        if (!Number.isNaN(num)) row.control.value = String(num)
      }
    }
  }

  private applyValue(def: ThemeTokenDef, value: string): void {
    const root = this.themeRoot()
    root.style.setProperty(def.name, value)
    this.writtenTokens.add(def.name)
    this.emit('change', { token: def.name, value })
    // 就地刷新值显示，避免整棵重建导致输入焦点丢失
    const row = this.rows.find((r) => r.def.name === def.name)
    if (row) row.valueEl.textContent = value
  }

  /**
   * 写读目标：位于 oas-config-provider 内部时写最近 provider（整个子树继承），
   * 否则写宿主自身。
   */
  private themeRoot(): HTMLElement {
    const provider = this.closest('oas-config-provider')
    return (provider as HTMLElement | null) ?? this
  }

  private readValue(name: string): string {
    return getComputedStyle(this.themeRoot()).getPropertyValue(name).trim()
  }

  private resolveGroups(): TokenGroup[] {
    const raw = this.getAttr('token')
    if (!raw) return DEFAULT_GROUPS
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_GROUPS
      const names = parsed.filter(
        (n): n is string => typeof n === 'string' && n.startsWith('--') && n.length > 2,
      )
      if (names.length === 0) return DEFAULT_GROUPS
      const byGroup = new Map<string, ThemeTokenDef[]>()
      for (const name of names) {
        const key = this.groupOf(name)
        const def: ThemeTokenDef =
          key === 'color'
            ? { name, type: 'color' }
            : { name, type: 'number', min: 0, max: 100, step: 1 }
        const list = byGroup.get(key)
        if (list) list.push(def)
        else byGroup.set(key, [def])
      }
      const groups: TokenGroup[] = []
      for (const key of ['color', 'fontSize', 'space', 'radius', 'controlHeight', 'custom']) {
        const tokens = byGroup.get(key)
        if (!tokens || tokens.length === 0) continue
        groups.push({ key, labelKey: GROUP_LABELS[key] ?? 'themeEditor.group.custom', tokens })
      }
      return groups
    } catch {
      return DEFAULT_GROUPS
    }
  }

  private groupOf(name: string): string {
    if (name.includes('color')) return 'color'
    if (name.startsWith('--oas-font-size-')) return 'fontSize'
    if (name.startsWith('--oas-space-')) return 'space'
    if (name.startsWith('--oas-radius-')) return 'radius'
    if (name.startsWith('--oas-control-height-')) return 'controlHeight'
    return 'custom'
  }

  private toHex(value: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : '#000000'
  }

  private extractUnit(value: string): string {
    const m = value.match(/[a-z%]+$/i)
    return m ? m[0] : ''
  }
}
