import { OASElement } from '@oas-ui/core/oas-element'
import { arrowDownPath } from '@oas-ui/icons/icons/arrow-down'
import { arrowUpPath } from '@oas-ui/icons/icons/arrow-up'
import { closePath } from '@oas-ui/icons/icons/close'
import { devWarn } from '../../shared/dev-warn.js'
import { stableHash36 } from '../../shared/stable-id.js'

/**
 * oas-rank —— 排序题（form 族）。
 *
 * 选项按名次选择：点击选项加入排名序列（已选项显示名次徽标），已选项可上移 / 下移 /
 * 取消（再点已选项或按移除按钮）。支持部分排名——值即已选子集的有序 key 数组。
 *
 * 属性（kebab-case）：
 * - `options`：可排序项 JSON 数组 `[{ key, label?, disabled?, description? }]`；字符串项按 `key=label` 收敛
 * - `value`：按名次排序的 key 数组（JSON）
 * - `min-ranks`：下限名次数（正整数）；未达下限时 `validate()` 不通过
 * - `disabled` / `readonly`：批量禁用 / 只读
 * - `label`：题面文本（同时作为分组可访问名称）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：用户加入 / 移除 / 上移 / 下移 / 清空，`detail: { value, key, rank, action }`
 * - `oas-invalid`：`validate()` 未达 `min-ranks`，`detail: { reason: 'min-ranks', min, count, value }`
 *
 * 方法：
 * - `validate()`：校验名次下限并同步可视错误，返回是否通过
 * - `clear()`：清空排名（派发 `oas-change`）
 *
 * a11y：选项为原生 `button`（键盘 Tab + Enter/Space）；上移 / 下移 / 移除是可见按钮
 * （aria-label 带选项名，避免同名按钮不可区分）；名次变化经 `aria-live="polite"` 播报；
 * 名次徽标与间距全部走逻辑属性，RTL 下自动镜像。
 *
 * @summary 排序题（点击 / 键盘按名次选择）
 */

export interface RankOption {
  key: string
  label: string
  disabled?: boolean
  description?: string
}

export type RankAction = 'add' | 'remove' | 'up' | 'down' | 'clear'

const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  devWarn(message)
}

const STYLE = `
:host {
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: inherit;
  /* 名次徽标直径（宿主可覆盖做细调） */
  --oas-rank-badge-size: var(--oas-control-height-sm);
}
:host([hidden]) {
  display: none !important;
}
.rank {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.caption {
  font-weight: 600;
}
.caption[hidden] {
  display: none;
}
.ranked {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}
.ranked[hidden] {
  display: none;
}
.ranked-item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1_5) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-inline-size: var(--oas-rank-badge-size);
  block-size: var(--oas-rank-badge-size);
  border-radius: 50%;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ranked-label {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.ranked-label:hover {
  text-decoration: underline;
}
.ranked-label:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}
.actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--oas-space-1);
}
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  inline-size: var(--oas-control-height-sm);
  block-size: var(--oas-control-height-sm);
  margin: 0;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.action svg {
  inline-size: 14px;
  block-size: 14px;
}
.action:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action:disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.option {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-block-size: var(--oas-control-height-md);
  margin: 0;
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font: inherit;
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.option:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border-strong);
}
.option:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.option:disabled {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.hint {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  font-variant-numeric: tabular-nums;
}
.hint[hidden] {
  display: none;
}
.error {
  color: var(--oas-color-danger-text);
  font-size: var(--oas-font-size-sm);
}
.error[hidden] {
  display: none;
}
.empty {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .option:focus-visible,
  .action:focus-visible,
  .ranked-label:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
  }
}
`

export class OASRank extends OASElement {
  static override get observedAttributes(): string[] {
    return ['options', 'value', 'min-ranks', 'disabled', 'readonly', 'label']
  }

