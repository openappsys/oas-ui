import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'text'
export type ButtonSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'
/** variant 形态维度（正交 type 语义色）：solid 实底 / outlined 描边 / dashed 虚线描边 / filled 浅底 / text 文字 / link 链接 */
export type ButtonVariant = 'solid' | 'outlined' | 'dashed' | 'filled' | 'text' | 'link'

const VALID_BUTTON_SIZES: readonly ButtonSize[] = ['xs', 'small', 'medium', 'large', 'xl']
const VALID_BUTTON_VARIANTS: readonly ButtonVariant[] = ['solid', 'outlined', 'dashed', 'filled', 'text', 'link']

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
button,
a[part='button'] {
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
  text-decoration: none;
  box-sizing: border-box;
}
button:hover,
a[part='button']:hover {
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
button.round,
a[part='button'].round {
  border-radius: var(--oas-radius-full, 999px);
}
/* 圆形按钮（纯图标常用）：正方形 + 正圆角 */
button.circle,
a[part='button'].circle {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 50%;
}
/* 图标在右：icon 后置到文字之后 */
button.icon-end .icon,
a[part='button'].icon-end .icon {
  order: 2;
}
/* 朴素按钮：弱化填充（浅底 + 主色文字），text 已是朴素 */
button.plain.primary {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-primary) 80%, black);
}
button.plain.primary:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 20%, transparent);
}
button.plain.primary:active {
  background: color-mix(in srgb, var(--oas-color-primary) 26%, transparent);
}
button.plain.success {
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-success) 80%, black);
}
button.plain.success:hover {
  background: color-mix(in srgb, var(--oas-color-success) 20%, transparent);
}
button.plain.warning {
  background: color-mix(in srgb, var(--oas-color-warning) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
}
button.plain.warning:hover {
  background: color-mix(in srgb, var(--oas-color-warning) 20%, transparent);
}
button.plain.danger {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
}
button.plain.danger:hover {
  background: color-mix(in srgb, var(--oas-color-danger) 20%, transparent);
}

/* 链接按钮禁用态（a 无 disabled 属性，用 aria-disabled + 与 button 一致配色） */
a[part='button'][aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
a[part='button'][aria-disabled='true']:hover {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
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
a[part='button'].primary {
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
a[part='button'].success {
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
a[part='button'].warning {
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
a[part='button'].danger {
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
a[part='button'].primary {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
}
:host([aria-pressed='true']) button.success,
:host([aria-pressed='true']) button.warning,
:host([aria-pressed='true']) button.danger {
  filter: brightness(0.9);
}
a[part='button'].danger {
  filter: brightness(0.9);
}
:host([aria-pressed='true']) button.text {
  color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
a[part='button'].text {
  color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
button.small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
a[part='button'].small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
button.xs {
  height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
}
a[part='button'].xs {
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
a[part='button'].large {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-5);
}
button.xl {
  height: var(--oas-control-height-xl);
  font-size: var(--oas-font-size-xl);
}
a[part='button'].xl {
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
a[part='button'].text {
  border-color: transparent;
  background: transparent;
}
/* 幽灵按钮：透明底 + 描边，按 type 着色，hover 加深 */
button.ghost {
  background: transparent;
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
a[part='button'].ghost {
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
a[part='button'].ghost.primary {
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
a[part='button'].ghost.success {
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
a[part='button'].ghost.warning {
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
a[part='button'].ghost.danger {
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
a[part='button'].ghost[disabled]:active {
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
/* ===== variant 形态维度（正交 type 语义色）===== */
/* 语义色变量：type 决定；color 属性经 --oas-button-color 覆盖 */
button.primary,
a[part='button'].primary {
  --btn-color: var(--oas-button-color, var(--oas-color-primary));
}
button.success,
a[part='button'].success {
  --btn-color: var(--oas-button-color, color-mix(in srgb, var(--oas-color-success) 80%, black));
}
button.warning,
a[part='button'].warning {
  --btn-color: var(--oas-button-color, color-mix(in srgb, var(--oas-color-warning) 80%, black));
}
button.danger,
a[part='button'].danger {
  --btn-color: var(--oas-button-color, var(--oas-color-danger));
}
/* outlined：透明底 + 语义色描边与文字 */
button.outlined,
a[part='button'].outlined {
  background: transparent;
  border-color: var(--btn-color, var(--oas-color-border));
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.outlined:hover,
a[part='button'].outlined:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* dashed：虚线描边（outlined + 虚线样式） */
button.dashed,
a[part='button'].dashed {
  background: transparent;
  border: 1px dashed var(--btn-color, var(--oas-color-border));
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.dashed:hover,
a[part='button'].dashed:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* filled：浅底 soft（语义色 12% 底 + 80% 深文字） */
button.filled,
a[part='button'].filled {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 12%, transparent);
  border-color: transparent;
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.filled.primary,
a[part='button'].filled.primary,
button.filled.success,
a[part='button'].filled.success,
button.filled.warning,
a[part='button'].filled.warning,
button.filled.danger,
a[part='button'].filled.danger {
  color: color-mix(in srgb, var(--btn-color) 80%, black);
}
button.filled:hover,
a[part='button'].filled:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 18%, transparent);
}
/* text：纯文字（无框无背景） */
button.text,
a[part='button'].text {
  background: transparent;
  border-color: transparent;
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.text:hover,
a[part='button'].text:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* link：链接样式（主色文字 + hover 下划线），常配合 href */
button.link,
a[part='button'].link {
  background: transparent;
  border-color: transparent;
  color: var(--oas-button-color, var(--oas-color-primary));
}
button.link:hover,
a[part='button'].link:hover {
  color: var(--oas-button-color, var(--oas-color-primary-hover));
  text-decoration: underline;
  background: transparent;
}
/* solid 背景走 --oas-button-bg 变量（支持渐变覆盖，默认语义色）；仅 solid 生效，避免覆盖 filled/outlined 等形态 */
button.primary:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link),
a[part='button'].primary:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link) {
  background: var(--oas-button-bg, var(--oas-color-primary));
}
/* press 反馈（wave 默认开）：按下轻微下沉 + 加深，克制不抢眼 */
button.wave,
a[part='button'].wave {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    filter var(--oas-transition-fast) var(--oas-ease-out);
}
button.wave:active,
a[part='button'].wave:active {
  transform: scale(0.97);
  filter: brightness(0.94);
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
    return [
      'type',
      'size',
      'disabled',
      'loading',
      'icon',
      'block',
      'round',
      'ghost',
      'circle',
      'icon-position',
      'href',
      'target',
      'plain',
      'variant',
      'color',
      'wave',
      'auto-insert-space',
    ]
  }

  private btn: HTMLElement | null = null

  /** 是否为链接按钮（渲染 <a> 而非 <button>） */
  private isLink(): boolean {
    return this.getAttr('href', '') !== ''
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const href = this.getAttr('href', '')
    const target = this.getAttr('target', '')
    const tag = href ? 'a' : 'button'
    const hrefAttr = href ? ` href="${href}"${target ? ` target="${target}"` : ''}` : ''
    return `
      <style>${STYLE}</style>
      <${tag} part="button"${hrefAttr}>
        <span class="spinner" part="spinner" hidden></span>
        <span class="icon" part="icon" aria-hidden="true" hidden></span>
        <slot></slot>
      </${tag}>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('button[part="button"], a[part="button"]')

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

  /** 真水合：校验 SSR 快照结构（关键节点 button/a[part=button] 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('button[part="button"], a[part="button"]')) return false
    this.bind()
    return true
  }

  /** href/target 增删会改变内部元素类型（button ↔ a），需重建 shadow；其余属性走 update() */
  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if ((name === 'href' || name === 'target') && this.hasRendered) {
      this.shadow.innerHTML = this.template()
      this.bind()
      this.update()
      return
    }
    super.attributeChangedCallback(name, oldValue, newValue)
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
    const circle = this.hasAttr('circle')
    const plain = this.hasAttr('plain')
    const iconPosition = this.getAttr('icon-position', 'start')
    const link = this.isLink()
    // variant 形态维度：显式 variant 属性优先；否则按旧属性映射（ghost→outlined、plain→filled、type=text→text），默认 solid
    const rawVariant = this.getAttr('variant', '') as ButtonVariant | ''
    const variant: ButtonVariant = (VALID_BUTTON_VARIANTS as readonly string[]).includes(rawVariant)
      ? (rawVariant as ButtonVariant)
      : ghost
        ? 'outlined'
        : plain
          ? 'filled'
          : type === 'text'
            ? 'text'
            : 'solid'
    const color = this.getAttr('color', '')
    const wave = this.getAttr('wave', 'true') !== 'false'

    const hasIcon = icon !== '' && iconRegistry[icon as IconName] !== undefined
    const hasText = (this.textContent ?? '').trim().length > 0
    const iconOnly = hasIcon && !hasText

    this.btn.className = [
      type,
      size,
      // variant 形态 class（solid 为默认不加 class；旧属性 ghost/plain 仍保留 class 兼容旧 CSS）
      variant !== 'solid' ? variant : '',
      ghost ? 'ghost' : '',
      block ? 'block' : '',
      round ? 'round' : '',
      circle ? 'circle' : '',
      plain ? 'plain' : '',
      iconPosition === 'end' ? 'icon-end' : '',
      hasIcon ? 'has-icon' : '',
      iconOnly ? 'icon-only' : '',
      wave ? 'wave' : '',
    ]
      .filter(Boolean)
      .join(' ')
    // color 自定义色：覆盖 type 语义色（经 --oas-button-color 变量，CSS 配色处兜底引用）
    if (color) this.btn.style.setProperty('--oas-button-color', color)
    else this.btn.style.removeProperty('--oas-button-color')
    this.btn.setAttribute('aria-busy', loading ? 'true' : 'false')
    // 链接按钮（a）无 disabled 属性，用 aria-disabled 承载禁用语义 + CSS 禁用态；button 用原生 disabled
    if (link) {
      this.btn.setAttribute('aria-disabled', disabled || loading ? 'true' : 'false')
    } else {
      ;(this.btn as HTMLButtonElement).disabled = disabled || loading
    }

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

    // 中文间自动空格（默认开）：两个连续汉字之间插入空格（中文排版优化）
    this.applyAutoInsertSpace()
  }

  /** 中文间自动空格：slot 文本里两个连续 CJK 字符间插入空格（auto-insert-space 默认关，opt-in） */
  private applyAutoInsertSpace(): void {
    if (!this.hasAttr('auto-insert-space') || this.getAttr('auto-insert-space', '') === 'false') return
    // 遍历宿主直接文本节点，两个连续汉字间插空格（不破坏元素子节点结构）
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) continue
      const text = node.textContent ?? ''
      const spaced = text.replace(/([\u4e00-\u9fa5])([\u4e00-\u9fa5])/g, '$1 $2')
      if (spaced !== text) node.textContent = spaced
    }
  }
}
