import { OASElement } from '@oas-ui/core/oas-element'
import { cloneSlotContent } from '../../shared/slot-template.js'
import {
  applyRowNaming,
  copyRowValue,
  indexedRowName,
  swapRowValues,
  type NamedRowField,
} from '../shared/list-row-ops.js'

/**
 * oas-form-list —— 动态字段组（oas-form 配套子组件，D10）。
 *
 * 宿主在组件内写一个 `<template>`（默认插槽位）作为字段行模板；组件按 `rows` / `min` / `max`
 * 维护行数，克隆模板创建行并把行内字段 `name` 索引化，主表 `oas-form` 经 light DOM 收集
 * 自然纳入校验/提交。
 *
 * 行数两个来源（V2 拆分，`min` 不再一物二用）：
 * - `rows`：初始渲染行数（显式指定时只作初始行数）；
 * - `min`：删行下界；未提供 `rows` 时兼作初始行数（既有用法向后兼容）。
 * 删行下界默认 0——初始 1 行的数组可以删空，`minItems` 交给校验层报错（不再被表单锁住）。
 *
 * name 索引化两条通路（可判定优先级：模板含 `{index}` 占位优先，否则按 `name` 属性前缀）：
 * 1. `{index}` 占位：模板字段 `name="users.{index}.name"` → 第 N 行为 `users.N.name`；
 * 2. `name` 前缀：组件 `name="users"` + 模板字段裸 `name="name"` → `users.N.name`。
 * 两者都未配置时字段名原样克隆（不索引化）。
 *
 * 字段留在 light DOM 是有意设计：主表 collectFields 只收集 light DOM，行内字段随主表
 * 校验/提交/values-change；删除行后剩余行重新编号（name 重派生，用户已填值随行保留）。
 *
 * 事件：`oas-add` / `oas-remove` `{ index }`；`oas-duplicate` / `oas-move` `{ from, to }`。
 * 行尾操作区（复制 / 上移 / 下移 / 删除）与 oas-array-table 行操作列同一套语义（值读写走内核
 * 通道、upload 跳过、操作后焦点按索引回归、aria-live 播报）。
 * 首次建行与模板重建后，会通知最近 `oas-form` 为新字段补放 initial-values（不覆盖已有字段）。
 */
const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.items {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.item {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
}
::slotted([data-oas-form-list-item]) {
  flex: 1;
  min-width: 0;
}
.ops {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: none;
}
.op,
.remove {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-text-secondary);
  flex: none;
  font-family: inherit;
  padding: 0;
}
.op:hover:not(:disabled),
.remove:hover:not(:disabled) {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.remove:hover:not(:disabled) {
  color: var(--oas-color-danger);
}
.op:focus-visible,
.remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.op:disabled,
.remove:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: transparent;
}
.add {
  appearance: none;
  border: 1px dashed var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-md);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-3);
  font-family: inherit;
  margin-top: var(--oas-space-2);
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 行操作播报区：视觉隐藏但保持可访问（读屏播报 + 不占布局） */
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .op:focus-visible,
  .remove:focus-visible,
  .add:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

