import { OASElement } from '@oas-ui/core/oas-element'
import { getViewport } from '../../overlay/floating/index.js'
import { pushEscapeLayer } from '../../shared/overlay-stack.js'
import { addOutsideDismiss, removeOutsideDismiss } from '../../shared/outside-dismiss.js'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import { OASMenuItem } from '../menu/index.js'
import type { OASMenu } from '../menu/index.js'
import type { MenuItem, MenuItemKind } from '../menu/index.js'

/** shadow 内当前焦点元素（happy-dom 在无焦点记录时 activeElement 会抛错，包一层兜底） */
function activeInShadow(root: ShadowRoot | null | undefined): HTMLElement | null {
  if (!root) return null
  try {
    return root.activeElement as HTMLElement | null
  } catch {
    return null
  }
}

const STYLE = `:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.menu-anchor {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
}
.menu-anchor[hidden] {
  display: none;
}
/* 磨砂玻璃接线（容器级 surface）：视觉面是内层 oas-menu 本体（menu-anchor 仅定位壳，
   无背景接 blur 无意义），ring 叠加在其视觉边框上；变量缺省时零影响 */
.menu-anchor oas-menu {
  -webkit-backdrop-filter: var(--oas-glass-blur, none);
  backdrop-filter: var(--oas-glass-blur, none);
  outline: 1px solid var(--oas-glass-ring, transparent);
  outline-offset: -1px;
}
`

export class OASContextMenu extends OASElement {
  static override get observedAttributes(): string[] {
    // value 入观察：打开期间宿主受控改 value 时内层 menu 勾选集即时跟随（下传走 update 的 open 分支）
    return ['items', 'open', 'long-press-delay', 'close-on-scroll', 'value']
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null
  /** 子元素通道观察器：light DOM 里 oas-context-menu-item/group/divider 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null

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
  /** 共享 Esc 层释放句柄 */
  private releaseEscapeLayer: (() => void) | null = null
  /** 右键/长按触发源（Esc 关闭后回焦；show(x,y) 无触发源则不回焦） */
  private contextTarget: HTMLElement | null = null

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

  override disconnectedCallback(): void {
    // 基类 onCleanup 一次性执行后会清空；断开时主动释放 Esc 层，重连后由 open 边沿重压
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
    this.contextTarget = null
    // 打开态断开：重置边沿标记，重连后 update() 重新走打开路径（重压 Esc 层与外点/滚动监听）
    this.wasOpen = false
    // 重连后 update 重挂的全局监听不再有 cleanup 兜底，必须在组件自身幂等摘除
    this.detachGlobalListeners()
    // 长按计时器挂起时断开：清掉，防超时后 show() 再次挂监听
    window.clearTimeout(this.longPressTimer)
    super.disconnectedCallback()
  }

  /** 幂等摘除 document/window 全局监听（onCleanup 与 disconnectedCallback 共用，重复调用无副作用） */
  private detachGlobalListeners(): void {
    removeOutsideDismiss(this.handleOutside)
    document.removeEventListener('contextmenu', this.handleDocContext)
    window.removeEventListener('scroll', this.handleScroll, true)
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
    // 右键触发：阻止原生菜单并定位打开（light DOM 内任意子元素右键均冒泡到 host）
    this.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      this.rememberTrigger(e)
      this.show(e.clientX, e.clientY)
    })
    // 移动端长按触发（touch 无右键）：touchstart 计时，超时视为右键
    this.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.addEventListener('touchend', this.onTouchEnd)
    this.addEventListener('touchcancel', this.onTouchEnd)
    this.onCleanup(() => window.clearTimeout(this.longPressTimer))
    this.onCleanup(() => {
      this.releaseEscapeLayer?.()
      this.releaseEscapeLayer = null
    })
    // 打开时注册的 document/window 监听在 update() 关闭分支移除；此处兜底防断开连接泄漏
    // （detachGlobalListeners 同时被 disconnectedCallback 调用，二次断连幂等摘除）
    this.onCleanup(() => this.detachGlobalListeners())
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail as { value: string; checked?: boolean; kind?: string }
      // checkbox 勾选项（detail 带 checked 字段）：勾选切换不收起（对齐 menu 惯例「连续勾选」），
      // 内层 menu 已更新自身 value 勾选集——回写宿主 value 后再转发（宿主受控链不丢勾选态）
      if ('checked' in detail) {
        const menuValue = this.menuEl?.getAttribute('value')
        if (menuValue !== null && menuValue !== undefined) this.setAttribute('value', menuValue)
        this.emit('select', { value: detail.value, checked: detail.checked })
        return
      }
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

