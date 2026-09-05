import type { ReactiveController } from '@oas-ui/core'
import type { OASTabPanel } from './oas-tab-panel.js'
import type { TabsManagerCapability } from './oas-tabs.js'

/**
 * tabs manager 能力包（manager）：把「editable 双击重命名 + contextmenu 右键菜单 + sortable 拖拽排序」
 * 的交互 machinery 从 OASTabs（core）外置为 ReactiveController，经能力注册表
 * （oas-tabs-capability.js）注入宿主。
 *
 * 边界划分：
 * - manager 专属（本文件）：editable 双击重命名（Enter 提交 oas-rename / Esc 或失焦取消）、
 *   contextmenu 右键菜单（新建 + 关闭/关闭其他/关闭左侧/关闭右侧/关闭全部）、sortable 拖拽排序
 *   （drag 事件 → oas-reorder）。对应 CSS（右键菜单弹层 / 重命名输入框 / 拖拽高亮）随本文件注入，
 *   core-only 消费者不携带。
 * - core 展示基线（留在 OASTabs，不抽）：closable 关闭钮、overflow 溢出滚动、more 收缩下拉、
 *   addable + 按钮、纯切换/图标/徽标/键盘导航等。
 *
 * 交互形态：editable/context-menu 经稳定 tablist 容器委托（hostConnected 绑一次，与 core 的
 * innerHTML 重建解耦——tablist 节点本身在重建中存活）；sortable 由 core update() 逐 tab 回调
 * decorateTab 施加（每次重建自动重挂，避免重复监听）。
 *
 * 宿主能力经 TabsManagerHost 面访问（与 table 先例一致：controller 不感知宿主实现细节）。
 */

/** manager 宿主能力面（OASTabs 公开实现；controller 仅经此访问宿主） */
export interface TabsManagerHost {
  /** 翻译内置文案（右键菜单项 / 重命名输入框 aria-label，就近 config-provider / locale） */
  translateText(key: string, params?: Record<string, string | number>): string
  /** 触发标签栏重建（重命名提交/取消后恢复结构；面板 label 已在 light DOM 写回） */
  refreshTabs(): void
  /** 派发 manager 结果事件（add/close/rename/reorder；事件名集中于此，detail 由本 controller 组好） */
  notifyManager(kind: 'add' | 'close' | 'rename' | 'reorder', detail: unknown): void
}

/** 右键菜单批量关闭操作类型 */
type CloseOp = 'close' | 'others' | 'left' | 'right' | 'all'
/** 右键菜单操作：new（新建）+ 批量关闭族 */
type CtxOp = 'new' | CloseOp

/**
 * manager 专属样式：随能力注入宿主 shadow（core-only 消费者不携带）。
 * 经 `style[data-oas-tabs-manager]` 标记，hostConnected 幂等注入一次。
 */
const MANAGER_STYLE = `
/* ===== context-menu：标签右键批量关闭菜单（fixed 光标弹层） ===== */
.ctx-menu {
  position: fixed;
  z-index: calc(var(--oas-z-dropdown, 1000) + 1);
  min-width: 148px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-1);
  display: flex;
  flex-direction: column;
  gap: 1px;
  box-sizing: border-box;
}
.ctx-menu[hidden] {
  display: none;
}
.ctx-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--oas-space-2) var(--oas-space-3);
  border: none;
  background: none;
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  text-align: start;
  white-space: nowrap;
}
.ctx-item:hover,
.ctx-item:focus-visible {
  background: var(--oas-color-bg-hover);
  outline: none;
}
.ctx-item.danger {
  color: var(--oas-color-danger);
}
.ctx-divider {
  height: 1px;
  background: var(--oas-color-border);
  margin: var(--oas-space-1) var(--oas-space-2);
}

/* ===== editable 重命名输入框：与标签文字像素级对齐，避免编辑/非编辑态晃动 ===== */
.tab-rename-input {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  /* 用 outline 而非 border 做选中框：outline 不占布局空间，编辑框与原标签同高同位；
     纵向 padding 取 0，box-sizing border-box + 固定行高与 label 一致 */
  border: none;
  outline: 1px solid var(--oas-color-primary);
  outline-offset: 1px;
  border-radius: var(--oas-radius-sm);
  padding: 0;
  margin: 0;
  min-width: 60px;
  box-sizing: border-box;
}

/* ===== sortable 拖拽：拖过目标的高亮指示 ===== */
.tab[draggable='true'] {
  cursor: grab;
}
.tab--drag-over {
  box-shadow: inset 2px 0 0 var(--oas-color-primary);
}
:host(.oas-tabs--vertical) .tab--drag-over {
  box-shadow: inset 0 2px 0 var(--oas-color-primary);
}
`

