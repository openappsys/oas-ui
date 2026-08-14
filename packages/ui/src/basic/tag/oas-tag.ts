import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type TagType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type TagSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'
/** variant 形态维度（正交 type 语义色）：outlined 描边 / filled 浅底 / solid 实心 */
export type TagVariant = 'outlined' | 'filled' | 'solid'
/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；非法名按普通色值处理） */
export type TagPresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const PRESET_COLORS: readonly TagPresetColor[] = [
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
]

const VALID_TAG_SIZES: readonly TagSize[] = ['xs', 'small', 'medium', 'large', 'xl']
const VALID_TAG_VARIANTS: readonly TagVariant[] = ['outlined', 'filled', 'solid']
const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeTagSize(raw: string): TagSize {
  if ((VALID_TAG_SIZES as readonly string[]).includes(raw)) return raw as TagSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-tag] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([clickable]:focus-visible) .tag,
:host([checkable]:focus-visible) .tag {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
  /* href 形态渲染为 <a>，去掉原生下划线 */
  text-decoration: none;
}
/* ===== 类型语义色解析 =====
   --tag-color：类型本色（filled / 缺省浅底渲染用）
   --tag-color-deep：深一档（solid / outlined / checked 用，白底对比度达标）
   color 属性经 --oas-tag-color 覆盖类型色（优先级最高，见下方 variant/checked 规则） */
.tag.primary {
  --tag-color: var(--oas-color-primary);
  --tag-color-deep: var(--oas-color-primary);
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.tag.success {
  --tag-color: var(--oas-color-success);
  --tag-color-deep: color-mix(in srgb, var(--oas-color-success) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
  color: var(--oas-color-success);
}
.tag.warning {
  --tag-color: var(--oas-color-warning);
  --tag-color-deep: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-warning) 12%, transparent);
  color: var(--oas-color-warning);
}
.tag.danger {
  --tag-color: var(--oas-color-danger);
  --tag-color-deep: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  color: var(--oas-color-danger);
}
.tag.info {
  --tag-color: var(--oas-color-primary);
  --tag-color-deep: var(--oas-color-primary-active);
  border-color: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-active);
}
.tag.round {
  border-radius: var(--oas-control-height-sm);
}
.tag.small {
  height: var(--oas-control-height-xs);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
}
/* xs 展示档：16px 高，比 small 更紧凑 */
.tag.xs {
  height: 16px;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
}
.tag.large {
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-md);
  padding: 0 var(--oas-space-3);
}
.tag.xl {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-4);
}
.tag.chip {
  border-radius: 999px;
  padding-inline: var(--oas-space-1);
}
.tag.clickable {
  cursor: pointer;
}
.tag.clickable:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
/* 实心 primary tag hover：保持白字，只加深底色，避免蓝底蓝字不可读 */
.tag.primary.clickable:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
  color: var(--oas-color-text-on-primary);
}
/* ===== variant 形态（显式 variant 对所有 type 统一生效；color 经 --oas-tag-color 覆盖类型色） ===== */
.tag.filled {
  background: color-mix(in srgb, var(--oas-tag-color, var(--tag-color, var(--oas-color-text-primary))) 12%, transparent);
  border-color: color-mix(in srgb, var(--oas-tag-color, var(--tag-color, var(--oas-color-text-primary))) 40%, transparent);
  color: var(--oas-tag-color-deep, var(--tag-color, var(--oas-color-text-primary)));
}
.tag.outlined {
  background: transparent;
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
}
.tag.solid {
  background: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  color: var(--oas-color-text-on-primary);
}
/* 形态标签 hover 保持自身语义色（覆盖 clickable 的 primary hover），实心/选中加深 */
.tag.clickable.outlined:hover {
  background: color-mix(in srgb, var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary))) 8%, transparent);
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
}
.tag.clickable.filled:hover {
  background: color-mix(in srgb, var(--oas-tag-color, var(--tag-color, var(--oas-color-text-primary))) 18%, transparent);
  border-color: color-mix(in srgb, var(--oas-tag-color, var(--tag-color, var(--oas-color-text-primary))) 40%, transparent);
  color: var(--oas-tag-color-deep, var(--tag-color, var(--oas-color-text-primary)));
}
.tag.clickable.solid:hover {
  background: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-text-primary)));
  color: var(--oas-color-text-on-primary);
  filter: brightness(0.94);
}
/* ===== checkable 可选中：选中态实心填充（default 用 primary 底），hover 加深（与按钮方向一致） ===== */
.tag.checkable {
  cursor: pointer;
}
.tag.checked {
  background: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-primary)));
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-primary)));
  color: var(--oas-color-text-on-primary);
}
.tag.checked:hover {
  filter: brightness(0.94);
}
.tag.clickable.checked:hover {
  background: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-primary)));
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-primary)));
  color: var(--oas-color-text-on-primary);
  filter: brightness(0.94);
}
.tag.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tag.disabled.clickable:hover {
  border-color: var(--oas-color-border);
  color: inherit;
}
.tag.disabled.checked:hover {
  filter: none;
}
/* 文字容器：inline-flex 让插槽图标/文字横向排列居中——宿主页面常见全局 reset
   （img/svg{display:block}）把插槽 svg 变 block 也只是 flex item 横排，打不中布局；
   min-width:0 允许在 flex 中收缩；truncate/multiline 切回 block（省略/换行需要块流） */
