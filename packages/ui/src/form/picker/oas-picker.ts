import { OASFormElement } from '@oas-ui/core'

/**
 * oas-picker —— 滚轮选择器（form 族，移动原生形态批）。
 *
 * 移动式滚轮列选择：原生滚动 + scroll-snap 提供惯性手感（零 JS 物理），滚动落停按
 * scrollTop/itemHeight 换算选中项。两数据形态：
 * - `columns`：独立多列 `[{ key?, label?, items: [{ label, value?, disabled? }] }]`；
 * - `options`：级联树 `[{ label, value?, children: [...] }]`——列数随选中路径派生，
 *   父列变更重建子列并复位到首可用项。
 * 两属性互斥（columns 优先）。
 *
 * 值：`value`（JSON 数组，各列选中 value——value 缺省回退 label），非受控落停回写 +
 * 反射，派发 `oas-change`（detail `{ value, labels, columnIndex }`）；程序性写入只
 * 滚动不派发（受控语义）。form-associated：FormData 提交 JSON 数组字符串；reset 回初始。
 *
 * a11y：列 `role="listbox"`（tabindex=0 + aria-activedescendant 同步）+ 项 `role="option"`
 * （aria-selected/aria-disabled）；方向键/Home/End 移动选中；列 aria-label 取列 label
 * 字段、缺省走 i18n 序号。
 *
 * 布局无关设计：选中换算只依赖 scrollTop 与 item-height（happy-dom 可测），中心指示带
 * 与滚轮高度由 visible-count（归奇）× item-height 决定。
 */

export interface PickerItem {
  label: string
  value?: string
  disabled?: boolean
  children?: PickerItem[]
}

export interface PickerColumn {
  key?: string
  label?: string
  items: PickerItem[]
}

