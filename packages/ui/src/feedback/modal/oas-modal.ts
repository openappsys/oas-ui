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
  z-index: var(--oas-z-modal, 1050);
}
.dialog {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
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
  z-index: calc(var(--oas-z-modal, 1050) + 1);
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
/* 垂直居中：data-centered 由 update() 增量同步 */
.dialog[data-centered] {
  top: 50%;
  transform: translate(-50%, -50%);
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
      'width',
      'centered',
      'draggable',
      'fullscreen',
      'loading',
    ]
  }

  private previousFocus: HTMLElement | null = null
  private wasVisible = false

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
        <div class="body" part="body"><slot></slot></div>
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

  /** 真水合：校验 SSR 快照结构（mask 与 dialog 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    if (!this.shadow.querySelector('.dialog')) return false
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
    // 内联 left/top 覆盖 CSS 居中定位；transform 置空避免 translate 二次偏移
    dialog.style.transform = 'none'
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

  /** 对话框内可聚焦元素（按 DOM 顺序） */
  private getFocusables(): HTMLElement[] {
    return Array.from(
      this.shadow.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  /** 关闭/确认：属性驱动约定——组件自管状态属性，同时派发事件供宿主响应 */
  private close(action: 'ok' | 'cancel'): void {
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
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.getAttr('title', '')
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('modal.close'))
    const okBtn = this.shadow.querySelector<HTMLButtonElement>('[part="ok"]')
    const cancelBtn = this.shadow.querySelector<HTMLElement>('[part="cancel"]')
    const loading = this.hasAttr('loading')
    if (okBtn) {
      okBtn.setAttribute('aria-label', this.t('modal.ok'))
      okBtn.querySelector<HTMLElement>('.ok-label')!.textContent = this.t('modal.ok')
      // loading：禁用确定 + aria-busy + spinner，禁止重复触发
      okBtn.disabled = loading
      okBtn.setAttribute('aria-busy', String(loading))
      const spinner = okBtn.querySelector<HTMLElement>('.spinner')
      if (spinner) spinner.hidden = !loading
    }
    if (cancelBtn) {
      cancelBtn.setAttribute('aria-label', this.t('modal.cancel'))
      cancelBtn.textContent = this.t('modal.cancel')
    }
    const footer = this.shadow.querySelector<HTMLElement>('.footer')
    if (footer) footer.style.display = this.hasAttr('no-footer') ? 'none' : ''

    // 焦点管理：仅在「隐藏 → 可见」转变时记录来源焦点并移入对话框；
    // 关闭后归还焦点并清空，避免标题/文案变化时误覆盖来源记录。
    if (visible && !this.wasVisible) {
      this.wasVisible = true
      this.previousFocus = document.activeElement as HTMLElement
      const target =
        this.shadow.querySelector<HTMLElement>('[part="cancel"]') ??
        this.shadow.querySelector<HTMLElement>('[part="close"]')
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