.tag .content {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}
.tag .content.truncate,
.tag.multiline .content {
  display: block;
}
.tag .content.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* ===== dot 状态点：文字前小圆点，颜色跟随 type/color(--oas-tag-color)；processing 带脉冲 ===== */
.tag .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oas-tag-color, var(--tag-color, var(--oas-color-text-secondary)));
  flex-shrink: 0;
}
.tag .dot[hidden] {
  display: none;
}
.tag.processing .dot {
  animation: oas-tag-pulse 1.4s var(--oas-ease-in-out) infinite;
}
@keyframes oas-tag-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.65);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tag.processing .dot {
    animation: none;
  }
}
/* ===== hit 加重描边：全不透明语义色边框（color 时取 --oas-tag-color） ===== */
.tag.hit {
  border-color: var(--oas-tag-color, var(--tag-color-deep, var(--oas-color-primary)));
}
/* ===== strong 加粗 ===== */
.tag.strong {
  font-weight: 600;
}
/* ===== multiline 多行：height auto + 上下 padding 补偿；与 max-width 省略互斥时 multiline 优先（update 层保证） ===== */
.tag.multiline {
  height: auto;
  padding-block: var(--oas-space-1);
}
.tag.multiline .content {
  white-space: normal;
  line-height: 1.5;
}
/* multiline 各档位最小高度对齐单行档位，避免换行后标签塌陷 */
.tag.multiline.xs {
  min-height: 16px;
}
.tag.multiline.small {
  min-height: var(--oas-control-height-xs);
}
.tag.multiline.medium {
  min-height: var(--oas-control-height-sm);
}
.tag.multiline.large {
  min-height: var(--oas-control-height-md);
}
.tag.multiline.xl {
  min-height: var(--oas-control-height-lg);
}
/* ===== avatar / img 头像适配：高度随 tag 档位、圆形、负 margin 贴左缘。
   尺寸定义在 :host（slotted 元素的 var 解析走 light DOM 祖先链，.tag 内定义不可见）。
   !important 压过 avatar host 的 inline width/height。 ===== */
