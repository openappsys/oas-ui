import { OASElement } from '@oas-ui/core'
import type { OASTimelineItem } from './oas-timeline-item.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 时间线内容跟随外层字号；定制开口：--oas-timeline-font（次级文本按 em 比例跟随） */
  font-size: var(--oas-timeline-font, inherit);
}
:host([hidden]) {
  display: none;
}
/* 纵向：条目纵向堆叠；reverse 视觉倒序（DOM 顺序不变，朗读/焦点顺序稳定） */
.timeline {
  display: flex;
  flex-direction: column;
}
.timeline[data-reverse='true'] {
  flex-direction: column-reverse;
}
/* 横向：条目横向排布（reverse 同理） */
.timeline[data-direction='horizontal'] {
  flex-direction: row;
  align-items: stretch;
}
.timeline[data-direction='horizontal'][data-reverse='true'] {
  flex-direction: row-reverse;
}
`

export class OASTimeline extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'mode', 'reverse']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="timeline" part="timeline"><slot></slot></div>
    `
  }

  private observer: MutationObserver | null = null

  /** 缓存节点引用（render 与水合路径共用）+ 子项增删监听（上下文下发） */
  private bind(): void {
    // 条目增删/重排后重发上下文（data-direction / data-mode）
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => {
      this.observer?.disconnect()
      this.observer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（timeline 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="timeline"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector('[part="timeline"]')
    if (!wrap) return
    const direction = this.getAttr('direction', '') === 'horizontal' ? 'horizontal' : 'vertical'
    const modeAttr = this.getAttr('mode', '')
    const mode = modeAttr === 'right' || modeAttr === 'alternate' ? modeAttr : 'left'
    wrap.setAttribute('data-direction', direction)
    wrap.setAttribute('data-mode', mode)
    wrap.setAttribute('data-reverse', String(this.hasAttr('reverse')))
    // 布局上下文下发给每个条目（条目自包含行，据此刻画轴/线/分列）
    for (const item of this.querySelectorAll('oas-timeline-item') as NodeListOf<OASTimelineItem>) {
      item.setAttribute('data-direction', direction)
      item.setAttribute('data-mode', mode)
    }
  }
}
