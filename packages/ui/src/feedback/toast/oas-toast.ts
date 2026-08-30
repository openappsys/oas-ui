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
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.icon {
  flex-shrink: 0;
  line-height: 1.4;
  font-size: var(--oas-font-size-lg);
}
.spinner {
  display: none;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 2px solid var(--oas-color-border-strong);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-toast-spin 0.8s linear infinite;
}
/* type 属性设在 host 上，颜色选择器从 host 属性命中 */
:host([type='success']) .icon { color: var(--oas-color-success); }
:host([type='error']) .icon { color: var(--oas-color-danger); }
:host([type='warning']) .icon { color: var(--oas-color-warning); }
:host([type='loading']) .spinner { display: block; }
:host([type='loading']) .icon { display: none; }
/* loading 态不可关 */
:host([type='loading']) .close { display: none; }
.content {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 600;
  line-height: 1.5;
}
.description {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
.action {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
}
.action:hover {
  background: var(--oas-color-bg-hover);
}
.close {
  flex-shrink: 0;
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
@keyframes oas-toast-spin {
  to { transform: rotate(360deg); }
}
`

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading'

const ICONS: Record<ToastType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
  loading: '',
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export class OASToast extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type']
  }

  /** action 由命令式层在 append 前注入（函数无法走属性） */
  action: ToastAction | null = null

  private timer: ReturnType<typeof setTimeout> | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="status">
        <span class="spinner" part="spinner" aria-hidden="true"></span>
        <span class="icon" part="icon" aria-hidden="true"></span>
        <div class="content" part="content">
          <div class="title" part="title"></div>
          <div class="description" part="description"></div>
        </div>
        ${this.action ? '<button class="action" part="action" type="button"></button>' : ''}
        ${this.hasAttr('closable') ? '<button class="close" part="close" aria-label=""></button>' : ''}
      </div>
    `
    this.shadow
      .querySelector<HTMLButtonElement>('[part="close"]')
      ?.addEventListener('click', () => this.remove())
    this.shadow
      .querySelector<HTMLButtonElement>('[part="action"]')
      ?.addEventListener('click', () => {
        this.action?.onClick()
        this.remove()
      })
    this.onCleanup(() => this.clearTimer())
    this.syncUi()
    this.startTimer()
  }

  /** promise 链流转：切换类型并重置自动关闭计时器 */
  transition(type: ToastType, title: string, duration = 3000): void {
    this.setAttribute('type', type)
    this.setAttribute('title', title)
    this.setAttribute('duration', String(duration))
    this.syncUi()
    this.startTimer()
  }

  protected override update(): void {
    this.syncUi()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('toast.close'))
  }

  private syncUi(): void {
    const type = (this.getAttr('type', 'info') || 'info') as ToastType
    this.shadow
      .querySelector<HTMLElement>('[part="box"]')
      ?.setAttribute('role', type === 'error' ? 'alert' : 'status')
    this.shadow.querySelector<HTMLElement>('[part="icon"]')!.textContent = ICONS[type] ?? ''
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。命令式 transition() 以 setAttribute('title') 作数据通道，
    // 设置后 syncUi 随即吸收，宿主无残留；缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttribute('title') ?? ''
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.titleCache ?? ''
    const desc = this.getAttr('description', '')
    const descEl = this.shadow.querySelector<HTMLElement>('[part="description"]')
    if (descEl) {
      descEl.textContent = desc
      descEl.style.display = desc ? '' : 'none'
    }
    const actionBtn = this.shadow.querySelector<HTMLElement>('[part="action"]')
    if (actionBtn) actionBtn.textContent = this.action?.label ?? ''
  }

  private startTimer(): void {
    this.clearTimer()
    const type = this.getAttr('type', 'info')
    if (type === 'loading') return
    const duration = Number(this.getAttr('duration', '3000'))
    if (duration <= 0) return
    this.timer = setTimeout(() => this.remove(), duration)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
