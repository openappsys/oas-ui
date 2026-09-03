import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
}
.input {
  box-sizing: border-box;
  width: var(--oas-toolbar-input-width, 120px);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.input:hover {
  border-color: var(--oas-color-border-strong);
}
.input:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.input[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
:host([size='small']) .input,
:host(.oas-ti-small) .input {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
:host([size='large']) .input,
:host(.oas-ti-large) .input {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
`

/**
 * oas-toolbar-input —— 工具栏输入框部件（特例：输入框参与 roving 的单 Tab 停靠）。
 *
 * 属性（kebab-case）：
 * - `value`：预设值（受控入口；oas-input/change 事件不带写回，宿主可监听更新）
 * - `placeholder`：占位提示
 * - `disabled`：禁用
 * - `size`：尺寸档位（small/medium/large），缺省跟随最近 oas-toolbar 的 size
 *
 * 事件（bubbles + composed）：
 * - `oas-input`：输入中，`detail: { value }`
 * - `oas-change`：Enter 或失焦提交，`detail: { value }`
 *
 * 交互：作为工具栏一个 roving 项（宿主 Tab 停靠点，聚焦转发到内部 input）；
 * 焦点在输入框内时方向键由文本编辑消费（工具栏方向键导航豁免），Tab 离开。
 */
export class OASToolbarInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'disabled', 'size']
  }

  private input: HTMLInputElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <input class="input" part="input" type="text" />
    `
  }

  /** 缓存节点引用 + 绑定输入/提交事件 + 宿主聚焦转发（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.input?.addEventListener('input', () => {
      this.emit('input', { value: this.input!.value })
    })
    this.input?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.emit('change', { value: this.input!.value })
      }
    })
    this.input?.addEventListener('change', () => {
      this.emit('change', { value: this.input!.value })
    })
    this.addEventListener('focusin', () => this.input?.focus())
    this.tabIndex = 0
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（input 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input[part="input"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const input = this.input
    if (!input) return
    const value = this.getAttr('value', '')
    if (input.value !== value) input.value = value
    const placeholder = this.getAttr('placeholder', '')
    if (placeholder) input.setAttribute('placeholder', placeholder)
    else input.removeAttribute('placeholder')
    const disabled = this.hasAttr('disabled')
    input.disabled = disabled
    // 工具栏 focusable-when-disabled：输入框可聚焦但禁输入（readonly 保留焦点，aria-disabled 语义同步）
    const tb = this.closest('oas-toolbar')
    const focusableDisabled =
      tb?.hasAttribute('disabled') && tb.hasAttribute('focusable-when-disabled')
    if (disabled) input.removeAttribute('aria-disabled')
    else if (focusableDisabled) {
      input.setAttribute('aria-disabled', 'true')
      input.readOnly = true
    } else {
      input.removeAttribute('aria-disabled')
      input.readOnly = false
    }
    // 内部 tabindex 跟随宿主（工具栏 roving 给宿主 0/-1，input 同步，Tab 直达内部输入框）
    const tabIndex = this.getAttribute('tabindex')
    input.tabIndex = tabIndex === '-1' ? -1 : 0
    // 尺寸：自身 size 属性 > 最近 oas-toolbar 的 size > medium（类标记，不反射 attribute 防递归）
    const own = this.getAttr('size', '')
    const size =
      own === 'small' || own === 'large'
        ? own
        : tb?.getAttribute('size') === 'small' || tb?.getAttribute('size') === 'large'
          ? tb.getAttribute('size')!
          : 'medium'
    this.classList.toggle('oas-ti-small', size === 'small')
    this.classList.toggle('oas-ti-large', size === 'large')
  }
}
