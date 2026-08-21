import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type LinkType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type LinkUnderline = 'always' | 'hover' | 'never'
export type LinkSize = 'small' | 'medium' | 'large'

/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；统一协议见 ui-spec §4.1） */
export type LinkPresetColor =
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

export const LINK_PRESET_COLORS: readonly LinkPresetColor[] = [
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

const VALID_UNDERLINE = ['always', 'hover', 'never'] as const
const VALID_SIZES = ['small', 'medium', 'large'] as const

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(`[oas-link] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
a {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  color: var(--oas-color-text-primary);
  text-decoration-line: underline;
  text-underline-offset: var(--oas-link-underline-offset, 2px);
  text-decoration-color: var(--oas-link-underline-color, currentColor);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
a:hover {
  color: var(--oas-color-primary);
}
a:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* underline 三态：hover（默认，无下划线悬停出现）/ always（常驻）/ never（无） */
a.hover {
  text-decoration-line: none;
}
a.hover:hover {
  text-decoration-line: underline;
}
a.always {
  text-decoration-line: underline;
}
a.never {
  text-decoration-line: none;
}
a.primary {
  color: var(--oas-color-primary);
}
a.primary:hover {
  color: var(--oas-color-primary-hover);
}
a.success {
  color: var(--oas-color-success-text);
}
a.warning {
  color: var(--oas-color-warning-text);
}
a.danger {
  color: var(--oas-color-danger-text);
}
a.info {
  color: var(--oas-color-info-text);
}
a[disabled] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  text-decoration-line: none;
  pointer-events: none;
}
/* color 统一协议：预设名映射 -text 达标 token、任意色值原值注入 --oas-link-color，has-color 胜过 type 语义色。
   dark 分支无需单独处理（-text token 明暗各一份，dark 本色即达标） */
a.has-color {
  color: var(--oas-link-color, var(--oas-color-text-primary));
}
a.has-color:hover {
  color: color-mix(in srgb, var(--oas-link-color, var(--oas-color-text-primary)) 80%, black);
}
:host-context([data-theme='dark']) a.has-color:hover,
:host-context(.dark) a.has-color:hover {
  color: color-mix(in srgb, var(--oas-link-color, var(--oas-color-text-primary)) 85%, white);
}
/* 图标：与文字同行（gap 由 a 的 inline-flex 提供），外链图标在末尾 */
.icon {
  display: inline-flex;
  flex-shrink: 0;
}
.icon svg {
  width: 1em;
  height: 1em;
  display: block;
}
.icon-external {
  opacity: 0.7;
}
/* size 字号档：small 小字辅助 / large 大字标题；medium 默认（base 已定 md） */
a.small {
  font-size: var(--oas-font-size-sm);
}
a.large {
  font-size: var(--oas-font-size-lg);
}
/* loading 态：光标 progress 表达进行中；转圈图标由 .icon.spinning svg 旋转动画驱动（仅 loading 时加该 class） */
a[loading] {
  cursor: progress;
}
.icon.spinning svg {
  animation: oas-link-spin 0.8s linear infinite;
}
@keyframes oas-link-spin {
  to {
    transform: rotate(360deg);
  }
}
`

/** 外链小图标（原创简单箭头↗） */
const EXTERNAL_ICON_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h7v7"/><path d="M13 3L7 9"/><path d="M5 5H3v8h8v-2"/></svg>'

export class OASLink extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'href',
      'type',
      'underline',
      'disabled',
      'target',
      'color',
      'icon',
      'icon-position',
      'external',
      'download',
      'size',
      'loading',
    ]
  }

  private a: HTMLAnchorElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <a part="link"><slot></slot></a>
    `
  }

  /** 缓存节点引用 + 绑定点击（render 与水合路径共用） */
  private bind(): void {
    this.a = this.shadow.querySelector('a')
    this.a?.addEventListener('click', (e: MouseEvent) => {
      // disabled / loading 均拦截：不派发 oas-click、阻止默认跳转
      if (this.hasAttr('disabled') || this.hasAttr('loading')) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      this.emit('click', { originalEvent: e })
      // href 为 '#'/空 时仅作为动作链接，阻止浏览器默认跳转（避免页面滚回顶部）
      const href = this.getAttr('href', '')
      if (href === '' || href === '#') e.preventDefault()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（链接元素存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('a[part="link"]')) return false
    this.bind()
    return true
  }

  /** 从图标集取图标（复用 @oas-ui/icons 的 iconRegistry，与 oas-icon 同源）；
   * 注册表值是 path 片段（非完整 svg），这里包 svg 壳（viewBox 16×16 与图标集一致） */
  private iconSvg(name: string): string {
    const path = iconRegistry[name as IconName]
    if (!path) return ''
    return `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${path}</svg>`
  }

  protected override update(): void {
    const a = this.a
    if (!a) return
    const href = this.getAttr('href', '')
    const type = this.getAttr('type', 'default') as LinkType
    const disabled = this.hasAttr('disabled')
    const target = this.getAttr('target', '')
    const external = this.hasAttr('external')

    // size 字号档：small/medium/large；非法值回落 medium + 告警（medium 默认不加 class）
    let size: LinkSize = 'medium'
    const rawSize = this.getAttr('size', '')
    if (rawSize) {
      if ((VALID_SIZES as readonly string[]).includes(rawSize)) size = rawSize as LinkSize
      else warnOnce('size', rawSize, 'medium', VALID_SIZES)
    }

    a.setAttribute('href', href)
    // download 透传（原生 <a download>）：空值布尔也透传（浏览器用原链接文件名），移除属性即清除
    if (this.hasAttr('download')) a.setAttribute('download', this.getAttr('download', ''))
    else a.removeAttribute('download')
    // external 自动 target=_blank；显式 target 优先（用户给了就听用户的）
    const effectiveTarget = target || (external ? '_blank' : '')
    if (effectiveTarget) a.setAttribute('target', effectiveTarget)
    else a.removeAttribute('target')
    // 安全：凡 target=_blank 自动补 rel="noopener noreferrer"
    if (effectiveTarget === '_blank') a.setAttribute('rel', 'noopener noreferrer')
    else a.removeAttribute('rel')

    // underline 三态：always/hover/never（默认 hover）；兼容 bare（=always）/"true"（=always）/"false"（=never）
    let underline: LinkUnderline = 'hover'
    const rawUnderline = this.getAttr('underline', '')
    if (rawUnderline === '' && this.hasAttr('underline')) underline = 'always'
    else if (rawUnderline === 'true') underline = 'always'
    else if (rawUnderline === 'false') underline = 'never'
    else if (rawUnderline && (VALID_UNDERLINE as readonly string[]).includes(rawUnderline)) {
      underline = rawUnderline as LinkUnderline
    } else if (rawUnderline) {
      warnOnce('underline', rawUnderline, 'hover', VALID_UNDERLINE)
    }

    const classes = [
      type !== 'default' ? type : '',
      underline,
      this.hasAttr('color') ? 'has-color' : '',
      size === 'small' ? 'small' : '',
      size === 'large' ? 'large' : '',
    ]
      .filter(Boolean)
      .join(' ')
    if (classes) a.className = classes
    else a.removeAttribute('class')
    a.toggleAttribute('disabled', disabled)
    a.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    // loading：a 上打 loading 标记（CSS 光标/aria 同步）；与 disabled 互不干扰
    const loading = this.hasAttr('loading')
    a.toggleAttribute('loading', loading)
    a.setAttribute('aria-busy', loading ? 'true' : 'false')

    // color 统一协议：预设名映射 --oas-preset-*-text（文字达标深色 token，明暗主题各一份）；
    // 任意 CSS 色值直注入原值渲染（不自动改写，对比度责任在宿主，文档已明示）
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (LINK_PRESET_COLORS as readonly string[]).includes(color)
      a.style.setProperty('--oas-link-color', isPreset ? `var(--oas-preset-${color}-text)` : color)
    } else {
      a.style.removeProperty('--oas-link-color')
    }

    // 图标：icon 属性（注册表名）+ external（自动外链图标）+ loading（转圈替换）
    // 结构：<span class="icon">svg</span> 按 icon-position 放前/后；external 图标额外带 icon-external class
    // icon-position 缺省：显式 icon 默认 start（图标在文字前惯例）；
    // external 外链图标默认 end（外链指示在文字后惯例）
    const iconName = this.getAttr('icon', '')
    const iconPosition = this.getAttr('icon-position', external && !iconName ? 'end' : 'start')
    // loading：显示转圈图标（替换原前置图标；原无图标时也在文字前补一个，加载反馈可感知）
    const wantIcon = iconName !== '' || external || loading
    const existingIcon = a.querySelector('.icon')
    if (wantIcon) {
      const svg = loading
        ? this.iconSvg('loading')
        : iconName
          ? this.iconSvg(iconName)
          : external
            ? EXTERNAL_ICON_SVG
            : ''
      if (!svg) {
        warnOnce('icon', iconName, '无图标（注册表无该名）', [])
      }
      const iconEl = existingIcon ?? a.insertBefore(document.createElement('span'), a.firstChild)
      // loading 时加 spinning（旋转动画），且不加 icon-external 的半透明（转圈要清晰可辨）
      iconEl.className = `icon${external && !loading ? ' icon-external' : ''}${loading ? ' spinning' : ''}`
      iconEl.innerHTML = svg
      // 位置：start=文字前（firstChild），end=文字后（appendChild）
      if (iconPosition === 'end' && iconEl !== a.lastElementChild) a.appendChild(iconEl)
      if (iconPosition === 'start' && iconEl !== a.firstElementChild)
        a.insertBefore(iconEl, a.firstChild)
    } else if (existingIcon) {
      existingIcon.remove()
    }
  }
}
