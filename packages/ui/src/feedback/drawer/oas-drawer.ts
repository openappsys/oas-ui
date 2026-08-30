import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: none;
}
:host([visible]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040));
}
.panel {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--oas-color-bg);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.12);
  z-index: calc(calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040)) + 1);
  display: flex;
  flex-direction: column;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.panel[data-placement='left'] {
  left: 0;
}
.panel[data-placement='right'] {
  right: 0;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
}
.body {
  flex: 1;
  overflow-y: auto;
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  padding: var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
}
.btn {
  min-width: 64px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-md);
  cursor: pointer;
  font-family: inherit;
}
`

/** size 预设档位宽度（对齐主流抽屉尺寸） */
const SIZE_PRESETS: Record<string, string> = {
  small: '256px',
  medium: '378px',
  large: '736px',
}

export class OASDrawer extends OASElement {
  static override get observedAttributes(): string[] {
    return ['visible', 'title', 'placement', 'no-footer', 'width', 'size']
  }

  private previousFocus: HTMLElement | null = null
  private wasVisible = false
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="panel" part="panel" role="dialog" aria-modal="true">
        <div class="header">
          <span class="title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
          <button class="close-btn" part="close" aria-label="">✕</button>
        </div>
        <div class="body" part="body"><slot></slot></div>
        ${
          this.hasAttr('no-footer')
            ? ''
            : `
        <div class="footer" part="footer">
          <button class="btn" part="cancel" type="button"></button>
          <button class="btn" part="ok" type="button"></button>
        </div>`
        }
      </div>
    `
  }

  /** 缓存节点 + 绑定交互事件（render 与水合路径共用） */
  private bind(): void {
    const panel = this.shadow.querySelector('.panel')
    panel?.addEventListener('click', (e) => e.stopPropagation())
    this.shadow.querySelector('.mask')?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.close('close')
    })
    this.shadow
      .querySelector('[part="cancel"]')
      ?.addEventListener('click', () => this.close('close'))
    this.shadow
      .querySelector('[part="close"]')
      ?.addEventListener('click', () => this.close('close'))
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => this.close('ok'))

    // title 插槽内容增减（slot 覆盖属性文案）时重刷双通道
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="title"]')
      ?.addEventListener('slotchange', () => this.update())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close('close')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（mask 与 panel 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    if (!this.shadow.querySelector('.panel')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** 关闭/确认：属性驱动约定——组件自管状态属性，同时派发事件供宿主响应 */
  private close(action: 'ok' | 'close'): void {
    this.removeAttribute('visible')
    this.emit(action)
  }

  /**
   * 宽度解析：显式 width 优先于 size；size 支持预设档位（small/medium/large）
   * 或具体值（纯数字视为 px，或直接是长度/百分比），无法解析时回退空串（用 CSS 默认）。
   */
  private resolveWidth(): string {
    const explicit = this.getAttr('width')
    if (explicit) return explicit
    const size = this.getAttr('size')
    if (!size) return ''
    const preset = SIZE_PRESETS[size]
    if (preset) return preset
    if (/^\d+(\.\d+)?$/.test(size)) return `${size}px`
    if (/^\d+(\.\d+)?(px|rem|em|vw|vh|%)$/.test(size)) return size
    return ''
  }

  protected override update(): void {
    const panel = this.shadow.querySelector<HTMLElement>('.panel')
    if (!panel) return
    const visible = this.hasAttr('visible')
    panel.setAttribute('aria-hidden', String(!visible))
    // 宽度：显式 width 优先；否则按 size 档位/具体值解析，未设置回退 CSS 默认
    panel.style.width = this.resolveWidth()
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
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    if (titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = this.hasTitleSlotContent(titleSlot)
    }
    this.shadow
      .querySelector<HTMLElement>('.panel')!
      .setAttribute('data-placement', this.getAttr('placement', 'right'))
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('drawer.close'))
    const okBtn = this.shadow.querySelector<HTMLElement>('[part="ok"]')
    const cancelBtn = this.shadow.querySelector<HTMLElement>('[part="cancel"]')
    if (okBtn) {
      okBtn.setAttribute('aria-label', this.t('drawer.ok'))
      okBtn.textContent = this.t('drawer.ok')
    }
    if (cancelBtn) {
      cancelBtn.setAttribute('aria-label', this.t('drawer.cancel'))
      cancelBtn.textContent = this.t('drawer.cancel')
    }

    // 焦点管理：仅在「隐藏 → 可见」转变时记录来源焦点并移入面板；
    // 关闭后归还焦点并清空，避免标题/文案变化时误覆盖来源记录。
    if (visible && !this.wasVisible) {
      this.wasVisible = true
      this.previousFocus = document.activeElement as HTMLElement
      this.shadow.querySelector<HTMLElement>('.close-btn')?.focus()
    } else if (!visible) {
      if (this.wasVisible) {
        this.previousFocus?.focus()
        this.previousFocus = null
      }
      this.wasVisible = false
    }
  }
}