/** manager 能力 controller：editable 重命名 + contextmenu 右键菜单 + sortable 拖拽排序 */
export class TabsManagerController implements ReactiveController, TabsManagerCapability {
  private host: HTMLElement & TabsManagerHost
  /** sortable 拖拽源标签 value */
  private dragSource: string | null = null
  /** 右键菜单弹层（懒创建复用；随宿主存活） */
  private ctxMenuEl: HTMLElement | null = null
  /** 右键菜单当前作用标签 value */
  private ctxMenuValue = ''
  /** 已绑定稳定 tablist / 文档级监听的标志（重连幂等） */
  private bound = false

  constructor(host: HTMLElement & TabsManagerHost) {
    this.host = host
  }

  // ==================== ReactiveController 生命周期 ====================

  /** 宿主连接（render/update 已就绪）：注入样式 + 在稳定 tablist 上委托可编辑/右键交互 */
  hostConnected(): void {
    this.injectStyle()
    this.bindTablist()
  }

  /** 宿主断开：解绑稳定节点/文档级监听、收起浮层（重连后 hostConnected 重绑） */
  hostDisconnected(): void {
    this.unbindTablist()
    if (this.ctxMenuEl) this.ctxMenuEl.hidden = true
  }

  private injectStyle(): void {
    const root = this.host.shadowRoot
    if (!root || root.querySelector('style[data-oas-tabs-manager]')) return
    const style = document.createElement('style')
    style.setAttribute('data-oas-tabs-manager', '')
    style.textContent = MANAGER_STYLE
    root.appendChild(style)
  }

  /** 在稳定的 tablist 容器上绑定 editable dblclick 与 contextmenu 右键委托 */
  private bindTablist(): void {
    if (this.bound) return
    const tablist = this.host.shadowRoot?.querySelector('.tablist') as HTMLElement | null
    if (!tablist) return
    this.bound = true
    tablist.addEventListener('dblclick', this.onTablistDblClick)
    tablist.addEventListener('contextmenu', this.onTablistContextMenu)
    // context-menu 弹层外部点击 / Escape 关闭（宿主 document 级，composed 跨 shadow）
    document.addEventListener('click', this.onDocClick, true)
    document.addEventListener('keydown', this.onDocKey)
  }

  private unbindTablist(): void {
    if (!this.bound) return
    this.bound = false
    const tablist = this.host.shadowRoot?.querySelector('.tablist') as HTMLElement | null
    tablist?.removeEventListener('dblclick', this.onTablistDblClick)
    tablist?.removeEventListener('contextmenu', this.onTablistContextMenu)
    document.removeEventListener('click', this.onDocClick, true)
    document.removeEventListener('keydown', this.onDocKey)
  }

  // ==================== 渲染挂接（核心 update 逐 tab 调用） ====================

