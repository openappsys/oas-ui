import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.head-row {
  display: flex;
  align-items: stretch;
}
.heading {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
}
.trigger {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  text-align: start;
}
.trigger:hover {
  background: var(--oas-color-bg-hover);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.header-text {
  order: 1;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: break-word;
}
.header-slot {
  order: 1;
  display: none;
  flex: 1 1 auto;
  min-width: 0;
}
:host([has-header-slot]) .header-slot {
  display: flex;
  align-items: center;
}
:host([has-header-slot]) .header-text {
  display: none;
}
.arrow {
  order: 2;
  flex: none;
  display: inline-flex;
  align-items: center;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
/* 展开态旋转：以 .root.open 类为准（不能写 :host([open])——受控收起 open="false" 时属性仍在场
   会误转，非受控展开无属性又不转；类由 update() 按生效展开态 toggle） */
.root.open .arrow {
  transform: rotate(90deg);
}
/* 展开动画：grid-template-rows 0fr→1fr 纯 CSS 方案，内容 overflow 裁剪 */
.body-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--oas-transition-base) var(--oas-ease-out);
}
.body {
  overflow: hidden;
  min-height: 0;
  padding: 0 var(--oas-space-4);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  transition: padding var(--oas-transition-base) var(--oas-ease-out);
}
.body-wrap.open {
  grid-template-rows: 1fr;
}
.body-wrap.open .body {
  padding: var(--oas-space-3) var(--oas-space-4);
}
/* disabled：不可聚焦、视觉降饱和，文字走 text-disabled token（含暗色变体） */
:host([disabled]) .trigger {
  cursor: not-allowed;
  opacity: 0.6;
}
:host([disabled]) .trigger,
:host([disabled]) .header-text {
  color: var(--oas-color-text-disabled);
}
:host([disabled]) .trigger:hover {
  background: none;
}
@media (prefers-reduced-motion: reduce) {
  .body-wrap,
  .body,
  .arrow {
    transition: none;
  }
}
`

/**
 * slot 模板克隆：浏览器对 <template> 子节点存在两种挂载形态（静态 HTML 在 content，
 * Vue 等框架 CSR 直插在元素 childNodes），按内容优先取源再深克隆，双形态都能渲染。
 */
function cloneSlotContent(tpl: HTMLTemplateElement): DocumentFragment {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const frag = document.createDocumentFragment()
  for (const node of Array.from(source.childNodes)) {
    frag.appendChild(node.cloneNode(true))
  }
  return frag
}

/**
 * oas-collapsible —— 单面板自折叠原语（data 族，邻近 oas-collapse）。
 *
 * 与 oas-collapse 的关系：collapse 是「容器 + 多面板」的编排件，面板开合由容器驱动；
 * collapsible 是无容器、自管开合的独立单面板，用作文件树节点 / 表单折叠分区 /
 * 侧栏分组等场景的积木。视觉与 collapse-item 同源（触发行 + grid 0fr→1fr 展开动画）。
 *
 * open 双模式契约：
 * - `open` 属性缺席 = 非受控：内部状态自管，首帧由 `default-open` 播种一次；
 * - `open` 属性在场 = 受控：显示值跟属性走（值语义：值非 `"false"` 为开、`"false"` 为收起），
 *   点击翻转后写回属性并派发事件（乐观更新，宿主不拦截时 UI 即时反馈）；
 * - 受控 → 非受控切换（宿主移除 open）时内部状态播种为移除前显示值，不跳变。
 */
export class OASCollapsible extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'default-open', 'header', 'disabled']
  }

  /** 非受控内部状态：open 属性缺席时自管（首帧由 default-open 播种，之后点击自更新） */
  private internalOpen: boolean | null = null

  /** 最近一次展开图标克隆来源（template 引用）；变化时才重填 */
  private toggleTpl: HTMLTemplateElement | null = null

  private triggerEl: HTMLButtonElement | null = null
  private bodyWrapEl: HTMLElement | null = null
  private rootEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="head-row" part="head-row">
          <div class="heading" part="heading">
            <button class="trigger" part="trigger" type="button" aria-expanded="false" aria-controls="content">
              <span class="header-text" part="header-text"></span>
              <span class="header-slot" part="header-slot"><slot name="header"></slot></span>
              <span class="arrow" part="arrow" aria-hidden="true">›</span>
            </button>
          </div>
        </div>
        <div class="body-wrap" part="body-wrap" id="content">
          <div class="body" part="body"><slot></slot></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector<HTMLButtonElement>('.trigger')
    this.bodyWrapEl = this.shadow.querySelector<HTMLElement>('.body-wrap')
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
    this.fillToggle()
    this.triggerEl?.addEventListener('click', () => this.toggle())
    // header 插槽内容增减 → 重刷显隐（属性文本 vs slot 优先）
    const headerSlot = this.shadow.querySelector('slot[name="header"]')
    const onSlotChange = () => this.update()
    headerSlot?.addEventListener('slotchange', onSlotChange)
    this.onCleanup(() => headerSlot?.removeEventListener('slotchange', onSlotChange))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（root 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.root')) return false
    this.bind()
    return true
  }

  /** 受控退出（宿主移除 open）时播种内部状态为移除前显示值，防回非受控后点击跳变 */
  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'open' && newValue === null && oldValue !== null) {
      this.internalOpen = oldValue !== 'false'
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  /** 生效展开态：open 属性在场为受控（值非 "false" 为开）；缺席时取内部状态（首帧 default-open 播种一次） */
  private getOpen(): boolean {
    const raw = this.getAttribute('open')
    if (raw != null) return raw !== 'false'
    if (this.internalOpen === null) {
      // default-open 播种：缺席 = 收起；在场用值语义读法（非 "false" 为开）——框架（Vue）布尔绑定
      // false 会序列化为 "false" 字符串在场，「存在即 true」读法会反向展开；值语义对手写无值写法等价
      const seed = this.getAttribute('default-open')
      this.internalOpen = seed != null ? seed !== 'false' : false
    }
    return this.internalOpen
  }

  /** 生效禁用态（显式 disabled 属性；config-provider 注入的全局禁用同样生效） */
  isDisabled(): boolean {
    return this.injectDisabled()
  }

  /** 点击触发器：翻开展开态（受控写回属性 / 非受控写内部状态）并派发 oas-toggle */
  private toggle(): void {
    if (this.isDisabled()) return
    const next = !this.getOpen()
    if (this.hasAttribute('open')) {
      // 受控：写回属性（'' = 展开 / "false" = 收起，属性保持在场=仍受控）
      if (next) this.setAttribute('open', '')
      else this.setAttribute('open', 'false')
    } else {
      this.internalOpen = next
    }
    this.emit('toggle', { open: next })
    // 非受控路径内部状态变化不经过 attributeChangedCallback，需手动增量同步
    this.update()
  }

  /** 展开图标：template[slot="toggle"] 自定义内容优先，默认箭头字符 › */
  private fillToggle(): void {
    const arrow = this.shadow.querySelector<HTMLElement>('.arrow')
    if (!arrow) return
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="toggle"]')
    this.toggleTpl = tpl ?? null
    arrow.textContent = ''
    if (tpl) {
      arrow.appendChild(cloneSlotContent(tpl))
    } else {
      arrow.textContent = '›'
    }
  }

  protected override update(): void {
    // 展开图标：template[slot="toggle"] 在连接后才挂载（框架异步插入）时按引用比对补克隆
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="toggle"]')
    if ((tpl ?? null) !== this.toggleTpl) this.fillToggle()

    const open = this.getOpen()
    const disabled = this.isDisabled()

    // 触发文本：header 属性进文本位；slot="header" 在场时 slot 优先（文本位空，has-header-slot 切显隐）
    const hasHeaderSlot = this.querySelector('[slot="header"]') !== null
    this.shadow.querySelector<HTMLElement>('[part="header-text"]')!.textContent = hasHeaderSlot
      ? ''
      : this.getAttr('header', '')
    if (hasHeaderSlot) this.setAttribute('has-header-slot', '')
    else this.removeAttribute('has-header-slot')

    // 触发按钮状态同步（原生 disabled + aria 双通道）
    if (this.triggerEl) {
      this.triggerEl.disabled = disabled
      this.triggerEl.setAttribute('aria-expanded', String(open))
      this.triggerEl.setAttribute('aria-disabled', String(disabled))
    }

    // 展开态 class（grid 0fr→1fr 动画钩子 + 箭头旋转钩子：以生效展开态为准，见 STYLE 说明）
    this.rootEl?.classList.toggle('open', open)
    this.bodyWrapEl?.classList.toggle('open', open)
  }
}