  /** 记录触发源（composedPath[0] 即实际右键/长按的元素，位于 light DOM 内） */
  private rememberTrigger(e: Event): void {
    const target = e.composedPath()[0]
    if (target instanceof HTMLElement && this.contains(target)) this.contextTarget = target
  }

  /** 压入共享 Esc 层：关闭后把焦点还给触发源，消费后不穿透下层浮层 */
  private armEscapeLayer(): void {
    if (this.releaseEscapeLayer) return
    this.releaseEscapeLayer = pushEscapeLayer({
      name: 'context-menu',
      active: () => this.hasAttr('open'),
      handle: () => {
        const target = this.contextTarget
        this.close()
        if (target && target.isConnected) target.focus({ preventScroll: true })
        return true
      },
    })
  }

  /**
   * 聚焦内层菜单容器：菜单方向键监听在 shadow 内 `.menu` ul 上，聚焦 oas-menu 宿主
   * 不会把键盘事件带进其 shadow 树。ul 自带 role=menu + tabindex=0。
   */
  private focusMenu(): void {
    const menu = this.menuEl as (OASMenu & { shadowRoot?: ShadowRoot | null }) | null
    if (!menu) return
    const list = menu.shadowRoot?.querySelector<HTMLElement>('.menu') ?? null
    ;(list ?? menu).focus({ preventScroll: true })
  }

