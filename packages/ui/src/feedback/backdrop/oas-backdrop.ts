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
  z-index: var(--oas-z-overlay, 1040);
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
 * body scroll 锁定：计数器保证多个遮罩同时打开时，
 * 只有最后一个关闭才恢复原始的 overflow，避免互相覆盖。
 */
let scrollLockCount = 0
let previousOverflow = ''
let previousGutter = ''

function lockScroll(): void {
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow
    previousGutter = document.documentElement.style.scrollbarGutter
    // 有滚动条时先预留滚动条槽位（scrollbar-gutter: stable），再锁滚动移除滚动条
    // 视口宽度不变 → 固定定位元素与页面内容都不位移（经典滚动条环境下的页面晃动修复）
    const hasScrollbar = window.innerWidth > document.documentElement.clientWidth
    if (hasScrollbar) document.documentElement.style.scrollbarGutter = 'stable'
  }
  scrollLockCount++
  document.body.style.overflow = 'hidden'
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousOverflow
    document.documentElement.style.scrollbarGutter = previousGutter
  }
}

export class OASBackdrop extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'transparent', 'blur', 'lock-scroll']
  }

  private locked = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
    `
    this.shadow.querySelector<HTMLElement>('.mask')?.addEventListener('click', (e) => {
      this.emit('click', { originalEvent: e })
    })
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