  private rankEl: HTMLElement | null = null
  private captionEl: HTMLElement | null = null
  private rankedEl: HTMLElement | null = null
  private optionsEl: HTMLElement | null = null
  private hintEl: HTMLElement | null = null
  private errorEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private liveEl: HTMLElement | null = null

  /** 选项快照（与已渲染 DOM 对齐） */
  private optionSnapshot: RankOption[] = []
  /** 上次渲染签名（options/value/label 原文），原文未变跳过重建 */
  private renderSignature: string | null = null
  private uid = ''
  /** 当前是否处于可视错误态（用于交互后静默复检） */
  private invalidActive = false

  /** @apiProperty 可排序项列表：JSON 属性与对象数组 property 双通道 */
  get options(): RankOption[] {
    return this.parseOptions(this.getAttribute('options'))
  }

  set options(value: RankOption[] | string) {
    const json = typeof value === 'string' ? value : JSON.stringify(value ?? [])
    if (this.getAttribute('options') === json) return
    this.setAttribute('options', json)
  }

  /**
   * @apiProperty 当前值：按名次排序的 key 数组（部分排名即已选子集有序）；赋值即生效，
   * JSON 字符串运行时容忍，不派发事件。
   */
  get value(): string[] {
    return this.coerceKeys(this.readRawValue())
  }

  set value(value: string[] | string) {
    const next = this.coerceKeys(value)
    const json = JSON.stringify(next)
    if (this.getAttribute('value') !== json) this.setAttribute('value', json)
    else if (this.hasRendered) this.update()
  }

  /** 纯函数骨架：SSR 快照与客户端渲染共用（本组件暂未进 SSR 白名单，保留同构写法） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="rank" part="root" role="group">
        <div class="caption" part="caption" hidden></div>
        <ol class="ranked" part="ranked" hidden></ol>
        <div class="options" part="options"></div>
        <div class="hint" part="hint" hidden></div>
        <div class="error" part="error" role="alert" hidden></div>
        <div class="empty" part="empty" hidden></div>
        <span class="live" part="live" aria-live="polite"></span>
      </div>
    `
  }

  private bind(): void {
    this.rankEl = this.shadow.querySelector('.rank')
    this.captionEl = this.shadow.querySelector('.caption')
    this.rankedEl = this.shadow.querySelector('.ranked')
    this.optionsEl = this.shadow.querySelector('.options')
    this.hintEl = this.shadow.querySelector('.hint')
    this.errorEl = this.shadow.querySelector('.error')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.liveEl = this.shadow.querySelector('.live')
    // 挂在 shadow 内部容器：click 跨界会重定向 target，挂宿主拿不到真实按钮
    this.rankEl?.addEventListener('click', this.onClick)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  protected override update(): void {
    if (!this.rankEl) return
    const label = this.getAttr('label', '').trim()
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-readonly', readonly)
    this.toggleAttribute('data-invalid', this.invalidActive)
    this.rankEl.setAttribute('aria-label', label || this.t('rank.group'))
    this.rankEl.setAttribute('aria-disabled', String(disabled))
    this.captionEl!.hidden = label === ''
    this.captionEl!.textContent = label

    const signature = [this.getAttribute('options') ?? '', this.getAttribute('value') ?? '', label].join('\u0000')
    this.uid = stableHash36(signature)
    if (signature !== this.renderSignature) {
      this.renderSignature = signature
      this.rebuild()
    }
    this.refresh()
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  /** 重建排名区与可选区（options/value/label 变化时） */
  private rebuild(): void {
    const options = this.options
    this.optionSnapshot = options
    const ranked = this.rankedKeys()
    const rankedSet = new Set(ranked)
    const rankedBox = this.rankedEl!
    const optionsBox = this.optionsEl!
    rankedBox.textContent = ''
    optionsBox.textContent = ''
    const empty = options.length === 0
    this.rankedEl!.hidden = empty || ranked.length === 0
    this.emptyEl!.hidden = !empty
    this.emptyEl!.textContent = empty ? this.t('empty.noData') : ''
    if (empty) return

    const byKey = new Map(options.map((option) => [option.key, option]))
    for (let i = 0; i < ranked.length; i++) {
      const key = ranked[i]!
      const option = byKey.get(key)
      if (!option) continue
      const item = document.createElement('li')
      item.className = 'ranked-item'
      item.setAttribute('part', 'ranked-item')
      const badge = document.createElement('span')
      badge.className = 'badge'
      badge.setAttribute('part', 'badge')
      badge.setAttribute('aria-hidden', 'true')
      badge.textContent = String(i + 1)
      const main = document.createElement('button')
      main.className = 'ranked-label'
      main.setAttribute('part', 'ranked-label')
      main.type = 'button'
      main.dataset.key = key
      main.dataset.action = 'remove'
      main.setAttribute('aria-label', this.t('rank.remove', { label: option.label }))
      main.textContent = option.label
      const actions = document.createElement('span')
      actions.className = 'actions'
      actions.setAttribute('part', 'actions')
      actions.appendChild(this.actionButton('up', key, option.label, i === 0, arrowUpPath))
      actions.appendChild(this.actionButton('down', key, option.label, i === ranked.length - 1, arrowDownPath))
      actions.appendChild(this.actionButton('remove', key, option.label, false, closePath))
      item.appendChild(badge)
      item.appendChild(main)
      item.appendChild(actions)
      rankedBox.appendChild(item)
    }

    for (const option of options) {
      if (rankedSet.has(option.key)) continue
      const button = document.createElement('button')
      button.className = 'option'
      button.setAttribute('part', 'option')
      button.type = 'button'
      button.dataset.key = option.key
      button.dataset.action = 'add'
      button.disabled = option.disabled === true
      if (option.description) button.setAttribute('aria-description', option.description)
      button.textContent = option.label
      optionsBox.appendChild(button)
    }
  }

