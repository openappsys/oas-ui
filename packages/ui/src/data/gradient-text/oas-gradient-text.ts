import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 特效文本跟随外层字号（同 span/p 排版直觉）；定制开口：--oas-gradient-text-font */
  font-size: var(--oas-gradient-text-font, inherit);
}
:host([hidden]) {
  display: none;
}
[part='text'] {
  display: inline-block;
  max-width: 100%;
}
/*
 * background-clip:text + 透明色只写在 @supports 块内：
 * 老浏览器不支持 clip 时不套透明色，文字保持普通前景色可见（回退为普通文字），
 * 背景渐变绘制在文字后方，不构成"隐形文字"事故。
 */
@supports (-webkit-background-clip: text) or (background-clip: text) {
  [part='text'].clipped {
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
  }
}
/*
 * type 语义色渐变对：token 派生（零新增 token，暗色自动换色）。
 * 第二 stop 取语义色向正文前景色混合（亮色主题变深、暗色主题变浅），
 * 与 --oas-color-primary-hover 的派生方向一致；info 复用 info-text token。
 * 方向走 --oas-gradient-text-dir 内联变量（animated 动态覆盖见 JS 路径）。
 */
[part='text'][data-type] {
  background-image: linear-gradient(
    var(--oas-gradient-text-dir, to right),
    var(--oas-gradient-text-from),
    var(--oas-gradient-text-to)
  );
}
[part='text'][data-type='primary'] {
  --oas-gradient-text-from: var(--oas-color-primary);
  --oas-gradient-text-to: var(--oas-color-primary-hover);
}
[part='text'][data-type='success'] {
  --oas-gradient-text-from: var(--oas-color-success);
  --oas-gradient-text-to: color-mix(in srgb, var(--oas-color-success) 72%, var(--oas-color-text-primary));
}
[part='text'][data-type='warning'] {
  --oas-gradient-text-from: var(--oas-color-warning);
  --oas-gradient-text-to: color-mix(in srgb, var(--oas-color-warning) 72%, var(--oas-color-text-primary));
}
[part='text'][data-type='danger'] {
  --oas-gradient-text-from: var(--oas-color-danger);
  --oas-gradient-text-to: color-mix(in srgb, var(--oas-color-danger) 72%, var(--oas-color-text-primary));
}
[part='text'][data-type='info'] {
  --oas-gradient-text-from: var(--oas-color-info-text);
  --oas-gradient-text-to: color-mix(in srgb, var(--oas-color-info-text) 72%, var(--oas-color-text-primary));
}
/* 动画渐变：背景图像双倍宽 + 背景位置平移一个图块周期（回文渐变首尾同色，无缝循环） */
[part='text'].animated {
  background-size: 200% 100%;
  animation: oas-gradient-text-flow var(--oas-gradient-text-duration, 3s) linear infinite;
}
@keyframes oas-gradient-text-flow {
  from {
    background-position: 0% 0;
  }
  to {
    background-position: 200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  [part='text'].animated {
    animation: none;
  }
}
`

/** 默认色标（token，随主题亮暗自动切换，无硬编码色值） */
const DEFAULT_COLORS = ['var(--oas-color-primary)', 'var(--oas-color-primary-hover)']
const DEFAULT_DIRECTION = 'to right'

/** 合法色标形态：hex / rgb(a) / hsl(a) / var() / 命名色 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|var\([^)]*\)|[a-zA-Z]+)$/

/** 受支持的语义色 type 名（非法值回退默认渐变） */
const TYPES = ['primary', 'success', 'warning', 'danger', 'info'] as const

/**
 * oas-gradient-text —— 渐变文字（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `gradient`：JSON 色标数组，如 `["#f00","#00f"]`；单个色标渲染纯色；
 *   缺失/非法回退默认 token 双色渐变
 * - `direction`：渐变方向（linear-gradient 第一参数），默认 `to right`
 * - `type`：语义色渐变（primary/success/warning/danger/info），与 gradient 并存时 gradient 优先
 * - `animated`：动画渐变（背景位置沿渐变轴流动；prefers-reduced-motion 自动静止）
 *
 * 实现：`background-image: linear-gradient(direction, colors...)` +
 * scoped `@supports` 内的 `background-clip: text` + `color: transparent`，
 * 文字被渐变色填充；不支持 clip 的浏览器回退为普通前景色文字。
 * type 语义色对走 scoped CSS（data-type + token 派生变量），暗色自动换色；
 * 动画态把色标做成回文序列（首尾同色）配 200% 背景宽度平移一个图块周期，无缝循环。
 * 色标条目经白名单校验，防 CSS 注入。
 */
export class OASGradientText extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gradient', 'direction', 'type', 'animated']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="text" part="text"><slot></slot></span>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；gradient-text 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（文本节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="text"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="text"]')
    if (!el) return

    const explicit = this.parseGradient()
    const type = this.typeOf()
    const direction = this.getAttr('direction', '').trim() || DEFAULT_DIRECTION
    const animated = this.hasAttr('animated') && explicit.length !== 1

    el.classList.add('clipped')
    el.classList.toggle('animated', animated)
    el.style.setProperty('--oas-gradient-text-dir', direction)

    if (explicit.length > 1) {
      // 显式色标：内联渐变（animated 回文化）
      el.removeAttribute('data-type')
      el.style.backgroundColor = 'transparent'
      const stops = animated ? palindrome(explicit) : explicit
      el.style.backgroundImage = `linear-gradient(${direction}, ${stops.join(', ')})`
      return
    }
    if (explicit.length === 1) {
      // 单个色标：渲染纯色（type 不生效——显式通道优先）
      el.removeAttribute('data-type')
      el.style.backgroundColor = explicit[0]!
      el.style.backgroundImage = 'none'
      return
    }
    if (type) {
      // 语义色渐变：scoped CSS（data-type）驱动；animated 以回文色标内联覆盖
      el.setAttribute('data-type', type)
      el.style.backgroundColor = 'transparent'
      if (animated) {
        el.style.backgroundImage = `linear-gradient(${direction}, ${TYPE_STOPS_INLINE[type]!.join(', ')})`
      } else {
        el.style.backgroundImage = ''
      }
      return
    }
    // 默认 token 双色渐变
    el.removeAttribute('data-type')
    el.style.backgroundColor = 'transparent'
    const stops = animated ? palindrome(DEFAULT_COLORS) : DEFAULT_COLORS
    el.style.backgroundImage = `linear-gradient(${direction}, ${stops.join(', ')})`
  }

  /** type 归一：受支持语义色名，非法/空返回 '' */
  private typeOf(): string {
    const t = this.getAttr('type', '').trim().toLowerCase()
    return (TYPES as readonly string[]).includes(t) ? t : ''
  }

  /** 解析 gradient JSON 色标数组，逐条白名单校验；返回空数组表示未显式给定 */
  private parseGradient(): string[] {
    const raw = this.getAttr('gradient', '').trim()
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((c): c is string => typeof c === 'string' && COLOR_RE.test(c.trim()))
    } catch {
      return []
    }
  }
}

/** 回文色标：首尾同色，配 200% 背景宽度平移一个图块周期实现无缝流动循环 */
function palindrome(colors: string[]): string[] {
  return [...colors, ...colors.slice(0, -1).reverse()]
}

/**
 * animated + type 的内联回文覆盖（scoped CSS 色对为 var/color-mix 组合，
 * 无法在内联拼接回文，故展开为与 STYLE 中 data-type 规则同源的 token 表达式；
 * 仅动画态需要，静态走 scoped CSS）。
 */
const TYPE_STOPS_INLINE: Record<string, [string, string, string]> = {
  primary: [
    'var(--oas-color-primary)',
    'var(--oas-color-primary-hover)',
    'var(--oas-color-primary)',
  ],
  success: [
    'var(--oas-color-success)',
    'color-mix(in srgb, var(--oas-color-success) 72%, var(--oas-color-text-primary))',
    'var(--oas-color-success)',
  ],
  warning: [
    'var(--oas-color-warning)',
    'color-mix(in srgb, var(--oas-color-warning) 72%, var(--oas-color-text-primary))',
    'var(--oas-color-warning)',
  ],
  danger: [
    'var(--oas-color-danger)',
    'color-mix(in srgb, var(--oas-color-danger) 72%, var(--oas-color-text-primary))',
    'var(--oas-color-danger)',
  ],
  info: [
    'var(--oas-color-info-text)',
    'color-mix(in srgb, var(--oas-color-info-text) 72%, var(--oas-color-text-primary))',
    'var(--oas-color-info-text)',
  ],
}
