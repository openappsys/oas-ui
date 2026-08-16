import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

/**
 * 用户自定义图标注册表（name → 内联 SVG 片段）。
 * 查询优先级高于内置 iconRegistry：同名时覆盖内置图标。
 */
const customIcons = new Map<string, string>()

/**
 * 注册自定义图标，注册后即可通过 `<oas-icon name="xxx">` 使用。
 * 与内置图标同名时覆盖内置图标。
 * 纯函数、无 DOM 依赖，可在 SSR/Node 环境调用。
 */
export function registerIcon(name: string, svg: string): void {
  customIcons.set(name, svg)
}

/** 查表：自定义注册优先，其次内置图标集 */
function lookupIcon(name: string): string | undefined {
  return customIcons.get(name) ?? iconRegistry[name as IconName]
}

/**
 * 远程图标库注册项。
 * - resolver：图标名 → SVG URL（可携带 family/variant 属性参数），按需 fetch 加载
 * - mutator：加载内联后调整 SVG（如 fill/stroke=currentColor）
 * - spriteSheet：sprite 模式，URL 为同一张 sprite 表地址，渲染 `<use href="url#name">`，不内联整 SVG
 */
export interface IconLibraryOptions {
  /** 图标名 → SVG URL */
  resolver: (name: string, family?: string, variant?: string) => string
  /** 加载内联后调整 SVG（如 fill/stroke=currentColor） */
  mutator?: (svg: SVGElement) => void
  /** sprite 模式：URL 含 #name 片段引用 sprite 表 symbol，渲染 <use> 而非内联 */
  spriteSheet?: boolean
}

/** 图标库注册表（libraryName → 选项），模块级共享 */
const iconLibraries = new Map<string, IconLibraryOptions>()

/**
 * 注册远程图标库。注册后通过 `<oas-icon library="xxx" name="yyy">` 使用：
 * 组件调用 resolver 得到 SVG URL，按需 fetch 加载内联渲染（sprite 模式渲染 <use>）。
 * 纯函数、无 DOM 依赖，可在 SSR/Node 环境调用。
 */
export function registerIconLibrary(name: string, options: IconLibraryOptions): void {
  iconLibraries.set(name, options)
}