/** detail.value/labels 为全列当前口径；columnIndex 为本次变更列 */
export interface PickerChangeDetail {
  value: string[]
  labels: string[]
  columnIndex: number
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.wheels {
  position: relative;
  display: flex;
  gap: var(--oas-space-1);
}
.column {
  flex: 1 1 0;
  min-width: 0;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  overscroll-behavior: contain;
  border-radius: var(--oas-radius-sm);
  /* 实底：axe 对比度可评分（项无底色时 axe 需解析到列/页底色；
     项 positioned 叠在 absolute band 上后底解析失败全列 incomplete，实抓） */
  background: var(--oas-color-bg);
}
.column::-webkit-scrollbar {
  display: none;
}
.column:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.column[aria-disabled='true'] {
  opacity: 0.6;
  pointer-events: none;
}
.item {
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
  user-select: none;
}
.item[aria-selected='true'] {
  color: var(--oas-color-text-primary);
  font-weight: var(--oas-font-weight-medium, 500);
  /* 选中行自带高亮（替代全宽 absolute 指示带——带会被 axe 判为遮挡元素的覆盖物，
     且与项的 stacking 关系脆弱；各列选中行同一中线，视觉连续带，列 gap 处自然断点） */
  background: var(--oas-color-bg-hover);
  box-shadow:
    inset 0 1px 0 var(--oas-color-border),
    inset 0 -1px 0 var(--oas-color-border);
}
.item[aria-disabled='true'] {
  color: var(--oas-color-text-disabled);
}
.spacer {
  flex: none;
}

:host([disabled]) .wheels {
  opacity: 0.6;
  pointer-events: none;
}
`

const DEFAULT_ITEM_HEIGHT = 36
const DEFAULT_VISIBLE_COUNT = 5
/** 滚动落停判定：最后一次 scroll 后无新事件的静默窗口（scrollend 不兼容环境的兜底） */
const SETTLE_MS = 100

export class OASPicker extends OASFormElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'options', 'value', 'item-height', 'visible-count', 'disabled', 'name', 'required']
  }

  /** 各列当前选中下标（渲染/滚动/事件共用的单一事实源） */
  private selectedIdx: number[] = []
  /** 初始 value 基线（form.reset 用） */
  private initialValue = ''
  private scrollTimer: ReturnType<typeof setTimeout> | null = null
  /** 落停提交是否允许派发（初始定位/程序性写入期间抑制） */
  private emitReady = false

  get value(): string[] {
    return this.currentValues()
  }
  set value(v: string[] | string) {
    this.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v))
  }

  private itemHeight(): number {
    const n = Number(this.getAttr('item-height', String(DEFAULT_ITEM_HEIGHT)))
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_ITEM_HEIGHT
  }

  private visibleCount(): number {
    let n = Number(this.getAttr('visible-count', String(DEFAULT_VISIBLE_COUNT)))
    if (!Number.isFinite(n) || n < 3) n = DEFAULT_VISIBLE_COUNT
    n = Math.floor(n)
    return n % 2 === 0 ? n + 1 : n
  }

  private parseJson<T>(name: string): T | null {
    const raw = this.getAttribute(name)
    if (raw == null || raw === '') return null
    try {
      const v: unknown = JSON.parse(raw)
      return Array.isArray(v) ? (v as T) : null
    } catch {
      return null
    }
  }

  /** 列数据源：columns 优先；options 树按选中路径派生列 */
  private resolvedColumns(): PickerColumn[] {
    const cols = this.parseJson<PickerColumn[]>('columns')
    if (cols && cols.length > 0) return cols.filter((c) => c && Array.isArray(c.items))
    const tree = this.parseJson<PickerItem[]>('options')
    if (!tree || tree.length === 0) return []
    const out: PickerColumn[] = [{ items: tree }]
    let level = tree
    for (let i = 0; i < this.selectedIdx.length; i++) {
      const sel = level[this.selectedIdx[i] ?? 0]
      if (!sel || !Array.isArray(sel.children) || sel.children.length === 0) break
      out.push({ items: sel.children })
      level = sel.children
    }
    return out
  }

  private isCascade(): boolean {
    return !this.parseJson<PickerColumn[]>('columns')?.length && !!this.parseJson<PickerItem[]>('options')?.length
  }

  /** 当前选中值（value 缺省回退 label；无列回空数组） */
  private currentValues(): string[] {
    const cols = this.resolvedColumns()
    const out: string[] = []
    cols.forEach((c, i) => {
      const item = c.items[this.selectedIdx[i] ?? 0]
      if (item) out.push(item.value ?? item.label)
    })
    return out
  }

  private currentLabels(): string[] {
    const cols = this.resolvedColumns()
    const out: string[] = []
    cols.forEach((c, i) => {
      const item = c.items[this.selectedIdx[i] ?? 0]
      if (item) out.push(item.label)
    })
    return out
  }

  /** value 属性 → 各列下标（按 value ?? label 匹配；未命中回 0 或首个可用项） */
  private indicesFromValue(): number[] {
    const cols = this.resolvedColumns()
    const values = this.parseJson<string[]>('value') ?? []
    return cols.map((c, i) => {
      const v = values[i]
      if (v != null) {
        const hit = c.items.findIndex((it) => (it.value ?? it.label) === v)
        if (hit >= 0) return hit
      }
      const firstEnabled = c.items.findIndex((it) => !it.disabled)
      return firstEnabled >= 0 ? firstEnabled : 0
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${STYLE}</style><div class="wheels" part="wheels"></div>`
    this.bind()
    this.runUpdateAndNotify()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.wheels')) return false
    this.bind()
    return true
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private bind(): void {
    this.shadow.addEventListener('scroll', this.handleScroll, true)
    this.shadow.addEventListener('keydown', this.handleKeydown)
    this.onCleanup(() => {
      if (this.scrollTimer) clearTimeout(this.scrollTimer)
      this.scrollTimer = null
    })
  }

  protected override update(): void {
    const wheels = this.shadow.querySelector<HTMLElement>('.wheels')
    if (!wheels) return
    const cols = this.resolvedColumns()
    // 选中下标同步：列结构变化（含级联重建/属性变更）后按 value 重解析，长度对齐列数
    const fromValue = this.indicesFromValue()
    this.selectedIdx = cols.map((_, i) => fromValue[i] ?? 0)
    const h = this.itemHeight()
    const count = this.visibleCount()
    const spacer = ((count - 1) / 2) * h
    const disabled = this.hasAttr('disabled')
    wheels.innerHTML = ''
    cols.forEach((col, i) => {
      wheels.appendChild(this.buildColumn(col, i, h, count, spacer, disabled))
    })
    // 初始定位：滚动位落定到选中项（instant，不派发——emitReady 在定位后开启）
    this.emitReady = false
    cols.forEach((_, i) => this.scrollToIndex(i, this.selectedIdx[i] ?? 0, false))
    this.emitReady = true
    this.syncFormValue()
  }