:host([size='xs']) {
  --oas-tag-avatar-size: 12px;
}
:host([size='small']) {
  --oas-tag-avatar-size: calc(var(--oas-control-height-xs) - 4px);
}
:host([size='large']) {
  --oas-tag-avatar-size: calc(var(--oas-control-height-md) - 4px);
}
:host([size='xl']) {
  --oas-tag-avatar-size: calc(var(--oas-control-height-lg) - 4px);
}
::slotted(oas-avatar),
::slotted(img) {
  width: var(--oas-tag-avatar-size, calc(var(--oas-control-height-sm) - 4px)) !important;
  height: var(--oas-tag-avatar-size, calc(var(--oas-control-height-sm) - 4px)) !important;
  margin-inline-start: calc(-1 * var(--oas-space-2));
  border-radius: 50% !important;
  object-fit: cover;
  flex-shrink: 0;
}
:host([chip]) ::slotted(oas-avatar),
:host([chip]) ::slotted(img) {
  margin-inline-start: calc(-1 * var(--oas-space-1));
}
/* 图标容器：icon 属性渲染 <oas-icon>，尺寸跟随字号 */
.tag .icon {
  display: inline-flex;
  align-items: center;
}
.tag .icon[hidden] {
  display: none;
}
.tag button {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  display: inline-flex;
  align-items: center;
  font-size: 1em;
}
.tag button[hidden] {
  display: none;
}
.tag button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.tag button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: 50%;
}
`

export class OASTag extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'size',
      'closable',
      'round',
      'chip',
      'clickable',
      'disabled',
      'checkable',
      'checked',
      'variant',
      'color',
      'icon',
      'href',
      'target',
      'max-width',
      'dot',
      'processing',
      'hit',
      'strong',
      'multiline',
    ]
  }

  private tagRoot: HTMLElement | null = null

  /** href 属性存在时渲染 <a>（链接形态），否则 <span> */
  private isLink(): boolean {
    return this.getAttr('href', '') !== ''
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const href = this.getAttr('href', '')
    const target = this.getAttr('target', '')
    const tag = href ? 'a' : 'span'
    const hrefAttr = href ? ` href="${href}"${target ? ` target="${target}"` : ''}` : ''
    return `
      <style>${STYLE}</style>
      <${tag} class="tag" part="tag"${hrefAttr}>
        <span class="dot" part="dot" aria-hidden="true" hidden></span>
        <span class="icon" part="icon" aria-hidden="true" hidden></span>
        <span class="content"><slot></slot></span>
        <button part="close" aria-label="" hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </${tag}>
    `
  }

  /** 关闭流程：派发 oas-close（cancelable），preventDefault 可阻止移除；disabled / checkable（与 closable 互斥）不可关 */
  private closeTag(): void {
    if (this.hasAttr('disabled') || this.hasAttr('checkable')) return
    const event = new CustomEvent('oas-close', {
      bubbles: true,
      composed: true,
      cancelable: true,
    })
    const notPrevented = this.dispatchEvent(event)
    if (notPrevented) this.remove()
  }

  /** checkable 切换：toggleAttribute 后派发 oas-change（detail 含新 checked 态） */
  private toggleChecked(): void {
    const next = !this.hasAttr('checked')
    this.toggleAttribute('checked', next)
    this.emit('change', { checked: next })
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；事件绑定幂等性由 rendered 标志保证只走一次） */
  private bind(): void {
    this.tagRoot = this.shadow.querySelector<HTMLElement>('.tag')
    this.shadow.querySelector('button')?.addEventListener('click', (e: MouseEvent) => {
      // 关闭按钮事件自带处理，不再向上触发整签 oas-click；preventDefault 防止 a 形态下的原生跳转
      e.stopPropagation()
      e.preventDefault()
      this.closeTag()
    })
    // 整签交互：checkable 优先（切换选中），否则 clickable（派发 oas-click）；disabled 全部拦截
    this.addEventListener('click', (e: Event) => {
      if (this.hasAttr('disabled')) {
        // 链接形态禁用：拦截原生跳转
        if (this.isLink()) e.preventDefault()
        return
      }
      const btn = this.tagRoot?.querySelector('button')
      if (btn && e.composedPath().includes(btn)) return
      if (this.hasAttr('checkable')) {
        this.toggleChecked()
        return
      }
      if (!this.hasAttr('clickable')) return
      this.emit('click', { originalEvent: e })
    })
    this.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      if (this.hasAttr('disabled')) return
      if (this.hasAttr('checkable')) {
        if (k.key !== 'Enter' && k.key !== ' ') return
        const btn = this.tagRoot?.querySelector('button')
        if (btn && k.composedPath().includes(btn)) return
        k.preventDefault()
        this.toggleChecked()
        return
      }
      // a11y：closable 且焦点在标签上时，Backspace/Delete 走与点 × 相同的关闭流程
      if (this.hasAttr('closable') && (k.key === 'Backspace' || k.key === 'Delete')) {
        k.preventDefault()
        this.closeTag()
        return
      }
      if (!this.hasAttr('clickable') || this.isLink()) return
      if (k.key !== 'Enter' && k.key !== ' ') return
      const btn = this.tagRoot?.querySelector('button')
      if (btn && k.composedPath().includes(btn)) return
      k.preventDefault()
      this.emit('click', { originalEvent: k })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 .tag 存在，span/a 两种形态共用 class）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tag')) return false
    this.bind()
    return true
  }

  /** href/target 增删会改变内部元素类型（span ↔ a），需重建 shadow；其余属性走 update() */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if ((name === 'href' || name === 'target') && this.hasRendered) {
      this.shadow.innerHTML = this.template()
      this.bind()
      this.update()
      return
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  protected override update(): void {
    if (!this.tagRoot) return
    const type = this.getAttr('type', 'default') as TagType
    // size 就近读取 config-provider 注入值（自身属性 > config-provider > medium）
    const size = normalizeTagSize(this.injectValue('size', 'medium') as TagSize)
    const closable = this.hasAttr('closable')
    const round = this.hasAttr('round')
    const chip = this.hasAttr('chip')
    const clickable = this.hasAttr('clickable')
    const checkable = this.hasAttr('checkable')
    const checked = this.hasAttr('checked')
    const disabled = this.hasAttr('disabled')
    const color = this.getAttr('color', '')
    const link = this.isLink()
    // variant 形态维度：显式合法值生效；color 存在且未显式 variant 时按 filled 渲染（color 覆盖 type）
    const rawVariant = this.getAttr('variant', '')
    let variant = ''
    if ((VALID_TAG_VARIANTS as readonly string[]).includes(rawVariant))
      variant = rawVariant as TagVariant
    else if (color) variant = 'filled'

    const dot = this.hasAttr('dot')
    const processing = this.hasAttr('processing')
    const hit = this.hasAttr('hit')
    const strong = this.hasAttr('strong')
    const multiline = this.hasAttr('multiline')

    this.tagRoot.className = [
      'tag',
      type,
      size,
      round ? 'round' : '',
      chip ? 'chip' : '',
      clickable ? 'clickable' : '',
      checkable ? 'checkable' : '',
      checkable && checked ? 'checked' : '',
      variant ? variant : '',
      disabled ? 'disabled' : '',
      hit ? 'hit' : '',
      strong ? 'strong' : '',
      multiline ? 'multiline' : '',
      processing ? 'processing' : '',
    ]
      .filter(Boolean)
      .join(' ')

    // color 自定义色：预设名解析到 --oas-preset-* token；非法名按普通 CSS 色值注入。
    // 注入到 .tag 内联 style（--oas-tag-color 本色；filled 文字用深色变体）
    if (color) {
      const isPreset = (PRESET_COLORS as readonly string[]).includes(color)
      const base = isPreset ? `var(--oas-preset-${color})` : color
      this.tagRoot.style.setProperty('--oas-tag-color', base)
      this.tagRoot.style.setProperty(
        '--oas-tag-color-deep',
        `color-mix(in srgb, ${base} 80%, black)`,
      )
    } else {
      this.tagRoot.style.removeProperty('--oas-tag-color')
      this.tagRoot.style.removeProperty('--oas-tag-color-deep')
    }

    // ARIA：clickable/checkable 整签承担按钮角色；href 链接形态保持原生链接语义（不加 role=button）
    const interactive = (clickable || checkable) && !link
    if (interactive) {
      this.setAttribute('role', 'button')
      if (disabled) this.removeAttribute('tabindex')
      else this.setAttribute('tabindex', '0')
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
      this.removeAttribute('aria-disabled')
    }
    // checkable 时 aria-pressed 与 checked 同步；非 checkable 不残留
    if (checkable) this.setAttribute('aria-pressed', checked ? 'true' : 'false')
    else this.removeAttribute('aria-pressed')
    // 链接形态禁用：a 无原生 disabled，aria-disabled 承载语义
    if (link) this.tagRoot.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    else this.tagRoot.removeAttribute('aria-disabled')

    const btn = this.tagRoot.querySelector('button')
    if (btn) {
      // checkable 与 closable 互斥：checkable 时隐藏关闭按钮（closable 失效）
      btn.hidden = !closable || checkable
      // disabled 不可关：原生 disabled 阻断点击与聚焦
      btn.disabled = disabled
      // 关闭按钮内置文案走 locale registry（setLocale 切换自动刷新）
      btn.setAttribute('aria-label', this.t('tag.close'))
    }

    // dot / processing 状态点：processing 隐含 dot（无需显式 dot 属性）
    const dotEl = this.tagRoot.querySelector<HTMLElement>('.dot')
    if (dotEl) dotEl.hidden = !(dot || processing)

    // max-width 约束内容宽度：默认超长省略（truncate）；
    // 与 multiline 同设时不省略，但 max-width 仍约束盒宽让换行真实发生
    const content = this.tagRoot.querySelector<HTMLElement>('.content')
    const maxWidth = this.getAttr('max-width', '')
    if (content) {
      content.classList.toggle('truncate', !!maxWidth && !multiline)
      content.style.maxWidth = maxWidth
    }

    // icon 属性：默认插槽前渲染 <oas-icon>（复用图标集，尺寸跟随字号）；非法名隐藏
    const iconEl = this.tagRoot.querySelector<HTMLElement>('.icon')
    const icon = this.getAttr('icon', '')
    if (iconEl) {
      const valid = icon !== '' && iconRegistry[icon as IconName] !== undefined
      iconEl.hidden = !valid
      if (valid) {
        if (iconEl.dataset.icon !== icon) {
          iconEl.innerHTML = `<oas-icon name="${icon}"></oas-icon>`
          iconEl.dataset.icon = icon
        }
      } else {
        iconEl.innerHTML = ''
        delete iconEl.dataset.icon
      }
    }
  }
}
