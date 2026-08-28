import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.wrap {
  display: inline-block;
}
.wrap.fixed {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-sticky, 1020));
}
`

export class OASAffix extends OASElement {
  static override get observedAttributes(): string[] {
    return ['offset']
  }

  private wrap: HTMLElement | null = null
  private lastTop: number | null = null
  /** 水合首帧的布局写入是否已延迟登记（抑制直至 rAF 校正完成，含 RO 首回调等同期写入） */
  private layoutRafScheduled = false
  private hydratedFirstFrameApplied = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap"><slot></slot></div>
    `
  }

  /** 缓存节点引用 + 绑定滚动监听（render 与水合路径共用） */
  private bind(): void {
    this.wrap = this.shadow.querySelector('.wrap')
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => window.removeEventListener('scroll', this.handleScroll))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（wrap 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.wrap')) return false
    this.bind()
    return true
  }

  private handleScroll = (): void => {
    const now = Math.round(window.scrollY)
    if (this.lastTop === null) {
      this.lastTop = now
      return
    }
    if (Math.abs(now - this.lastTop) < 4) return
    this.lastTop = now
    this.apply()
  }

  protected override update(): void {
    // DSD 水合首帧：吸顶态写入延迟到首帧后（快照首帧与 hydrate 后一致，第二帧校正）。
    // 纯 CSR 或水合后的后续 update 一律同步写入（行为不变）。
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedApply()
      return
    }
    this.apply()
  }

  /** 水合首帧：布局写入统一延迟到 rAF 校正；期间（含 rAF 前其他 update/RO 回调）一律抑制 */
  private scheduleHydratedApply(): void {
    if (this.layoutRafScheduled) return
    this.layoutRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.apply()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  private apply(): void {
    if (!this.wrap) return
    const offset = Number(this.getAttr('offset', '0')) || 0
    const rect = this.getBoundingClientRect()
    const stuck = rect.top <= offset
    this.wrap.classList.toggle('fixed', stuck)
    if (stuck) this.wrap.style.top = `${offset}px`
  }
}
