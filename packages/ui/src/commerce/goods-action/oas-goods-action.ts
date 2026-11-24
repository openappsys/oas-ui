import { OASElement } from '@oas-ui/core/oas-element'
import { lookupIcon } from '@oas-ui/icons/runtime'
import { cartPath } from '@oas-ui/icons/icons/cart'
import { heartPath } from '@oas-ui/icons/icons/heart'
import { organizationPath } from '@oas-ui/icons/icons/organization'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-goods-action —— 商品底部导航（commerce 族）。
 *
 * 商品详情的底部操作栏：左侧 icon 按钮组（收藏 / 店铺 / 购物车，可带角标），
 * 右侧主按钮组（加入购物车 / 立即购买等）。数据通过 JSON 属性驱动，逐项可禁用。
 *
 * 属性（kebab-case）：
 * - `items`：JSON 数组——icon 按钮：`[{ key, label?, icon?, badge?, active?, color? }]`
 *   - `key`：事件标识；内置 key（`favorite` / `shop` / `cart`）缺省文案与图标走内置映射
 *   - `label`：可访问名称（缺省取内置 key 文案，再回退 key 本身）
 *   - `icon`：图标名（lookupIcon 查表，自定义注册优先）；缺省按内置 key 取内置图标；
 *     未注册的名字告警一次并回退内置图标
 *   - `badge`：非负整数角标；>0 显示，>99 收敛 `99+`
 *   - `active`：收藏类开关项的按下态（`aria-pressed`）
 *   - `color`：自定义色——预设名走 `--oas-preset-<name>-text` token（magenta/red/volcano/
 *     orange/gold/lime/green/cyan/blue/geekblue/purple），其余按宿主声明的色值透传；
 *     在场时 base / hover / 按下态都钉在该色上（custom 色不被状态色翻掉）
 * - `actions`：JSON 数组——主按钮：`[{ key, text, primary?, disabled?, loading?, type? }]`
 *   - `loading`：加载中——禁用点击 + `aria-busy` + spinner，与 `disabled` 正交（可并存）
 *   - `type`：视觉档位 default / primary / success / warning / danger；缺省按 `primary`
 *     标志（未写 type 时行为与现状一致）
 * - `label`：导航区可访问名称，缺省走 i18n `goodsAction.label`
 * - `disabled`：全局禁用（兼容 config-provider 注入禁用）
 *
 * property 通道：`items` / `actions` 同时是读+写访问器（setter 接受数组或 JSON 字符串并
 * 反射 attribute），供框架把模板静态属性直接写成 property 时走同一份数据入口。
 *
 * 插槽：无。
 * 事件（bubbles + composed）：
 * - `oas-action-click`：任一项点击派发，detail `{ key, source: 'icon' | 'button' }`
 *
 * a11y：`<nav>` + 原生 `<button>`；icon 项 `aria-pressed` 表达开关态（收藏），
 * 角标数值并入可访问名称（读屏可听到数量）；图标 `aria-hidden`。
 * 布局走逻辑属性（RTL 安全）；颜色全走 token。
 */

export interface GoodsActionItem {
  key: string
  label?: string
  icon?: string
  badge?: number
  active?: boolean
  /** 自定义色：预设名（magenta/red/…）走 `--oas-preset-<name>-text` token，其余按宿主声明透传 */
  color?: string
}

export type GoodsActionButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger'

export interface GoodsActionButton {
  key: string
  text?: string
  primary?: boolean
  disabled?: boolean
  /** 加载中：禁用点击 + `aria-busy` + spinner（与 disabled 正交，可并存） */
  loading?: boolean
  /** 视觉档位：default（默认）/ primary / success / warning / danger；缺省按 primary 标志 */
  type?: GoodsActionButtonType
}

export interface GoodsActionDetail {
  key: string
  source: 'icon' | 'button'
}

/** 内置 key → i18n 文案 key */
const DEFAULT_LABEL_KEYS: Record<string, string> = {
  favorite: 'goodsAction.favorite',
  shop: 'goodsAction.shop',
  cart: 'goodsAction.cart',
}

/** 内置 key → 内置图标 path（精确导入，不拉全量注册表） */
const DEFAULT_ICONS: Record<string, string> = {
  favorite: heartPath,
  shop: organizationPath,
  cart: cartPath,
}

const MAX_BADGE = 99

/** 主按钮视觉档位（type 字段合法值） */
const BUTTON_TYPES: readonly string[] = ['default', 'primary', 'success', 'warning', 'danger']