const STYLE = `
:host {
  /* inline-flex：宿主收缩包裹 svg，消除 inline 上下文行高撑出基线支撑导致的垂直偏心 */
  display: inline-flex;
  /* duotone 双层着色变量：用户可在宿主元素上通过自定义属性覆盖 */
  --oas-icon-primary-color: currentColor;
  --oas-icon-secondary-color: currentColor;
  --oas-icon-primary-opacity: 1;
  --oas-icon-secondary-opacity: 0.4;
}
/* fill 默认值只在没有显式 fill 属性时兜底：CSS 优先级高于表现属性，
   裸写 svg{fill} 会盖掉 slot/远程图标自带的 fill="none"（描边图标变实心块） */
svg:not([fill]) {
  fill: currentColor;
}
svg {
  transform-origin: center;
}
/* 用户经 slot 提供的原始 svg 不直接显示（内容已克隆进内部 svg）：
   slot 不出盒则分配内容不渲染——shadow 内部规则，宿主页面全局 reset
   （img/svg{display:block} 等）够不到，无需 ::slotted 对抗 */
slot {
  display: none;
}
/* duotone：优先 data-layer 显式分层，其次按前两个直接子图形元素着色 */
svg[data-duotone='true'] [data-layer='primary'],
svg[data-duotone='true'] > :first-child {
  color: var(--oas-icon-primary-color);
  opacity: var(--oas-icon-primary-opacity);
}
svg[data-duotone='true'] [data-layer='secondary'],
svg[data-duotone='true'] > :nth-child(2) {
  color: var(--oas-icon-secondary-color);
  opacity: var(--oas-icon-secondary-opacity);
}
/* swap-opacity：交换两层透明度 */
svg[data-duotone='true'][data-swap='true'] [data-layer='primary'],
svg[data-duotone='true'][data-swap='true'] > :first-child {
  opacity: var(--oas-icon-secondary-opacity);
}
svg[data-duotone='true'][data-swap='true'] [data-layer='secondary'],
svg[data-duotone='true'][data-swap='true'] > :nth-child(2) {
  opacity: var(--oas-icon-primary-opacity);
}
@keyframes oas-icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes oas-icon-spin-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
@keyframes oas-icon-spin-snap {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(45deg); }
  12.5% { transform: rotate(45deg); }
  22.5% { transform: rotate(90deg); }
  25% { transform: rotate(90deg); }
  35% { transform: rotate(135deg); }
  37.5% { transform: rotate(135deg); }
  47.5% { transform: rotate(180deg); }
  50% { transform: rotate(180deg); }
  60% { transform: rotate(225deg); }
  62.5% { transform: rotate(225deg); }
  72.5% { transform: rotate(270deg); }
  75% { transform: rotate(270deg); }
  85% { transform: rotate(315deg); }
  87.5% { transform: rotate(315deg); }
  97.5% { transform: rotate(360deg); }
  100% { transform: rotate(360deg); }
}
@keyframes oas-icon-beat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
}
@keyframes oas-icon-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes oas-icon-beat-fade {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}
@keyframes oas-icon-bounce {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-25%); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-12%); }
}
@keyframes oas-icon-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8%); }
  20%, 40%, 60%, 80% { transform: translateX(8%); }
}
@keyframes oas-icon-swing {
  0% { transform-origin: top center; transform: rotate(0deg); }
  20% { transform: rotate(14deg); }
  40% { transform: rotate(-11deg); }
  60% { transform: rotate(7deg); }
  80% { transform: rotate(-4deg); }
  100% { transform: rotate(0deg); }
}
@keyframes oas-icon-wag {
  0% { transform-origin: bottom center; transform: rotate(0deg); }
  20% { transform: rotate(9deg); }
  40% { transform: rotate(-9deg); }
  60% { transform: rotate(5deg); }
  80% { transform: rotate(-5deg); }
  100% { transform: rotate(0deg); }
}
@keyframes oas-icon-buzz {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(3deg); }
  20% { transform: rotate(-3deg); }
  30% { transform: rotate(2.4deg); }
  40% { transform: rotate(-2.4deg); }
  50% { transform: rotate(1.8deg); }
  60% { transform: rotate(-1.8deg); }
  70% { transform: rotate(1.2deg); }
  80% { transform: rotate(-1.2deg); }
  90% { transform: rotate(0.6deg); }
  100% { transform: rotate(0deg); }
}
@keyframes oas-icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10%); }
}
@keyframes oas-icon-jello {
  0%, 100% { transform: scale(1, 1); }
  20% { transform: scale(1.08, 0.92); }
  40% { transform: scale(0.92, 1.08); }
  60% { transform: scale(1.04, 0.96); }
  80% { transform: scale(0.96, 1.04); }
}
/* 尊重系统减弱动态偏好：一律停用图标动画 */
@media (prefers-reduced-motion: reduce) {
  svg { animation: none !important; }
}
`

/** animation 属性预设 → CSS animation 简写（自制 keyframes，非第三方实现） */
const ANIMATIONS: Record<string, string> = {
  spin: 'oas-icon-spin 1s linear infinite',
  'spin-pulse': 'oas-icon-spin 1.2s steps(8, end) infinite',
  'spin-reverse': 'oas-icon-spin-reverse 1s linear infinite',
  'spin-snap': 'oas-icon-spin-snap 2.4s ease-in-out infinite',
  beat: 'oas-icon-beat 1.2s ease-in-out infinite',
  fade: 'oas-icon-fade 1.5s ease-in-out infinite',
  'beat-fade': 'oas-icon-beat-fade 1.6s ease-in-out infinite',
  bounce: 'oas-icon-bounce 1.5s ease-in-out infinite',
  shake: 'oas-icon-shake 0.8s linear infinite',
  swing: 'oas-icon-swing 2s ease-in-out infinite',
  wag: 'oas-icon-wag 1.5s ease-in-out infinite',
  buzz: 'oas-icon-buzz 0.9s linear infinite',
  float: 'oas-icon-float 3s ease-in-out infinite',
  jello: 'oas-icon-jello 1.2s linear infinite',
}

/** canvas 占位框模式（auto 单独处理：自然宽 × 1em 高） */
const CANVAS: Record<string, { w: string; h: string }> = {
  fixed: { w: '1.25em', h: '1em' },
  square: { w: '1.25em', h: '1.25em' },
  roomy: { w: '1.5em', h: '1.5em' },
}

