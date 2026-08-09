import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
}
.inner {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:disabled:hover {
  border-color: var(--oas-color-border);
}

/* ---- addon 区（prepend / append，独立 ::part） ---- */
.addon {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
  user-select: none;
}
:host([disabled]) .addon {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
:host([addon-before]) [part='prepend'] {
  border-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md);
  border-right: none;
}
:host([addon-after]) [part='append'] {
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  border-left: none;
}
:host([addon-before]) input {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
:host([addon-after]) input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.addon[hidden] {
  display: none;
}

/* ---- 内嵌前后缀（prefix / suffix 文案 + prefix-icon / suffix-icon 图标） ---- */
.affix,
.affix-icon {
  position: absolute;
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  pointer-events: none;
  z-index: 1;
  max-width: 50%;
  overflow: hidden;
}
:host([disabled]) .affix,
:host([disabled]) .affix-icon {
  color: var(--oas-color-text-disabled);
}
.affix-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
[part='prefix-icon'] {
  left: var(--oas-space-3);
}
[part='prefix'] {
  left: var(--oas-space-8, 40px);
}
:host(:not([prefix-icon])) [part='prefix'] {
  left: var(--oas-space-3);
}
[part='suffix-icon'] {
  right: var(--oas-space-8, 40px);
}
[part='suffix'] {
  right: calc(var(--oas-space-8, 40px) + 16px);
}
:host(:not([suffix-icon])) [part='suffix'] {
  right: var(--oas-space-8, 40px);
}
:host(:not([clearable])) [part='suffix-icon'] {
  right: var(--oas-space-3);
}
:host(:not([clearable])) [part='suffix'] {
  right: var(--oas-space-3);
}
.affix[hidden],
.affix-icon[hidden] {
  display: none;
}

/* 有前缀/图标时 input 左侧留位，有后缀/图标/可清空时右侧留位 */
:host([prefix]) input,
:host([prefix-icon]) input {
  padding-left: var(--oas-space-8, 40px);
}
:host([prefix][prefix-icon]) input {
  padding-left: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([suffix]) input,
:host([suffix-icon]) input,
:host([clearable]) input {
  padding-right: var(--oas-space-8, 40px);
}
:host([clearable][suffix]) input,
:host([clearable][suffix-icon]) input {
  padding-right: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}

/* ---- 清除按钮 ---- */
.clear-btn {
  position: absolute;
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
`

export class OASInput extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'type',
      'disabled',
      'readonly',
      'clearable',
      'label',
      'addon-before',
      'addon-after',
      'prefix',
      'suffix',
      'prefix-icon',
      'suffix-icon',
    ]
  }

  /** Element 内建只读 getter prefix 会让 Vue 走 property 赋值；访问器遮蔽并反射到 attribute */
  override get prefix(): string {
    return this.getAttr('prefix', '')
  }
  override set prefix(value: string) {
    this.setAttribute('prefix', value)
  }

  private inputEl: HTMLInputElement | null = null
  private clearBtn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="wrapper" part="wrapper">
        <span class="addon" part="prepend" hidden></span>
        <span class="inner" part="inner">
          <span class="affix-icon" part="prefix-icon" hidden></span>
          <span class="affix" part="prefix" hidden></span>
          <input part="input" />
          <span class="affix" part="suffix" hidden></span>
          <span class="affix-icon" part="suffix-icon" hidden></span>
          <button class="clear-btn" part="clear" hidden>
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
              <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </span>
        <span class="addon" part="append" hidden></span>
      </span>
    `
    this.inputEl = this.shadow.querySelector('input')
    this.clearBtn = this.shadow.querySelector('.clear-btn')

    this.inputEl?.addEventListener('input', () => {
      this.emit('input', { value: this.inputEl!.value })
      this.syncClearVisibility()
    })
    this.clearBtn?.addEventListener('click', () => {
      if (!this.inputEl) return
      this.inputEl.value = ''
      this.emit('clear', { originalEvent: new MouseEvent('click') })
      this.inputEl.focus()
      this.syncClearVisibility()
    })
    this.update()
  }

  protected override update(): void {
    const i = this.inputEl
    if (!i) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const type = this.getAttr('type', 'text')
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')

    if (i.value !== value) i.value = value
    i.placeholder = placeholder
    i.type = type
    i.disabled = disabled
    i.readOnly = readonly
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    i.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('input.defaultLabel'))
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !this.shouldShowClear()
    }
    this.syncAddons()
    this.syncAffixes()
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.hasAttr('disabled') &&
      !this.hasAttr('readonly') &&
      this.inputEl !== null &&
      this.inputEl.value !== ''
    )
  }

  private syncClearVisibility(): void {
    if (!this.clearBtn || !this.inputEl) return
    this.clearBtn.hidden = !this.shouldShowClear()
  }

  /** addon 文案块：prepend / append（空值隐藏，文本可被读屏读取） */
  private syncAddons(): void {
    const prepend = this.shadow.querySelector<HTMLElement>('[part="prepend"]')
    const append = this.shadow.querySelector<HTMLElement>('[part="append"]')
    const setAddon = (el: HTMLElement | null, value: string): void => {
      if (!el) return
      el.textContent = value
      el.hidden = value === ''
    }
    setAddon(prepend, this.getAttr('addon-before', ''))
    setAddon(append, this.getAttr('addon-after', ''))
  }

  /** 内嵌前后缀：prefix/suffix 文案 + prefix-icon/suffix-icon 图标（iconRegistry 内联 SVG） */
  private syncAffixes(): void {
    const render = (
      part: string,
      text: string,
      iconName: string,
    ): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const content = iconName ? iconRegistry[iconName as IconName] : undefined
      if (content) {
        el.hidden = false
        // 装饰性图标对读屏隐藏（输入框 aria-label 提供可访问名称）
        el.setAttribute('aria-hidden', 'true')
        el.textContent = ''
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 16 16')
        svg.setAttribute('width', '1em')
        svg.setAttribute('height', '1em')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.innerHTML = content
        el.appendChild(svg)
      } else if (text !== '') {
        el.hidden = false
        el.removeAttribute('aria-hidden')
        el.textContent = text
      } else {
        el.hidden = true
        el.textContent = ''
      }
    }
    render('prefix-icon', '', this.getAttr('prefix-icon', ''))
    render('prefix', this.getAttr('prefix', ''), '')
    render('suffix-icon', '', this.getAttr('suffix-icon', ''))
    render('suffix', this.getAttr('suffix', ''), '')
  }
}
