import { OASElement, escapeAttr } from '@oas-ui/core'

/** 尺寸档位：xs/sm/md/lg/xl（默认 lg，对应 48px 常规 FAB 观感） */
const VALID_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
type FloatButtonSize = (typeof VALID_SIZES)[number]

const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 lg 并在 dev 下 console.warn 一次（同值去重） */
function normalizeSize(raw: string): FloatButtonSize {
  if ((VALID_SIZES as readonly string[]).includes(raw)) return raw as FloatButtonSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-float-button] 非法 size "${raw}"，已回落 lg；合法值：xs/sm/md/lg/xl`)
  }
  return 'lg'
}

/** 拖拽/点击判定阈值：位移 >4px 视为拖拽（pointerup 不派发 oas-click）；≤4px 视为点击 */
const DRAG_THRESHOLD = 4

const STYLE = `
:host {
  display: inline-block;
  vertical-align: middle;
  font-family: inherit;
  position: fixed;
  /* 定位开口：宿主可覆盖 --oas-float-button-bottom / --oas-float-button-right 调整悬浮位置 */
  bottom: var(--oas-float-button-bottom, var(--oas-space-6));
  right: var(--oas-float-button-right, var(--oas-space-6));
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
  /* 尺寸档位（默认 lg = control-height-xl = 48px） */
  --oas-float-button-size: var(--oas-control-height-xl);
}
:host([hidden]) {
  display: none;
}
:host([data-size='xs']) {
  --oas-float-button-size: var(--oas-control-height-sm);
}
:host([data-size='sm']) {
  --oas-float-button-size: var(--oas-control-height-md);
}
:host([data-size='md']) {
  --oas-float-button-size: var(--oas-control-height-lg);
}
:host([data-size='lg']) {
  --oas-float-button-size: var(--oas-control-height-xl);
}
:host([data-size='xl']) {
  --oas-float-button-size: calc(var(--oas-control-height-xl) + var(--oas-space-2));
}
.btn {
  position: relative;
  box-sizing: border-box;
  width: var(--oas-float-button-size);
  height: var(--oas-float-button-size);
  border-radius: 50%;
  border: 1px solid transparent;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xl);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding: 0;
  line-height: 1;
  font-family: inherit;
  text-decoration: none;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 40%, transparent);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    transform var(--oas-transition-fast) var(--oas-ease-out);
}
/* 图标字号随尺寸档位缩放（xs 24px 档 20px 图标会溢出，故逐档递减） */
:host([data-size='xs']) .btn {
  font-size: var(--oas-font-size-md);
}
:host([data-size='sm']) .btn,
:host([data-size='md']) .btn {
  font-size: var(--oas-font-size-lg);
}
:host([data-size='lg']) .btn {
  font-size: var(--oas-font-size-xl);
}
:host([data-size='xl']) .btn {
  font-size: calc(var(--oas-font-size-xl) * 1.2);
}
/* 方形（square）即胶囊圆角：与 extended 扩展形态视觉合并 */
:host([data-shape='square']) .btn {
  border-radius: var(--oas-radius-full, 999px);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring),
    0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 40%, transparent);
}
.btn:not(:disabled):not([aria-disabled='true']):active {
  transform: scale(0.96);
}
/* 拖拽中：grabbing 光标 + 禁止选中（配合宿主 data-dragging） */
:host(.dragging) .btn {
  cursor: grabbing;
  user-select: none;
  -webkit-user-select: none;
}
.btn.primary {
  background: var(--oas-color-primary);
  border-color: transparent;
  color: var(--oas-color-text-on-primary);
}
.btn.primary:hover {
  background: var(--oas-color-primary-hover);
}
.btn.primary:active {
  background: var(--oas-color-primary-active);
}
.btn.default {
  background: var(--oas-color-bg);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
.btn.default:hover {
  background: var(--oas-color-bg-hover);
}
.btn.default:active {
  background: var(--oas-color-bg-hover);
}
/* 扩展文字：横向胶囊（icon + 文字横排），宽度随内容、高度保持尺寸档位 */
.btn.extended {
  width: auto;
  min-width: var(--oas-float-button-size);
  height: var(--oas-float-button-size);
  border-radius: var(--oas-radius-full, 999px);
  padding: 0 var(--oas-space-4);
}
.btn:disabled,
.btn[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
  box-shadow: none;
}
.btn:disabled:hover,
.btn[aria-disabled='true']:hover,
.btn:disabled:active,
.btn[aria-disabled='true']:active {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  transform: none;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.label {
  display: inline-flex;
  align-items: center;
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
  line-height: 1;
}
.label[hidden] {
  display: none;
}
.badge {
  position: absolute;
  top: calc(-1 * var(--oas-space-1));
  right: calc(-1 * var(--oas-space-1));
  min-width: var(--oas-control-height-xs);
  height: var(--oas-control-height-xs);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--oas-space-1);
  line-height: 1;
}
`

export class OASFloatButton extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'badge',
      'shape',
      'type',
      'size',
      'disabled',
      'href',
      'target',
      'aria-label',
      'draggable',
      'magnetic',
    ]
  }

  private btn: HTMLElement | null = null

  /** 进行中的拖拽会话（draggable）：pointer 捕获 + 起点 + 位移阈值标记 */
  private dragState: {
    pointerId: number
    startX: number
    startY: number
    startLeft: number
    startTop: number
    moved: boolean
  } | null = null
  /** 拖拽超阈值后抑制随之合成的一次 click（区分拖拽与点击） */
  private suppressClick = false

  /**
   * 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致。
   * 标签三态：button（无 href）/ a（href）/ span（href + disabled 降级，不可点击）。
   */
  private template(): string {
    const href = this.getAttr('href', '')
    const target = this.getAttr('target', '')
    const disabled = this.injectDisabled()
    let tag = 'button'
    let tagAttrs = ' type="button"'
    if (href) {
      if (disabled) {
        tag = 'span'
        tagAttrs = ' aria-disabled="true"'
      } else {
        tag = 'a'
        tagAttrs = ` href="${escapeAttr(href)}"${target ? ` target="${escapeAttr(target)}"` : ''}`
      }
    } else if (disabled) {
      tagAttrs = ' type="button" disabled aria-disabled="true"'
    }
    const hasText = this.hasText()
    return `
      <style>${STYLE}</style>
      <${tag} class="btn" part="btn"${tagAttrs}>
        <span class="icon" part="icon"><slot name="icon">＋</slot></span>
        <span class="label" part="label"${hasText ? '' : ' hidden'}><slot></slot></span>
        ${this.hasAttr('badge') ? '<span class="badge" part="badge"></span>' : ''}
      </${tag}>
    `
  }

  /**
   * 是否带扩展文字：light DOM 中是否存在「未被具名 slot（icon）消费」的文本内容。
   * 只读宿主子节点，不依赖 shadow 状态——render/SSR/update 各路径一致可用。
   */
  private hasText(): boolean {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 具名 slot 内容（icon）不算扩展文字
        if ((node as Element).hasAttribute('slot')) return false
        return (node.textContent ?? '').trim().length > 0
      }
      return false
    })
  }

  /** 缓存节点引用 + 绑定点击 / 插槽变化（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('.btn')
    this.btn?.addEventListener('click', (e: MouseEvent) => {
      // 拖拽超阈值后浏览器会在捕获目标上合成一次 click → 消费并复位（拖拽不派发 oas-click），
      // 同时 preventDefault 阻止 href 模式下 <a> 的链接导航被拖拽误触发
      if (this.suppressClick) {
        this.suppressClick = false
        e.preventDefault()
        return
      }
      if (this.injectDisabled()) {
        e.preventDefault()
        return
      }
      // detail 携带 originalEvent：与组件文档契约一致（原生 disabled button 不会触发点击，
      // 此处 guard 覆盖 href 模式降级 span 之外的防御场景）
      this.emit('click', { originalEvent: e })
    })
    // 拖拽会话（pointer 捕获 + 移动定位 + 松手释放/磁吸）——绑定在内层按钮上，
    // 捕获目标 = 按钮自身，合成的 click 仍落在按钮（点击判定不被破坏）
    this.btn?.addEventListener('pointerdown', this.handlePointerDown)
    this.btn?.addEventListener('pointermove', this.handlePointerMove)
    this.btn?.addEventListener('pointerup', this.handlePointerUp)
    this.btn?.addEventListener('pointercancel', this.handlePointerCancel)
    // 默认插槽内容增减时重算扩展文字形态（icon slot 变化不影响 extended）
    this.shadow
      .querySelector<HTMLSlotElement>('slot:not([name])')
      ?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  // ---------- draggable 拖拽（pointer 捕获 + 自由定位 + 磁吸） ----------

  /** 是否减少动效：reduced-motion 下磁吸过渡停用（位置直切） */
  private prefersReducedMotion(): boolean {
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // 非 draggable 零行为变化；禁用态不可拖；仅主键（左键/触屏）
    if (!this.hasAttr('draggable')) return
    if (this.injectDisabled()) return
    if (e.button !== 0) return
    // 新会话先复位抑制标记（上一次拖拽若被 pointercancel 中断可能残留）
    this.suppressClick = false
    const rect = this.getBoundingClientRect()
    this.dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    }
    this.classList.add('dragging')
    // 拖拽中禁止过渡（跟手）；磁吸过渡只作用于松手动画
    this.style.transition = 'none'
    try {
      this.btn?.setPointerCapture(e.pointerId)
    } catch {
      // 环境不支持指针捕获：退化为移动/释放监听跟踪（无捕获也能完成拖拽）
    }
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    // 阈值内视为点击（不移动）；超过阈值进入拖拽
    if (!d.moved && Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return
    d.moved = true
    // 边界夹取：left/top 夹在视口内（fixed 定位相对视口，拖出视口回夹）
    const maxX = Math.max(0, window.innerWidth - this.offsetWidth)
    const maxY = Math.max(0, window.innerHeight - this.offsetHeight)
    const left = Math.min(Math.max(0, d.startLeft + dx), maxX)
    const top = Math.min(Math.max(0, d.startTop + dy), maxY)
    // 位置写入 host 内联 left/top（fixed 定位系），清掉默认 bottom/right 避免双端拉伸
    this.style.left = `${left}px`
    this.style.top = `${top}px`
    this.style.bottom = ''
    this.style.right = ''
  }

  private handlePointerUp = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    if (d.moved) {
      // 超阈值是拖拽：抑制随后的合成 click（不派发 oas-click），并尝试磁吸
      this.suppressClick = true
      this.applyMagnetic()
    }
    this.endDrag(e.pointerId)
  }

  private handlePointerCancel = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    this.endDrag(e.pointerId)
  }

  private endDrag(pointerId: number): void {
    if (!this.dragState || this.dragState.pointerId !== pointerId) return
    try {
      this.btn?.releasePointerCapture(pointerId)
    } catch {
      // 指针已失效：忽略释放失败
    }
    this.dragState = null
    this.classList.remove('dragging')
  }

  /**
   * magnetic 磁吸：松手时吸附到最近的对应轴边缘（x=左右边缘贴齐，y=上下边缘贴齐）。
   * 吸附动画：恢复 left/top 过渡（拖拽中已被 pointerdown 置 none）；reduced-motion 下直切。
   */
  private applyMagnetic(): void {
    const axis = this.getAttr('magnetic', '')
    if (axis !== 'x' && axis !== 'y') return
    const left = parseFloat(this.style.left) || 0
    const top = parseFloat(this.style.top) || 0
    const maxX = Math.max(0, window.innerWidth - this.offsetWidth)
    const maxY = Math.max(0, window.innerHeight - this.offsetHeight)
    const reduced = this.prefersReducedMotion()
    if (axis === 'x') {
      const distLeft = left
      const distRight = maxX - left
      const target = distLeft <= distRight ? 0 : maxX
      if (Math.abs(target - left) > 0.5) {
        this.style.transition = reduced
          ? 'none'
          : `left var(--oas-transition-base) var(--oas-ease-out)`
        this.style.left = `${target}px`
      }
    } else {
      const distTop = top
      const distBottom = maxY - top
      const target = distTop <= distBottom ? 0 : maxY
      if (Math.abs(target - top) > 0.5) {
        this.style.transition = reduced
          ? 'none'
          : `top var(--oas-transition-base) var(--oas-ease-out)`
        this.style.top = `${target}px`
      }
    }
  }

  /** 真水合：校验 SSR 快照结构（按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.btn')) return false
    this.bind()
    return true
  }

  /** href/target/disabled 变化会改变内部元素类型（button ↔ a ↔ span），需重建 shadow；其余属性走 update() */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    const affectsTag =
      name === 'href' || name === 'target' || (name === 'disabled' && this.getAttr('href', '') !== '')
    if (affectsTag && this.hasRendered) {
      this.shadow.innerHTML = this.template()
      this.bind()
      this.update()
      return
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  protected override update(): void {
    const btnEl = this.btn
    if (!btnEl) return
    const shape = this.getAttr('shape', 'circle')
    const type = this.getAttr('type', 'primary')
    const size = normalizeSize(this.getAttr('size', 'lg'))
    const disabled = this.injectDisabled()
    const hasText = this.hasText()

    // 几何/尺寸走 host data-*（CSS 变量映射），视觉变体走 btn 类名
    this.setAttribute('data-shape', shape)
    this.setAttribute('data-size', size)
    btnEl.className = ['btn', type, hasText ? 'extended' : ''].filter(Boolean).join(' ')

    // disabled 同步：button 用原生 disabled；href 禁用的 span / 非禁用 a 走 aria-disabled
    if (btnEl.tagName === 'BUTTON') {
      ;(btnEl as HTMLButtonElement).disabled = disabled
      if (disabled) btnEl.setAttribute('aria-disabled', 'true')
      else btnEl.removeAttribute('aria-disabled')
    } else if (btnEl.tagName === 'SPAN') {
      btnEl.setAttribute('aria-disabled', 'true')
    } else {
      btnEl.removeAttribute('aria-disabled')
    }

    const label = this.shadow.querySelector<HTMLElement>('[part="label"]')
    if (label) label.hidden = !hasText

    const badge = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    if (badge) badge.textContent = this.getAttr('badge', '')

    // aria-label：宿主显式标签优先；纯图标（无可见文字）用 locale 文案兜底；有扩展文字时让位给可见文本
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) btnEl.setAttribute('aria-label', hostLabel)
    else if (hasText) btnEl.removeAttribute('aria-label')
    else btnEl.setAttribute('aria-label', this.t('floatButton.action'))

    // draggable：touch-action none 禁止触摸手势滚动干扰拖拽（非 draggable 恢复，零回归）
    this.style.touchAction = this.hasAttr('draggable') ? 'none' : ''
  }
}
