import { OASElement } from '@oas-ui/core'
import type { OASTimelineItem } from './oas-timeline-item.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
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
  border-radius: 50%;
  background: var(--oas-color-primary);
  border: 2px solid var(--oas-color-bg);
  z-index: 1;
}
.dot[data-color='green'] { background: var(--oas-color-success, #52c41a); }
.dot[data-color='red'] { background: var(--oas-color-danger, #ff4d4f); }
.dot[data-color='gray'] { background: var(--oas-color-text-secondary, #999); }
.time {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-1);
}
.content {
  line-height: 1.6;
}
`

export class OASTimeline extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="timeline" part="timeline"></div>
    `
    this.update()
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector('.timeline')
    if (!wrap) return
    wrap.innerHTML = ''
    for (const item of this.querySelectorAll('oas-timeline-item') as NodeListOf<OASTimelineItem>) {
      const row = document.createElement('div')
      row.className = 'item'
      row.setAttribute('part', 'item')
      row.setAttribute('data-color', item.getAttribute('color') ?? '')
      const dot = document.createElement('span')
      dot.className = 'dot'
      dot.setAttribute('data-color', item.getAttribute('color') ?? '')
      const body = document.createElement('div')
      const time = document.createElement('div')
      time.className = 'time'
      time.textContent = item.getAttribute('time') ?? ''
      const content = document.createElement('div')
      content.className = 'content'
      content.append(item.cloneNode(true))
      body.append(time, content)
      row.append(dot, body)
      wrap.appendChild(row)
    }
  }
}
