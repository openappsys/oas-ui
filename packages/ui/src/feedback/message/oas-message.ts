import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  max-width: 360px;
  margin-bottom: var(--oas-space-2);
}
.box {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
/* type 属性设在 host 上，颜色选择器需从 host 属性命中 */
:host([type='success']) .box {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
:host([type='error']) .box {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
:host([type='warning']) .box {
  border-color: var(--oas-color-warning);
  color: var(--oas-color-warning);
}
.text {
  flex: 1;
}
.close {
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: inherit;
}
`

export type MessageType = 'info' | 'success' | 'warning' | 'error'

export class OASMessage extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'group', 'duration', 'count']
  }

  private timer: ReturnType<typeof setTimeout> | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="status">
        <span class="text" part="text"></span>
        <button class="close" part="close" aria-label="">✕</button>
      </div>
    `
    this.shadow
      .querySelector<HTMLButtonElement>('.close')
      ?.addEventListener('click', () => this.close())
    this.onCleanup(() => this.clearTimer())
    this.syncRole()
    this.syncText()
    this.startTimer()
  }

  protected override update(): void {
    this.syncRole()
    this.syncText()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('message.close'))
  }

  /**
   * 命令式层刷新入口：更新内容/类型/时长/合并计数并重置自动关闭计时。
   * 更新内容必须经此方法——textContent 变更不触发 attributeChangedCallback，
   * 无法靠 update() 增量同步。
   */
  refresh(content: string, type?: MessageType, duration?: number, count?: number): void {
    this.textContent = content
    if (type) this.setAttribute('type', type)
    if (duration !== undefined) this.setAttribute('duration', String(duration))
    if (count !== undefined) this.setAttribute('count', String(count))
    this.syncText()
    this.startTimer()
  }

  /** 关闭：派发 oas-close（detail 携带 key）后移除 */
  close(): void {
    this.clearTimer()
    this.emit('close', { key: this.getAttr('key') || undefined })
    this.remove()
  }

  private syncRole(): void {
    const box = this.shadow.querySelector<HTMLElement>('[part="box"]')
    if (!box) return
    box.setAttribute('role', this.getAttr('type', 'info') === 'error' ? 'alert' : 'status')
  }

  private syncText(): void {
    const textEl = this.shadow.querySelector<HTMLElement>('[part="text"]')
    if (!textEl) return
    const content = this.textContent ?? ''
    const count = Number(this.getAttr('count', '0'))
    // 分组合并计数 >1 时在内容后展示 `×n`
    textEl.textContent = count > 1 ? `${content} ×${count}` : content
  }

  private startTimer(): void {
    this.clearTimer()
    const duration = Number(this.getAttr('duration', '3000'))
    if (duration > 0) {
      this.timer = setTimeout(() => this.close(), duration)
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
