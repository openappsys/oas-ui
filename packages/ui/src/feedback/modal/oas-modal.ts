import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ModalVariant = 'info' | 'success' | 'warning' | 'error'

/** 语义变体 → 内置图标名（iconRegistry 键） */
const SEMANTIC_ICONS: Record<ModalVariant, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
}

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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
}
.dialog {
  position: fixed;
  top: 100px;
  /* 水平居中不用 transform：fixed + left/right 0 + margin auto（transform 会让后代
     position:fixed 的浮层以其为包含块，modal 内 select 等下拉按视口算的坐标被错位解释） */
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 520px;
  min-width: 360px;
  max-width: 90vw;
  /* 视口高度保护：小窗口下不溢出（标题/关闭钮始终可达），超出部分由 body 滚动承载 */
  max-height: var(--oas-modal-max-height, 90vh);
  display: flex;
  flex-direction: column;
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: calc(calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050)) + 1);
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
/* 垂直居中：data-centered 由 update() 增量同步；inset 0 + margin auto（不用 transform，同上） */
.dialog[data-centered] {
  inset: 0;
  margin: auto;
}
/* 可拖拽：标题栏抓取、触摸不滚动；拖拽中禁止选中文本（状态属性 dragging 与用户属性 draggable 区分） */
:host([draggable]) .header {
  cursor: move;
  touch-action: none;
}
:host([dragging]) {
  user-select: none;
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
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
  /* 超出滚动：flex 子项收缩锚定（min-height 归零才允许被 max-height 限住） */
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  /* 滚动边缘指示（CSS-only scroll shadow）：上下边缘渐隐阴影提示该方向还有内容——
     上下 bg 覆盖层随内容滚动、到边缘时遮住阴影；径向阴影固定在视口边缘（background-attachment 分层） */
  background-color: var(--oas-color-bg);
  background-image:
    linear-gradient(var(--oas-color-bg) 30%, transparent),
    linear-gradient(transparent, var(--oas-color-bg) 70%),
    radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.12), transparent),
    radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.12), transparent);
  background-repeat: no-repeat;
  background-size:
    100% 24px,
    100% 24px,
    100% 12px,
    100% 12px;
  background-attachment: local, local, scroll, scroll;
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
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
/* 语义变体图标（type 属性）：正文顶部居中，颜色随语义（info 用 primary） */
.semantic-icon {
  display: block;
  text-align: center;
  font-size: 36px;
  line-height: 1;
  margin-bottom: var(--oas-space-3);
  color: var(--oas-color-primary);
}
.semantic-icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.semantic-icon[hidden] {
  display: none;
}
:host([type='success']) .semantic-icon {
  color: var(--oas-color-success);
}
:host([type='warning']) .semantic-icon {
  color: var(--oas-color-warning);
}
:host([type='error']) .semantic-icon {
  color: var(--oas-color-danger);
}
/* 全屏：铺满视口、无圆角/边距；规则后置 + 更高特异性，优先级高于 centered/width/draggable */
:host([fullscreen]) .dialog {
  inset: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: none;
  border-radius: 0;
  transform: none;
}
/* 全屏下拖拽语义失效：标题栏不显示 move 光标、恢复触摸默认行为 */
:host([fullscreen]) .header {
  cursor: default;
  touch-action: auto;
}
/* 确定按钮 loading：内置 spinner（复用按钮的 oas-spin 动效，shadow 内 keyframes 隔离） */
.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
  vertical-align: -0.125em;
  margin-inline-end: var(--oas-space-1);
}
.spinner[hidden] {
  display: none;
}
:host([loading]) .btn[part='ok'] {
  opacity: 0.6;
  cursor: default;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASModal extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'visible',
      'title',
      'no-footer',
      'no-cancel',
      'width',
      'centered',
      'draggable',
      'fullscreen',
      'loading',
      'type',
      'ok-text',
      'cancel-text',
      'focus-ok',
    ]
  }

  private previousFocus: HTMLElement | null = null
  private wasVisible = false
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /**
   * 确定按钮点击时不自动关闭、只派发 oas-ok，由宿主决定关闭时机。
   * 仅 confirm 命令式 API（异步 onOk）内部使用，避免异步流程中 modal 先关后 loading。
   */
  deferOkClose = false

  // 拖拽状态：dragging 为内部状态属性（未观察），draggable 为用户属性
  private dragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragOriginLeft = 0
  private dragOriginTop = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="dialog" part="dialog" role="dialog" aria-modal="true" aria-labelledby="oas-modal-title">
        <div class="header">
          <span class="title" id="oas-modal-title" part="title"></span>
          <button class="close-btn" part="close" aria-label="">✕</button>
        </div>
        <div class="body" part="body">
          <span class="semantic-icon" part="semantic-icon" aria-hidden="true" hidden></span>
          <slot></slot>
        </div>
        ${
          this.hasAttr('no-footer')
            ? ''
            : `
        <div class="footer" part="footer">
          <button class="btn" part="cancel" type="button"></button>
          <button class="btn" part="ok" type="button">
            <span class="spinner" part="spinner" hidden></span>
            <span class="ok-label"></span>
          </button>
        </div>`
        }
      </div>
    `
  }

  /** 缓存节点 + 绑定交互事件（render 与水合路径共用） */
  private bind(): void {
    const dialog = this.shadow.querySelector('.dialog')
    dialog?.addEventListener('click', (e) => e.stopPropagation())
    this.shadow.querySelector('.mask')?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.close('cancel')
    })
    this.shadow
      .querySelector('[part="cancel"]')
      ?.addEventListener('click', () => this.close('cancel'))
    this.shadow
      .querySelector('[part="close"]')
      ?.addEventListener('click', () => this.close('cancel'))
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => {
      if (this.hasAttr('loading')) return
      if (this.deferOkClose) {
        // 异步确认（confirm onOk）：不关闭，由宿主决定关闭时机；loading 由宿主设置
        this.emit('ok')
        return
      }
      this.close('ok')
    })

    // 可拖拽：标题栏 pointerdown 启动，move/up 监听在 document 保证指针移出仍跟随
    const header = this.shadow.querySelector<HTMLElement>('.header')
    header?.addEventListener('pointerdown', (e) => this.startDrag(e as PointerEvent))
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onDrag)
      document.removeEventListener('pointerup', this.endDrag)
    })

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close('cancel')
      if (e.key === 'Tab') this.trapFocus(e)
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（mask 与 dialog 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉（aria-labelledby 指向的标题区不受影响） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    if (!this.shadow.querySelector('.dialog')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  private startDrag(e: PointerEvent): void {
    if (!this.hasAttr('draggable')) return
    // 全屏铺满视口，拖拽语义失效（优先级：fullscreen > draggable）
    if (this.hasAttr('fullscreen')) return
    if (e.button !== 0 && e.pointerType !== 'touch') return
    // 标题栏上的关闭按钮不触发拖动
    if ((e.target as Element | null)?.closest('[part="close"]')) return
    e.preventDefault()
    const dialog = this.shadow.querySelector<HTMLElement>('.dialog')
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    this.dragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOriginLeft = rect.left
    this.dragOriginTop = rect.top
    this.setAttribute('dragging', '')
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDrag = (e: PointerEvent): void => {
    if (!this.dragging) return
    const dialog = this.shadow.querySelector<HTMLElement>('.dialog')
    if (!dialog) return
    // 内联 left/top 覆盖 CSS 居中定位；清居中相关（margin auto/right/inset）防 margin auto
    // 与内联 left 冲突（居中已从 transform 改 margin auto 方案）
    dialog.style.transform = 'none'
    dialog.style.margin = '0'
    dialog.style.right = 'auto'
    dialog.style.inset = 'auto'
    dialog.style.left = `${this.dragOriginLeft + e.clientX - this.dragStartX}px`
    dialog.style.top = `${this.dragOriginTop + e.clientY - this.dragStartY}px`
  }

  private endDrag = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.removeAttribute('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
  }

  /** 对话框内可聚焦元素（按 DOM 顺序；hidden 的取消按钮（no-cancel）排除在陷阱外） */
  private getFocusables(): HTMLElement[] {
    return Array.from(
      this.shadow.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
  }

  /**
   * 解析当前真实聚焦元素。
   * 真实浏览器对 open shadow DOM 返回内层元素；happy-dom 重定向为宿主（document.activeElement = host），
   * 需回退 shadowRoot.activeElement 获取真实焦点。
   */
  private resolveActive(): HTMLElement | null {
    const ae = document.activeElement
    if (!ae) return null
    if (this.shadow.contains(ae)) return ae as HTMLElement
    if (ae === this) return this.shadow.activeElement as HTMLElement | null
    return null
  }

  /**
   * 焦点是否落在 modal 的可达区域：shadow 内元素，或 slot 分配的 light DOM 树
   * （含嵌套自定义元素，穿透其 inner shadow）。用于判断 Tab 是否逃逸出对话框——
   * 否则焦点在嵌套表单控件（如 slot 内 oas-input 的内层 input）时会被误判为逃逸并拉回。
   */
  private isWithinModalTree(node: Node | null): boolean {
    while (node) {
      if (node === this || node === this.shadow) return true
      if (node instanceof ShadowRoot) node = node.host
      else node = node.parentNode
    }
    return false
  }

  /** 焦点陷阱：Tab/Shift+Tab 在对话框内循环，焦点逃逸则拉回；多实例仅最上层接管 */
  private trapFocus(e: KeyboardEvent): void {
    if (!this.hasAttr('visible')) return
    const visibles = [...document.querySelectorAll('oas-modal')].filter((m) =>
      m.hasAttribute('visible'),
    )
    if (visibles[visibles.length - 1] !== this) return
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.resolveActive()
    // 逃逸判定：真实焦点不在 modal 树（shadow 或 slot 内容）内
    if (active == null && !this.isWithinModalTree(document.activeElement)) {
      // 焦点逃逸出对话框（含尚未移入）：Tab 拉回首个可聚焦元素
      e.preventDefault()
      first.focus()
      return
    }
    if (active && e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (active && !e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /** 关闭/确认：属性驱动约定——组件自管状态属性，同时派发事件供宿主响应。
   *  公开：命令式 modal API 的 `{ close() }` 句柄经此编程关闭（移除 visible → 还原焦点 → 派发事件） */
  close(action: 'ok' | 'cancel'): void {
    this.removeAttribute('visible')
    this.emit(action)
  }

  protected override update(): void {
    const dialog = this.shadow.querySelector<HTMLElement>('.dialog')
    if (!dialog) return
    const visible = this.hasAttr('visible')
    dialog.setAttribute('aria-hidden', String(!visible))
    const fullscreen = this.hasAttr('fullscreen')
    // 全屏：data-fullscreen 驱动 CSS 铺满；同时清除内联 width/拖拽定位，防止覆盖全屏布局
    if (fullscreen) dialog.setAttribute('data-fullscreen', '')
    else dialog.removeAttribute('data-fullscreen')
    if (fullscreen) {
      dialog.style.width = ''
      dialog.style.left = ''
      dialog.style.top = ''
      dialog.style.transform = ''
    } else {
      // 宽度：显式设置则覆盖主题默认 520px，未设置时回退 CSS 默认
      dialog.style.width = this.getAttr('width')
    }
    // 垂直居中：data-centered 驱动 CSS 布局，增删同步
    if (this.hasAttr('centered')) dialog.setAttribute('data-centered', '')
    else dialog.removeAttribute('data-centered')
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
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.titleCache ?? ''
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）；ok-text/cancel-text 可覆盖
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('modal.close'))
    const okBtn = this.shadow.querySelector<HTMLButtonElement>('[part="ok"]')
    const cancelBtn = this.shadow.querySelector<HTMLElement>('[part="cancel"]')
    const loading = this.hasAttr('loading')
    if (okBtn) {
      const okText = this.getAttr('ok-text') || this.t('modal.ok')
      okBtn.setAttribute('aria-label', okText)
      okBtn.querySelector<HTMLElement>('.ok-label')!.textContent = okText
      // loading：禁用确定 + aria-busy + spinner，禁止重复触发
      okBtn.disabled = loading
      okBtn.setAttribute('aria-busy', String(loading))
      const spinner = okBtn.querySelector<HTMLElement>('.spinner')
      if (spinner) spinner.hidden = !loading
    }
    if (cancelBtn) {
      const cancelText = this.getAttr('cancel-text') || this.t('modal.cancel')
      // no-cancel：隐藏取消按钮（hidden 属性，焦点陷阱选择器同步排除）
      cancelBtn.hidden = this.hasAttr('no-cancel')
      cancelBtn.setAttribute('aria-label', cancelText)
      cancelBtn.textContent = cancelText
    }
    // 语义变体图标（type 属性）：内置图标名映射；无 type / 非法值隐藏
    const semanticIcon = this.shadow.querySelector<HTMLElement>('[part="semantic-icon"]')
    if (semanticIcon) {
      const iconName = SEMANTIC_ICONS[this.getAttr('type') as ModalVariant]
      if (iconName) {
        semanticIcon.hidden = false
        semanticIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconRegistry[iconName]}</svg>`
      } else {
        semanticIcon.hidden = true
        semanticIcon.innerHTML = ''
      }
    }
    const footer = this.shadow.querySelector<HTMLElement>('.footer')
    if (footer) footer.style.display = this.hasAttr('no-footer') ? 'none' : ''

    // 焦点管理：仅在「隐藏 → 可见」转变时记录来源焦点并移入对话框；
    // 默认聚焦「取消」按钮（破坏性确认的保守选择）；focus-ok 时聚焦「确定」按钮
    // （命令式 API 的统一行为）；no-cancel（取消已隐藏）回退「确定」/「关闭」。
    // 关闭后归还焦点并清空，避免标题/文案变化时误覆盖来源记录。
    if (visible && !this.wasVisible) {
      this.wasVisible = true
      this.previousFocus = document.activeElement as HTMLElement
      let target: HTMLElement | null = null
      if (this.hasAttr('focus-ok')) {
        target = okBtn
      } else if (cancelBtn && !cancelBtn.hidden) {
        target = cancelBtn
      } else {
        target = okBtn ?? this.shadow.querySelector<HTMLElement>('[part="close"]')
      }
      target?.focus()
    } else if (!visible) {
      if (this.wasVisible) {
        this.previousFocus?.focus()
        this.previousFocus = null
      }
      this.wasVisible = false
      // 关闭时结束拖拽并重置内联定位，下次打开回到默认布局
      if (this.dragging) this.endDrag()
      dialog.style.left = ''
      dialog.style.top = ''
      dialog.style.transform = ''
    }
  }
}
