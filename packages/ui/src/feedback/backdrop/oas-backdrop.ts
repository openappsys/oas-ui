import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: none;
}
:host([open]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040));
}
:host([transparent]) .mask {
  background: transparent;
}
:host([blur]) .mask {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
`

/**
 * body scroll 锁定：不移除滚动条（overflow:hidden 会移除滚动条→视口变宽→页面/固定元素位移），
 * 改为拦截滚动行为（wheel / touchmove / 滚动方向键），滚动条保持可见 → 视口宽度不变 → 零位移。
 * 计数器保证多个遮罩同时打开时，只有最后一个关闭才解除拦截。
 */
let scrollLockCount = 0

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

function preventScroll(e: Event): void {
  e.preventDefault()
}

function preventScrollKeydown(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null
  // 输入类控件内不拦截（保留正常输入），仅拦截会滚动页面的按键
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  )
    return
  if (SCROLL_KEYS.has(e.key)) e.preventDefault()
}

function lockScroll(): void {
  if (scrollLockCount === 0) {
    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })
    window.addEventListener('keydown', preventScrollKeydown, { passive: false })
  }
  scrollLockCount++
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    window.removeEventListener('wheel', preventScroll)
    window.removeEventListener('touchmove', preventScroll)
    window.removeEventListener('keydown', preventScrollKeydown)
  }
}

export class OASBackdrop extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'transparent', 'blur', 'lock-scroll']
  }

  private locked = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
    `
  }

  /** 绑定遮罩点击事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector<HTMLElement>('.mask')?.addEventListener('click', (e) => {
      this.emit('click', { originalEvent: e })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（mask 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const open = this.hasAttr('open')
    if (open) {
      if (!this.locked && this.getAttr('lock-scroll', 'true') !== 'false') {
        lockScroll()
        this.locked = true
      }
    } else {
      if (this.locked) {
        unlockScroll()
        this.locked = false
      }
      // open=false 卸载节点，无孤儿 DOM（Esc 不自动关闭，由外层弹窗决定）
      this.remove()
    }
  }

  override disconnectedCallback(): void {
    if (this.locked) {
      unlockScroll()
      this.locked = false
    }
    super.disconnectedCallback()
  }
}