/** 预设色名 → `--oas-preset-<name>-text` token（与弹幕预设同表；其余色值按宿主声明透传） */
const PRESET_NAMES = new Set([
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
])

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: stretch;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  padding: var(--oas-space-2) var(--oas-space-3);
  padding-block-end: max(var(--oas-space-2), env(safe-area-inset-bottom, 0px));
  background: var(--oas-color-bg);
  border-block-start: 1px solid var(--oas-color-border);
}
.icons {
  display: flex;
  align-items: stretch;
  gap: var(--oas-space-1);
  flex: none;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  flex: 1 1 auto;
  min-width: 0;
}
.icon-button {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  min-width: 56px;
  min-height: var(--oas-control-height-xl, 48px);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  cursor: pointer;
  transition:
    color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.icon-button:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.icon-button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.icon-button[data-active='true'] {
  color: var(--oas-color-primary-text);
}
/* 自定义色项：base / hover / 按下态都钉在宿主声明的色上（缺省回退与无色项一致） */
.icon-button[data-color='true'] {
  color: var(--oas-goods-action-item-color, var(--oas-color-text-secondary));
}
.icon-button[data-color='true']:hover:not(:disabled) {
  color: var(--oas-goods-action-item-color, var(--oas-color-text-primary));
}
.icon-button[data-color='true'][data-active='true'] {
  color: var(--oas-goods-action-item-color, var(--oas-color-primary-text));
}
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xl);
  line-height: 1;
}
.icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.icon-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 50%;
  margin-inline-start: var(--oas-space-2);
  min-width: 16px;
  padding: 0 var(--oas-space-1);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-danger);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  pointer-events: none;
}
.badge[hidden] {
  display: none;
}
.button {
  /* inline-flex：spinner（inline span）的 1em 尺寸只在 flex 布局下生效——
     否则 loading 态渲染成 4px 竖线 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--oas-control-height-lg, 40px);
  padding: 0 var(--oas-space-2);
  /* 极窄宿主（如 ≤90px 双 loading 按钮）下 spinner flex:none 不可收缩，
     内容会画出边框——盒内裁剪兜底（长文本省略由 .button-text 自身的
     overflow + ellipsis 承担，不回退） */
  overflow: hidden;
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-primary-text);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.button:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.button[data-primary='true'],
.button[data-type='primary'] {
  border-color: var(--oas-color-primary);
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.button[data-primary='true']:hover:not(:disabled),
.button[data-type='primary']:hover:not(:disabled) {
  background: var(--oas-color-primary-hover);
}
.button[data-primary='true']:active:not(:disabled),
.button[data-type='primary']:active:not(:disabled) {
  background: var(--oas-color-primary-active);
}
/* 语义档位（success / warning / danger）：实底 + hover 沿「增大文字对比」方向走。
   color-mix 百分比 = 主色占比：占比越低掺 text-primary 越多——light（text-primary 近黑）
   即压深，dark（text-primary 近白）即提亮，两档主题都朝对比增大方向收敛。
   light 白字基线：success 80% → 4.58 / warning 78% → 4.60（原色底仅 3.30 / 3.19，
   hover 曾误写 85% 朝提亮方向走、对比跌回 ≈4.1，已改回压深档 success 76% → 4.90 /
   warning 74% → 4.93）；文字走专用 on-<tone> token 达 WCAG AA。
   danger 原色即达标（4.83），hover 85% 掺深续增（light 6.0） */
.button[data-type='success'] {
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, var(--oas-color-text-primary));
  background: color-mix(in srgb, var(--oas-color-success) 80%, var(--oas-color-text-primary));
  color: var(--oas-color-text-on-success);
}
.button[data-type='success']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--oas-color-success) 76%, var(--oas-color-text-primary));
}
.button[data-type='warning'] {
  border-color: color-mix(in srgb, var(--oas-color-warning) 78%, var(--oas-color-text-primary));
  background: color-mix(in srgb, var(--oas-color-warning) 78%, var(--oas-color-text-primary));
  color: var(--oas-color-text-on-warning);
}
.button[data-type='warning']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--oas-color-warning) 74%, var(--oas-color-text-primary));
}
.button[data-type='danger'] {
  border-color: var(--oas-color-danger);
  background: var(--oas-color-danger);
  color: var(--oas-color-bg);
}
.button[data-type='danger']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--oas-color-danger) 85%, var(--oas-color-text-primary));
}
.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.button[hidden] {
  display: none;
}
/* 按钮内 spinner（loading 态）：文字不丢，旋转图形 aria-hidden */
.button-spinner {
  width: 1em;
  height: 1em;
  flex: none;
  border: 2px solid currentColor;
  border-inline-start-color: transparent;
  border-radius: 50%;
  animation: oas-goods-action-spin 0.8s linear infinite;
}
.button-spinner[hidden] {
  display: none;
}
@keyframes oas-goods-action-spin {
  to {
    transform: rotate(1turn);
  }
}
.button-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .button-spinner {
    animation-duration: 2.4s;
  }
}