  private buildColumn(
    col: PickerColumn,
    index: number,
    h: number,
    count: number,
    spacer: number,
    disabled: boolean,
  ): HTMLElement {
    const el = document.createElement('div')
    el.className = 'column'
    el.setAttribute('part', 'column')
    el.setAttribute('role', 'listbox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-label', col.label ?? this.t('picker.columnLabel', { index: index + 1 }))
    if (disabled) el.setAttribute('aria-disabled', 'true')
    el.dataset.index = String(index)
    el.style.height = `${count * h}px`

    const top = document.createElement('div')
    top.className = 'spacer'
    top.style.height = `${spacer}px`
    el.appendChild(top)

    const sel = this.selectedIdx[index] ?? 0
    col.items.forEach((item, j) => {
      const it = document.createElement('div')
      it.className = 'item'
      it.setAttribute('part', 'item')
      it.setAttribute('role', 'option')
      it.id = `oas-picker-item-${index}-${j}`
      it.style.height = `${h}px`
      it.textContent = item.label
      it.setAttribute('aria-selected', String(j === sel))
      if (item.disabled) it.setAttribute('aria-disabled', 'true')
      el.appendChild(it)
    })
    el.setAttribute('aria-activedescendant', `oas-picker-item-${index}-${sel}`)

    const bottom = document.createElement('div')
    bottom.className = 'spacer'
    bottom.style.height = `${spacer}px`
    el.appendChild(bottom)
    return el
  }

  /** 滚动位换算选中下标（布局无关：只依赖 scrollTop 与 item-height） */
  private indexFromScroll(col: HTMLElement): number {
    const h = this.itemHeight()
    return Math.max(0, Math.round(col.scrollTop / h))
  }

  private scrollToIndex(colIdx: number, itemIdx: number, smooth: boolean): void {
    const col = this.shadow.querySelectorAll<HTMLElement>('.column')[colIdx]
    if (!col) return
    const top = itemIdx * this.itemHeight()
    // scrollTo 缺席/抛错环境（happy-dom 等）回退直接写 scrollTop——逻辑选中不依赖物理吸附
    if (smooth) {
      try {
        col.scrollTo({ top, behavior: 'smooth' })
        return
      } catch {
        /* 回退直下 */
      }
    }
    col.scrollTop = top
  }

  /** 最近可用项（disabled 吸附）：优先向目标方向，其次反向，最终原值 */
  private nearestEnabled(items: PickerItem[], from: number, dir: 1 | -1 = 1): number {
    if (items.length === 0) return 0
    const clamp = (n: number) => Math.min(Math.max(0, n), items.length - 1)
    for (let d = 0; d < items.length; d++) {
      const fwd = clamp(from + d * dir)
      if (!items[fwd]!.disabled) return fwd
      const bwd = clamp(from - d * dir)
      if (!items[bwd]!.disabled) return bwd
    }
    return clamp(from)
  }

  private handleScroll = (e: Event): void => {
    // disabled：不改值（settleColumn 拦）也不许滚动中重绘选中（视觉态即事实源的一部分）
    if (this.hasAttr('disabled')) return
    const col = (e.target as HTMLElement).closest?.('.column') as HTMLElement | null
    if (!col) return
    const colIdx = Number(col.dataset.index ?? '0')
    // 滚动中实时高亮最近项（跟手反馈）
    this.paintSelection(colIdx, this.indexFromScroll(col))
    if (this.scrollTimer) clearTimeout(this.scrollTimer)
    this.scrollTimer = setTimeout(() => this.settleColumn(col, colIdx), SETTLE_MS)
  }

