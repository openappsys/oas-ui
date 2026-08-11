import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'text'
export type ButtonSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_BUTTON_SIZES: readonly ButtonSize[] = ['xs', 'small', 'medium', 'large', 'xl']

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeButtonSize(raw: string): ButtonSize {
  if ((VALID_BUTTON_SIZES as readonly string[]).includes(raw)) return raw as ButtonSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-button] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

const warnedSizes = new Set<string>()

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([block]) {
  display: block;
  width: 100%;
}
:host([block]) button {
  width: 100%;
}
button {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  /* button-group 通过自定义属性合并相邻圆角/拉满宽度（::slotted 后不支持链 ::part，故走变量穿透） */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  width: var(--oas-button-group-width, auto);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
}
button:hover {
  background: var(--oas-color-bg-hover);
}
/* 图标按钮：图标与文字间距走 --oas-space-2 */
button.has-icon {
  gap: var(--oas-space-2);
}
/* 纯图标按钮：等宽正方形（width = height），去除水平内边距 */
button.icon-only {
  aspect-ratio: 1;
  padding: 0;
}
/* 块级按钮占满父容器 */
button.block {
  width: 100%;
}
/* 胶囊圆角（button-group 合并圆角经自定义属性穿透，round 显式覆盖） */
button.round {
  border-radius: var(--oas-radius-full, 999px);
}
.icon {
  display: inline-flex;
}
.icon[hidden] {
  display: none;
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 选中态（button-group 单/多选经 host aria-pressed 标记）；置于类型规则前，有色按钮由下方规则覆盖 */
:host([aria-pressed='true']) button {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
button[part~='button'][disabled],
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
button.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
button.primary:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
button.primary:active {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
}
button.success {
  background: color-mix(in srgb, var(--oas-color-success) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: var(--oas-color-text-on-success);
}
button.success:hover {
  filter: brightness(1.08);
}
button.warning {
  background: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: var(--oas-color-text-on-warning);
}
button.warning:hover {
  filter: brightness(1.08);
}
button.danger {
  background: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  color: var(--oas-color-text-on-danger);
}
button.danger:hover {
  filter: brightness(1.08);
}
/* 有色 / text 按钮的选中态覆盖 */
:host([aria-pressed='true']) button.primary {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
}
:host([aria-pressed='true']) button.success,
:host([aria-pressed='true']) button.warning,
:host([aria-pressed='true']) button.danger {
  filter: brightness(0.9);
}
:host([aria-pressed='true']) button.text {
  color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
button.small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
button.xs {
  height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
}
button.xs:not(.icon-only) {
  padding: 0 6px;
  /* xs 档防过窄：最小宽放宽至 44px（其余档 56px） */
  min-width: 44px;
}
button.large {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-5);
}
button.xl {
  height: var(--oas-control-height-xl);
  font-size: var(--oas-font-size-xl);
}
button.xl:not(.icon-only) {
  padding: 0 var(--oas-space-6);
}
button.text {
  border-color: transparent;
  background: transparent;
}
/* 幽灵按钮：透明底 + 描边，按 type 着色，hover 加深 */
button.ghost {
  background: transparent;
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
button.ghost:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border-strong);
}
button.ghost.primary {
  background: transparent;
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
button.ghost.primary:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  border-color: var(--oas-color-primary-hover);
  color: var(--oas-color-primary-hover);
}
button.ghost.primary:active {
  background: color-mix(in srgb, var(--oas-color-primary) 16%, transparent);
  border-color: var(--oas-color-primary-active);
  color: var(--oas-color-primary-active);
}
button.ghost.success {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#16a34a 仅 3.3:1） */
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: color-mix(in srgb, var(--oas-color-success) 80%, black);
}
button.ghost.success:hover {
  background: color-mix(in srgb, var(--oas-color-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-success) 70%, black);
  color: color-mix(in srgb, var(--oas-color-success) 70%, black);
}
button.ghost.warning {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#d97706 仅 3.18:1） */
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
}
button.ghost.warning:hover {
  background: color-mix(in srgb, var(--oas-color-warning) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-warning) 70%, black);
  color: color-mix(in srgb, var(--oas-color-warning) 70%, black);
}
button.ghost.danger {
  background: transparent;
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
button.ghost.danger:hover {
  background: color-mix(in srgb, var(--oas-color-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-danger) 70%, black);
  color: color-mix(in srgb, var(--oas-color-danger) 70%, black);
}
/* 幽灵禁用：回落到禁用配色，防止 ghost/ghost:hover 覆盖 disabled 样式 */
button.ghost[disabled],
button.ghost[disabled]:hover,
button.ghost[disabled]:active {
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'size', 'disabled', 'loading', 'icon', 'block', 'round', 'ghost']
  }

  private btn: HTMLButtonElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button part="button">
        <span class="spinner" part="spinner" hidden></span>
        <span class="icon" part="icon" aria-hidden="true" hidden></span>
        <slot></slot>
      </button>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('button')

    this.btn?.addEventListener('click', (e: MouseEvent) => {
      if (this.hasAttr('disabled') || this.hasAttr('loading')) {
        e.preventDefault()
        return
      }
      this.emit('click', { originalEvent: e })
    })

    // 文字经 slot 增删时重算「纯图标 / 有文字」布局
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 button[part=button] 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('button[part="button"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.btn) return
    const type = this.getAttr('type', 'default') as ButtonType
    // size 就近读取 config-provider 注入值（自身属性 > config-provider > medium）
    const size = normalizeButtonSize(this.injectValue('size', 'medium') as ButtonSize)
    const disabled = this.hasAttr('disabled')
    const loading = this.hasAttr('loading')
    const icon = this.getAttr('icon', '')
    const ghost = this.hasAttr('ghost')
    const block = this.hasAttr('block')
    const round = this.hasAttr('round')

    const hasIcon = icon !== '' && iconRegistry[icon as IconName] !== undefined
    const hasText = (this.textContent ?? '').trim().length > 0
    const iconOnly = hasIcon && !hasText

    this.btn.className = [
      type,
      size,
      ghost ? 'ghost' : '',
      block ? 'block' : '',
      round ? 'round' : '',
      hasIcon ? 'has-icon' : '',
      iconOnly ? 'icon-only' : '',
    ]
      .filter(Boolean)
      .join(' ')
    this.btn.disabled = disabled || loading
    this.btn.setAttribute('aria-busy', loading ? 'true' : 'false')

    const spinner = this.btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !loading

    // 图标：iconRegistry 内联 SVG（跟随 currentColor，装饰性对读屏隐藏）
    const iconEl = this.btn.querySelector<HTMLElement>('.icon')
    if (iconEl) {
      const content = hasIcon ? iconRegistry[icon as IconName] : undefined
      iconEl.hidden = !content
      iconEl.innerHTML = ''
      if (content) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 16 16')
        svg.setAttribute('width', '1em')
        svg.setAttribute('height', '1em')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.innerHTML = content
        iconEl.appendChild(svg)
      }
    }

    // 可访问名称：宿主 aria-label 优先；纯图标无文字时以图标名兜底
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) {
      this.btn.setAttribute('aria-label', hostLabel)
    } else if (iconOnly) {
      this.btn.setAttribute('aria-label', icon)
    } else {
      this.btn.removeAttribute('aria-label')
    }
  }
}
