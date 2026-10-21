import { OASElement } from '@oas-ui/core'

export type MessageActionTone = 'default' | 'danger'

export interface MessageAction {
  key: string
  label: string
  title?: string
  disabled?: boolean
  active?: boolean
  tone?: MessageActionTone
}

export interface MessageActionDetail {
  key: string
  messageId?: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none !important;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1);
}
.actions[data-align='end'] {
  justify-content: flex-end;
}
.action {
  appearance: none;
  border: 0;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  min-height: 28px;
  padding: 0 var(--oas-space-1_5);
}
.action:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.action:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
.action[aria-pressed='true'] {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-text-primary);
  font-weight: 600;
}
.action[data-tone='danger'] {
  color: var(--oas-color-danger);
}
.action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
`

/**
 * oas-message-actions — 消息操作条（复制/重试/编辑/重新生成/分支/反馈等）
 *
 * 只渲染按钮并派发 `oas-action`，不执行任何业务动作；会话状态由宿主持有。
 *
 * 属性：
 * - `actions`：JSON `[{ key, label, title?, disabled?, active?, tone? }]`
 * - `message-id`：随事件 detail 回传
 * - `align`：`start`（默认）/ `end`
 * - `disabled`：禁用全部操作
 *
 * 事件：`oas-action` detail `{ key, messageId }`
 */
export class OASMessageActions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['actions', 'message-id', 'align', 'disabled', 'label']
  }

  private actionsEl: HTMLElement | null = null
  private actionsRaw = ''

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="actions" part="actions" role="group"></div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="actions"]')) return false
    this.bind()
    return true
  }

  private bind(): void {
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
  }

  protected override update(): void {
    const box = this.actionsEl
    if (!box) return
    box.dataset.align = this.getAttr('align', 'start') === 'end' ? 'end' : 'start'
    const label = this.getAttr('label', '')
    if (label) box.setAttribute('aria-label', label)
    else box.removeAttribute('aria-label')
    const raw = this.getAttr('actions', '')
    if (raw === this.actionsRaw && box.childElementCount > 0) {
      this.syncDisabled(box)
      return
    }
    this.actionsRaw = raw
    box.innerHTML = ''
    for (const action of this.parseActions(raw)) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'action'
      button.setAttribute('part', 'action')
      button.dataset.key = action.key
      if (action.tone === 'danger') button.dataset.tone = 'danger'
      button.textContent = action.label
      button.title = action.title ?? action.label
      button.disabled = this.hasAttr('disabled') || action.disabled === true
      if (action.active) button.setAttribute('aria-pressed', 'true')
      button.addEventListener('click', () => {
        if (button.disabled) return
        this.emit('action', {
          key: action.key,
          messageId: this.getAttr('message-id', '') || undefined,
        } satisfies MessageActionDetail)
      })
      box.appendChild(button)
    }
    this.syncDisabled(box)
  }

  private syncDisabled(box: HTMLElement): void {
    const disabled = this.hasAttr('disabled')
    for (const button of box.querySelectorAll<HTMLButtonElement>('.action')) {
      const own = this.parseActions(this.actionsRaw).find((action) => action.key === button.dataset.key)
      button.disabled = disabled || own?.disabled === true
    }
  }

  private parseActions(raw: string): MessageAction[] {
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    const out: MessageAction[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      const record = item as Record<string, unknown>
      if (typeof record.key !== 'string' || record.key.trim() === '') continue
      const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : record.key.trim()
      out.push({
        key: record.key.trim(),
        label,
        title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : undefined,
        disabled: record.disabled === true,
        active: record.active === true,
        tone: record.tone === 'danger' ? 'danger' : 'default',
      })
    }
    return out
  }
}