  /** 落停：校正吸附（disabled 避让）→ 提交变更 */
  private settleColumn(col: HTMLElement, colIdx: number): void {
    if (this.hasAttr('disabled')) return
    const cols = this.resolvedColumns()
    const items = cols[colIdx]?.items ?? []
    if (items.length === 0) return
    let idx = Math.min(this.indexFromScroll(col), items.length - 1)
    if (items[idx]?.disabled) {
      idx = this.nearestEnabled(items, idx)
      this.scrollToIndex(colIdx, idx, true)
    } else if (col.scrollTop !== idx * this.itemHeight()) {
      // 吸附校正（scroll-snap 缺席环境兜底；原生环境为同值 no-op）
      this.scrollToIndex(colIdx, idx, true)
    }
    this.paintSelection(colIdx, idx)
    this.commit(colIdx, idx)
  }

  private paintSelection(colIdx: number, idx: number): void {
    const col = this.shadow.querySelectorAll<HTMLElement>('.column')[colIdx]
    if (!col) return
    const items = col.querySelectorAll('.item')
    items.forEach((it, j) => it.setAttribute('aria-selected', String(j === idx)))
    col.setAttribute('aria-activedescendant', `oas-picker-item-${colIdx}-${idx}`)
  }

  /** 提交选中：变化才回写/派发（天然防程序性回环）；级联截断路径并重建子列 */
  private commit(colIdx: number, idx: number): void {
    if (this.selectedIdx[colIdx] === idx) return
    this.selectedIdx[colIdx] = idx
    if (this.isCascade() && colIdx < this.resolvedColumns().length - 1) {
      // 级联：截断深层路径 + 子列复位首可用项；不写中间态——统一由下方 setAttribute('value')
      // 触发整体重建（update 重推导读的正是新 value，口径一致，避免旧 value 把路径顶回去）
      this.selectedIdx = this.selectedIdx.slice(0, colIdx + 1)
      const cols = this.resolvedColumns()
      for (let i = colIdx + 1; i < cols.length; i++) {
        this.selectedIdx[i] = this.nearestEnabled(cols[i]!.items, 0)
      }
    }
    const value = this.currentValues()
    this.setAttribute('value', JSON.stringify(value))
    this.syncFormValue()
    if (this.emitReady) {
      this.emit('change', {
        value,
        labels: this.currentLabels(),
        columnIndex: colIdx,
      } satisfies PickerChangeDetail)
    }
  }

  private handleKeydown = (e: Event): void => {
    if (this.hasAttr('disabled')) return
    const ke = e as KeyboardEvent
    const col = (ke.target as HTMLElement).closest?.('.column') as HTMLElement | null
    if (!col) return
    const colIdx = Number(col.dataset.index ?? '0')
    const cols = this.resolvedColumns()
    const items = cols[colIdx]?.items ?? []
    if (items.length === 0) return
    const cur = this.selectedIdx[colIdx] ?? 0
    let next: number | null = null
    if (ke.key === 'ArrowDown') next = this.nearestEnabled(items, Math.min(cur + 1, items.length - 1), 1)
    else if (ke.key === 'ArrowUp') next = this.nearestEnabled(items, Math.max(cur - 1, 0), -1)
    else if (ke.key === 'Home') next = this.nearestEnabled(items, 0, 1)
    else if (ke.key === 'End') next = this.nearestEnabled(items, items.length - 1, -1)
    if (next == null || next === cur) return
    ke.preventDefault()
    this.scrollToIndex(colIdx, next, true)
    this.paintSelection(colIdx, next)
    this.commit(colIdx, next)
  }

  /** 表单值：JSON 数组字符串（照单值控件「有值才提交」——无列/全空回 null） */
  protected getFormValue(): string | null {
    const values = this.currentValues()
    return values.length > 0 ? JSON.stringify(values) : null
  }

  /** form.reset：回初始 value 基线，不派发事件（与原生一致） */
  protected resetFormValue(): void {
    this.setAttribute('value', this.initialValue)
  }

  /** shadow 内真实聚焦目标：首列滚轮（label for / 校验锚点转发） */
  protected override get innerControl(): HTMLElement | null {
    return this.shadow.querySelector('.column')
  }

  override connectedCallback(): void {
    this.initialValue = this.getAttribute('value') ?? ''
    super.connectedCallback()
  }
}
