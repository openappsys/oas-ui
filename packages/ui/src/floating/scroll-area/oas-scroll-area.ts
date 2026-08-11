import { OASElement } from '@oas-ui/core'

const MIN_THUMB = 24
const HIDE_DELAY = 800

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.scroll-area {
  position: relative;
  width: 100%;
  height: 100%;
}
.viewport {
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-width: none; /* Firefox：隐藏原生滚动条 */
}
.viewport::-webkit-scrollbar {
  display: none; /* Chromium/Safari：隐藏原生滚动条 */
}
/* 自定义滚动条：细条 + hover 变粗；auto-hide 时仅在滚动/悬停显示 */
.track {
  position: absolute;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    width var(--oas-transition-fast) var(--oas-ease-out),
    height var(--oas-transition-fast) var(--oas-ease-out);
}
.track.peek {
  opacity: 1;
  pointer-events: auto;
}
.track-v {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}
.track-h {
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: 6px;
}
.thumb {
  position: absolute;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-border-strong);
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.track-v .thumb {
  left: 0;
  right: 0;
  top: 0;
}
.track-h .thumb {
  top: 0;
  bottom: 0;
  left: 0;
}
.track:hover .thumb {
  background: var(--oas-color-text-disabled);
}
/* hover 变粗：纵向轨道加宽、横向轨道变高（thumb 随轨道尺寸变化） */
.track-v:hover {
  width: 10px;
}
.track-h:hover {
  height: 10px;
}
.track-v:focus-visible,
.track-h:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/**
 * oas-scroll-area —— 自定义滚动条容器。
 *
 * 属性（kebab-case）：
 * - `height`/`width`：视口固定尺寸（px），不设置时随内容自然撑开
 * - `auto-hide`：滚动条仅在滚动/悬停时显示，超时自动隐藏
 *
 * 事件（bubbles + composed）：
 * - `oas-scroll`：`{ scrollTop, scrollLeft }`，rAF 节流
 */
export class OASScrollArea extends OASElement {
  static override get observedAttributes(): string[] {
    return ['height', 'width', 'auto-hide']
  }

  private viewport: HTMLElement | null = null
  private vTrack: HTMLElement | null = null
  private vThumb: HTMLElement | null = null
  private hTrack: HTMLElement | null = null
  private hThumb: HTMLElement | null = null
  private raf = 0
  private hideTimer = 0
  private resizeObserver: ResizeObserver | null = null
  /** 水合首帧的布局写入是否已延迟登记（抑制直至 rAF 校正完成，含 RO 首回调等同期写入） */
  private layoutRafScheduled = false
  private hydratedFirstFrameApplied = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="scroll-area">
        <div class="viewport" part="viewport" tabindex="0">
          <slot></slot>
        </div>
        <div class="track track-v" part="track-v" aria-hidden="true">
          <div class="thumb" part="thumb-v"></div>
        </div>
        <div class="track track-h" part="track-h" aria-hidden="true">
          <div class="thumb" part="thumb-h"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定滚动/悬停监听 + 尺寸观察（render 与水合路径共用） */
  private bind(): void {
    this.viewport = this.shadow.querySelector('.viewport')
    this.vTrack = this.shadow.querySelector('.track-v')
    this.vThumb = this.shadow.querySelector('[part="thumb-v"]')
    this.hTrack = this.shadow.querySelector('.track-h')
    this.hThumb = this.shadow.querySelector('[part="thumb-h"]')
    const wrap = this.shadow.querySelector('.scroll-area')
    this.viewport?.addEventListener('scroll', this.handleScrollEvt, { passive: true })
    wrap?.addEventListener('pointerenter', this.peek)
    wrap?.addEventListener('pointerleave', this.scheduleHide)
    this.onCleanup(() => {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      if (this.hideTimer) window.clearTimeout(this.hideTimer)
      this.hideTimer = 0
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
    })
    // 内容/容器尺寸变化时重算滚动条（内容增删后即时生效）；走 update() 统一入口，
    // 水合首帧时 RO 首回调同样被延迟抑制（避免第一帧提前写滚动条）
    if (typeof ResizeObserver !== 'undefined' && wrap) {
      this.resizeObserver = new ResizeObserver(() => this.update())
      this.resizeObserver.observe(wrap)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（viewport 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // DSD 水合首帧：滚动条可见性/尺寸写入延迟到首帧后（快照首帧与 hydrate 后一致，第二帧校正）。
    // 纯 CSR 或水合后的后续 update 一律同步写入（行为不变）。
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedSync()
      return
    }
    this.syncSize()
    this.syncThumbs()
  }

  /** 水合首帧：滚动条写入统一延迟到 rAF 校正；期间（含 rAF 前其他 update/RO 回调）一律抑制 */
  private scheduleHydratedSync(): void {
    if (this.layoutRafScheduled) return
    this.layoutRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.syncSize()
      this.syncThumbs()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  private autoHide(): boolean {
    return this.hasAttr('auto-hide')
  }

  private px(attr: string): string {
    const raw = this.getAttr(attr, '').trim()
    if (!raw) return ''
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? `${n}px` : ''
  }

  private syncSize(): void {
    const vp = this.viewport
    if (!vp) return
    vp.style.height = this.px('height')
    vp.style.width = this.px('width')
  }

  private syncThumbs(): void {
    const vp = this.viewport
    if (!vp) return
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = vp

    const vOverflow = scrollHeight > clientHeight
    this.vTrack?.classList.toggle('visible', vOverflow)
    if (vOverflow && this.vThumb) {
      const thumbH = Math.max(MIN_THUMB, clientHeight * (clientHeight / scrollHeight))
      const maxScroll = scrollHeight - clientHeight
      const maxTop = clientHeight - thumbH
      const top = maxScroll > 0 ? maxTop * (scrollTop / maxScroll) : 0
      this.vThumb.style.height = `${thumbH}px`
      this.vThumb.style.transform = `translateY(${top}px)`
    }

    const hOverflow = scrollWidth > clientWidth
    this.hTrack?.classList.toggle('visible', hOverflow)
    if (hOverflow && this.hThumb) {
      const thumbW = Math.max(MIN_THUMB, clientWidth * (clientWidth / scrollWidth))
      const maxScroll = scrollWidth - clientWidth
      const maxLeft = clientWidth - thumbW
      const left = maxScroll > 0 ? maxLeft * (scrollLeft / maxScroll) : 0
      this.hThumb.style.width = `${thumbW}px`
      this.hThumb.style.transform = `translateX(${left}px)`
    }

    // 非 auto-hide：溢出时滚动条常显（内容收缩回未溢出时清理）
    if (!this.autoHide()) {
      this.vTrack?.classList.toggle('peek', vOverflow)
      this.hTrack?.classList.toggle('peek', hOverflow)
    }
  }

  private peek = (): void => {
    if (!this.autoHide()) return
    this.vTrack?.classList.add('peek')
    this.hTrack?.classList.add('peek')
    this.scheduleHide()
  }

  private scheduleHide = (): void => {
    if (!this.autoHide()) return
    if (this.hideTimer) window.clearTimeout(this.hideTimer)
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = 0
      this.vTrack?.classList.remove('peek')
      this.hTrack?.classList.remove('peek')
    }, HIDE_DELAY)
  }

  private handleScrollEvt = (): void => {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.syncThumbs()
      this.peek()
      const vp = this.viewport
      this.emit('scroll', {
        scrollTop: vp ? vp.scrollTop : 0,
        scrollLeft: vp ? vp.scrollLeft : 0,
      })
    })
  }
}
