import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  width: 320px;
  margin-bottom: var(--oas-space-3);
}
.box {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
}
.title-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.title {
  flex: 1;
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.close {
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
/* 长内容可滚动：内容区限高 + 纵向滚动（scrollable 默认开启，显式 "false" 关闭） */
.description.scrollable {
  max-height: 8em;
  overflow-y: auto;
}
.icon {
  font-size: var(--oas-font-size-lg);
  line-height: 1;
}
/* 自动关闭倒计时进度条：进度动画时长 = duration，与 JS 计时器同步关闭 */
.progress {
  margin-top: var(--oas-space-3);
  height: 2px;
  border-radius: 1px;
  background: var(--oas-color-bg-hover);
  overflow: hidden;
}
.progress[hidden] {
  display: none;
}
.progress-top {
  order: -1;
  margin-top: 0;
  margin-bottom: var(--oas-space-3);
}
.progress-fill {
  width: 100%;
  height: 100%;
  background: var(--oas-color-primary);
  animation-name: oas-notification-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes oas-notification-progress {
  from { width: 100%; }
  to { width: 0; }
}
/* type 属性设在 host 上，颜色选择器从 host 属性命中（render 后 type 动态变化也能响应） */
:host([type='success']) .icon { color: var(--oas-color-success); }
:host([type='error']) .icon { color: var(--oas-color-danger); }
:host([type='warning']) .icon { color: var(--oas-color-warning); }
`

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

const ICONS: Record<NotificationType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
}

export class OASNotification extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'show-progress', 'progress-position', 'scrollable', 'duration']
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  notification 为命令式 API 组件（title 非观察属性，命令式层挂载前一次性写入），
   *  吸收只在 render 首帧完成——真实使用路径（命令式 API）已被完整覆盖 */
  private titleCache: string | null = null

  protected override render(): void {
    const type = (this.getAttr('type', 'info') || 'info') as NotificationType
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="region" aria-label="">
        <div class="title-row">
          <span class="icon" part="icon" aria-hidden="true">${ICONS[type]}</span>
          <span class="title" part="title"></span>
          <button class="close" part="close" aria-label="">✕</button>
        </div>
        <div class="description" part="description"></div>
        <div class="progress" part="progress" aria-hidden="true" hidden>
          <div class="progress-fill"></div>
        </div>
      </div>
    `
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const title = this.shadow.querySelector('.title')!
    const desc = this.shadow.querySelector('.description')!
    title.textContent = this.titleCache ?? ''
    desc.textContent = this.getAttr('description', '')
    this.shadow
      .querySelector<HTMLButtonElement>('.close')
      ?.addEventListener('click', () => this.remove())
    const duration = Number(this.getAttr('duration', '4500'))
    if (duration > 0) {
      this.timer = setTimeout(() => this.remove(), duration)
      this.onCleanup(() => {
        if (this.timer) clearTimeout(this.timer)
      })
    }
  }

  protected override update(): void {
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="box"]')
      ?.setAttribute('aria-label', this.t('notification.region'))
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('notification.close'))

    // 倒计时进度条：show-progress 且 duration>0 才显示；动画时长与 auto-close 同步
    const duration = Number(this.getAttr('duration', '4500'))
    const progress = this.shadow.querySelector<HTMLElement>('[part="progress"]')
    if (!progress) return
    const fill = progress.querySelector<HTMLElement>('.progress-fill')
    if (fill) fill.style.animationDuration = `${duration}ms`
    progress.hidden = !(this.hasAttr('show-progress') && duration > 0)
    progress.classList.toggle('progress-top', this.getAttr('progress-position', 'bottom') === 'top')

    // 长内容可滚动：默认开启，显式 scrollable="false" 关闭
    this.shadow
      .querySelector<HTMLElement>('[part="description"]')
      ?.classList.toggle('scrollable', this.getAttr('scrollable', 'true') !== 'false')
  }
}
