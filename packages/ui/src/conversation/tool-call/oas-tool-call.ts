import { OASElement } from '@oas-ui/core'

export type ToolCallStatus = 'running' | 'success' | 'error'
export interface ToolCallToggleDetail {
  open: boolean
  name: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none !important;
}
.tool {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  overflow: hidden;
}
.head {
  appearance: none;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-2) var(--oas-space-3);
  text-align: start;
}
.head:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.head:disabled {
  cursor: default;
}
.status {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oas-color-text-secondary);
}
.tool[data-status='running'] .status {
  background: var(--oas-color-warning);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--oas-color-warning) 18%, transparent);
}
.tool[data-status='success'] .status {
  background: var(--oas-color-success);
}
.tool[data-status='error'] .status {
  background: var(--oas-color-danger);
}
.name {
  font-weight: 600;
  flex: none;
}
.icon {
  display: inline-flex;
  flex: none;
}
.summary {
  color: var(--oas-color-text-secondary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-text {
  margin-inline-start: auto;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  flex: none;
}
.chevron {
  flex: none;
  color: var(--oas-color-text-secondary);
  transition: transform 120ms ease;
}
.head[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.body {
  border-top: 1px solid var(--oas-color-border);
  padding: var(--oas-space-2) var(--oas-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.body[hidden] {
  display: none !important;
}
.section {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
.section[hidden] {
  display: none !important;
}
.label {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
pre {
  margin: 0;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--oas-font-family-mono);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-subtle, var(--oas-color-bg-hover));
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-2);
}
@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
`

/**
 * oas-tool-call — 工具调用卡片
 *
 * 属性：`name`、`summary`、`status`（running/success/error）、`args`、`result`、`open`、`collapsible`
 * 事件：`oas-toggle` detail `{ open, name }`
 * 插槽：`icon`
 *
 * 只展示宿主提供的数据，不执行工具、不解析函数、不注入 HTML。
 */
export class OASToolCall extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'summary', 'status', 'args', 'result', 'open', 'collapsible']
  }

  private headEl: HTMLButtonElement | null = null
  private bodyEl: HTMLElement | null = null
  private nameEl: HTMLElement | null = null
  private summaryEl: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private argsEl: HTMLElement | null = null
  private argsPre: HTMLElement | null = null
  private resultEl: HTMLElement | null = null
  private resultPre: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tool" part="tool">
        <button class="head" part="head" type="button" aria-expanded="false">
          <span class="status" part="status" aria-hidden="true"></span>
          <span class="icon" part="icon" aria-hidden="true"><slot name="icon"></slot></span>
          <span class="name" part="name"></span>
          <span class="summary" part="summary"></span>
          <span class="status-text" part="status-text"></span>
          <span class="chevron" part="chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="body" part="body">
          <div class="section" data-section="args">
            <span class="label" part="args-label"></span>
            <pre part="args"></pre>
          </div>
          <div class="section" data-section="result">
            <span class="label" part="result-label"></span>
            <pre part="result"></pre>
          </div>
        </div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="head"]')) return false
    this.bind()
    return true
  }

  private bind(): void {
    this.headEl = this.shadow.querySelector<HTMLButtonElement>('[part="head"]')
    this.bodyEl = this.shadow.querySelector<HTMLElement>('[part="body"]')
    this.nameEl = this.shadow.querySelector<HTMLElement>('[part="name"]')
    this.summaryEl = this.shadow.querySelector<HTMLElement>('[part="summary"]')
    this.statusEl = this.shadow.querySelector<HTMLElement>('[part="status-text"]')
    this.argsEl = this.shadow.querySelector<HTMLElement>('[data-section="args"]')
    this.argsPre = this.shadow.querySelector<HTMLElement>('[part="args"]')
    this.resultEl = this.shadow.querySelector<HTMLElement>('[data-section="result"]')
    this.resultPre = this.shadow.querySelector<HTMLElement>('[part="result"]')
    this.headEl?.addEventListener('click', () => this.toggle())
  }

  private statusLabel(status: ToolCallStatus): string {
    if (status === 'success') return this.t('toolCall.success')
    if (status === 'error') return this.t('toolCall.error')
    return this.t('toolCall.running')
  }

  private format(value: string): string {
    if (!value) return ''
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  private toggle(): void {
    if (this.getAttr('collapsible', 'true') === 'false') return
    const open = !this.hasAttr('open')
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
    this.emit('toggle', { open, name: this.getAttr('name', '') } satisfies ToolCallToggleDetail)
  }

  protected override update(): void {
    const status: ToolCallStatus =
      this.getAttr('status', '') === 'success'
        ? 'success'
        : this.getAttr('status', '') === 'error'
          ? 'error'
          : 'running'
    const tool = this.shadow.querySelector<HTMLElement>('[part="tool"]')
    if (tool) tool.dataset.status = status
    if (this.nameEl) this.nameEl.textContent = this.getAttr('name', '')
    if (this.summaryEl) this.summaryEl.textContent = this.getAttr('summary', '')
    if (this.statusEl) this.statusEl.textContent = this.statusLabel(status)
    const collapsible = this.getAttr('collapsible', 'true') !== 'false'
    const open = !collapsible || this.hasAttr('open')
    if (this.headEl) {
      this.headEl.disabled = !collapsible
      this.headEl.setAttribute('aria-expanded', String(open))
    }
    if (this.bodyEl) {
      this.bodyEl.hidden = !open
      this.bodyEl.setAttribute('aria-hidden', String(!open))
    }
    const args = this.format(this.getAttr('args', ''))
    const result = this.format(this.getAttr('result', ''))
    if (this.argsEl) this.argsEl.hidden = args === ''
    if (this.argsPre) this.argsPre.textContent = args
    if (this.resultEl) this.resultEl.hidden = result === ''
    if (this.resultPre) this.resultPre.textContent = result
    const argsLabel = this.shadow.querySelector<HTMLElement>('[part="args-label"]')
    const resultLabel = this.shadow.querySelector<HTMLElement>('[part="result-label"]')
    if (argsLabel) argsLabel.textContent = this.t('toolCall.arguments')
    if (resultLabel) resultLabel.textContent = this.t('toolCall.result')
  }
}
