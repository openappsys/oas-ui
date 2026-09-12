import { OASElement } from '@oas-ui/core'
import '../input/index.js'

/** pair 预设的键值对行值 */
export interface DynamicInputPair {
  key: string
  value: string
}

/** 行值：input 预设为 string，pair 预设为 {key, value} */
export type DynamicInputRowValue = string | DynamicInputPair

/** size 尺寸档（对齐 oas-input：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
/** status 校验态：success / warning / error */
const VALID_STATUSES = ['error', 'warning', 'success'] as const
/** 行预设：input 单输入框 / pair 键值对双输入框 */
const VALID_PRESETS = ['input', 'pair'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/** 行值归一化：string 原样；对象取 key/value 字符串化；其余 String() 兜底 */
function normalizeRowValue(v: unknown): DynamicInputRowValue {
  if (typeof v === 'string') return v
  if (v != null && typeof v === 'object') {
    const o = v as { key?: unknown; value?: unknown }
    return { key: String(o.key ?? ''), value: String(o.value ?? '') }
  }
  return String(v)
}

const STYLE = `
 :host {
  display: block;
  font-family: inherit;
  /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-md);
}
:host([data-size='small']) {
  --_ch: var(--oas-control-height-sm);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.row oas-input {
  flex: 1;
  min-width: 0;
}
.row-content {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex: 1;
  min-width: 0;
}
.row-content > * {
  min-width: 0;
}
.icon-btn {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  width: var(--_ch);
  height: var(--_ch);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  flex: none;
}
.icon-btn:hover:not(:disabled) {
  color: var(--oas-color-danger);
  background: var(--oas-color-bg-hover);
}
.icon-btn.sort:hover:not(:disabled) {
  color: var(--oas-color-primary);
}
.icon-btn:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.icon-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.add {
  appearance: none;
  border: 1px dashed var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  height: var(--_ch);
  border-radius: var(--oas-radius-md);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-3);
  font-family: inherit;
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

const REMOVE_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const MOVE_UP_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M4 10 L8 5.5 L12 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const MOVE_DOWN_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M4 6 L8 10.5 L12 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

export class OASDynamicInput extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'min',
      'max',
      'default-value',
      'disabled',
      'model-value',
      'preset',
      'placeholder',
      'key-placeholder',
      'value-placeholder',
      'sortable',
      'size',
      'status',
      'readonly',
    ]
  }

  private rowsEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private rows: HTMLElement[] = []
  private values: DynamicInputRowValue[] = []
  private lastWrittenAttr: string | null = null
  /** 上次归一化后的 preset（切换时做值映射转换） */
  private lastPreset = 'input'
  /** 行内容重建签名：preset + row 模板在场状态（变化才整建） */
  private lastRowSig = ''
  /** light DOM 观察器：template[slot="row"] 增删 → 重建行内容 */
  private childObserver: MutationObserver | null = null

  get modelValue(): DynamicInputRowValue[] {
    return this.values.slice()
  }

  set modelValue(v: DynamicInputRowValue[]) {
    this.values = (Array.isArray(v) ? v : []).map(normalizeRowValue)
    this.writeBack()
    this.syncRows()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="rows" part="rows"></div>
      <button class="add" part="add" type="button"></button>
    `
  }

  /** 缓存节点引用 + 绑定行输入/删除/排序/焦点事件 + 接管快照已有行（render 与水合路径共用） */
  private bind(): void {
    this.rowsEl = this.shadow.querySelector('.rows')
    this.addBtn = this.shadow.querySelector('.add')

    // 水合接管：SSR 快照已按 model-value 渲染行，采纳为 rows 引用，避免 syncRows 重复追加
    if (this.rowsEl) {
      this.rows = [...this.rowsEl.querySelectorAll<HTMLElement>(':scope > .row')]
    }

    this.rowsEl?.addEventListener('oas-input', ((e: CustomEvent<{ value: string }>) =>
      this.handleRowInput(e)) as EventListener)
    this.rowsEl?.addEventListener('click', (e: MouseEvent) => this.handleClick(e))
    // 行内 oas-focus / oas-blur：封口重派发（detail 换行 index，内部事件不外泄）
    this.rowsEl?.addEventListener('oas-focus', ((e: Event) => this.handleRowFocusBlur(e, 'focus')) as EventListener)
    this.rowsEl?.addEventListener('oas-blur', ((e: Event) => this.handleRowFocusBlur(e, 'blur')) as EventListener)
    this.addBtn?.addEventListener('click', () => this.handleAdd())

    // row 模板增删 → 重建行内容（模板在 light DOM，行内容渲染时克隆）
    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.update())
      observer.observe(this, { childList: true, subtree: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    this.onCleanup(() => {
      this.rows = []
      this.lastRowSig = ''
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（rows 容器与添加按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.rows')) return false
    if (!this.shadow.querySelector('.add')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseValues()
    this.syncPreset()
    this.syncRows()
  }

  /** 属性通道：外部写 model-value 属性（JSON）时采用，自己写回的跳过 */
  private parseValues(): void {
    const raw = this.getAttribute('model-value')
    if (raw == null || raw === this.lastWrittenAttr) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.values = parsed.map(normalizeRowValue)
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** preset 归一化 + 切换时值映射：input→pair 得 {key: 原值, value: ""}；pair→input 取 key（空回落 value） */
  private syncPreset(): void {
    const preset = normalizeChoice(this.getAttr('preset', ''), 'input', VALID_PRESETS)
    if (preset !== this.lastPreset) {
      if (preset === 'pair') {
        this.values = this.values.map((v) => (typeof v === 'string' ? { key: v, value: '' } : v))
      } else {
        this.values = this.values.map((v) => (typeof v === 'string' ? v : v.key !== '' ? v.key : v.value))
      }
      this.lastPreset = preset
      this.writeBack()
    }
  }

  private isPair(): boolean {
    return normalizeChoice(this.getAttr('preset', ''), 'input', VALID_PRESETS) === 'pair'
  }

  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    return Math.max(0, Number(raw) || 0)
  }

  /** 组级禁用判定：disabled / readonly 均冻结增删与排序 */
  private isFrozen(): boolean {
    return this.hasAttr('disabled') || this.hasAttr('readonly')
  }

  private syncRows(): void {
    const rowsEl = this.rowsEl
    if (!rowsEl) return
    const max = this.maxValue()
    const min = this.minValue()
    const frozen = this.isFrozen()

    // 宿主态镜像：size（就近读取注入，与全局密度联动）/ status
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')

    // 边界：超长截断、不足补足 min
    if (this.values.length > max) this.values = this.values.slice(0, max)
    while (this.values.length < min) {
      this.values.push(this.isPair() ? { key: '', value: '' } : this.getAttr('default-value', ''))
    }

    // 行内容重建：preset / sortable / row 模板在场状态变化时整建（值变化只走下方增量同步）
    const sig = `${this.isPair() ? 'pair' : 'input'}|${this.hasAttr('sortable') ? '1' : '0'}|${this.querySelector('template[slot="row"]') ? '1' : '0'}`
    if (sig !== this.lastRowSig) {
      for (const row of this.rows) row.remove()
      this.rows = []
      this.lastRowSig = sig
    }

    // 结构同步（仅在长度变化时增删行，保留既有行引用）
    while (this.rows.length < this.values.length) this.appendRow()
    while (this.rows.length > this.values.length) {
      const last = this.rows.pop()
      last?.remove()
    }

    const sortable = this.hasAttr('sortable')
    this.rows.forEach((row, i) => {
      this.syncRowContent(row, i, { size, status, frozen })
      const btn = row.querySelector<HTMLButtonElement>('.remove')
      if (btn) {
        btn.disabled = frozen || this.values.length <= min
        btn.setAttribute('aria-label', this.t('dynamicInput.remove'))
      }
      if (sortable) {
        const up = row.querySelector<HTMLButtonElement>('.move-up')
        const down = row.querySelector<HTMLButtonElement>('.move-down')
        if (up) up.disabled = frozen || i === 0
        if (down) down.disabled = frozen || i === this.rows.length - 1
      }
    })

    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = frozen || this.values.length >= max
      addBtn.textContent = ''
      const icon = this.buildAddIcon()
      icon.style.verticalAlign = '-2px'
      icon.style.marginRight = 'var(--oas-space-1)'
      addBtn.appendChild(icon)
      const span = document.createElement('span')
      span.textContent = this.t('dynamicInput.add')
      addBtn.appendChild(span)
    }
  }

  /** 单行内容同步：预设行写入值/占位符/禁用态；模板行更新数据绑定 */
  private syncRowContent(row: HTMLElement, i: number, opts: { size: string; status: string; frozen: boolean }): void {
    const value = this.values[i] ?? ''
    const pair = typeof value === 'object' ? value : null
    const inputs = [...row.querySelectorAll('oas-input')]
    if (inputs.length > 0) {
      // 预设行：input 预设单输入框；pair 预设 key/value 双输入框（模板行含 oas-input 时仅透传交互态）
      const keyInput = row.querySelector('oas-input[part="row-key"]')
      const valueInput = row.querySelector('oas-input[part="row-value"]')
      const single = row.querySelector('oas-input[part="row-input"]')
      if (pair && keyInput && valueInput) {
        if (keyInput.getAttribute('value') !== pair.key) keyInput.setAttribute('value', pair.key)
        if (valueInput.getAttribute('value') !== pair.value) valueInput.setAttribute('value', pair.value)
        keyInput.setAttribute('placeholder', this.getAttr('key-placeholder', ''))
        valueInput.setAttribute('placeholder', this.getAttr('value-placeholder', ''))
      } else if (!pair && single) {
        const v = typeof value === 'string' ? value : ''
        if (single.getAttribute('value') !== v) single.setAttribute('value', v)
        if (single.getAttribute('part') === 'row-input') {
          single.setAttribute('placeholder', this.getAttr('placeholder', ''))
        }
      }
      for (const input of inputs) {
        if (this.hasAttr('disabled')) input.setAttribute('disabled', '')
        else input.removeAttribute('disabled')
        if (this.hasAttr('readonly')) input.setAttribute('readonly', '')
        else input.removeAttribute('readonly')
        if (opts.size !== 'medium') input.setAttribute('size', opts.size)
        else input.removeAttribute('size')
        if (opts.status) input.setAttribute('status', opts.status)
        else input.removeAttribute('status')
      }
    }
    // 模板行数据绑定：data-row-value（input 预设=行值 / pair 预设=value 部分）、data-row-key（key 部分）
    const rowValueText = pair ? pair.value : String(value)
    const rowKeyText = pair ? pair.key : ''
    const bindValue = row.querySelector('[data-row-value]')
    if (bindValue && bindValue.textContent !== rowValueText) bindValue.textContent = rowValueText
    const bindKey = row.querySelector('[data-row-key]')
    if (bindKey && bindKey.textContent !== rowKeyText) bindKey.textContent = rowKeyText
  }

  private buildAddIcon(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '12')
    svg.setAttribute('height', '12')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', 'M8 3 L8 13 M3 8 L13 8')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.4')
    path.setAttribute('stroke-linecap', 'round')
    svg.appendChild(path)
    return svg
  }

  private appendRow(): void {
    const rowsEl = this.rowsEl
    if (!rowsEl) return
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')

    // 行内容：template[slot="row"] 克隆优先，缺省回落预设（input 单框 / pair 双框）
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="row"]')
    const content = document.createElement('div')
    content.className = 'row-content'
    if (tpl instanceof HTMLTemplateElement) {
      content.appendChild(tpl.content.cloneNode(true))
    } else if (this.isPair()) {
      const keyInput = document.createElement('oas-input')
      keyInput.setAttribute('part', 'row-key')
      const valueInput = document.createElement('oas-input')
      valueInput.setAttribute('part', 'row-value')
      content.append(keyInput, valueInput)
    } else {
      const input = document.createElement('oas-input')
      input.setAttribute('part', 'row-input')
      content.appendChild(input)
    }
    row.appendChild(content)

    if (this.hasAttr('sortable')) {
      const up = document.createElement('button')
      up.type = 'button'
      up.className = 'icon-btn sort move-up'
      up.setAttribute('part', 'move-up')
      up.setAttribute('aria-label', this.t('dynamicInput.moveUp'))
      up.innerHTML = MOVE_UP_ICON
      const down = document.createElement('button')
      down.type = 'button'
      down.className = 'icon-btn sort move-down'
      down.setAttribute('part', 'move-down')
      down.setAttribute('aria-label', this.t('dynamicInput.moveDown'))
      down.innerHTML = MOVE_DOWN_ICON
      row.append(up, down)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon-btn remove'
    btn.setAttribute('part', 'remove')
    btn.innerHTML = REMOVE_ICON
    row.appendChild(btn)

    rowsEl.appendChild(row)
    this.rows.push(row)

    const idx = this.rows.length - 1
    this.emit('row-render', {
      index: idx,
      value: this.values[idx],
      element: content,
    })
  }

  private handleClick(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    const btn = path.find((n) => n instanceof Element && n.classList.contains('icon-btn'))
    if (!btn) return
    const row = path.find((n) => n instanceof Element && n.classList.contains('row'))
    const idx = row ? this.rows.indexOf(row as HTMLElement) : -1
    if (idx < 0) return
    if (btn.classList.contains('remove')) this.removeRow(idx)
    else if (btn.classList.contains('move-up')) this.moveRow(idx, -1)
    else if (btn.classList.contains('move-down')) this.moveRow(idx, 1)
  }

  private handleRowInput(e: CustomEvent<{ value: string }>): void {
    const path = e.composedPath() as Element[]
    const row = path.find((n) => n instanceof Element && n.classList.contains('row'))
    const idx = row ? this.rows.indexOf(row as HTMLElement) : -1
    if (idx < 0) return
    const raw = String(e.detail?.value ?? '')
    const target = e.composedPath()[0] as Element | undefined
    if (this.isPair()) {
      const current = this.values[idx]
      const pair: DynamicInputPair =
        typeof current === 'object' ? { key: current.key, value: current.value } : { key: '', value: '' }
      if (target?.getAttribute('part') === 'row-key') pair.key = raw
      else pair.value = raw
      this.values[idx] = pair
    } else {
      this.values[idx] = raw
    }
    this.writeBack()
    this.emitChange()
  }

  /** 行内 oas-focus / oas-blur 封口：拦截内部事件，重派发 detail {index} */
  private handleRowFocusBlur(e: Event, kind: 'focus' | 'blur'): void {
    const path = e.composedPath() as Element[]
    const row = path.find((n) => n instanceof Element && n.classList.contains('row'))
    const idx = row ? this.rows.indexOf(row as HTMLElement) : -1
    if (idx < 0) return
    e.stopPropagation()
    this.emit(kind, { index: idx })
  }

  private handleAdd(): void {
    if (this.isFrozen()) return
    if (this.values.length >= this.maxValue()) return
    this.values.push(this.isPair() ? { key: '', value: '' } : this.getAttr('default-value', ''))
    this.writeBack()
    this.syncRows()
    this.emit('add', { index: this.values.length - 1 })
    this.emitChange()
    // 聚焦新行第一个可聚焦输入控件（oas-input 聚焦其内部 input）
    const last = this.rows[this.rows.length - 1]
    const oasInput = last?.querySelector<HTMLElement>('oas-input')
    if (oasInput) {
      const inner = oasInput.shadowRoot?.querySelector<HTMLElement>('input')
      if (inner) inner.focus()
      else oasInput.focus()
      return
    }
    const plain = last?.querySelector<HTMLElement>('input, textarea, select')
    plain?.focus()
  }

  private removeRow(idx: number): void {
    if (this.isFrozen()) return
    if (this.values.length <= this.minValue()) return
    const removed = this.values[idx]
    this.values.splice(idx, 1)
    const row = this.rows[idx]
    row?.remove()
    this.rows.splice(idx, 1)
    this.writeBack()
    this.syncRows()
    this.emit('remove', { index: idx, value: removed })
    this.emitChange()
  }

  /** 按钮式排序：交换相邻值后原位同步（DOM 行不动、内容随值刷新，焦点不丢） */
  private moveRow(idx: number, dir: -1 | 1): void {
    if (this.isFrozen()) return
    const to = idx + dir
    if (to < 0 || to >= this.values.length) return
    const tmp = this.values[idx]!
    this.values[idx] = this.values[to]!
    this.values[to] = tmp
    this.writeBack()
    this.syncRows()
    this.emitChange()
  }

  private writeBack(): void {
    this.lastWrittenAttr = JSON.stringify(this.values)
    this.setAttribute('model-value', this.lastWrittenAttr)
  }

  private emitChange(): void {
    this.emit('change', { value: this.values.slice() })
  }
}