export class OASIcon extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'name',
      'size',
      'color',
      'label',
      'spin',
      'rotate',
      'flip',
      'src',
      'animation',
      'duotone',
      'swap-opacity',
      'canvas',
      'depth',
      'library',
      'family',
      'variant',
    ]
  }

  private svgHost: SVGSVGElement | null = null
  /** src 异步加载的竞态令牌：仅最新一次请求的结果会写入 */
  private fetchId = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `<style>${STYLE}</style><svg part="icon"></svg><slot></slot>`
  }

  /** 缓存节点引用 + 绑定 slotchange（render 与水合路径共用） */
  private bind(): void {
    this.svgHost = this.shadow.querySelector('svg')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：SVG 骨架缺失（非法 name 时快照为空 shadow）也属有效快照，由 update 按属性决定是否重建 */
  protected override hydrate(): boolean {
    this.bind()
    return true
  }

  /** 查询 light DOM 中用户经 slot 提供的内联 svg */
  private slotSvg(): SVGSVGElement | null {
    return this.querySelector('svg') as SVGSVGElement | null
  }

  /** 将用户 slot 的内联 svg 克隆进内部 svgHost（属性全量复制——fill/stroke 等表现属性
      继承给子图形，只拷 viewBox 会丢描边变纯填充；width/height 由组件 size/canvas 管理除外） */
  private renderSlotSvg(host: SVGSVGElement, slotSvg: SVGSVGElement): void {
    for (const attr of Array.from(slotSvg.attributes)) {
      if (attr.name === 'width' || attr.name === 'height') continue
      host.setAttribute(attr.name, attr.value)
    }
    if (!slotSvg.hasAttribute('viewBox')) host.setAttribute('viewBox', '0 0 16 16')
    host.innerHTML = ''
    for (const child of Array.from(slotSvg.childNodes)) {
      host.appendChild(child.cloneNode(true))
    }
  }

  /** 通用远程 SVG 加载：fetch 文本 + 防竞态令牌（仅最新一次请求的响应写入），失败静默兜底 */
  private fetchSvg(url: string, onSuccess: (text: string) => void): void {
    const id = ++this.fetchId
    const host = this.svgHost
    if (!host || typeof fetch !== 'function' || typeof document === 'undefined') return
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`icon fetch failed: ${url}`)
        return res.text()
      })
      .then((text) => {
        if (id !== this.fetchId || !this.svgHost) return
        onSuccess(text)
      })
      .catch(() => {
        // 加载失败静默兜底：保持空内容（aria-hidden 由 update 同步）
      })
  }

  /** src 异步加载：fetch 远程/本地 SVG，解析后内联渲染（颜色走 currentColor） */
  private loadSrc(src: string): void {
    this.fetchSvg(src, (text) => {
      if (!this.svgHost) return
      this.applyFetchedSvg(this.svgHost, text)
    })
  }

  /** 把 fetch 到的 SVG 文本应用到 svgHost：外层 svg 的表现属性（fill/stroke 等，继承给子图形）
      全量复制——只取 innerHTML 会把描边图标丢成纯填充块；width/height 由 size/canvas 管理除外 */
  private applyFetchedSvg(host: SVGSVGElement, text: string): void {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = text
    const outer = wrapper.querySelector('svg')
    if (!outer) {
      host.innerHTML = text
      return
    }
    for (const attr of Array.from(outer.attributes)) {
      if (attr.name === 'width' || attr.name === 'height') continue
      host.setAttribute(attr.name, attr.value)
    }
    if (!host.hasAttribute('viewBox')) host.setAttribute('viewBox', '0 0 16 16')
    host.innerHTML = outer.innerHTML
  }

  /**
   * library 异步加载：resolver 解析图标名 → SVG URL。
   * sprite 模式渲染 `<use href="url#name">`（不 fetch 不内联）；
   * 否则 fetch 内联渲染后调 mutator 调整 SVG（如 fill/stroke=currentColor）。
   */
  private loadLibrary(library: string, name: string, family: string, variant: string): void {
    const options = iconLibraries.get(library)
    const host = this.svgHost
    if (!options || !host) return
    const url = options.resolver(name, family || undefined, variant || undefined)
    if (options.spriteSheet) {
      // sprite 模式：使在途 src/library 请求失效，防止旧响应覆盖 <use>
      ++this.fetchId
      host.innerHTML = `<use href="${url}#${name}"></use>`
      return
    }
    this.fetchSvg(url, (text) => {
      if (!this.svgHost) return
      this.applyFetchedSvg(this.svgHost, text)
      options.mutator?.(this.svgHost)
    })
  }

  /** 增量同步外观：尺寸/颜色/变换/动画/透明度/duotone/aria */
  private syncAppearance(host: SVGSVGElement): void {
    // canvas 占位框模式（size 显式时优先，canvas 缺省保持旧行为 1em×1em）
    const size = this.getAttr('size', '')
    const canvas = this.getAttr('canvas', '')
    if (size) {
      host.setAttribute('width', size)
      host.setAttribute('height', size)
    } else if (canvas === 'auto') {
      host.removeAttribute('width')
      host.setAttribute('height', '1em')
    } else if (canvas && CANVAS[canvas]) {
      host.setAttribute('width', CANVAS[canvas].w)
      host.setAttribute('height', CANVAS[canvas].h)
    } else {
      host.setAttribute('width', '1em')
      host.setAttribute('height', '1em')
    }
    host.setAttribute('aria-hidden', 'true')
    host.setAttribute('focusable', 'false')

    // 颜色
    this.style.color = this.getAttr('color', '')

    // rotate + flip 静态变换叠加
    const transforms: string[] = []
    const rotate = this.getAttr('rotate', '')
    if (rotate) transforms.push(`rotate(${rotate}deg)`)
    const flip = this.getAttr('flip', '')
    if (flip === 'x' || flip === 'both') transforms.push('scaleX(-1)')
    if (flip === 'y' || flip === 'both') transforms.push('scaleY(-1)')
    host.style.transform = transforms.join(' ')

    // 动画：animation 属性优先，spin 为布尔快捷方式
    const animation = this.getAttr('animation', '')
    host.style.animation = animation
      ? (ANIMATIONS[animation] ?? '')
      : this.hasAttr('spin')
        ? (ANIMATIONS.spin ?? '')
        : ''

    // depth 透明度层级：1=100% … 5=20%（整数运算避免浮点误差）
    const depth = Number.parseInt(this.getAttr('depth', ''), 10)
    host.style.opacity = depth >= 1 && depth <= 5 ? String((6 - depth) / 5) : ''

    // duotone / swap-opacity 标记（实际着色由 shadow CSS 按变量完成）
    if (this.hasAttr('duotone')) host.setAttribute('data-duotone', 'true')
    else host.removeAttribute('data-duotone')
    if (this.hasAttr('swap-opacity')) host.setAttribute('data-swap', 'true')
    else host.removeAttribute('data-swap')

    // 无障碍：label 提供可读名称
    const label = this.getAttr('label', '')
    if (label) {
      this.setAttribute('role', 'img')
      this.setAttribute('aria-label', label)
      this.removeAttribute('aria-hidden')
    } else {
      this.setAttribute('aria-hidden', 'true')
      this.removeAttribute('role')
      this.removeAttribute('aria-label')
    }
  }

  protected override update(): void {
    const name = this.getAttr('name', '') as IconName
    const src = this.getAttr('src', '')
    const library = this.getAttr('library', '')
    const family = this.getAttr('family', '')
    const variant = this.getAttr('variant', '')
    const slotSvg = this.slotSvg()
    const content = slotSvg ? undefined : src ? undefined : lookupIcon(name)
    const libOptions = library ? iconLibraries.get(library) : undefined

    if (!this.svgHost) {
      this.shadow.innerHTML = this.template()
      this.bind()
    }
    const host = this.svgHost
    if (!host) return

    // 内容源优先级：slot 内联 svg > src 异步加载 > library 注册库 > name 注册表
    if (slotSvg) {
      this.renderSlotSvg(host, slotSvg)
    } else if (src) {
      host.innerHTML = ''
      host.removeAttribute('viewBox')
      this.loadSrc(src)
    } else if (libOptions) {
      host.innerHTML = ''
      host.removeAttribute('viewBox')
      this.loadLibrary(library, name, family, variant)
    } else if (content) {
      host.innerHTML = content
      host.setAttribute('viewBox', '0 0 16 16')
    } else {
      host.innerHTML = ''
      host.removeAttribute('viewBox')
    }

    if (!slotSvg && !src && !content && !libOptions) {
      // 空态兜底：保留骨架，清空内容与宿主样式
      host.removeAttribute('data-duotone')
      host.removeAttribute('data-swap')
      host.style.transform = ''
      host.style.animation = ''
      host.style.opacity = ''
      this.style.color = ''
      this.setAttribute('aria-hidden', 'true')
      this.removeAttribute('role')
      this.removeAttribute('aria-label')
      return
    }

    this.syncAppearance(host)
  }
}