  /**
   * sortable 拖拽装饰：draggable + 原生 HTML5 拖拽换位（drop 后 notify oas-reorder，
   * 宿主据此重排面板顺序，组件不自动移动 DOM）。核心每次重建标签时调用，
   * 节点全新故不会重复监听；未开启 sortable / disabled 标签静默跳过。
   */
  decorateTab(tab: HTMLElement, tablist: HTMLElement, value: string, disabled: boolean): void {
    if (!this.host.hasAttribute('sortable') || disabled) return
    if (tab.getAttribute('draggable') === 'true') return
    tab.setAttribute('draggable', 'true')
    tab.addEventListener('dragstart', (e: Event) => {
      this.dragSource = value
      const de = e as DragEvent
      if (de.dataTransfer) {
        de.dataTransfer.effectAllowed = 'move'
        de.dataTransfer.setData('text/plain', value)
      }
    })
    tab.addEventListener('dragover', (e: Event) => {
      const de = e as DragEvent
      de.preventDefault() // 必须 preventDefault 才允许 drop
      if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
      tab.classList.add('tab--drag-over')
    })
    tab.addEventListener('dragleave', () => tab.classList.remove('tab--drag-over'))
    tab.addEventListener('drop', (e: Event) => {
      const de = e as DragEvent
      de.preventDefault()
      tab.classList.remove('tab--drag-over')
      const fromValue = this.dragSource ?? de.dataTransfer?.getData('text/plain') ?? ''
      if (fromValue && fromValue !== value) this.reorder(fromValue, value)
      this.dragSource = null
    })
    tab.addEventListener('dragend', () => {
      this.dragSource = null
      tablist
        .querySelectorAll('.tab--drag-over')
        .forEach((t) => t.classList.remove('tab--drag-over'))
    })
  }

  /** sortable 拖拽换位：计算 from/to 索引并通知 oas-reorder */
  private reorder(fromValue: string, toValue: string): void {
    const values = this.panelValues()
    const fromIndex = values.indexOf(fromValue)
    const toIndex = values.indexOf(toValue)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    this.host.notifyManager('reorder', { fromIndex, toIndex })
  }

  // ==================== editable 双击重命名 ====================

