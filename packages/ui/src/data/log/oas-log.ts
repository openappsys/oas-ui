import { OASElement } from '@oas-ui/core'

/** 视为"贴底"的滚动剩余距离阈值（px），小于等于该值判定用户停在底部 */
const AUTO_SCROLL_THRESHOLD = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.viewport {
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
.log {
  box-sizing: border-box;
  min-height: 100%;
}
/* 等宽字体：日志流逐行对齐 */
.row {
  display: flex;
  align-items: baseline;
  padding-inline: var(--oas-space-3);
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: var(--oas-font-size-sm);
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.gutter {
  flex-shrink: 0;
  min-width: 2.5em;
  padding-inline-end: var(--oas-space-3);
  text-align: end;
  color: var(--oas-color-text-disabled);
  user-select: none;
}
.log[data-line-number='false'] .gutter {
  display: none;
}
.line {
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
/* 空态占位 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-6);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border-strong);
}
`

/**
 * oas-log —— 等宽字体的日志流。
 *
 * 属性（kebab-case）：
 * - `lines`（property，`string[]`）：日志行数据（property 通道优先；也支持 `lines` 属性传 JSON 字符串）
 * - `auto-scroll`：追加后自动滚动到底，默认 `true`；仅当用户本就停靠在底部（未上翻）时滚动
 * - `line-number`：显示左侧行号栏
 * - `empty-text`：空态文案（覆盖 locale 默认值）
 *
 * 实现要点：`lines` 更新时增量追加/移除行（不重建已有节点），大量行下保持性能；
 * 滚动监听实时维护"是否贴底"状态，断开连接时经 onCleanup 清理。
 */
export class OASLog extends OASElement {
  static override get observedAttributes(): string[] {
    return ['lines', 'auto-scroll', 'line-number', 'empty-text']
  }

  private data: string[] = []
  private linesFromProperty = false
  private viewport: HTMLElement | null = null
  private logEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  /** 用户是否停靠在底部（未上翻）——由滚动事件实时维护 */
  private stickToBottom = true

  get lines(): string[] {
    return this.data.slice()
  }

  set lines(value: string[]) {
    this.data = Array.isArray(value)
      ? value.filter((l): l is string => typeof l === 'string')
      : []
    this.linesFromProperty = true
    if (this.isConnected) this.update()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport" tabindex="0">
        <div class="log" part="log" role="log" aria-live="polite" hidden></div>
        <div class="empty" part="empty" hidden>
          <div class="empty-icon" aria-hidden="true"></div>
          <span part="empty-text"></span>
        </div>
      </div>
    `
    this.viewport = this.shadow.querySelector('.viewport')
    this.logEl = this.shadow.querySelector('.log')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.viewport?.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => {
      this.viewport?.removeEventListener('scroll', this.handleScroll)
    })
    this.update()
  }

  protected override update(): void {
    this.parseLines()
    // 在改动 DOM 前记录停靠状态：追加后 scrollHeight 已变大，事后无法判断"追加前是否在底部"
    const wasStuck = this.stickToBottom
    this.reconcileRows()
    this.syncEmpty()
    this.syncLineNumber()
    const vp = this.viewport
    if (vp && this.autoScroll() && wasStuck) {
      vp.scrollTop = vp.scrollHeight
    }
  }

  private autoScroll(): boolean {
    return this.getAttr('auto-scroll', 'true') !== 'false'
  }

  private parseLines(): void {
    if (this.linesFromProperty) return
    const raw = this.getAttribute('lines')
    if (raw == null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.data = parsed.filter((l): l is string => typeof l === 'string')
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  /** 增量同步行：只追加新增行、移除多余行，不重建已有节点（大量行性能） */
  private reconcileRows(): void {
    const logEl = this.logEl
    if (!logEl) return
    const count = this.data.length
    while (logEl.children.length > count) {
      const last = logEl.children.item(logEl.children.length - 1)
      if (last) logEl.removeChild(last)
    }
    for (let i = logEl.children.length; i < count; i++) {
      logEl.appendChild(this.createRow(i))
    }
  }

  private createRow(index: number): HTMLElement {
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')
    const gutter = document.createElement('div')
    gutter.className = 'gutter'
    gutter.setAttribute('part', 'line-number')
    gutter.textContent = String(index + 1)
    const line = document.createElement('div')
    line.className = 'line'
    line.setAttribute('part', 'line')
    line.textContent = this.data[index] ?? ''
    row.append(gutter, line)
    return row
  }

  private syncEmpty(): void {
    const isEmpty = this.data.length === 0
    if (this.logEl) this.logEl.hidden = isEmpty
    if (this.emptyEl) this.emptyEl.hidden = !isEmpty
    const text = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    if (text) text.textContent = this.getAttr('empty-text', this.t('log.empty'))
  }

  private syncLineNumber(): void {
    this.logEl?.setAttribute('data-line-number', String(this.hasAttr('line-number')))
  }

  private handleScroll = (): void => {
    const vp = this.viewport
    if (!vp) return
    this.stickToBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight <= AUTO_SCROLL_THRESHOLD
  }
}
