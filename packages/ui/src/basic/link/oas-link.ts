import { OASElement } from '@oas-ui/core'

export type LinkType = 'default' | 'primary' | 'success' | 'warning' | 'danger'

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

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
a {
  color: var(--oas-color-text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
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
a.no-underline {
  text-decoration: none;
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
a[disabled] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  text-decoration: none;
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
`

export class OASLink extends OASElement {
  static override get observedAttributes(): string[] {
    return ['href', 'type', 'underline', 'disabled', 'target', 'color']
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
      if (this.hasAttr('disabled')) {
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

  protected override update(): void {
    const a = this.a
    if (!a) return
    const href = this.getAttr('href', '')
    const type = this.getAttr('type', 'default') as LinkType
    const underline = this.getAttr('underline', 'true') !== 'false'
    const disabled = this.hasAttr('disabled')
    const target = this.getAttr('target', '')

    a.setAttribute('href', href)
    if (target) a.setAttribute('target', target)
    else a.removeAttribute('target')
    a.className = `${type}${underline ? '' : ' no-underline'}`
    a.toggleAttribute('disabled', disabled)
    a.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    // color 统一协议：预设名映射 --oas-preset-*-text（文字达标深色 token，明暗主题各一份）；
    // 任意 CSS 色值直注入原值渲染（不自动改写，对比度责任在宿主，文档已明示）；移除后回落 type 语义色
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (LINK_PRESET_COLORS as readonly string[]).includes(color)
      a.style.setProperty('--oas-link-color', isPreset ? `var(--oas-preset-${color}-text)` : color)
      a.classList.add('has-color')
    } else {
      a.style.removeProperty('--oas-link-color')
      a.classList.remove('has-color')
    }
  }
}
