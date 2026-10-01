import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'
import type { OASSwatch } from './oas-swatch.js'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
[part='group'] {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-2);
}
`

const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * oas-swatch-group —— 色板选择组：把多个 `<oas-swatch>` 组合为一个选值组
 *（内联预设色快选场景：主题色 / tag 色 / 收藏色选择）。
 *
 * 属性（kebab-case）：
 * - `value`：单选为子件 color 值；`multiple` 时逗号分隔多个选中值
 * - `multiple`：多选模式
 * - `disabled`：全组禁用（透传子件）
 * - `aria-label`：组可访问名（缺省 i18n `swatchGroup.group`）
 *
 * 事件：`oas-change`——单选 detail `{ value }`，多选 detail `{ value: string[] }`；
 * 子件 `oas-click` 不外泄（组拦截后派发组级事件）。
 *
 * ARIA：单选 role=radiogroup + 子件 role=radio（aria-checked）；多选 role=group + 子件
 * role=checkbox。键盘：roving tabindex（Tab 单停）+ 方向键漫游焦点（RTL 镜像：ArrowLeft=下一项）
 * + Home/End 首末 + Enter/Space 选中。受控：宿主写 value 子件 selected 跟随；空组/未命中值不报错。
 */
export class OASSwatchGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'multiple', 'disabled', 'aria-label', 'dir']
  }

  private groupEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div part="group"><slot></slot></div>
    `
  }

  private bind(): void {
    this.groupEl = this.shadow.querySelector<HTMLElement>('[part="group"]')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.syncChildren())
    // capture 阶段拦截子件 oas-click：算新 value 并派发组级 oas-change 后 stopPropagation
    this.addEventListener('oas-click', this.handleSwatchClick, true)
    this.addEventListener('keydown', this.handleKeydown)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（组容器存在）后直接接管 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.groupEl?.setAttribute('aria-label', this.getAttr('aria-label', this.t('swatchGroup.group')))
    this.syncChildren()
  }

  /** 子件同步：selected 由组 value 统一驱动（受控）+ 组语义 role/ARIA + 禁用透传 + roving 起点 */
  private syncChildren(): void {
    const disabled = this.hasAttr('disabled') || this.injectDisabled()
    const selected = this.selectedValues
    const multiple = this.hasAttr('multiple')
    this.groupEl?.setAttribute('role', multiple ? 'group' : 'radiogroup')
    for (const sw of this.childrenSwatches) {
      // 组禁用下发走 data-group-disabled（对齐 radio-group/checkbox-group 惯例）：
      // 不写子件自有 disabled——否则组未禁用时 toggleAttribute(false) 会抹掉子件自身写的 disabled
      sw.toggleAttribute('data-group-disabled', disabled)
      // 首帧时序防护：静态 HTML 带 value 时本 update 可能先于子项 upgrade（upgrade 回调按队列
      // 在 group 的 connectedCallback 之后）——未升级子项是白板，调方法即 TypeError（demands 实抓）。
      // 判空跳过并下一微任务重试（upgrade 是 microtask，重试时子项已升级）
      if (typeof sw.syncSelected !== 'function') {
        queueMicrotask(() => this.syncChildren())
        continue
      }
      const color = sw.getAttribute('color')
      const sel = color ? selected.includes(color) : false
      sw.syncSelected(sel)
      sw.setGroupRole(multiple ? 'checkbox' : 'radio')
    }
    this.syncRoving()
  }

  /** 当前选中值：单选 [value]，多选逗号分隔数组 */
  private get selectedValues(): string[] {
    const v = this.getAttr('value', '')
    if (v === '') return []
    return this.hasAttr('multiple')
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [v]
  }

  private get childrenSwatches(): OASSwatch[] {
    return [...this.querySelectorAll<OASSwatch>(':scope > oas-swatch')]
  }

  private get enabledSwatches(): OASSwatch[] {
    // 自身 disabled 或组下发 data-group-disabled 均排除出 roving/交互链
    return this.childrenSwatches.filter((s) => !s.hasAttribute('disabled') && !s.hasAttribute('data-group-disabled'))
  }

  /** roving tabindex：仅当前（选中或首个可用）子件可 Tab 停 */
  private syncRoving(): void {
    const enabled = this.enabledSwatches
    if (!enabled.length) return
    const selected = enabled.find((s) => s.hasAttribute('selected'))
    const current = selected ?? enabled[0]
    for (const sw of enabled) {
      const btn = sw.shadowRoot?.querySelector<HTMLButtonElement>('[part="swatch"]')
      if (btn) btn.tabIndex = sw === current ? 0 : -1
    }
  }

  private handleSwatchClick = (e: Event): void => {
    if (e.target === this) return
    const sw = (e.target as HTMLElement).closest?.('oas-swatch') as OASSwatch | null
    if (!sw || !this.contains(sw)) return
    // 命中组内 swatch 才拦截——组内混入的其他组件事件照常冒泡给宿主
    e.stopPropagation()
    if (this.hasAttr('disabled') || sw.hasAttribute('disabled') || sw.hasAttribute('data-group-disabled')) return
    const color = sw.getAttribute('color')
    if (!color) return
    const current = this.selectedValues
    const multiple = this.hasAttr('multiple')

    if (multiple) {
      const next = current.includes(color) ? current.filter((x) => x !== color) : [...current, color]
      this.setAttribute('value', next.join(','))
      this.emit('change', { value: next })
    } else {
      // 单选不可取消：点击已选中项时保持选中，不派发
      if (current.includes(color)) {
        sw.syncSelected(true)
        return
      }
      this.setAttribute('value', color)
      this.emit('change', { value: color })
    }
    sw.syncSelected(sw.hasAttribute('selected'))
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (this.injectDisabled() || this.hasAttr('disabled')) return
    if (!NAV_KEYS.has(e.key) && e.key !== 'Enter' && e.key !== ' ') return
    const enabled = this.enabledSwatches
    if (!enabled.length) return

    if (e.key === 'Enter' || e.key === ' ') {
      // 焦点在哪就点哪（复用点击全链路）
      const active = this.activeSwatch
      if (active) {
        e.preventDefault()
        active.shadowRoot?.querySelector<HTMLButtonElement>('[part="swatch"]')?.click()
      }
      return
    }

    e.preventDefault()
    const active = this.activeSwatch
    const cur = Math.max(0, active ? enabled.indexOf(active) : 0)
    let next: number | undefined
    if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = enabled.length - 1
    else {
      // RTL：水平方向键视觉镜像（ArrowLeft=下一项，对齐原生 RTL 行为）；上下键不变
      const forward = e.key === 'ArrowDown' || (isRtl(this) ? e.key === 'ArrowLeft' : e.key === 'ArrowRight')
      const backward = e.key === 'ArrowUp' || (isRtl(this) ? e.key === 'ArrowRight' : e.key === 'ArrowLeft')
      const dir = forward ? 1 : backward ? -1 : 0
      if (dir === 0) return
      next = (cur + dir + enabled.length) % enabled.length
    }
    const target = enabled[next]
    if (!target) return
    // 焦点迁移 + roving 标记同步
    const btn = target.shadowRoot?.querySelector<HTMLButtonElement>('[part="swatch"]')
    for (const sw of enabled) {
      const b = sw.shadowRoot?.querySelector<HTMLButtonElement>('[part="swatch"]')
      if (b) b.tabIndex = sw === target ? 0 : -1
    }
    btn?.focus()
  }

  /** 当前焦点所在的 swatch（shadow 内 activeElement 逐级穿透宿主链） */
  private get activeSwatch(): OASSwatch | null {
    let node: Element | null = document.activeElement
    while (node) {
      if (node.localName === 'oas-swatch' && this.contains(node)) return node as OASSwatch
      const root = node.getRootNode?.() as ShadowRoot | Document | undefined
      if (root && 'host' in root && root.host) node = root.host as Element
      else break
    }
    return null
  }
}
