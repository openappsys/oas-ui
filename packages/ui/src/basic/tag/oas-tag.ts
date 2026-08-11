import { OASElement } from '@oas-ui/core'

export type TagType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type TagSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_TAG_SIZES: readonly TagSize[] = ['xs', 'small', 'medium', 'large', 'xl']
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
:host([clickable]:focus-visible) .tag {
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
}
.tag.success {
  border-color: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
  color: var(--oas-color-success);
}
.tag.warning {
  border-color: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-warning) 12%, transparent);
  color: var(--oas-color-warning);
}
.tag.danger {
  border-color: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  color: var(--oas-color-danger);
}
.tag.info {
  border-color: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-active);
}
.tag.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
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
.tag.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tag.disabled.clickable:hover {
  border-color: var(--oas-color-border);
  color: inherit;
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
    return ['type', 'size', 'closable', 'round', 'chip', 'clickable', 'disabled']
  }

  private tagRoot: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="tag" part="tag">
        <slot></slot>
        <button part="close" aria-label="" hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；事件绑定幂等性由 rendered 标志保证只走一次） */
  private bind(): void {
    this.tagRoot = this.shadow.querySelector<HTMLElement>('.tag')
    this.shadow.querySelector('button')?.addEventListener('click', (e: MouseEvent) => {
      // 关闭按钮事件自带处理，不再向上触发整签 oas-click
      e.stopPropagation()
      if (this.hasAttr('disabled')) return
      const event = new CustomEvent('oas-close', {
        bubbles: true,
        composed: true,
        cancelable: true,
      })
      const notPrevented = this.dispatchEvent(event)
      if (notPrevented) this.remove()
    })
    // 整签可点（clickable）：点击/Enter/Space 派发 oas-click；disabled 不可点
    this.addEventListener('click', (e: Event) => {
      if (!this.hasAttr('clickable') || this.hasAttr('disabled')) return
      const btn = this.tagRoot?.querySelector('button')
      if (btn && e.composedPath().includes(btn)) return
      this.emit('click', { originalEvent: e })
    })
    this.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      if (!this.hasAttr('clickable') || this.hasAttr('disabled')) return
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

  /** 真水合：校验 SSR 快照结构（关键节点 .tag 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tag')) return false
    this.bind()
    return true
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
    const disabled = this.hasAttr('disabled')

    this.tagRoot.className = `tag ${type} ${size}${round ? ' round' : ''}${chip ? ' chip' : ''}${clickable ? ' clickable' : ''}${disabled ? ' disabled' : ''}`

    if (clickable) {
      // 整签承担按钮角色；disabled 时不可聚焦、aria-disabled 同步
      this.setAttribute('role', 'button')
      if (disabled) this.removeAttribute('tabindex')
      else this.setAttribute('tabindex', '0')
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
      this.removeAttribute('aria-disabled')
    }

    const btn = this.tagRoot.querySelector('button')
    if (btn) {
      btn.hidden = !closable
      // disabled 不可关：原生 disabled 阻断点击与聚焦
      btn.disabled = disabled
      // 关闭按钮内置文案走 locale registry（setLocale 切换自动刷新）
      btn.setAttribute('aria-label', this.t('tag.close'))
    }
  }
}