  protected override update(): void {
    if (!this.menuEl || !this.anchorEl) return
    // 子元素通道观察器（重连后重建；items 属性显式时子元素被忽略，观察器空转无副作用）
    this.ensureChildObserver()
    const open = this.hasAttr('open')
    this.anchorEl.hidden = !open
    // open 状态迁移（受控 setAttribute 与右键/长按/show(x,y) 触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      // 双通道：items 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 items 模型渲染
      if (this.hasAttribute('items')) this.parseItems()
      else this.parseChildItems()
      // items 未变时跳过重写（同值 setAttribute 会触发内层 menu 全量重建——value 高频受控场景的写放大）；
      // 含 leading 克隆节点的项无法 JSON 序列化：走 menu 的 items property 对象通道
      if (this.itemsList.some((i) => i.leading && i.leading.length > 0)) {
        ;(this.menuEl as OASMenu).items = this.itemsList
      } else {
        ;(this.menuEl as OASMenu).items = null
        const itemsJson = JSON.stringify(this.itemsList)
        if (this.menuEl.getAttribute('items') !== itemsJson) this.menuEl.setAttribute('items', itemsJson)
      }
      // value 下传：checkbox/radio 勾选项的初始勾选态由内层 menu 的 value 驱动（缺之勾选永不回显）；
      // 同值守卫：同值 setAttribute 也触发内层 attributeChangedCallback → 全量重建（与 items 同款写放大）
      const hostValue = this.getAttr('value', '')
      if (this.menuEl.getAttribute('value') !== hostValue) this.menuEl.setAttribute('value', hostValue)
      if (!this.wasOpen) {
        // 打开瞬间：用缓存的触发坐标定位（无坐标则不定位，保持快照/上次位置）
        if (this.hasPending) this.positionAt(this.pendingX, this.pendingY)
        addOutsideDismiss(this.handleOutside)
        document.addEventListener('contextmenu', this.handleDocContext)
        if (this.closeOnScrollOn()) window.addEventListener('scroll', this.handleScroll, true)
        this.armEscapeLayer()
        this.focusMenu()
      }
    } else {
      // 关闭前若焦点还在菜单内，先还给触发源（菜单 hidden 后焦点不能丢到 body）
      const menu = this.menuEl as (OASMenu & { shadowRoot?: ShadowRoot | null }) | null
      const focusInMenu = !!activeInShadow(menu?.shadowRoot) || activeInShadow(this.shadow) === menu
      if (focusInMenu) {
        const target = this.contextTarget
        if (target && target.isConnected) target.focus({ preventScroll: true })
      }
      removeOutsideDismiss(this.handleOutside)
      document.removeEventListener('contextmenu', this.handleDocContext)
      window.removeEventListener('scroll', this.handleScroll, true)
      this.releaseEscapeLayer?.()
      this.releaseEscapeLayer = null
      this.contextTarget = null
    }
    this.wasOpen = open
  }

  /** 视口内锚定：超出右/下边界时向左/上回退 */
  private positionAt(x: number, y: number): void {
    if (!this.anchorEl) return
    let left = x
    let top = y
    const { width: w, height: h } = getViewport()
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
  private closeOnScrollOn(): boolean {
    return this.getAttr('close-on-scroll', 'true') !== 'false'
  }

  /** long-press-delay：长按触发时长（ms），默认 500，非法值回退 500 */
  private longPressDelayMs(): number {
    const raw = parseInt(this.getAttr('long-press-delay', '500'), 10)
    return Number.isFinite(raw) && raw >= 0 ? raw : 500
  }

  /** touchstart：启动长按计时（记录触点坐标，计时到后作为打开位置） */
  private onTouchStart = (e: TouchEvent): void => {
    const touch = e.touches ? Array.from(e.touches)[0] : undefined
    if (!touch) return
    this.rememberTrigger(e)
    this.longPressX = touch.clientX
    this.longPressY = touch.clientY
    this.longPressArmed = false
    window.clearTimeout(this.longPressTimer)
    const delay = this.longPressDelayMs()
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

  // ===== 子元素声明式通道 =====

  /**
   * 子元素通道解析层：把 light DOM 的 `<oas-context-menu-item>` / `<oas-context-menu-group>` /
   * `<oas-context-menu-divider>` 收敛为内部 items 模型（与 parseItems 单一渲染路径）。
   * 右键区域等非载体元素不在识别清单里，天然被忽略（不会误当菜单项）。
   */
  private parseChildItems(): void {
    this.itemsList = this.parseChildLevel(this.children)
  }

  /** 解析一层子元素为 MenuItem[]（仅识别数据载体元素，其余 light DOM 内容忽略） */
  private parseChildLevel(elements: HTMLCollection | Element[]): MenuItem[] {
    const items: MenuItem[] = []
    for (const child of Array.from(elements)) {
      if (child.tagName === 'OAS-CONTEXT-MENU-ITEM') {
        items.push(this.childToMenuItem(child))
      } else if (child.tagName === 'OAS-CONTEXT-MENU-GROUP') {
        items.push(this.childToGroup(child))
      } else if (child.tagName === 'OAS-CONTEXT-MENU-DIVIDER') {
        items.push({ type: 'divider' })
      }
    }
    return items
  }

  /** 单个 <oas-context-menu-item> → MenuItem（默认插槽文本为 label，属性对齐 items 字段；嵌套子元素递归为 children） */
  private childToMenuItem(el: Element): MenuItem {
    const item: MenuItem = { label: this.childLabel(el) }
    const value = el.getAttribute('value')
    if (value) item.value = value
    if (el.hasAttribute('disabled')) item.disabled = true
    if (el.hasAttribute('loading')) item.loading = true
    const icon = el.getAttribute('icon')
    if (icon) item.icon = icon
    const kind = el.getAttribute('kind')
    if (kind) item.kind = kind as MenuItemKind
    if (el.hasAttribute('danger')) item.danger = true
    const href = el.getAttribute('href')
    if (href) item.href = href
    const target = el.getAttribute('target')
    if (target) item.target = target
    const rel = el.getAttribute('rel')
    if (rel) item.rel = rel
    const leading = OASMenuItem.extractLeadingFrom(el)
    if (leading.length > 0) item.leading = leading
    const children = this.parseChildLevel(el.children)
    if (children.length > 0) item.children = children
    return item
  }

  /** 单个 <oas-context-menu-group> → 分组项（label/value 属性 + 子元素平铺 children） */
  private childToGroup(el: Element): MenuItem {
    const item: MenuItem = { type: 'group', label: el.getAttribute('label') ?? '' }
    const value = el.getAttribute('value')
    if (value) item.value = value
    const children = this.parseChildLevel(el.children)
    if (children.length > 0) item.children = children
    return item
  }

  /** 默认插槽 label 文本：跳过嵌套数据载体元素（其文本属于子菜单而非 label） */
  private childLabel(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      if (node instanceof Element) {
        const tag = node.tagName
        if (tag === 'OAS-CONTEXT-MENU-ITEM' || tag === 'OAS-CONTEXT-MENU-GROUP' || tag === 'OAS-CONTEXT-MENU-DIVIDER') {
          continue
        }
        if (OASMenuItem.isLeadingNode(node)) continue
      }
      text += node.textContent ?? ''
    }
    return text.trim()
  }

  /**
   * 子元素通道观察器：只监听 light DOM 子元素（数据载体增删/属性/文本变化 → 重解析）。
   * 组件自身动作不写 light DOM，无需自引用守卫。
   */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: [
        'value',
        'disabled',
        'loading',
        'icon',
        'kind',
        'danger',
        'href',
        'target',
        'rel',
        'label',
        'slot',
      ],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }
}
