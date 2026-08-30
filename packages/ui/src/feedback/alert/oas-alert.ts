import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
/* 关闭态：host hidden 会被上面的作者级 display 规则覆盖，需显式补回（关闭按钮点击后真正隐藏） */
:host([hidden]) {
  display: none;
}
.box {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  border: 1px solid transparent;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
}
.box[data-type='info'] {
  border-color: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  color: var(--oas-color-primary);
}
.box[data-type='success'] {
  border-color: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-success) 10%, transparent);
  color: var(--oas-color-success);
}
.box[data-type='warning'] {
  border-color: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-warning) 10%, transparent);
  color: var(--oas-color-warning);
}
.box[data-type='error'] {
  border-color: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
  background: color-mix(in srgb, var(--oas-color-danger) 10%, transparent);
  color: var(--oas-color-danger);
}
.title {
  font-weight: 600;
  margin-bottom: var(--oas-space-1);
}
.body {
  flex: 1;
  line-height: 1.6;
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
`

const ROLES = { info: 'status', success: 'status', warning: 'status', error: 'alert' } as const

export class OASAlert extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'title', 'closeable']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="box" part="box">
        <div class="body" part="body">
          <div class="title" part="title"></div>
          <slot></slot>
        </div>
        ${this.hasAttr('closeable') ? '<button class="close-btn" part="close" aria-label="">✕</button>' : ''}
      </div>
    `
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 绑定关闭事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => {
      this.emit('close')
      this.hidden = true
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（box 容器存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="box"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    // type/role 增量同步（SSR 快照与运行时变更共用同一通道）
    const type = this.getAttr('type', 'info')
    const box = this.shadow.querySelector('[part="box"]')
    box?.setAttribute('data-type', type)
    box?.setAttribute('role', ROLES[type as keyof typeof ROLES] ?? 'status')
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
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.titleCache ?? ''
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('alert.close'))
  }
}
