import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-family: inherit;
  user-select: none;
  flex-shrink: 0;
}
:host([hidden]) {
  display: none;
}
img,
.fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 50%;
}
img {
  object-fit: cover;
}
.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
[hidden] {
  display: none !important;
}
/* 角标：视觉对齐 oas-badge（danger 底 + on-danger 字，dot 8px 圆点），尺寸随头像 size 缩放 */
.badge {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge.color-primary {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.badge.color-success {
  background: var(--oas-color-success);
  color: var(--oas-color-text-on-success);
}
.badge.color-warning {
  background: var(--oas-color-warning);
  color: var(--oas-color-text-on-warning);
}
.badge.placement-top-right {
  top: 0;
  inset-inline-end: 0;
  transform: translate(50%, -50%);
}
.badge.placement-bottom-right {
  bottom: 0;
  inset-inline-end: 0;
  transform: translate(50%, 50%);
}
`

/**
 * oas-avatar —— 头像（v1.6 P0 增强：徽标叠加 + 加载失败回退）。
 *
 * 徽标：`badge` 文本或布尔（空值显示小圆点）、`badge-dot` 圆点变体、
 * `badge-color` 彩色、`badge-placement` 位置（top-right/bottom-right）；
 * 视觉对齐 oas-badge（同一套 danger 底 / on-* 字 token），尺寸随头像 size 缩放。
 *
 * 回退：图片 `error` 时隐藏 img，按 `fallback` 命名插槽 → 内容首字符 → `?` 的
 * 优先级回退占位；`failed` 状态保持，仅 `src` 变化时重置重新加载。
 * 模板常驻 img + fallback 容器（badge 组件同款「骨架常驻、hidden 切换」模式），
 * 动态增删 src 无需重建 shadow，DSD 快照结构稳定。
 */
export class OASAvatar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['src', 'size', 'alt', 'badge', 'badge-dot', 'badge-color', 'badge-placement', 'text']
  }

  /** 图片加载失败态（仅 src 变化时重置） */
  private failed = false
  private lastSrc = ''
  /** 宿主 light DOM 文本变化观察器（运行时改 textContent 也能刷新首字符） */
  private textObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <img part="image" alt="">
      <span class="fallback" part="fallback">
        <slot name="fallback"></slot>
        <span class="text" part="text"></span>
      </span>
      <span class="badge" part="badge" hidden></span>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('img')?.addEventListener('error', () => this.handleImgError())
    // 宿主侧 fallback 命名插槽增删内容（slotchange 异步）时刷新占位（slot 内容优先于首字符）
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="fallback"]')
      ?.addEventListener('slotchange', () => this.update())
    // 宿主 light DOM 文本变化（运行时 avatar.textContent = '张'）→ 重算首字符，否则首字母停在初次快照
    this.ensureTextObserver()
  }

  /** 观察宿主 light DOM 文本/子节点变化（textContent setter 是 childList + characterData），变化即重算首字符 */
  private ensureTextObserver(): void {
    if (this.textObserver) return
    const observer = new MutationObserver(() => this.update())
    observer.observe(this, { childList: true, characterData: true, subtree: true })
    this.textObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.textObserver = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（img 与 fallback 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('img')) return false
    if (!this.shadow.querySelector('[part="fallback"]')) return false
    this.bind()
    return true
  }

  private handleImgError(): void {
    this.failed = true
    this.sync()
  }

  /** 统一可见性：无 src 或加载失败 → 显示 fallback 占位；否则显示 img */
  private sync(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    if (!fb) return
    const hasSrc = this.getAttr('src', '') !== ''
    const showFallback = !hasSrc || this.failed
    if (img) img.hidden = showFallback
    fb.hidden = !showFallback
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="fallback"]')
    const hasAssigned = slot ? slot.assignedNodes().length > 0 : false
    const text = fb.querySelector<HTMLElement>('[part="text"]')
    if (text) text.hidden = hasAssigned
  }

  /** 角标同步：显隐 / dot 变体 / 颜色 / 位置 / 随头像 size 缩放 */
  private syncBadge(size: string): void {
    const badgeEl = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    if (!badgeEl) return
    const hasBadge = this.hasAttr('badge') || this.hasAttr('badge-dot')
    badgeEl.hidden = !hasBadge
    if (!hasBadge) return

    const badgeText = this.getAttr('badge', '')
    const dot = this.hasAttr('badge-dot') || (this.hasAttr('badge') && badgeText === '')
    badgeEl.classList.toggle('dot', dot)

    const color = this.getAttr('badge-color', 'danger')
    badgeEl.classList.toggle('color-primary', color === 'primary')
    badgeEl.classList.toggle('color-success', color === 'success')
    badgeEl.classList.toggle('color-warning', color === 'warning')
    badgeEl.classList.toggle(
      'color-danger',
      color !== 'primary' && color !== 'success' && color !== 'warning',
    )

    const placement = this.getAttr('badge-placement', 'top-right')
    badgeEl.classList.toggle('placement-top-right', placement !== 'bottom-right')
    badgeEl.classList.toggle('placement-bottom-right', placement === 'bottom-right')

    const n = Number(size) || 32
    const bs = Math.max(12, Math.min(22, Math.round(n * 0.5)))
    if (dot) {
      const ds = Math.max(6, Math.round(bs * 0.5))
      badgeEl.style.width = `${ds}px`
      badgeEl.style.height = `${ds}px`
      badgeEl.style.minWidth = `${ds}px`
      badgeEl.style.borderRadius = '50%'
      badgeEl.style.lineHeight = 'normal'
      badgeEl.style.padding = '0'
      badgeEl.style.fontSize = ''
      badgeEl.textContent = ''
    } else {
      // 清除 dot 分支残留的内联样式（width/padding），回落到 CSS 默认（width auto、padding 0 4px）
      badgeEl.style.width = ''
      badgeEl.style.height = `${bs}px`
      badgeEl.style.minWidth = `${bs}px`
      badgeEl.style.lineHeight = `${bs}px`
      badgeEl.style.fontSize = `${Math.max(10, Math.round(bs * 0.75))}px`
      badgeEl.style.borderRadius = `${Math.round(bs / 2)}px`
      badgeEl.style.padding = ''
      badgeEl.textContent = badgeText
    }
  }

  protected override update(): void {
    const size = this.getAttr('size', '32')
    this.style.width = `${size}px`
    this.style.height = `${size}px`
    this.style.fontSize = `${Math.max(12, Number(size) * 0.4)}px`

    const img = this.shadow.querySelector('img')
    if (img) {
      const src = this.getAttr('src', '')
      if (src !== this.lastSrc) {
        this.lastSrc = src
        this.failed = false
      }
      img.setAttribute('src', src)
      img.setAttribute('alt', this.getAttr('alt', this.t('avatar.defaultAlt')))
    }
    const text = this.shadow.querySelector('[part="text"]')
    if (text) {
      // 声明式 text 属性优先（cleaner，React/Vue 桥接友好），否则回落宿主 textContent 首字符
      const source = this.getAttr('text', '') || (this.textContent ?? '')
      text.textContent = source.trim().charAt(0) || '?'
    }

    this.sync()
    this.syncBadge(size)
  }
}