const ADD_ICON_PATH = 'M8 3 L8 13 M3 8 L13 8'
const REMOVE_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
const DUPLICATE_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M5 2 L12 2 L12 9 M3 5 L10 5 L10 13 L3 13 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
</svg>`
const UP_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M8 12 L8 4 M4.5 7.5 L8 4 L11.5 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
const DOWN_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M8 4 L8 12 M4.5 8.5 L8 12 L11.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

/** 行内操作按钮种类（顺序即渲染顺序，删除在末尾——破坏性动作离手最远） */
const ROW_ACTIONS = ['duplicate', 'move-up', 'move-down', 'remove'] as const
type RowAction = (typeof ROW_ACTIONS)[number]

interface ListItem {
  /** 行唯一号（slot 名稳定，删行不重排 slot） */
  uid: number
  /** light DOM 行 wrapper（slot 进阴影帧） */
  wrapper: HTMLElement
  /** 行内带 name 的字段记录（重编号用） */
  named: NamedRowField[]
}

export class OASFormList extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'name',
      'rows',
      'min',
      'max',
      'disabled',
      'add-text',
      'remove-text',
      'duplicate-text',
      'move-up-text',
      'move-down-text',
    ]
  }

  private itemsEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private liveEl: HTMLElement | null = null
  private items: ListItem[] = []
  private uidCounter = 0
  /** 当前生效的行模板（变化时整建行） */
  private lastTemplate: HTMLTemplateElement | null = null
  /** 有新建行待主表补放初始值（首次建行 / 模板重建 / rows 补足） */
  private pendingInitialReplay = true
  private childObserver: MutationObserver | null = null
  /** 上次渲染的帧顺序键（uid 序列）：顺序/行数变化才重建帧，属性微调不抖焦点 */
  private frameKey = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="items" part="items"></div>
      <slot></slot>
      <div class="live" part="live" role="status" aria-live="polite" aria-atomic="true"></div>
      <button class="add" part="add" type="button"></button>
    `
  }

  /** 缓存节点引用 + 绑定添加按钮/行操作点击 + 观察模板增删（render 与水合路径共用） */
  private bind(): void {
    this.itemsEl = this.shadow.querySelector('.items')
    this.addBtn = this.shadow.querySelector('.add')
    this.liveEl = this.shadow.querySelector('.live')
    this.addBtn?.addEventListener('click', this.handleAddClick)
    this.itemsEl?.addEventListener('click', this.handleRowActionEvent as EventListener)

    // 模板增删（Vue/md 场景晚于连接注入）：直接子节点变化时核对模板引用
    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.handleDomMutation())
      observer.observe(this, { childList: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    // 行状态（items / lastTemplate）**不随断开清理**：行 wrapper 留在 light DOM，
    // 清空记录会让重连后的 update 认不出既有行、按初始行数再建一遍（行数翻倍实抓）
  }

  /** 断开重连：观察器与阴影内监听已由 cleanup 摘除 → 重新绑定（幂等） */
  protected override onReconnect(): void {
    this.bind()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（items 容器与添加按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.items')) return false
    if (!this.shadow.querySelector('.add')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
    }
    this.ensureItems()
    this.applyNaming()
    this.syncShadow()
    this.replayInitialValues()
  }

  /** 默认插槽位的行模板（首个无 slot 属性的 template；具名 template 不参与） */
  private resolveTemplate(): HTMLTemplateElement | null {
    return this.querySelector('template:not([slot])')
  }

  /** 删行下界（min；缺省 0——删空由校验层报 minItems，不再锁住唯一行） */
  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  /** 初始行数：rows 优先；未提供时沿用 min（既有用法向后兼容）；都没有则 0 行 */
  private initialRowCount(): number {
    const rows = this.getAttr('rows', '')
    if (rows !== '') {
      const n = Number(rows)
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    }
    return this.minValue()
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    // 非法值回落无上限（「无法解析」≠「上限为零」——Number(raw)||0 会把 'abc' 当 0 误锁添加）
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, n) : Number.POSITIVE_INFINITY
  }

  /** 模板引用变化：清空全部行（light wrapper + 阴影帧），由 update 后续步骤按初始行数重建 */
  private rebuild(): void {
    for (const item of this.items) item.wrapper.remove()
    this.items = []
    this.frameKey = ''
    this.itemsEl?.querySelectorAll(':scope > .item').forEach((frame) => frame.remove())
    this.pendingInitialReplay = true
  }

  /** 不足初始行数补足（rows / min 调大同样生效）；新建行标记待主表补放初始值 */
  private ensureItems(): void {
    if (!this.lastTemplate) return
    let grew = false
    const target = this.initialRowCount()
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    if (grew) this.pendingInitialReplay = true
  }

  /** 创建一行：克隆模板 → 索引化字段 name → light wrapper（slot 进阴影帧） */
  private addItem(at: number = this.items.length): ListItem {
    const uid = this.uidCounter++
    const listName = this.getAttr('name', '')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-oas-form-list-item', '')
    wrapper.setAttribute('slot', `oas-form-list-item-${uid}`)

    const named: NamedRowField[] = []
    // 双形态克隆：静态 HTML 取 template.content，框架 CSR 直插取 template 元素 childNodes
    const content = cloneSlotContent(this.lastTemplate!)
    for (const el of [...content.querySelectorAll('[name]')]) {
      const tplName = el.getAttribute('name') ?? ''
      const next = indexedRowName(tplName, at, listName)
      if (next !== tplName) el.setAttribute('name', next)
      named.push({ el, tplName })
    }
    wrapper.appendChild(content)

    const item: ListItem = { uid, wrapper, named }
    const anchor = this.items[at]?.wrapper ?? null
    if (anchor) this.insertBefore(wrapper, anchor)
    else this.appendChild(wrapper)
    this.items.splice(at, 0, item)
    return item
  }

  /** 重编号：name 属性变化 / 行增删移动后，全部行字段按新索引重派生（值不动） */
  private applyNaming(): void {
    if (this.items.length === 0) return
    applyRowNaming(
      this.items.map((item) => item.named),
      this.getAttr('name', ''),
    )
  }

  /** 阴影帧同步：行数/顺序变化才重建帧；文案与禁用态每次刷新（属性微调即时跟随） */
  private syncShadow(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    const key = this.items.map((item) => item.uid).join(',')
    if (key !== this.frameKey) {
      this.frameKey = key
      itemsEl.textContent = ''
      for (const item of this.items) itemsEl.appendChild(this.createFrame(item.uid))
    }
    const frames = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .item')]
    const frozen = this.hasAttr('disabled')
    const atMin = this.items.length <= this.minValue()
    const atMax = this.items.length >= this.maxValue()
    const last = this.items.length - 1
    this.items.forEach((item, i) => {
      const frame = frames[i]
      if (!frame) return
      const slotName = `oas-form-list-item-${item.uid}`
      const slot = frame.querySelector('slot')
      if (slot?.getAttribute('name') !== slotName) slot?.setAttribute('name', slotName)
      const states: Record<RowAction, boolean> = {
        duplicate: frozen || atMax,
        'move-up': frozen || i === 0,
        'move-down': frozen || i === last,
        remove: frozen || atMin,
      }
      for (const action of ROW_ACTIONS) {
        const btn = frame.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        if (!btn) continue
        btn.disabled = states[action]
        const label = this.resolveActionText(action)
        if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label)
      }
    })
    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = frozen || atMax
      addBtn.textContent = ''
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('viewBox', '0 0 16 16')
      icon.setAttribute('width', '12')
      icon.setAttribute('height', '12')
      icon.setAttribute('aria-hidden', 'true')
      icon.setAttribute('focusable', 'false')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', ADD_ICON_PATH)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1.4')
      path.setAttribute('stroke-linecap', 'round')
      icon.appendChild(path)
      // 图标与文案间距走逻辑属性（RTL 下间隙自动落到文案另一侧）
      icon.style.setProperty('margin-inline-end', 'var(--oas-space-1)')
      icon.style.verticalAlign = '-2px'
      addBtn.appendChild(icon)
      const span = document.createElement('span')
      span.textContent = this.resolveAddText()
      addBtn.appendChild(span)
    }
  }

  /** 行操作区帧（slot + 四个操作钮） */
  private createFrame(uid: number): HTMLElement {
    const frame = document.createElement('div')
    frame.className = 'item'
    frame.setAttribute('part', 'item')
    const slot = document.createElement('slot')
    slot.setAttribute('name', `oas-form-list-item-${uid}`)
    frame.appendChild(slot)
    const ops = document.createElement('div')
    ops.className = 'ops'
    ops.setAttribute('part', 'ops')
    const icons: Record<RowAction, string> = {
      duplicate: DUPLICATE_ICON,
      'move-up': UP_ICON,
      'move-down': DOWN_ICON,
      remove: REMOVE_ICON,
    }
    for (const action of ROW_ACTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = action === 'remove' ? 'remove' : 'op'
      btn.setAttribute('part', action)
      btn.setAttribute('data-action', action)
      btn.innerHTML = icons[action]
      ops.appendChild(btn)
    }
    frame.appendChild(ops)
    return frame
  }

  /** 行操作按钮可访问名：`<action>-text` 覆盖（缺省走 i18n），schema-form 注入自己的文案 */
  private resolveActionText(action: RowAction): string {
    const raw = this.getAttr(`${action}-text`, '')
    if (raw !== '') return raw
    if (action === 'duplicate') return this.t('schemaForm.rowDuplicate')
    if (action === 'move-up') return this.t('schemaForm.rowUp')
    if (action === 'move-down') return this.t('schemaForm.rowDown')
    return this.t('dynamicInput.remove')
  }

  /**
   * 添加按钮文案：add-text 覆盖（缺省走既有 i18n）。
   * 命名刻意避开 attribute camelCase（`add-text` → `addText` / `remove-text` → `removeText`）：
   * 同名私有方法会被框架的 property 写入以 own property 遮蔽，内部 `this.xxx()` 直接 TypeError（撞名守卫红线）。
   */
  private resolveAddText(): string {
    const raw = this.getAttr('add-text', '')
    return raw !== '' ? raw : this.t('dynamicInput.add')
  }

  /** 新建行后通知最近 oas-form 补放 initial-values（只为新字段；无主表/无新行时跳过） */
  private replayInitialValues(): void {
    if (!this.pendingInitialReplay) return
    this.pendingInitialReplay = false
    const form = this.closest('oas-form') as { reapplyInitialValues?: () => void } | null
    form?.reapplyInitialValues?.()
  }

  /** 模板增删（观察器）：仅模板引用变化时整建，自身行 wrapper 增删不触发 */
  private handleDomMutation(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
      this.ensureItems()
      this.applyNaming()
      this.syncShadow()
      this.replayInitialValues()
    }
  }

  /** 行数（当前渲染行） */
  get rowCount(): number {
    return this.items.length
  }

  /**
   * 行数收敛到指定值（程序化：受控数组缩容 / 行值内层数组对齐用）：
   * 增长补空行、缩减从末尾删行，**不派发 oas-add / oas-remove**（值来源在调用方）。
   */
  setRowCount(count: number): void {
    if (!this.lastTemplate) return
    const target = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : this.items.length
    if (target === this.items.length) return
    let grew = false
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    while (this.items.length > target) {
      const [removed] = this.items.splice(this.items.length - 1, 1)
      removed?.wrapper.remove()
    }
    if (grew) this.pendingInitialReplay = true
    this.applyNaming()
    this.syncShadow()
    this.replayInitialValues()
  }

  /**
   * 在第 `index` 位插入一行（复制行用），返回是否插入。
   * 新行按模板克隆、字段名按新索引重派生，值由调用方写入。
   */
  insertRowAt(index: number): boolean {
    if (!this.lastTemplate) return false
    if (this.items.length >= this.maxValue()) return false
    const at = Math.min(Math.max(0, Math.floor(index)), this.items.length)
    this.addItem(at)
    this.pendingInitialReplay = true
    this.applyNaming()
    this.syncShadow()
    this.replayInitialValues()
    return true
  }

  private handleAdd(): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    if (!this.lastTemplate) return
    this.addItem()
    this.applyNaming()
    this.syncShadow()
    this.replayInitialValues()
    const index = this.items.length - 1
    this.emit('add', { index })
    this.announce(this.t('schemaForm.rowAdded', { index: index + 1 }))
    this.focusItem(index)
  }

  /** 行操作点击（事件委托：帧在 shadow 内，路径取 button[data-action]） */
  private readonly handleRowActionEvent = (event: Event): void => this.handleRowAction(event as MouseEvent)

  private readonly handleAddClick = (): void => this.handleAdd()

  private handleRowAction(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    const button = path.find((n) => n instanceof Element && n.hasAttribute('data-action')) as HTMLElement | undefined
    if (!button || button.hasAttribute('disabled')) return
    const action = button.getAttribute('data-action') as RowAction | null
    if (!action) return
    const frame = path.find((n) => n instanceof Element && n.classList.contains('item'))
    if (!frame) return
    const frames = [...this.itemsEl!.querySelectorAll<HTMLElement>(':scope > .item')]
    const index = frames.indexOf(frame as HTMLElement)
    if (index < 0) return
    if (action === 'remove') this.removeRow(index)
    else if (action === 'duplicate') this.duplicateRow(index)
    else this.moveRow(index, action === 'move-up' ? index - 1 : index + 1)
  }

  private removeRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length <= this.minValue()) return
    const [item] = this.items.splice(index, 1)
    item!.wrapper.remove()
    this.applyNaming()
    this.syncShadow()
    this.emit('remove', { index })
    this.announce(this.t('schemaForm.rowRemoved', { index: index + 1 }))
    // 焦点按「同一位置」回归（被删行的按钮随行消失，落到新占该位置的行）
    const next = Math.min(index, this.items.length - 1)
    if (next >= 0) this.focusAction(next, 'remove')
  }

  private duplicateRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    const target = index + 1
    if (!this.insertRowAt(target)) return
    // 值写入必须在内层行数收敛之后：先按目标行数建内层行，再按路径写叶子
    copyRowValue(this, this.getAttr('name', ''), index, target)
    this.emit('duplicate', { from: index, to: target })
    this.announce(this.t('schemaForm.rowDuplicated', { index: target + 1 }))
    this.focusAction(target, 'duplicate')
  }

  private moveRow(from: number, to: number): void {
    if (this.hasAttr('disabled')) return
    if (to < 0 || to >= this.items.length) return
    swapRowValues(this, this.getAttr('name', ''), from, to)
    this.emit('move', { from, to })
    this.announce(this.t('schemaForm.rowMoved', { from: from + 1, to: to + 1 }))
    this.focusAction(to, to < from ? 'move-up' : 'move-down')
  }

  /** 行操作播报（aria-live polite；文案进 status 区） */
  private announce(message: string): void {
    if (!this.liveEl) return
    this.liveEl.textContent = message
  }

  /** 按行索引聚焦某个操作钮（行/帧可能已重建，按索引重新定位） */
  private focusAction(index: number, action: RowAction): void {
    this.focusActionIn(this.itemsEl?.querySelectorAll<HTMLElement>(':scope > .item')[index], action)
  }

  /** 焦点落点：优先被点按钮的同位按钮；边界处该按钮已禁用（首行上移 / 末行下移）则退到该行首个可用操作钮 */
  private focusActionIn(frame: HTMLElement | undefined, action: RowAction): void {
    if (!frame) return
    const preferred = frame.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
    if (preferred && !preferred.disabled) {
      preferred.focus()
      return
    }
    // 边界处优先退到「反向」操作钮（刚上移到首行 → 下移可撤销），再退首个可用
    const opposite = action === 'move-up' ? 'move-down' : action === 'move-down' ? 'move-up' : null
    const order: RowAction[] = opposite ? [opposite, ...ROW_ACTIONS] : [...ROW_ACTIONS]
    for (const candidate of order) {
      const btn = frame.querySelector<HTMLButtonElement>(`[data-action="${candidate}"]`)
      if (btn && !btn.disabled) {
        btn.focus()
        return
      }
    }
  }

  /** 聚焦行内第一个可聚焦控件（oas-input 聚焦其内部 input，原生控件直接聚焦） */
  private focusItem(index: number): void {
    const row = this.items[index]?.wrapper
    if (!row) return
    const oasInput = row.querySelector<HTMLElement>('oas-input')
    if (oasInput) {
      const inner = oasInput.shadowRoot?.querySelector<HTMLElement>('input')
      if (inner) {
        inner.focus()
        return
      }
    }
    const focusable = row.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]')
    focusable?.focus()
  }
}