  private actionButton(
    action: 'up' | 'down' | 'remove',
    key: string,
    label: string,
    disabled: boolean,
    path: string,
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = 'action'
    button.setAttribute('part', 'action')
    button.type = 'button'
    button.dataset.key = key
    button.dataset.action = action
    button.disabled = disabled
    const name =
      action === 'up'
        ? this.t('rank.moveUp', { label })
        : action === 'down'
          ? this.t('rank.moveDown', { label })
          : this.t('rank.remove', { label })
    button.setAttribute('aria-label', name)
    button.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${path}</svg>`
    return button
  }

  /** 同步提示 / 错误文案 / 按钮只读态（不重建 DOM） */
  private refresh(): void {
    const min = this.minRankLimit()
    const count = this.rankedKeys().length
    const errorText = this.invalidActive && min !== null ? this.t('rank.minRanks', { min }) : ''
    if (this.hintEl) {
      this.hintEl.hidden = min === null
      this.hintEl.textContent = min === null ? '' : this.t('rank.count', { count, min })
    }
    if (this.errorEl) {
      this.errorEl.id = `oas-rank-${this.uid}-error`
      this.errorEl.textContent = errorText
      this.errorEl.hidden = errorText === ''
    }
    if (this.hintEl) this.hintEl.id = `oas-rank-${this.uid}-hint`
    const readonly = this.hasAttr('readonly')
    const disabled = this.injectDisabled()
    const ranked = this.rankedKeys()
    const describedBy = [
      this.hintEl && !this.hintEl.hidden ? this.hintEl.id : '',
      errorText ? (this.errorEl?.id ?? '') : '',
    ]
      .filter((id) => id !== '')
      .join(' ')
    if (this.rankEl) {
      if (describedBy) this.rankEl.setAttribute('aria-describedby', describedBy)
      else this.rankEl.removeAttribute('aria-describedby')
    }
    for (const button of this.shadow.querySelectorAll<HTMLButtonElement>('button')) {
      const key = button.dataset.key ?? ''
      const action = button.dataset.action ?? ''
      const position = ranked.indexOf(key)
      const boundary = action === 'up' ? position === 0 : action === 'down' ? position === ranked.length - 1 : false
      const option = this.optionSnapshot.find((item) => item.key === key)
      button.disabled = disabled || boundary || (action === 'add' && option?.disabled === true)
      if (readonly) button.setAttribute('aria-disabled', 'true')
      else button.removeAttribute('aria-disabled')
    }
    if (this.rankedEl) this.rankedEl.hidden = ranked.length === 0
  }

  private onClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button')
    if (!button || !this.rankEl?.contains(button)) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    if (button.disabled) return
    const key = button.dataset.key ?? ''
    const action = button.dataset.action ?? ''
    if (key === '') return
    const focused = this.shadow.activeElement as HTMLElement | null
    if (action === 'add') this.addKey(key)
    else if (action === 'remove') this.removeKey(key)
    else if (action === 'up') this.moveKey(key, -1)
    else if (action === 'down') this.moveKey(key, 1)
    // 重建把被点的按钮换成新节点：把焦点交还给语义等价的新按钮（键盘流不中断）
    if (focused && !focused.isConnected) this.restoreFocus(action, key)
  }

  /** 交互后焦点归还：加入 → 新排名项；移出 → 回到可选区；上/下移 → 同方向按钮（越界退让） */
  private restoreFocus(action: string, key: string): void {
    const sequence: string[] =
      action === 'add'
        ? ['remove']
        : action === 'remove'
          ? []
          : action === 'up'
            ? ['up', 'down', 'remove']
            : ['down', 'up', 'remove']
    const target =
      action === 'remove'
        ? this.findButton(key, 'add')
        : (sequence.map((name) => this.findButton(key, name)).find((button) => button !== null && !button.disabled) ??
          null)
    target?.focus()
  }

  private findButton(key: string, action: string): HTMLButtonElement | null {
    for (const button of this.shadow.querySelectorAll<HTMLButtonElement>('button')) {
      if (button.dataset.key === key && button.dataset.action === action) return button
    }
    return null
  }

  private addKey(key: string): void {
    const option = this.optionSnapshot.find((item) => item.key === key)
    if (!option || option.disabled) return
    const ranked = this.rankedKeys()
    if (ranked.includes(key)) return
    this.commit([...ranked, key], 'add', key)
  }

  private removeKey(key: string): void {
    const ranked = this.rankedKeys()
    if (!ranked.includes(key)) return
    this.commit(
      ranked.filter((item) => item !== key),
      'remove',
      key,
    )
  }

  private moveKey(key: string, delta: -1 | 1): void {
    const ranked = this.rankedKeys()
    const index = ranked.indexOf(key)
    const nextIndex = index + delta
    if (index < 0 || nextIndex < 0 || nextIndex >= ranked.length) return
    const next = [...ranked]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item!)
    this.commit(next, delta < 0 ? 'up' : 'down', key)
  }

  private commit(next: string[], action: RankAction, key: string): void {
    const json = JSON.stringify(next)
    if (this.getAttribute('value') !== json) this.setAttribute('value', json)
    this.refresh()
    const label = this.labelOf(key)
    const rank = action === 'remove' ? 0 : next.indexOf(key) + 1
    if (action === 'remove') this.announce(this.t('rank.removed', { label }))
    else this.announce(this.t('rank.selected', { label, rank }))
    this.emit('change', { value: next, key, rank, action })
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  /**
   * 校验名次下限并同步可视错误。
   * @returns 是否通过；未达 `min-ranks` 时派发 `oas-invalid`
   */
  validate(): boolean {
    const info = this.missingInfo()
    this.applyValidation(info, true)
    return info === null
  }

  /** 清空排名（派发 `oas-change`） */
  clear(): void {
    if (this.value.length === 0) return
    if (this.getAttribute('value') !== '[]') this.setAttribute('value', '[]')
    this.refresh()
    this.announce(this.t('rank.cleared'))
    this.emit('change', { value: [], key: '', rank: 0, action: 'clear' })
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  private missingInfo(): { min: number; count: number } | null {
    const min = this.minRankLimit()
    if (min === null) return null
    const count = this.rankedKeys().length
    return count >= min ? null : { min, count }
  }

  private applyValidation(info: { min: number; count: number } | null, emit: boolean): void {
    this.invalidActive = info !== null
    this.toggleAttribute('data-invalid', info !== null)
    this.refresh()
    if (info === null || !emit) return
    this.emit('invalid', { reason: 'min-ranks', min: info.min, count: info.count, value: this.value })
  }

  /** 已选 key（按 value 顺序，过滤未知选项与重复项） */
  private rankedKeys(): string[] {
    const known = new Set(this.optionSnapshot.map((option) => option.key))
    const out: string[] = []
    for (const key of this.value) {
      if (!known.has(key) || out.includes(key)) continue
      out.push(key)
    }
    return out
  }

  private labelOf(key: string): string {
    if (key === '') return ''
    return this.optionSnapshot.find((option) => option.key === key)?.label ?? key
  }

  private announce(text: string): void {
    if (text !== '' && this.liveEl) this.liveEl.textContent = text
  }

  private minRankLimit(): number | null {
    const raw = this.getAttr('min-ranks', '').trim()
    if (raw === '') return null
    const value = Number(raw)
    if (!Number.isInteger(value) || value <= 0) {
      warnOnce(`[oas-rank] 非法 min-ranks "${raw}"，已忽略；应为正整数`)
      return null
    }
    return value
  }

  /** 属性值解析：非法 JSON 视为空（裸 key 容忍只在 property 通道，避免坏属性凭空选中） */
  private readRawValue(): unknown {
    const raw = this.getAttribute('value')
    if (raw === null || raw.trim() === '') return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  /** 值归一：数组 / JSON 字符串 / 裸 key 三形态容错，去重去空 */
  private coerceKeys(input: unknown): string[] {
    let list: unknown[]
    if (Array.isArray(input)) list = input
    else if (typeof input === 'string') {
      const trimmed = input.trim()
      if (trimmed === '') return []
      const parsed = (() => {
        try {
          return JSON.parse(trimmed) as unknown
        } catch {
          return null
        }
      })()
      if (Array.isArray(parsed)) list = parsed
      else return [trimmed]
    } else return []
    const out: string[] = []
    for (const item of list) {
      if (typeof item !== 'string' || item === '' || out.includes(item)) continue
      out.push(item)
    }
    return out
  }

  private parseOptions(raw: string | null): RankOption[] {
    if (raw === null || raw.trim() === '') return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      warnOnce('[oas-rank] 非法 options JSON（应为数组），已忽略')
      return []
    }
    if (!Array.isArray(parsed)) {
      warnOnce('[oas-rank] 非法 options JSON（应为数组），已忽略')
      return []
    }
    const out: RankOption[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      let key = ''
      let label = ''
      let disabled = false
      let description = ''
      if (typeof item === 'string') {
        key = item
        label = item
      } else if (item && typeof item === 'object') {
        const record = item as { key?: unknown; label?: unknown; disabled?: unknown; description?: unknown }
        if (typeof record.key !== 'string') continue
        key = record.key
        label = typeof record.label === 'string' && record.label !== '' ? record.label : record.key
        disabled = record.disabled === true
        description = typeof record.description === 'string' ? record.description : ''
      } else {
        continue
      }
      if (key === '' || seen.has(key)) continue
      seen.add(key)
      out.push({ key, label, disabled, ...(description === '' ? {} : { description }) })
    }
    return out
  }
}
