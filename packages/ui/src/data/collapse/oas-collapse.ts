import { OASElement } from '@oas-ui/core'
import type { OASCollapseItem } from './oas-collapse-item.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.group {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.item {
  border-bottom: 1px solid var(--oas-color-border);
}
.item:last-child {
  border-bottom: none;
}
/* 无边框幽灵形态：去掉组轮廓圆角与项分隔线 */
:host([variant="borderless"]) .group {
  border: none;
  border-radius: 0;
}
:host([variant="borderless"]) .item {
  border-bottom: none;
}
`

export class OASCollapse extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active', 'accordion', 'variant', 'icon-placement', 'heading-level', 'default-active']
  }

  /** 非受控内部状态：active 属性缺席时自管（首帧由 default-active 播种，之后点击自更新） */
  private internalActive: string[] | null = null

  /** roving tabindex 当前锚定的 item */
  private rovingItem: OASCollapseItem | null = null

  /** item 事件绑定去重（item-click / keydown 每 item 只绑一次） */
  private bound = new WeakSet<OASCollapseItem>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；collapse 自身的 item 事件绑定在 update 中经 WeakSet 幂等处理） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  /** 只收集直接子 item：嵌套 collapse 的内部 item 归内层容器管，互不干扰 */
  private items(): OASCollapseItem[] {
    return Array.from(this.children).filter(
      (el): el is OASCollapseItem => el.tagName === 'OAS-COLLAPSE-ITEM',
    )
  }

  private parseList(raw: string | null): string[] {
    return (raw ?? '').split(',').filter(Boolean)
  }

  /** 生效展开集合：active 属性在场为受控；缺席时取内部状态（首帧用 default-active 播种一次） */
  private getActive(): string[] {
    if (this.hasAttribute('active')) return this.parseList(this.getAttribute('active'))
    if (this.internalActive === null) {
      this.internalActive = this.parseList(this.getAttribute('default-active'))
      if (this.hasAttr('accordion')) this.internalActive = this.internalActive.slice(0, 1)
    }
    return this.internalActive
  }

  /** 写回展开集合：受控模式写 active 属性，非受控模式写内部状态 */
  private commit(next: string[]): void {
    if (this.hasAttribute('active')) this.setAttribute('active', next.join(','))
    else this.internalActive = next
    this.emit('change', { active: next })
    this.update()
  }

  private toggle(name: string): void {
    const item = this.items().find((i) => i.getAttribute('name') === name)
    // isDisabled?.() 可空调用：item 升级晚于容器时（define 顺序窗口）方法是 undefined，按未禁用放行
    if (item?.isDisabled?.() === true) return
    const current = this.getActive()
    const open = current.includes(name)
    // no-collapse 强锁：展开后点自身不收（可再开别的）
    if (open && item?.hasAttribute('no-collapse')) return
    let next: string[]
    if (this.hasAttr('accordion')) {
      next = open ? [] : [name]
    } else {
      next = open ? current.filter((n) => n !== name) : [...current, name]
    }
    // oas-before-collapse：切换前可取消（detail 含目标 name 与将生效的 next 集合）
    if (!this.emit('before-collapse', { name, next }, { cancelable: true })) return
    this.commit(next)
  }

  /** 展开全部可用面板（跳过 disabled）；手风琴语义下只展开第一项。命令式方法，不触发 before-collapse */
  expandAll(): void {
    const names = this.items()
      .filter((i) => i.isDisabled?.() !== true)
      .map((i) => i.getAttribute('name') ?? '')
      .filter(Boolean)
    this.commit(this.hasAttr('accordion') ? names.slice(0, 1) : names)
  }

  /** 收起全部面板。命令式方法，不受 no-collapse 强锁限制（锁只约束头部点击） */
  collapseAll(): void {
    this.commit([])
  }

  protected override update(): void {
    const active = this.getActive()
    const placement = this.getAttr('icon-placement', 'end')
    const headingLevel = this.getAttr('heading-level', '')

    for (const item of this.items()) {
      const name = item.getAttribute('name') ?? ''
      if (active.includes(name)) item.setAttribute('open', '')
      else item.removeAttribute('open')

      // 容器级 icon-placement / heading-level 传播：item 自定义时不覆盖
      if (!item.hasAttribute('icon-placement')) {
        if (placement === 'end') item.removeAttribute('icon-placement')
        else item.setAttribute('icon-placement', placement)
      }
      if (!item.hasAttribute('heading-level')) {
        if (headingLevel) item.setAttribute('heading-level', headingLevel)
        else item.removeAttribute('heading-level')
      }

      if (!this.bound.has(item)) {
        item.addEventListener('oas-collapse-item-click', ((e: Event) => {
          const detail = (e as CustomEvent<{ item: OASCollapseItem }>).detail
          // 嵌套防御：内层 item 的事件冒泡到外层容器时，只归直接父容器处理
          if (detail.item.closest('oas-collapse') !== this) return
          this.rovingItem = detail.item
          this.syncRoving()
          this.toggle(detail.item.getAttribute('name') ?? '')
        }) as EventListener)
        item.addEventListener('keydown', ((e: Event) => this.onItemKeydown(e)) as EventListener)
        this.bound.add(item)
      }
    }
    this.syncRoving()
  }

  /** roving tabindex：锚定项 tabindex=0，其余 -1；disabled 项恒 -1 且不参与移动 */
  private syncRoving(): void {
    // isDisabled/setRoving 可空调用：item 未升级时按未禁用处理、跳过 roving 写入；
    // item 升级后会经 requestSync 微任务重同步，最终一致
    const enabled = this.items().filter((i) => i.isDisabled?.() !== true)
    if (!this.rovingItem || !enabled.includes(this.rovingItem)) {
      this.rovingItem = enabled[0] ?? null
    }
    for (const item of this.items()) {
      item.setRoving?.(item === this.rovingItem && item.isDisabled?.() !== true)
    }
  }

  /** item 升级晚于容器（define 顺序窗口）时由 item 连接后微任务回调：重同步 roving/disabled 态 */
  requestSync(): void {
    this.update()
  }

  /** 键盘：↑↓/Home/End 移动 roving 焦点（仅头 button 的按键，slotted 输入控件不劫持） */
  private onItemKeydown(e: Event): void {
    const ke = e as KeyboardEvent
    // 经 composedPath 找头 button：shadow 内按键（happy-dom 不做 target 重定向）与
    // 真实浏览器行为都覆盖；slotted 富标题 / extra 内控件的按键路径里不含 head，天然跳过
    const path = typeof ke.composedPath === 'function' ? ke.composedPath() : []
    const onHead = path.some(
      (n) => n instanceof Element && n.getAttribute('part') === 'head',
    )
    if (!onHead) return
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(ke.key)) return
    ke.preventDefault()
    const enabled = this.items().filter((i) => i.isDisabled?.() !== true)
    const idx = this.rovingItem ? enabled.indexOf(this.rovingItem) : -1
    let nextIdx = idx
    if (ke.key === 'ArrowDown') nextIdx = idx + 1
    else if (ke.key === 'ArrowUp') nextIdx = idx - 1
    else if (ke.key === 'Home') nextIdx = 0
    else if (ke.key === 'End') nextIdx = enabled.length - 1
    if (nextIdx < 0 || nextIdx >= enabled.length) return
    this.rovingItem = enabled[nextIdx]!
    this.syncRoving()
    enabled[nextIdx]!.focusHead()
  }
}
