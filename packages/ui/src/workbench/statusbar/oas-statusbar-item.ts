import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** status 合法值：语义色档（warning/error 用底色醒目属最后手段，info/progress 只着文字） */
export type StatusbarItemStatus = 'default' | 'info' | 'warning' | 'error' | 'progress'

const VALID_STATUS: readonly StatusbarItemStatus[] = ['default', 'info', 'warning', 'error', 'progress']
const warnedStatuses = new Set<string>()

/** 非法 status 归一化：回落 default 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizeStatus(raw: string): StatusbarItemStatus {
  if ((VALID_STATUS as readonly string[]).includes(raw)) return raw as StatusbarItemStatus
  if (!warnedStatuses.has(raw)) {
    warnedStatuses.add(raw)
    console.warn(
      `[oas-statusbar-item] 非法 status "${raw}"，已回落 default；合法值：default/info/warning/error/progress`,
    )
  }
  return 'default'
}

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  max-width: 100%;
}
/* 全空态：宿主整体不显示（无布局足迹——仅藏内部格子时宿主仍占 flex gap 位，产生幽灵 gap） */
:host([data-empty]) {
  display: none;
}
:host([hidden]) {
  display: none;
}
.item {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  max-width: 100%;
  height: 100%;
  min-height: var(--oas-statusbar-item-height, 22px);
  padding: 0 var(--oas-space-1_5);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1;
  white-space: nowrap;
}
div.item {
  cursor: default;
}
button.item {
  cursor: pointer;
}
button.item:hover {
  background: var(--oas-statusbar-item-hover-bg, var(--oas-color-bg-hover));
  color: var(--oas-color-text-primary);
}
button.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item[hidden] {
  display: none;
}
/* 语义色：warning/error 用底色醒目（状态栏惯例：仅特殊且必要场景慎用）；info/progress 只着文字 */
:host([data-status='info']) .item {
  /* info 文字安全档做 theme-aware 掺向（light 掺主文字压深 / dark 掺近白提亮，自动随主题双向提对比）：
     info-text 本色双底是库内已知存量欠账（ui-spec §1.2），在 elevated 底上感知分压线以下，
     状态栏单元格是真实可达组合，故在消费侧混色达标（--oas-color-text-primary 兼作混色颜料惯例） */
  color: var(--oas-statusbar-info-color, color-mix(in srgb, var(--oas-color-info-text) 88%, var(--oas-color-text-primary)));
}
:host([data-status='warning']) .item {
  background: var(--oas-statusbar-warning-bg, var(--oas-color-warning));
  color: var(--oas-color-text-on-warning);
}
:host([data-status='warning']) button.item:hover {
  background: var(--oas-color-warning-hover, var(--oas-color-warning));
}
:host([data-status='error']) .item {
  background: var(--oas-statusbar-error-bg, var(--oas-color-danger));
  color: var(--oas-color-text-on-danger);
}
:host([data-status='error']) button.item:hover {
  background: var(--oas-color-danger-hover, var(--oas-color-danger));
}
:host([data-status='progress']) .item {
  /* progress 用 primary 文字安全档（primary 本色 on 白底不达 WCAG 4.5，安全档达标） */
  color: var(--oas-statusbar-progress-color, var(--oas-color-primary-text));
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.label[hidden] {
  display: none;
}
/* 数值：表格数字体对齐（时间码/计数/尺寸） */
.value {
  font-variant-numeric: tabular-nums;
  color: var(--oas-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}
:host([data-status='info']) .value,
:host([data-status='progress']) .value,
/* 语义底色档下值文字必须继承 on-warning/on-danger（显式主文字色会压过底色白字，
   实测感知分跌破 <60 硬闸） */
:host([data-status='warning']) .value,
:host([data-status='error']) .value {
  color: inherit;
}
.value[hidden] {
  display: none;
}
.icon {
  display: inline-flex;
  flex-shrink: 0;
}
.icon svg {
  display: block;
}
.icon[hidden] {
  display: none;
}
/* 后台活动旋转指示：reduced-motion 停转（静止图标仍可见） */
.spinner {
  display: inline-flex;
  flex-shrink: 0;
  animation: oas-statusbar-spin 1.2s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-statusbar-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
`

const SPINNER_SVG =
  '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="24 14"/></svg>'

/**
 * oas-statusbar-item —— 状态栏单元格（文本 / 图标 / 数值）。
 *
 * 属性（kebab-case）：
 * - `value`：数值/状态值（表格数字体呈现）
 * - `label`：文本标签
 * - `icon`：内置图标名（@oas-ui/icons 注册表；未知名不渲染）
 * - `button`：布尔，渲染为原生 button（可点、键盘可达）；缺省为只读 div 语义
 * - `status`：`default`（默认）/ `info` / `warning` / `error` / `progress`；非法值回落并告警
 *   （warning/error 为底色醒目——仅特殊且必要场景慎用；info/progress 只着文字色）
 * - `spinning`：布尔，后台活动旋转指示（reduced-motion 停转）
 *
 * 全空态（label/value/icon/spinning 全缺）：宿主打 `data-empty` 反射并整体不显示
 * （无布局足迹，不留 flex gap 位；button 模式不进 Tab 序列）。
 *
 * 事件：`oas-item-click`（detail `{ value, label }`，仅 button 模式；bubbles + composed，
 * 可在 oas-statusbar 容器或宿主上监听）。
 */
export class OASStatusbarItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'label', 'icon', 'button', 'status', 'spinning', 'dir']
  }

  /** item 部件引用（每次 update 从 shadow 刷新——button 模式切换会重建元素，缓存会失效） */
  private itemEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="item" part="item">
        <span class="spinner" part="item-spinner" hidden>${SPINNER_SVG}</span>
        <span class="icon" part="item-icon" hidden></span>
        <span class="label" part="item-label" hidden></span>
        <span class="value" part="item-value" hidden></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；元素重查与监听重绑走 ensureItemElement） */
  private bind(): void {
    this.ensureItemElement()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（item 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="item"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // status 语义档钩子（非法值回落 + 告警在 normalizeStatus 内）
    this.dataset.status = normalizeStatus(this.getAttr('status', 'default'))
    // button 模式：元素语义可能与属性不一致（属性运行时增删）→ 按需重建 + 重绑监听
    this.ensureItemElement()
    if (!this.itemEl) return
    const labelEl = this.shadow.querySelector<HTMLElement>('[part="item-label"]')
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="item-value"]')
    const spinnerEl = this.shadow.querySelector<HTMLElement>('[part="item-spinner"]')
    // 内容同步：label/value 文本 + spinner 显隐
    const label = this.getAttr('label', '')
    const value = this.getAttr('value', '')
    if (labelEl) {
      labelEl.textContent = label
      labelEl.hidden = label === ''
    }
    if (valueEl) {
      valueEl.textContent = value
      valueEl.hidden = value === ''
    }
    if (spinnerEl) spinnerEl.hidden = !this.hasAttr('spinning')
    const iconVisible = this.syncIcon()
    // 全空态：宿主打 data-empty（:host([data-empty]) display:none 整体退场，无布局足迹）+
    // item 同步隐藏（双保险；button 模式下空钮不进 Tab 序列）——回归：曾只藏内部格子，
    // 宿主仍占 flex gap 位产生 4px 幽灵间隔
    const isEmpty = label === '' && value === '' && !iconVisible && !this.hasAttr('spinning')
    this.toggleAttribute('data-empty', isEmpty)
    this.itemEl.hidden = isEmpty
  }

  /**
   * item 部件就位（幂等）：元素形态（div 只读 ↔ button 可点）与 button 属性一致时仅刷新引用；
   * 不一致时重建元素（原生语义切换干净）并重绑点击监听——重建会丢弃旧元素上的监听与子节点，
   * 子节点迁移 + 监听重绑都在这里完成，后续引用一律从 shadow 重查（不缓存跨重建引用）。
   */
  private ensureItemElement(): void {
    const wantButton = this.hasAttr('button')
    const existing = this.shadow.querySelector<HTMLElement>('[part="item"]')
    const isButton = existing?.tagName === 'BUTTON'
    if (existing && wantButton === isButton) {
      if (wantButton) (existing as HTMLButtonElement).type = 'button'
      this.itemEl = existing
      return
    }
    if (!existing) {
      this.itemEl = null
      return
    }
    const next = document.createElement(wantButton ? 'button' : 'div')
    next.setAttribute('part', 'item')
    next.setAttribute('class', 'item')
    if (wantButton) (next as HTMLButtonElement).type = 'button'
    for (const child of [...existing.childNodes]) next.appendChild(child)
    existing.replaceWith(next)
    next.addEventListener('click', () => {
      if (!this.hasAttr('button')) return
      this.emit('item-click', { value: this.getAttr('value', ''), label: this.getAttr('label', '') })
    })
    this.itemEl = next
  }

  /** icon 属性 → 内置图标注册表渲染内联 svg（未知名不渲染，不告警——宿主自选名）；返回图标是否可见 */
  private syncIcon(): boolean {
    const iconEl = this.shadow.querySelector<HTMLElement>('[part="item-icon"]')
    if (!iconEl) return false
    const name = this.getAttr('icon', '')
    iconEl.innerHTML = ''
    if (name === '') {
      iconEl.hidden = true
      return false
    }
    const path = iconPathOf(name)
    if (!path) {
      iconEl.hidden = true
      return false
    }
    iconEl.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`
    iconEl.hidden = false
    return true
  }
}

/** 从内置图标运行时取 path（@oas-ui/icons 图标 opt-in 后统一走 runtime 查询，组件 chrome 图标同一来源） */
import { lookupIcon } from '@oas-ui/icons/runtime'
function iconPathOf(name: string): string | null {
  const path = lookupIcon(name)
  return typeof path === 'string' ? path : null
}
