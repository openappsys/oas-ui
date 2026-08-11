import { OASElement } from '@oas-ui/core'

export type TextType = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'disabled'

const TYPE_COLOR: Record<TextType, string> = {
  default: 'var(--oas-color-text-primary)',
  secondary: 'var(--oas-color-text-secondary)',
  success: 'var(--oas-color-success)',
  warning: 'var(--oas-color-warning)',
  danger: 'var(--oas-color-danger)',
  disabled: 'var(--oas-color-text-disabled)',
}

const BASE_STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.text {
  display: inline;
  margin: 0;
}
.text.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}
.copy-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 0 0 var(--oas-space-1);
  cursor: pointer;
  color: var(--oas-color-primary);
  font-size: 1em;
  vertical-align: baseline;
}
.copy-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

function styleFor(tag: string): string {
  return BASE_STYLE
}

interface TypoOptions {
  tag: string
  levels?: boolean
  part: string
}

type TypographyConstructor = CustomElementConstructor

function createTypography(
  tag: string,
  options: { levels?: boolean; part: string },
): TypographyConstructor {
  const { levels = false, part } = options

  class OASTypography extends OASElement {
    static override get observedAttributes(): string[] {
      return levels ? ['level', 'type', 'ellipsis'] : ['type', 'ellipsis', 'copyable']
    }

    private root: HTMLElement | null = null
    private copyBtn: HTMLButtonElement | null = null

    /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
    private template(): string {
      const level = Number(this.getAttr('level', '3')) || 3
      const tagName = levels ? (`h${level}` as const) : tag
      return `
        <style>${BASE_STYLE}</style>
        <${tagName} class="text" part="${part}">
          <slot></slot>
        </${tagName}>
        <button class="copy-btn" part="copy" hidden></button>
      `
    }

    /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
    private bind(): void {
      this.root = this.shadow.querySelector('.text')
      this.copyBtn = this.shadow.querySelector('.copy-btn')
      this.copyBtn?.addEventListener('click', () => this.handleCopy())
    }

    protected override render(): void {
      this.shadow.innerHTML = this.template()
      this.bind()
    }

    /** 真水合：校验 SSR 快照结构（关键节点 .text 存在）后直接接管，跳过 shadow 重建 */
    protected override hydrate(): boolean {
      if (!this.shadow.querySelector('.text')) return false
      this.bind()
      return true
    }

    protected override update(): void {
      const root = this.root
      if (!root) return
      const type = this.getAttr('type', 'default') as TextType
      const ellipsis = this.hasAttr('ellipsis')
      root.classList.toggle('ellipsis', ellipsis)
      for (const key of Object.keys(TYPE_COLOR) as TextType[]) {
        root.classList.toggle(key, key === type && type !== 'default')
      }
      root.style.color = type === 'default' ? '' : TYPE_COLOR[type]!
      if (levels) {
        const level = Math.min(Math.max(Number(this.getAttr('level', '3')) || 3, 1), 5)
        const tagName = `h${level}` as const
        if (root.tagName.toLowerCase() !== tagName) {
          const next = document.createElement(tagName)
          next.className = root.className
          next.style.cssText = root.style.cssText
          next.setAttribute('part', part)
          root.replaceWith(next)
          this.root = next
        }
      }
      if (this.copyBtn) {
        this.copyBtn.hidden = !this.hasAttr('copyable')
        // 复制按钮内置文案走 locale registry（setLocale 切换自动刷新）
        this.copyBtn.setAttribute('aria-label', this.t('typography.copy'))
        this.copyBtn.textContent = this.t('typography.copy')
      }
    }

    private async handleCopy(): Promise<void> {
      const text = this.textContent ?? ''
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
        }
        this.emit('copy', { text })
      } catch {
        this.emit('copy-error', { text })
      }
    }
  }

  return OASTypography
}

export const OASText = createTypography('span', { part: 'text' })
export const OASTitle = createTypography('div', { levels: true, part: 'title' })
export const OASParagraph = createTypography('p', { part: 'paragraph' })
