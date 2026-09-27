import { OASElement } from '@oas-ui/core'

/**
 * oas-form-list —— 动态字段组（oas-form 配套子组件，D10）。
 *
 * 宿主在组件内写一个 `<template>`（默认插槽位）作为字段行模板；组件按 `min`/`max` 维护行数，
 * 克隆模板创建行并把行内字段 `name` 索引化，主表 `oas-form` 经 light DOM 收集自然纳入校验/提交。
 *
 * name 索引化两条通路（可判定优先级：模板含 `{index}` 占位优先，否则按 `name` 属性前缀）：
 * 1. `{index}` 占位：模板字段 `name="users.{index}.name"` → 第 N 行为 `users.N.name`；
 * 2. `name` 前缀：组件 `name="users"` + 模板字段裸 `name="name"` → `users.N.name`。
 * 两者都未配置时字段名原样克隆（不索引化）。
 *
 * 字段留在 light DOM 是有意设计：主表 collectFields 只收集 light DOM，行内字段随主表
 * 校验/提交/values-change；删除行后剩余行重新编号（name 重派生，用户已填值随行保留）。
 *
 * 事件：`oas-add` detail `{ index }` / `oas-remove` detail `{ index }`。
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
}
.remove:hover:not(:disabled) {
  color: var(--oas-color-danger);
  background: var(--oas-color-bg-hover);
}
.remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.remove:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
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
`

const ADD_ICON_PATH = 'M8 3 L8 13 M3 8 L13 8'
const REMOVE_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

interface NamedFieldRecord {
  /** 行内字段元素 */
  el: Element
  /** 模板原始 name（重编号时按它重派生） */
  tplName: string
}

interface ListItem {
  /** 行唯一号（slot 名稳定，删行不重排 slot） */
  uid: number
  /** light DOM 行 wrapper（slot 进阴影帧） */
  wrapper: HTMLElement
  /** 行内带 name 的字段记录（重编号用） */
  named: NamedFieldRecord[]
}

/** {index} 占位符 */
const INDEX_PLACEHOLDER = '{index}'

