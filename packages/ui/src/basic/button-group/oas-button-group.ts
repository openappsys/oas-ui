import { OASElement } from '@oas-ui/core'
import type { OASButton } from '../button/oas-button.js'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
.group {
  display: inline-flex;
}
:host([vertical]) .group {
  flex-direction: column;
  align-items: stretch;
}
/* 相邻按钮贴合，边框合并 */
::slotted(oas-button) {
  position: relative;
}
::slotted(oas-button:not(:first-child)) {
  margin-left: -1px;
}
:host([vertical]) ::slotted(oas-button:not(:first-child)) {
  margin-left: 0;
  margin-top: -1px;
}
/* hover / 聚焦 / 选中时只亮当前项（置于相邻按钮之上） */
::slotted(oas-button:hover),
::slotted(oas-button:focus-visible),
::slotted(oas-button[aria-pressed='true']) {
  z-index: 1;
}
/* 横向：首/尾圆角，中间直角（::slotted 后不支持链 ::part，经自定义属性穿透到 button 内部） */
::slotted(oas-button:first-child) {
  --oas-button-group-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md);
}
::slotted(oas-button:last-child) {
  --oas-button-group-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
}
::slotted(oas-button:not(:first-child):not(:last-child)) {
  --oas-button-group-radius: 0;
}
::slotted(oas-button:only-child) {
  --oas-button-group-radius: var(--oas-radius-md);
}
/* 纵向：上/下圆角，中间直角 */
:host([vertical]) ::slotted(oas-button) {
  --oas-button-group-width: 100%;
}
:host([vertical]) ::slotted(oas-button:first-child) {
  --oas-button-group-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
}
:host([vertical]) ::slotted(oas-button:last-child) {
  --oas-button-group-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
}
:host([vertical]) ::slotted(oas-button:only-child) {
  --oas-button-group-radius: var(--oas-radius-md);
}
`

export class OASButtonGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'size', 'vertical', 'value', 'multiple', 'disabled', 'aria-label']
  }

  private groupEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div part="group" role="group"><slot></slot></div>
    `
    this.groupEl = this.shadow.querySelector<HTMLElement>('[part="group"]')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
    // 子按钮点击统一由组代理（oas-click 冒泡到组）
    this.addEventListener('oas-click', this.handleItemClick)
  }

  protected override update(): void {
    const type = this.getAttr('type', '')
    const size = this.getAttr('size', '')
    const disabled = this.hasAttr('disabled')
    const selected = this.selectedValues

    const buttons = [...this.querySelectorAll('oas-button')] as OASButton[]
    for (const btn of buttons) {
      // type/size 透传（组设置时统一覆盖子按钮）
      if (type) btn.setAttribute('type', type)
      if (size) btn.setAttribute('size', size)
      btn.toggleAttribute('disabled', disabled)
      if (btn.hasAttribute('value')) {
        const val = btn.getAttribute('value') ?? ''
        btn.setAttribute('aria-pressed', selected.includes(val) ? 'true' : 'false')
      } else {
        btn.removeAttribute('aria-pressed')
      }
    }

    // 容器 role="group" + aria-label（默认走 i18n，可被 aria-label 属性覆盖）
    this.groupEl?.setAttribute('aria-label', this.getAttr('aria-label', this.t('buttonGroup.group')))
  }

  /** 当前选中值：单选返回 [value]，多选返回 value 逗号分隔的数组 */
  private get selectedValues(): string[] {
    const v = this.getAttr('value', '')
    if (v === '') return []
    return this.hasAttr('multiple')
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [v]
  }

  private handleItemClick = (e: Event): void => {
    const btn = e.target as OASButton
    if (!this.contains(btn) || !btn.hasAttribute('value')) return
    if (this.hasAttr('disabled')) return
    const val = btn.getAttribute('value') ?? ''
    const current = this.selectedValues
    const multiple = this.hasAttr('multiple')

    if (multiple) {
      const next = current.includes(val)
        ? current.filter((x) => x !== val)
        : [...current, val]
      this.setAttribute('value', next.join(','))
      this.emit('change', { value: next })
    } else {
      if (current.includes(val)) return
      this.setAttribute('value', val)
      this.emit('change', { value: val })
    }
  }
}