  /**
   * editable 重命名：双击委托（真实双击前两次 click 触发 activate→update 重建 tablist，
   * 导致浏览器判定双击目标已变而不派发 dblclick——委托到稳定的 tablist 容器避开该问题）。
   */
  private onTablistDblClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest?.(
      '[role="tab"][data-value]',
    ) as HTMLElement | null
    if (!btn) return
    const value = btn.getAttribute('data-value') ?? ''
    const panel = this.panelOf(value)
    if (!panel?.hasAttribute('editable')) return
    e.stopPropagation()
    this.startRename(btn, panel, value)
  }

  /** 标签 label 替换为 input 进入编辑态。Enter/blur 确认（写回 label + oas-rename）；Esc 取消。 */
  private startRename(btn: HTMLElement, panel: HTMLElement, value: string): void {
    const labelEl = btn.querySelector('.tab-label') as HTMLElement | null
    if (!labelEl || btn.querySelector('.tab-rename-input')) return
    const original = panel.getAttribute('label') ?? ''
    // 宽度贴合原标签（不用 input 默认宽度，防布局跳动）+ 随内容自适应增长
    const baseWidth = labelEl.offsetWidth
    const baseHeight = labelEl.offsetHeight
    const input = document.createElement('input')
    input.className = 'tab-rename-input'
    input.value = original
    input.setAttribute('aria-label', this.host.translateText('tabs.newTab'))
    if (baseWidth > 0) input.style.width = `${baseWidth}px`
    // 高度贴合原标签（input 固有高度 ≠ span 行高，差 1px 会致 tab 轻微晃动）
    if (baseHeight > 0) input.style.height = `${baseHeight}px`
    // 自适应：输入内容变长时宽度跟随（不小于原标签宽），缩短时回到原宽
    const syncWidth = (): void => {
      const contentW = input.scrollWidth
      const w = Math.max(baseWidth, contentW)
      if (w > 0) input.style.width = `${w}px`
    }
    input.addEventListener('input', syncWidth)
    labelEl.replaceWith(input)
    input.focus()
    input.select()
    const finish = (commit: boolean): void => {
      const newLabel = input.value.trim()
      if (commit && newLabel && newLabel !== original) {
        panel.setAttribute('label', newLabel)
        this.host.notifyManager('rename', { value, label: newLabel })
      }
      // 恢复标签渲染（重建整个 tablist 恢复结构）
      this.host.refreshTabs()
    }
    input.addEventListener('keydown', (e: Event) => {
      const k = e as KeyboardEvent
      k.stopPropagation()
      if (k.key === 'Enter') {
        k.preventDefault()
        finish(true)
      } else if (k.key === 'Escape') {
        k.preventDefault()
        finish(false)
      }
    })
    // 失焦保存（通用 commit on blur：Enter 保存、Esc 取消、blur 保存）；内容未变则静默退出
    input.addEventListener('blur', () => finish(true))
    input.addEventListener('click', (e) => e.stopPropagation())
  }

  // ==================== contextmenu 右键菜单 ====================

  /** 右键标签：弹批量关闭菜单（新建/关闭/关闭其他/关闭左侧所有/关闭右侧所有/关闭全部） */
  private onTablistContextMenu = (e: MouseEvent): void => {
    if (!this.host.hasAttribute('context-menu')) return
    const btn = (e.target as HTMLElement).closest?.(
      '[role="tab"][data-value]',
    ) as HTMLElement | null
    if (!btn) return
    e.preventDefault()
    e.stopPropagation()
    const value = btn.getAttribute('data-value') ?? ''
    if (!value) return
    this.showContextMenu(value, e.clientX, e.clientY)
  }

  /** 构建/定位右键菜单（懒创建复用） */
  private showContextMenu(value: string, x: number, y: number): void {
    this.ctxMenuValue = value
    const root = this.host.shadowRoot
    if (!root) return
    if (!this.ctxMenuEl) {
      const menu = document.createElement('div')
      menu.className = 'ctx-menu'
      menu.setAttribute('part', 'context-menu')
      menu.setAttribute('role', 'menu')
      const items: Array<{ op: CtxOp; key: string }> = [
        { op: 'new', key: 'tabs.ctxNew' },
        { op: 'close', key: 'tabs.ctxClose' },
        { op: 'others', key: 'tabs.ctxCloseOthers' },
        { op: 'left', key: 'tabs.ctxCloseLeft' },
        { op: 'right', key: 'tabs.ctxCloseRight' },
        { op: 'all', key: 'tabs.ctxCloseAll' },
      ]
      for (const it of items) {
        // 新建与关闭族之间加分隔线（浏览器标签右键菜单惯例：新建置顶）
        if (it.op === 'close') {
          const divider = document.createElement('div')
          divider.className = 'ctx-divider'
          divider.setAttribute('role', 'separator')
          menu.appendChild(divider)
        }
        const item = document.createElement('button')
        item.className = 'ctx-item' + (it.op === 'all' ? ' danger' : '')
        item.type = 'button'
        item.setAttribute('role', 'menuitem')
        item.dataset.op = it.op
        item.addEventListener('click', () => {
          this.runCtxOp(it.op, this.ctxMenuValue)
          this.hideContextMenu()
        })
        item.addEventListener('keydown', (e) => {
          const ke = e as KeyboardEvent
          if (ke.key === 'Escape') {
            ke.preventDefault()
            this.hideContextMenu()
            return
          }
          // menu 模式 roving：方向键/Home/End 在菜单项间移动（与 more-dropdown 一致）
          if (
            ke.key === 'ArrowDown' ||
            ke.key === 'ArrowUp' ||
            ke.key === 'Home' ||
            ke.key === 'End'
          ) {
            ke.preventDefault()
            const btns = [...menu.querySelectorAll<HTMLElement>('.ctx-item')]
            const i = btns.indexOf(item)
            const n =
              ke.key === 'Home'
                ? 0
                : ke.key === 'End'
                  ? btns.length - 1
                  : ke.key === 'ArrowDown'
                    ? (i + 1) % btns.length
                    : (i - 1 + btns.length) % btns.length
            btns[n]?.focus({ preventScroll: true })
          }
        })
        menu.appendChild(item)
      }
      root.appendChild(menu)
      this.ctxMenuEl = menu
    }
    // locale 文案每次刷新（setLocale 切换自动更新）
    const btns = this.ctxMenuEl.querySelectorAll<HTMLElement>('.ctx-item')
    const ops: CtxOp[] = ['new', 'close', 'others', 'left', 'right', 'all']
    btns.forEach((b, i) => {
      const op = ops[i]!
      b.textContent = this.host.translateText(
        op === 'new'
          ? 'tabs.ctxNew'
          : op === 'close'
            ? 'tabs.ctxClose'
            : op === 'others'
              ? 'tabs.ctxCloseOthers'
              : op === 'left'
                ? 'tabs.ctxCloseLeft'
                : op === 'right'
                  ? 'tabs.ctxCloseRight'
                  : 'tabs.ctxCloseAll',
      )
    })
    // 定位：光标处，视口夹取防溢出
    const menu = this.ctxMenuEl
    menu.hidden = false
    const mw = menu.offsetWidth || 160
    const mh = menu.offsetHeight || 180
    const left = Math.max(4, Math.min(x, window.innerWidth - mw - 4))
    const top = Math.max(4, Math.min(y, window.innerHeight - mh - 4))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    menu.querySelector<HTMLElement>('.ctx-item')?.focus({ preventScroll: true })
  }

  private hideContextMenu(): void {
    if (this.ctxMenuEl) this.ctxMenuEl.hidden = true
  }

  private onDocClick = (e: Event): void => {
    const menu = this.ctxMenuEl
    if (!menu || menu.hidden) return
    const path = (e as MouseEvent).composedPath()
    if (!path.includes(menu)) this.hideContextMenu()
  }

  private onDocKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.hideContextMenu()
  }

  /** 右键菜单操作：new 通知 oas-add（与 addable + 按钮同契约）；关闭族按目标集合逐个通知 oas-close{key} */
  private runCtxOp(op: CtxOp, value: string): void {
    if (op === 'new') {
      this.host.notifyManager('add', { label: this.host.translateText('tabs.newTab') })
      return
    }
    this.closeTabsByOp(op, value)
  }

  /** 按操作逐个通知 oas-close{key}（宿主既有 oas-close 处理逐个移除面板，契约零变更） */
  private closeTabsByOp(op: CloseOp, value: string): void {
    const values = this.panelValues()
    const idx = values.indexOf(value)
    let targets: string[] = []
    if (op === 'close') targets = [value]
    else if (op === 'others') targets = values.filter((v) => v !== value)
    else if (op === 'left') targets = idx >= 0 ? values.slice(0, idx) : []
    else if (op === 'right') targets = idx >= 0 ? values.slice(idx + 1) : []
    else targets = values
    for (const key of targets) this.host.notifyManager('close', { key })
  }

  // ==================== 面板 DOM 映射辅助 ====================

  /** 直接子面板按 DOM 序（与核心 this.panels 同一来源；能力经 querySelector 自行读取） */
  private panels(): OASTabPanel[] {
    return [...this.host.querySelectorAll<OASTabPanel>(':scope > oas-tab-panel')]
  }

  private panelValues(): string[] {
    return this.panels().map((p) => p.getAttribute('value') ?? '')
  }

  private panelOf(value: string): OASTabPanel | null {
    return this.panels().find((p) => (p.getAttribute('value') ?? '') === value) ?? null
  }
}

/** 便捷：构造 manager 能力 controller（供能力注册表 / 组装类 addController 用） */
export function createTabsManagerController(
  host: HTMLElement & TabsManagerHost,
): TabsManagerController {
  return new TabsManagerController(host)
}