export class OASFormList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'min', 'max', 'disabled']
  }

  private itemsEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private items: ListItem[] = []
  private uidCounter = 0
  /** 当前生效的行模板（变化时整建行） */
  private lastTemplate: HTMLTemplateElement | null = null
  /** 有新建行待主表补放初始值（首次建行 / 模板重建 / min 补足） */
  private pendingInitialReplay = true
  private childObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="items" part="items"></div>
      <slot></slot>
      <button class="add" part="add" type="button"></button>
    `
  }

  /** 缓存节点引用 + 绑定添加按钮/行删除点击 + 观察模板增删（render 与水合路径共用） */
  private bind(): void {
    this.itemsEl = this.shadow.querySelector('.items')
    this.addBtn = this.shadow.querySelector('.add')
    this.addBtn?.addEventListener('click', () => this.handleAdd())
    this.itemsEl?.addEventListener('click', ((e: MouseEvent) => this.handleRemoveClick(e)) as EventListener)

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
    this.onCleanup(() => {
      this.items = []
      this.lastTemplate = null
    })
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

  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    return Math.max(0, Number(raw) || 0)
  }

  /** 模板引用变化：清空全部行（light wrapper + 阴影帧），由 update 后续步骤按 min 重建 */
  private rebuild(): void {
    for (const item of this.items) item.wrapper.remove()
    this.items = []
    this.itemsEl?.querySelectorAll(':scope > .item').forEach((frame) => frame.remove())
    this.pendingInitialReplay = true
  }

  /** 不足 min 补足行（min 调大同样生效）；新建行标记待主表补放初始值 */
  private ensureItems(): void {
    if (!this.lastTemplate) return
    let grew = false
    while (this.items.length < this.minValue()) {
      this.addItem()
      grew = true
    }
    if (grew) this.pendingInitialReplay = true
  }

  /** 行内字段 name 索引化：{index} 占位优先，否则 list name 前缀，否则原样 */
  private indexedName(tplName: string, index: number, listName: string): string {
    if (tplName.includes(INDEX_PLACEHOLDER)) return tplName.split(INDEX_PLACEHOLDER).join(String(index))
    if (listName !== '') return `${listName}.${index}.${tplName}`
    return tplName
  }

  /** 创建一行：克隆模板 → 索引化字段 name → light wrapper（slot 进阴影帧） */
  private addItem(): ListItem {
    const index = this.items.length
    const uid = this.uidCounter++
    const listName = this.getAttr('name', '')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-oas-form-list-item', '')
    wrapper.setAttribute('slot', `oas-form-list-item-${uid}`)

    const named: NamedFieldRecord[] = []
    const content = this.lastTemplate!.content.cloneNode(true) as DocumentFragment
    for (const el of [...content.querySelectorAll('[name]')]) {
      const tplName = el.getAttribute('name') ?? ''
      const next = this.indexedName(tplName, index, listName)
      if (next !== tplName) el.setAttribute('name', next)
      named.push({ el, tplName })
    }
    wrapper.appendChild(content)
    this.appendChild(wrapper)

    const item: ListItem = { uid, wrapper, named }
    this.items.push(item)
    return item
  }

  /** 重编号：name 属性变化 / 删行后，全部行字段按新索引重派生（值不动） */
  private applyNaming(): void {
    if (this.items.length === 0) return
    const listName = this.getAttr('name', '')
    this.items.forEach((item, index) => {
      for (const record of item.named) {
        const next = this.indexedName(record.tplName, index, listName)
        if (record.el.getAttribute('name') !== next) record.el.setAttribute('name', next)
      }
    })
  }

  /** 阴影帧同步：按行数增删帧、slot 名对齐、按钮状态刷新 */
  private syncShadow(): void {
    const itemsEl = this.itemsEl
    if (!itemsEl) return
    const frames = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .item')]
    while (frames.length > this.items.length) frames.pop()!.remove()
    while (frames.length < this.items.length) {
      const frame = document.createElement('div')
      frame.className = 'item'
      frame.setAttribute('part', 'item')
      const slot = document.createElement('slot')
      frame.appendChild(slot)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'remove'
      btn.setAttribute('part', 'remove')
      btn.setAttribute('aria-label', this.t('dynamicInput.remove'))
      btn.innerHTML = REMOVE_ICON
      frame.appendChild(btn)
      itemsEl.appendChild(frame)
      frames.push(frame)
    }
    const frozen = this.hasAttr('disabled')
    const atMin = this.items.length <= this.minValue()
    this.items.forEach((item, i) => {
      const frame = frames[i]!
      const slot = frame.querySelector('slot')
      const slotName = `oas-form-list-item-${item.uid}`
      if (slot?.getAttribute('name') !== slotName) slot?.setAttribute('name', slotName)
      const btn = frame.querySelector('button')
      if (btn) btn.disabled = frozen || atMin
    })
    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = frozen || this.items.length >= this.maxValue()
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
      span.textContent = this.t('dynamicInput.add')
      addBtn.appendChild(span)
    }
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

  private handleAdd(): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    if (!this.lastTemplate) return
    this.addItem()
    this.applyNaming()
    this.syncShadow()
    const index = this.items.length - 1
    this.emit('add', { index })
    this.focusItem(index)
  }

  private handleRemoveClick(e: MouseEvent): void {
    if (this.hasAttr('disabled')) return
    const path = e.composedPath() as Element[]
    const frame = path.find((n) => n instanceof Element && n.classList.contains('item'))
    if (!frame) return
    const frames = [...this.itemsEl!.querySelectorAll<HTMLElement>(':scope > .item')]
    const index = frames.indexOf(frame as HTMLElement)
    if (index < 0) return
    if (this.items.length <= this.minValue()) return
    const [item] = this.items.splice(index, 1)
    item!.wrapper.remove()
    this.applyNaming()
    this.syncShadow()
    this.emit('remove', { index })
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
