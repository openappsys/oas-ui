import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: relative;
}
.popover {
  position: absolute;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-3);
  min-width: 180px;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.popover[data-position='top'] { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.popover[data-position='bottom'] { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.popover[data-position='left'] { right: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
.popover[data-position='right'] { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
.popover[aria-hidden='true'] { display: none; }
.title {
  margin-bottom: var(--oas-space-3);
  line-height: 1.5;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
}
.btn {
  min-width: 56px;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
`

export class OASPopconfirm extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'title', 'position']
  }

  private popoverEl: HTMLElement | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="popover" part="popover" role="dialog">
        <div class="title" part="title"></div>
        <div class="actions" part="actions">
          <button class="btn" part="cancel" type="button"></button>
          <button class="btn" part="ok" type="button"></button>
        </div>
      </div>
    `
  }

  /** 缓存节点 + 绑定触发/确认/取消/Esc/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.popoverEl = this.shadow.querySelector('.popover')
    this.addEventListener('click', (e: Event) => {
      // 用 composedPath 取原始 target：element.click()/键盘激活派发的合成 click 事件
      // composed=false，跨出 shadow boundary 时会被 retarget 成 host 自身，
      // 若读 e.target 会把「点按钮关闭」误判成「点外部切换」，导致 open 反复翻转。
      const origin = e.composedPath()[0] as Node | undefined
      if (origin && !this.shadow.contains(origin)) this.toggle()
    })
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => {
      this.emit('ok', { source: this })
      this.removeAttribute('open')
    })
    this.shadow.querySelector('[part="cancel"]')?.addEventListener('click', () => {
      this.emit('cancel', { source: this })
      this.removeAttribute('open')
    })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（popover 容器存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.popover')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this)) this.removeAttribute('open')
  }

  protected override update(): void {
    if (!this.popoverEl) return
    const open = this.hasAttr('open')
    this.popoverEl.setAttribute('aria-hidden', String(!open))
    this.popoverEl.setAttribute('data-position', this.getAttr('position', 'top'))
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttribute('title') ?? ''
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.titleCache ?? ''
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLElement>('[part="ok"]')!.textContent = this.t('popconfirm.ok')
    this.shadow.querySelector<HTMLElement>('[part="cancel"]')!.textContent =
      this.t('popconfirm.cancel')
    if (open) document.addEventListener('click', this.handleOutside, true)
    else document.removeEventListener('click', this.handleOutside, true)
  }
}