@media (pointer: coarse) {
  .icon-button,
  .button {
    min-height: var(--oas-touch-target-min, 44px);
  }
}

@media (forced-colors: active) {
  .icon-button:focus-visible,
  .button:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

export class OASGoodsAction extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'actions', 'label', 'disabled']
  }

  private navEl: HTMLElement | null = null
  private iconsEl: HTMLElement | null = null
  private actionsEl: HTMLElement | null = null
  /** 未注册图标名的 dev 告警去重（实例级；同一名字只报一次） */
  private warnedIcons = new Set<string>()

  // -------------------------------------------------------------------------
  // property 通道（框架把模板静态属性写成 property 时的数据入口）
  // -------------------------------------------------------------------------

  /** icon 按钮组（读=解析后的条目；写=接受数组或 JSON 字符串，反射 `items` attribute） */
  get items(): GoodsActionItem[] {
    return this.parseItems()
  }
  set items(value: GoodsActionItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 主按钮组（读=解析后的条目；写=接受数组或 JSON 字符串，反射 `actions` attribute） */
  get actions(): GoodsActionButton[] {
    return this.parseActions()
  }
  set actions(value: GoodsActionButton[] | string) {
    this.setAttribute('actions', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <nav class="bar" part="bar">
        <div class="icons" part="icons"></div>
        <div class="actions" part="actions"></div>
      </nav>
    `
  }

  private bind(): void {
    this.navEl = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    this.iconsEl = this.shadow.querySelector<HTMLElement>('[part="icons"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.navEl?.addEventListener('click', this.onClick)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  /** 事件委托：重建子节点后无需重新绑定，按 data-key/data-source 上行识别 */
  private onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null
    const trigger = target?.closest<HTMLElement>('[data-key]')
    if (!trigger || (trigger as HTMLButtonElement).disabled) return
    const key = trigger.getAttribute('data-key')
    const source = trigger.getAttribute('data-source')
    if (!key || (source !== 'icon' && source !== 'button')) return
    this.emit('action-click', { key, source } satisfies GoodsActionDetail)
  }

  /** 解析 items（非法 JSON 告警一次并回落空数组） */
  private parseItems(): GoodsActionItem[] {
    return parseJsonArray<GoodsActionItem>(this.getAttr('items'), () =>
      devWarn('[oas-goods-action] items 不是合法 JSON 数组，已忽略'),
    ).filter((it): it is GoodsActionItem => typeof it?.key === 'string' && it.key !== '')
  }

  private parseActions(): GoodsActionButton[] {
    return parseJsonArray<GoodsActionButton>(this.getAttr('actions'), () =>
      devWarn('[oas-goods-action] actions 不是合法 JSON 数组，已忽略'),
    ).filter((it): it is GoodsActionButton => typeof it?.key === 'string' && it.key !== '')
  }

  protected override update(): void {
    const nav = this.navEl
    if (!nav) return
    nav.setAttribute('aria-label', this.getAttr('label') || this.t('goodsAction.label'))

    const disabled = this.hasAttr('disabled') || this.injectDisabled()
    const items = this.parseItems()
    const actions = this.parseActions()

    if (this.iconsEl) {
      this.iconsEl.replaceChildren(...items.map((item) => this.renderIconButton(item, disabled)))
    }
    if (this.actionsEl) {
      this.actionsEl.replaceChildren(...actions.map((action) => this.renderActionButton(action, disabled)))
    }
  }

  private renderIconButton(item: GoodsActionItem, disabled: boolean): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon-button'
    btn.setAttribute('part', 'icon-button')
    btn.setAttribute('data-key', item.key)
    btn.setAttribute('data-source', 'icon')
    btn.disabled = disabled
    const active = item.active === true
    btn.setAttribute('aria-pressed', String(active))
    if (active) btn.setAttribute('data-active', 'true')

    const color = typeof item.color === 'string' && item.color.trim() !== '' ? item.color.trim() : ''
    btn.setAttribute('data-color', String(color !== ''))
    if (color !== '') {
      btn.style.setProperty('--oas-goods-action-item-color', resolveItemColor(color))
    } else {
      btn.style.removeProperty('--oas-goods-action-item-color')
    }

    const badge = this.normalizeBadge(item.badge)
    const defaultKey = DEFAULT_LABEL_KEYS[item.key]
    const label = item.label || (defaultKey ? this.t(defaultKey) : item.key)
    btn.setAttribute('aria-label', badge > 0 ? `${label} ${badge}` : label)

    const iconPath = this.resolveIconPath(item)
    if (iconPath) {
      const icon = document.createElement('span')
      icon.className = 'icon'
      icon.setAttribute('part', 'icon')
      icon.setAttribute('aria-hidden', 'true')
      icon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconPath}</svg>`
      btn.appendChild(icon)
    }

    const text = document.createElement('span')
    text.className = 'icon-label'
    text.setAttribute('part', 'label')
    text.textContent = label
    btn.appendChild(text)

    const badgeEl = document.createElement('span')
    badgeEl.className = 'badge'
    badgeEl.setAttribute('part', 'badge')
    badgeEl.setAttribute('aria-hidden', 'true')
    badgeEl.hidden = badge <= 0
    badgeEl.textContent = badge > MAX_BADGE ? `${MAX_BADGE}+` : String(badge)
    btn.appendChild(badgeEl)
    return btn
  }

  private renderActionButton(action: GoodsActionButton, hostDisabled: boolean): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'button'
    btn.setAttribute('part', 'button')
    btn.setAttribute('data-key', action.key)
    btn.setAttribute('data-source', 'button')
    // data-primary 是旧 primary 标志的反映通道：仅当未显式写 type 时生效——
    // 显式 type:'default' 时 primary 标志不得再翻转视觉（type 优先），CSS 由 data-type 接管
    const explicitType = typeof action.type === 'string' && BUTTON_TYPES.includes(action.type)
    btn.setAttribute('data-primary', String(!explicitType && action.primary === true))
    btn.setAttribute('data-type', resolveButtonType(action))
    const loading = action.loading === true
    btn.disabled = hostDisabled || action.disabled === true || loading
    if (loading) {
      btn.setAttribute('aria-busy', 'true')
      btn.setAttribute('data-loading', 'true')
    } else {
      btn.removeAttribute('aria-busy')
      btn.removeAttribute('data-loading')
    }
    const text = (action.text ?? '').trim() || action.key
    const label = document.createElement('span')
    label.className = 'button-text'
    label.setAttribute('part', 'button-text')
    label.textContent = text
    const spinner = document.createElement('span')
    spinner.className = 'button-spinner'
    spinner.setAttribute('part', 'button-spinner')
    spinner.setAttribute('aria-hidden', 'true')
    spinner.hidden = !loading
    btn.append(spinner, label)
    btn.setAttribute('aria-label', text)
    return btn
  }

  private normalizeBadge(raw: unknown): number {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0
    return Math.floor(n)
  }

  /**
   * 图标 path 解析：`icon` 命中注册表则用之；未注册时告警一次并回退该 key 的内置图标
   * （无内置图标则不渲染图标，文字仍可读——不因一个错名把整项画坏）。
   */
  private resolveIconPath(item: GoodsActionItem): string | undefined {
    const fallback = DEFAULT_ICONS[item.key]
    if (!item.icon) return fallback
    const found = lookupIcon(item.icon)
    if (found) return found
    if (!this.warnedIcons.has(item.icon)) {
      this.warnedIcons.add(item.icon)
      devWarn(`[oas-goods-action] 图标 "${item.icon}" 未注册，已回退内置图标（自定义图标需先 registerIcon）`)
    }
    return fallback
  }
}

/** 主按钮视觉档位：显式 type 合法值优先；否则按 primary 标志；非法 type 回落 default */
function resolveButtonType(action: GoodsActionButton): GoodsActionButtonType {
  if (typeof action.type === 'string' && BUTTON_TYPES.includes(action.type)) {
    return action.type as GoodsActionButtonType
  }
  return action.primary === true ? 'primary' : 'default'
}

/** 预设名取 -text 安全档，其余按宿主声明色值直接注入 */
function resolveItemColor(raw: string): string {
  return PRESET_NAMES.has(raw) ? `var(--oas-preset-${raw}-text)` : raw
}
