import { OASElement } from '@oas-ui/core'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import type { OASMenu } from '../menu/index.js'
import type { MenuItem } from '../menu/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.menu-anchor {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
}
.menu-anchor[hidden] {
  display: none;
}
`

export class OASContextMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'open', 'long-press-delay', 'close-on-scroll']
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null

  /** 长按计时器句柄（touch 长按触发，移动端无右键的替代） */
  private longPressTimer = 0
  /** 长按触点坐标（计时到后作为打开位置） */
  private longPressX = 0
  private longPressY = 0
  /** 长按已生效：后续 touchmove 阻止默认（防止手指移动带动页面滚动，fixed 菜单与滚动脱节） */
  private longPressArmed = false
  /** 手指滑动超过该阈值视为滚动手势，取消长按（px） */
  private static readonly MOVE_THRESHOLD = 10

  /** 触发坐标缓存（show(x,y)/右键/长按写入），供受控 open 打开时定位 */
  private pendingX = 0
  private pendingY = 0
  private hasPending = false

  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change，同 tooltip/popover） */
  private prevOpen: boolean | null = null
  /** 上一次 update() 的 open 状态，用于区分「打开瞬间」与「已打开后的属性微调」 */
  private wasOpen = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="menu-anchor" part="menu" hidden>
        <oas-menu tabindex="-1"></oas-menu>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
    // 右键触发：阻止原生菜单并定位打开（light DOM 内任意子元素右键均冒泡到 host）
    this.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      this.show(e.clientX, e.clientY)
    })
    // 移动端长按触发（touch 无右键）：touchstart 计时，超时视为右键
    this.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.addEventListener('touchend', this.onTouchEnd)
    this.addEventListener('touchcancel', this.onTouchEnd)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close()
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => window.clearTimeout(this.longPressTimer))
    // 打开时注册的 document/window 监听在 update() 关闭分支移除；此处兜底防断开连接泄漏
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    this.onCleanup(() => document.removeEventListener('contextmenu', this.handleDocContext))
    this.onCleanup(() => window.removeEventListener('scroll', this.handleScroll, true))
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail
      this.emit('select', { value: detail.value })
      this.close()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu-anchor 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu-anchor')) return false
    this.bind()
    return true
  }

  /**
   * 编程式打开：任意坐标弹菜单（表格行/画布/选区右键等脱离宿主元素的场景）。
   * 公开方法：宿主直接 el.show(x, y) 调用，与右键/长按触发殊途同归。
   * 已打开时仅重定位（不闪关），未打开时写入 open 属性走 update() 统一状态迁移。
   */
  show(x: number, y: number): void {
    this.pendingX = x
    this.pendingY = y
    this.hasPending = true
    if (this.hasAttr('open')) {
      this.positionAt(x, y)
    } else {
      this.setAttribute('open', '')
    }
  }

  /** 编程式关闭：宿主 el.close() 调用（与右键别处关闭/Esc/外部点击/选中同路径） */
  close(): void {
    this.removeAttribute('open')
  }

  protected override update(): void {
    if (!this.menuEl || !this.anchorEl) return
    const open = this.hasAttr('open')
    this.anchorEl.hidden = !open
    // open 状态迁移（受控 setAttribute 与右键/长按/show(x,y) 触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      this.parseItems()
      this.menuEl.setAttribute('items', JSON.stringify(this.itemsList))
      if (!this.wasOpen) {
        // 打开瞬间：用缓存的触发坐标定位（无坐标则不定位，保持快照/上次位置）
        if (this.hasPending) this.positionAt(this.pendingX, this.pendingY)
        document.addEventListener('click', this.handleOutside)
        document.addEventListener('contextmenu', this.handleDocContext)
        if (this.closeOnScroll()) window.addEventListener('scroll', this.handleScroll, true)
      }
    } else {
      document.removeEventListener('click', this.handleOutside)
      document.removeEventListener('contextmenu', this.handleDocContext)
      window.removeEventListener('scroll', this.handleScroll, true)
    }
    this.wasOpen = open
  }

  /** 视口内锚定：超出右/下边界时向左/上回退 */
  private positionAt(x: number, y: number): void {
    if (!this.anchorEl) return
    let left = x
    let top = y
    const { innerWidth: w, innerHeight: h } = window
    const rect = this.anchorEl.getBoundingClientRect()
    if (left + rect.width > w) left = Math.max(0, x - rect.width)
    if (top + rect.height > h) top = Math.max(0, y - rect.height)
    this.anchorEl.style.left = `${left}px`
    this.anchorEl.style.top = `${top}px`
  }

  /** 外部点击关闭：点击不在组件（含 shadow）内则关闭 */
  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
    }
  }

  /**
   * 页面别处右键 → 关闭本菜单（防止多菜单并存；当前只监听 click，别处右键旧菜单残留是 bug 级修复）。
   * 组件自身区域内的右键由 host 级 contextmenu 监听器处理（重定位打开），此处不重复关闭。
   */
  private handleDocContext = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
    }
  }

  /** 滚动关闭：fixed 定位菜单与页面滚动脱节，打开后滚动页面即关闭（close-on-scroll="false" 可关） */
  private handleScroll = (): void => {
    this.close()
  }

  /** close-on-scroll 布尔属性：默认 true（滚动关闭），仅 "false" 关闭该行为 */
  private closeOnScroll(): boolean {
    return this.getAttr('close-on-scroll', 'true') !== 'false'
  }

  /** long-press-delay：长按触发时长（ms），默认 500，非法值回退 500 */
  private longPressDelay(): number {
    const raw = parseInt(this.getAttr('long-press-delay', '500'), 10)
    return Number.isFinite(raw) && raw >= 0 ? raw : 500
  }

  /** touchstart：启动长按计时（记录触点坐标，计时到后作为打开位置） */
  private onTouchStart = (e: TouchEvent): void => {
    const touch = e.touches ? Array.from(e.touches)[0] : undefined
    if (!touch) return
    this.longPressX = touch.clientX
    this.longPressY = touch.clientY
    this.longPressArmed = false
    window.clearTimeout(this.longPressTimer)
    const delay = this.longPressDelay()
    this.longPressTimer = window.setTimeout(() => {
      // 计时到：视为右键打开菜单（随后到达的原生 contextmenu 会被 preventDefault 掉，幂等不重复打开）
      this.longPressArmed = true
      this.show(this.longPressX, this.longPressY)
    }, delay)
  }

  /** touchmove：长按已生效时阻止页面滚动；未生效时滑动超过阈值取消计时 */
  private onTouchMove = (e: TouchEvent): void => {
    if (this.longPressArmed) {
      e.preventDefault()
      return
    }
    const touch = e.touches ? Array.from(e.touches)[0] : undefined
    if (!touch) return
    const dx = touch.clientX - this.longPressX
    const dy = touch.clientY - this.longPressY
    if (Math.abs(dx) > OASContextMenu.MOVE_THRESHOLD || Math.abs(dy) > OASContextMenu.MOVE_THRESHOLD) {
      window.clearTimeout(this.longPressTimer)
    }
  }

  /** touchend/touchcancel：清除长按计时与 armed 状态 */
  private onTouchEnd = (): void => {
    window.clearTimeout(this.longPressTimer)
    this.longPressArmed = false
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenuItem => i && typeof i.value === 'string')
        : []
    } catch {
      this.itemsList = []
    }
  }
}
