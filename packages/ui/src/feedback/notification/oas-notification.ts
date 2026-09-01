import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  width: var(--oas-notification-width, 320px);
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
/* onClick 场景的可点击暗示（命令式层有 onClick 时设 clickable 属性） */
:host([clickable]) .box {
  cursor: pointer;
}
/* size 档：宽度变量 + 内边距/字号档位 */
:host([size='small']) {
  --oas-notification-width: 280px;
}
:host([size='small']) .box {
  padding: var(--oas-space-3);
}
:host([size='small']) .title {
  font-size: var(--oas-font-size-sm);
}
:host([size='large']) {
  --oas-notification-width: 380px;
}
:host([size='large']) .box {
  padding: var(--oas-space-5);
}
:host([size='large']) .title {
  font-size: var(--oas-font-size-lg);
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
.close:focus-visible {
  opacity: 1;
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
  border-radius: var(--oas-radius-sm);
}
.close[hidden] {
  display: none;
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
.spinner {
  display: none;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 2px solid var(--oas-color-border-strong);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-notification-spin 0.8s linear infinite;
}
:host([type='loading']) .spinner { display: block; }
:host([type='loading']) .icon { display: none; }
/* footer 操作区（slot="footer" 或命令式 footer Node） */
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-3);
}
.footer[hidden] {
  display: none;
}
.footer::slotted(oas-button) {
  margin: 0;
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
  background: var(--oas-notification-progress-color, var(--oas-color-primary));
  animation-name: oas-notification-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes oas-notification-progress {
  from { width: 100%; }
  to { width: 0; }
}
@keyframes oas-notification-spin {
  to { transform: rotate(360deg); }
}
/* type 属性设在 host 上，颜色选择器从 host 属性命中（render 后 type 动态变化也能响应） */
:host([type='success']) .icon { color: var(--oas-color-success); }
:host([type='error']) .icon { color: var(--oas-color-danger); }
:host([type='warning']) .icon { color: var(--oas-color-warning); }
`

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'loading'

const ICONS: Record<NotificationType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
  loading: '',
}

/** oas-close 事件来源：auto（计时到期）/ button（关闭按钮）/ destroy（命令式销毁）/ evict（超上限挤出） */
export type NotificationCloseSource = 'auto' | 'button' | 'destroy' | 'evict'

export class OASNotification extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'show-progress',
      'progress-position',
      'scrollable',
      'duration',
      'closable',
      'size',
      'pause-on-hover',
    ]
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  /** 悬停暂停后剩余的自动关闭毫秒数（pause-on-hover 剩余时间记录恢复） */
  private remaining = 0
  private startedAt = 0
  private hoverPaused = false

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  notification 为命令式 API 组件（title 非观察属性，命令式层挂载前一次性写入），
   *  吸收只在渲染首帧完成——真实使用路径（命令式 API）已被完整覆盖 */
  private titleCache: string | null = null

  /** 命令式 Node 标题通道：options.title 传 Node 时由 notification.show() 注入，
   *  渲染时 append 进标题区（忽略 titleCache 文本路径）；string 走属性吸收通道，置 null */
  titleNode: Node | null = null

  /** 命令式 Node 描述富内容通道：options.content 传 Node 时注入（代码块等场景），
   *  覆盖 description 属性文本；声明式用 slot="content" 覆盖 */
  contentNode: Node | null = null

  /** 命令式 Node footer 操作区通道：options.footer 传 Node 时注入；
   *  声明式用 slot="footer" */
  footerNode: Node | null = null

  /** 命令式 Node 图标通道：options.icon 传 Node 时覆盖类型默认图标 */
  iconNode: Node | null = null

  /** 命令式 Node 关闭图标通道：options.closeIcon 传 Node 时覆盖默认 ✕ */
  closeIconNode: Node | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="region" aria-label="">
        <div class="title-row">
          <span class="spinner" part="spinner" aria-hidden="true"></span>
          <span class="icon" part="icon" aria-hidden="true"><slot name="icon"></slot></span>
          <span class="title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
          <button class="close" part="close" aria-label=""><slot name="close-icon">✕</slot></button>
        </div>
        <div class="description" part="description"><slot name="content"><span class="desc-text"></span></slot></div>
        <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
        <div class="progress" part="progress" aria-hidden="true" hidden>
          <div class="progress-fill"></div>
        </div>
      </div>
    `
    this.syncTitle()
    // title 插槽内容增减（slot 覆盖属性文案/Node 通道的兜底判空）时重刷双通道
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="title"]')
      ?.addEventListener('slotchange', () => this.syncTitle())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="content"]')
      ?.addEventListener('slotchange', () => this.syncDescription())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="footer"]')
      ?.addEventListener('slotchange', () => this.syncFooter())
    this.shadow
      .querySelector<HTMLButtonElement>('.close')
      ?.addEventListener('click', (e) => {
        // 关闭钮点击不冒泡为通知体点击（P5 排除语义）
        e.stopPropagation()
        this.close('button')
      })
    this.shadow.querySelector<HTMLElement>('.box')?.addEventListener('click', () => {
      this.emit('click')
    })
    // pause-on-hover：悬停暂停计时 + 进度条动画同步暂停（默认开启，显式 "false" 关闭）
    this.addEventListener('mouseenter', () => this.pause())
    this.addEventListener('mouseleave', () => this.resume())
    this.onCleanup(() => {
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
    })
    this.startTimer()
  }

  /** 统一关闭出口：派发 oas-close（detail.source 标明来源）后移除。
   *  自动关闭 / 关闭按钮 / 命令式 destroy / 超上限挤出全部收口到这里 */
  close(source: NotificationCloseSource = 'destroy'): void {
    this.emit('close', { source })
    this.remove()
  }

  /** 命令式更新通道：刷新标题/描述/富内容/footer（title/description 非观察属性，
   *  属性赋值不触发 update；命令式 update/transition 后由命令式层调用） */
  refresh(): void {
    this.syncTitle()
    this.syncDescription()
    this.syncFooter()
  }

  /** promise 链流转：切换类型并重置自动关闭计时器（loading → success/error 场景）。
   *  title 支持 string（属性通道）或 Node（append 进标题区，忽略 titleCache 文本路径） */
  transition(type: NotificationType, title: string | Node, duration = 4500): void {
    this.setAttribute('type', type)
    this.setAttribute('duration', String(duration))
    if (typeof title === 'string') {
      this.titleNode = null
      this.setAttribute('title', title)
    } else {
      this.titleNode = title
      this.setAttribute('title', '')
    }
    this.syncTitle()
    this.syncProgress(true)
    this.startTimer()
  }

  /** 悬停暂停：记录剩余时间并暂停进度动画（pause-on-hover 通道，外部也可调用） */
  pause(): void {
    // pause-on-hover 显式 "false" 关闭时悬停不暂停（外部显式调 pause() 不受此限）
    if (this.getAttr('pause-on-hover', 'true') === 'false' && this.hoverPaused === false) {
      return
    }
    if (this.hoverPaused) return
    this.hoverPaused = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt))
    }
    this.setProgressPaused(true)
  }

  /** 恢复：从剩余时间继续倒计时与进度动画 */
  resume(): void {
    if (!this.hoverPaused) return
    this.hoverPaused = false
    if (this.remaining > 0) this.tick()
    this.setProgressPaused(false)
  }

  private setProgressPaused(paused: boolean): void {
    const fill = this.shadow.querySelector<HTMLElement>('.progress-fill')
    if (fill) fill.style.animationPlayState = paused ? 'paused' : 'running'
  }

  /** 启动/重置自动关闭计时（duration>0 且非 loading 才计时；重复调用先清旧计时） */
  private startTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const type = this.getAttr('type', 'info')
    if (type === 'loading') {
      this.remaining = 0
      return
    }
    const duration = Number(this.getAttr('duration', '4500'))
    if (duration <= 0) {
      this.remaining = 0
      return
    }
    this.remaining = duration
    // 悬停中发生 transition（loading → success）：保持暂停语义，等 mouseleave 恢复
    if (!this.hoverPaused) this.tick()
  }

  private tick(): void {
    this.startedAt = Date.now()
    this.timer = setTimeout(() => this.close('auto'), this.remaining)
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue)
    // duration 变化（命令式 update / transition）→ 计时与进度动画都按新时长重置
    if (name === 'duration' && oldValue !== newValue && this.hasRendered) {
      this.startTimer()
      this.syncProgress(true)
    }
  }

  /** title 双通道同步：属性吸收状态机不变；slot 有真实内容时以插槽为准，
   *  无则兜底 span 承载 titleCache 文本（string 通道）或命令式 Node（titleNode 通道，
   *  忽略 titleCache 文本路径） */
  private syncTitle(): void {
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    if (!titleSlot || !titleFallback) return
    const hasSlot = this.hasSlotContent(titleSlot)
    if (this.titleNode) {
      titleFallback.textContent = ''
      titleFallback.appendChild(this.titleNode)
    } else {
      titleFallback.textContent = this.titleCache ?? ''
    }
    titleFallback.hidden = hasSlot
  }

  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 描述区双通道：slot="content" 有内容时以插槽为准；无则兜底 span 承载
   *  description 属性文本或命令式 contentNode（富内容，忽略文本路径） */
  private syncDescription(): void {
    const contentSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="content"]')
    const descFallback = this.shadow.querySelector<HTMLElement>('.desc-text')
    if (!contentSlot || !descFallback) return
    if (this.contentNode) {
      if (!this.contentNode.isConnected || contentSlot.contains(this.contentNode) === false) {
        if (this.contentNode.parentNode) this.contentNode.parentNode.removeChild(this.contentNode)
        descFallback.textContent = ''
        descFallback.appendChild(this.contentNode)
      }
    } else {
      descFallback.textContent = this.getAttr('description', '')
    }
    descFallback.hidden = this.hasSlotContent(contentSlot)
  }

  /** footer 操作区：slot="footer" 有内容或命令式 footerNode 存在时显示 */
  private syncFooter(): void {
    const footerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="footer"]')
    const footer = this.shadow.querySelector<HTMLElement>('[part="footer"]')
    if (!footerSlot || !footer) return
    if (this.footerNode && !footerSlot.contains(this.footerNode)) {
      footerSlot.appendChild(this.footerNode)
    }
    footer.hidden = !(this.footerNode || this.hasSlotContent(footerSlot))
  }

  protected override update(): void {
    const type = (this.getAttr('type', 'info') || 'info') as NotificationType
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="box"]')
      ?.setAttribute('aria-label', this.t('notification.region'))
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('notification.close'))

    // 类型图标 fallback 刷新（slot="icon" 有 assigned 内容时覆盖，fallback 不显示）
    const iconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')
    if (iconSlot) iconSlot.textContent = ICONS[type] ?? ''

    // 命令式 icon/closeIcon Node 通道注入（append 进 slot fallback 子树）
    if (this.iconNode) {
      const slot = this.shadow.querySelector('slot[name="icon"]')
      if (slot && !slot.contains(this.iconNode)) {
        slot.textContent = ''
        slot.appendChild(this.iconNode)
      }
    }
    if (this.closeIconNode) {
      const slot = this.shadow.querySelector('slot[name="close-icon"]')
      if (slot && !slot.contains(this.closeIconNode)) slot.appendChild(this.closeIconNode)
    }

    this.syncDescription()
    this.syncFooter()

    // closable：默认 true，显式 "false" 隐藏；loading 态强制不可关
    const closeBtn = this.shadow.querySelector<HTMLElement>('[part="close"]')
    if (closeBtn) {
      closeBtn.hidden = type === 'loading' || this.getAttr('closable', 'true') === 'false'
    }

    // 倒计时进度条：show-progress 且 duration>0 才显示；动画时长与 auto-close 同步
    this.syncProgress()
    // 长内容可滚动：默认开启，显式 scrollable="false" 关闭
    this.shadow
      .querySelector<HTMLElement>('[part="description"]')
      ?.classList.toggle('scrollable', this.getAttr('scrollable', 'true') !== 'false')
  }

  /** 进度条同步；restart=true 时强制重启动画（duration 变化后从 100% 重新走） */
  private syncProgress(restart = false): void {
    const duration = Number(this.getAttr('duration', '4500'))
    const progress = this.shadow.querySelector<HTMLElement>('[part="progress"]')
    if (!progress) return
    const fill = progress.querySelector<HTMLElement>('.progress-fill')
    if (!fill) return
    if (restart) {
      fill.style.animation = 'none'
      void fill.offsetWidth
      fill.style.animation = ''
    }
    fill.style.animationDuration = `${duration}ms`
    fill.style.animationPlayState = this.hoverPaused ? 'paused' : 'running'
    progress.hidden = !(this.hasAttr('show-progress') && duration > 0)
    progress.classList.toggle('progress-top', this.getAttr('progress-position', 'bottom') === 'top')
  }
}
