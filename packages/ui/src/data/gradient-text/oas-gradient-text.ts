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
`

/** 默认色标（token，随主题亮暗自动切换，无硬编码色值） */
const DEFAULT_COLORS = ['var(--oas-color-primary)', 'var(--oas-color-primary-hover)']
const DEFAULT_DIRECTION = 'to right'

/** 合法色标形态：hex / rgb(a) / hsl(a) / var() / 命名色 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|var\([^)]*\)|[a-zA-Z]+)$/

/**
 * oas-gradient-text —— 渐变文字（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `gradient`：JSON 色标数组，如 `["#f00","#00f"]`；单个色标渲染纯色；
 *   缺失/非法回退默认 token 双色渐变
 * - `direction`：渐变方向（linear-gradient 第一参数），默认 `to right`
 *
 * 实现：`background-image: linear-gradient(direction, colors...)` +
 * `-webkit-background-clip: text` + `color: transparent`，文字被渐变色填充。
 * 色标条目经白名单校验，防 CSS 注入。
 */
export class OASGradientText extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gradient', 'direction']
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

    const colors = this.parseGradient()
    const direction = this.getAttr('direction', '').trim() || DEFAULT_DIRECTION

    el.style.color = 'transparent'
    el.style.setProperty('-webkit-background-clip', 'text')
    el.style.backgroundClip = 'text'

    if (colors.length > 1) {
      el.style.backgroundColor = 'transparent'
      el.style.backgroundImage = `linear-gradient(${direction}, ${colors.join(', ')})`
    } else if (colors.length === 1) {
      // 单个色标：渲染纯色
      el.style.backgroundColor = colors[0]!
      el.style.backgroundImage = 'none'
    } else {
      el.style.backgroundColor = 'transparent'
      el.style.backgroundImage = `linear-gradient(${direction}, ${DEFAULT_COLORS.join(', ')})`
    }
  }

  /** 解析 gradient JSON 色标数组，逐条白名单校验；返回空数组表示回退默认 */
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
