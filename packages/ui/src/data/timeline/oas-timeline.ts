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
.item {
  position: relative;
  padding-left: var(--oas-space-5);
  padding-bottom: var(--oas-space-5);
}
.item::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--oas-color-border);
}
.item:last-child::before {
  display: none;
}
.dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 10px;
  /* border-box：总宽 10px、圆心 5px，与连接线（left:4px + 2px 宽 → 中心 5px）对齐；
     content-box 下总宽 14px 圆心 7px，会偏右 2px */
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--oas-color-primary);
  border: 2px solid var(--oas-color-bg);
  z-index: 1;
}
.dot[data-color='green'] { background: var(--oas-color-success, #52c41a); }
.dot[data-color='red'] { background: var(--oas-color-danger, #ff4d4f); }
.dot[data-color='gray'] { background: var(--oas-color-text-secondary, #999); }
.time {
  /* 次级文本按比例跟随 host（原 xs/md ≈ 12/14） */
  font-size: 0.857em;
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-1);
}
.content {
  line-height: 1.6;
}
/* 进行中（pending）节点：空心圆点 + 虚线连接 */
.item[data-pending]::before {
  background: transparent;
  border-left: 2px dashed var(--oas-color-border);
}
.item[data-pending]:last-child::before {
  display: block;
  bottom: auto;
  height: var(--oas-space-2);
}
.item[data-pending] .dot {
  background: var(--oas-color-bg);
  border-color: var(--oas-color-primary);
  animation: oas-timeline-pulse 1.6s ease-in-out infinite;
}
@keyframes oas-timeline-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.pending-text {
  color: var(--oas-color-text-secondary);
  /* 次级文本按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
}
`

export class OASTimeline extends OASElement {
  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="timeline" part="timeline"></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；timeline 无事件绑定，行渲染由 update 驱动） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（timeline 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.timeline')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector('.timeline')
    if (!wrap) return
    wrap.innerHTML = ''
    for (const item of this.querySelectorAll('oas-timeline-item') as NodeListOf<OASTimelineItem>) {
      const pending = item.hasAttribute('pending')
      const row = document.createElement('div')
      row.className = 'item'
      row.setAttribute('part', 'item')
      row.setAttribute('data-color', item.getAttribute('color') ?? '')
      if (pending) row.setAttribute('data-pending', '')
      const dot = document.createElement('span')
      dot.className = 'dot'
      dot.setAttribute('data-color', item.getAttribute('color') ?? '')
      const body = document.createElement('div')
      const time = document.createElement('div')
      time.className = 'time'
      time.textContent = item.getAttribute('time') ?? ''
      const content = document.createElement('div')
      content.className = 'content'
      const clone = item.cloneNode(true) as OASTimelineItem
      if (pending && !(clone.textContent ?? '').trim()) {
        const tip = document.createElement('p')
        tip.className = 'pending-text'
        tip.textContent = this.t('timeline.pending')
        clone.appendChild(tip)
      }
      content.append(clone)
      body.append(time, content)
      row.append(dot, body)
      wrap.appendChild(row)
    }
  }
}
