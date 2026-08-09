import { OASElement } from '@oas-ui/core'

export type SwitchSize = 'small' | 'medium' | 'large'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* small 尺寸的文案放轨道外侧时，宿主切换为 flex 行布局（按钮 + 外侧文案） */
:host(.has-outside-label) {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
}
button {
  /* 尺寸变量：medium 为默认值，.small/.large 覆盖 */
  --track-w: 40px;
  --track-h: 22px;
  --thumb-size: 18px;
  --thumb-offset: 2px;
  --thumb-travel: 18px;
  --label-font: var(--oas-font-size-sm);
  appearance: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-width: var(--track-w);
  height: var(--track-h);
  border-radius: calc(var(--track-h) / 2);
  background: var(--oas-color-border);
  transition: background var(--oas-transition-base) var(--oas-ease-out);
}
button.small {
  --track-w: 28px;
  --track-h: 16px;
  --thumb-size: 12px;
  --thumb-travel: 12px;
  --label-font: var(--oas-font-size-xs);
}
button.large {
  --track-w: 52px;
  --track-h: 28px;
  --thumb-size: 24px;
  --thumb-travel: 24px;
  --label-font: var(--oas-font-size-md);
}
button[aria-checked='true'] {
  background: var(--oas-color-primary);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
.thumb {
  position: absolute;
  top: var(--thumb-offset);
  left: var(--thumb-offset);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: 50%;
  background: var(--oas-color-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: left var(--oas-transition-base) var(--oas-ease-out);
}
button[aria-checked='true'] .thumb {
  /* 锚定右端而非固定位移：轨道带文案自动加宽时也能贴右端，不遮文案 */
  left: calc(100% - var(--thumb-size) - var(--thumb-offset));
}
/* 轨道内文案：显示在滑块对侧，nowrap 不换行、轨道随文案自动加宽（不溢出不变形） */
.label {
  font-size: var(--label-font);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  transition: color var(--oas-transition-base) var(--oas-ease-out);
}
.label[hidden] {
  display: none;
}
/* 单 flex 项（滑块绝对定位不参与 flex）：未开启文案靠右、开启文案靠左 */
button:not([aria-checked='true']) {
  justify-content: flex-end;
}
button[aria-checked='true'] {
  justify-content: flex-start;
}
button:not([aria-checked='true']) .label {
  padding-left: calc(var(--thumb-size) + var(--thumb-offset) * 2 + var(--oas-space-1));
  padding-right: var(--oas-space-2);
  color: var(--oas-color-text-secondary);
}
button[aria-checked='true'] .label {
  padding-right: calc(var(--thumb-size) + var(--thumb-offset) * 2 + var(--oas-space-1));
  padding-left: var(--oas-space-2);
  color: var(--oas-color-bg);
}
/* 轨道外侧文案（size=small 时展示） */
.outside-label {
  font-size: var(--oas-font-size-sm);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  color: var(--oas-color-text-secondary);
}
.outside-label[hidden] {
  display: none;
}
/* 加载指示：放在滑块对侧、垂直居中（loading 时轨道内文案隐藏，互不遮挡） */
.spinner {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -7px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
button:not([aria-checked='true']) .spinner {
  right: calc(var(--thumb-offset) + 2px);
  color: var(--oas-color-text-secondary);
}
button[aria-checked='true'] .spinner {
  left: calc(var(--thumb-offset) + 2px);
  color: var(--oas-color-bg);
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASSwitch extends OASElement {
  static override get observedAttributes(): string[] {
    return ['checked', 'disabled', 'loading', 'checked-text', 'unchecked-text', 'size', 'color']
  }

  private btn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <button part="switch" role="switch" aria-checked="false">
        <span class="thumb" part="thumb"></span>
        <span class="label" part="label" hidden></span>
        <span class="spinner" hidden></span>
      </button>
      <span class="outside-label" part="label" hidden></span>
    `
    this.btn = this.shadow.querySelector('button')
    this.btn?.addEventListener('click', () => {
      if (this.hasAttr('disabled') || this.hasAttr('loading')) return
      const checked = !this.hasAttr('checked')
      this.toggleAttribute('checked', checked)
      this.emit('change', { checked })
    })
    this.update()
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    const checked = this.hasAttr('checked')
    const disabled = this.hasAttr('disabled')
    const loading = this.hasAttr('loading')

    btn.setAttribute('aria-checked', String(checked))
    btn.disabled = disabled || loading

    // 尺寸：自身属性 > config-provider 注入 > medium（复用 button 的注入约定）
    const rawSize = this.injectValue('size', 'medium')
    const size: SwitchSize = rawSize === 'small' || rawSize === 'large' ? rawSize : 'medium'
    btn.className = size

    // 开关文案：开启显示 checked-text，关闭显示 unchecked-text；
    // small 尺寸时文案放轨道外侧（小轨道塞不下文字），其余尺寸显示在轨道内滑块对侧
    const text = checked ? this.getAttr('checked-text') : this.getAttr('unchecked-text')
    const showOutside = size === 'small' && text !== ''
    const label = btn.querySelector<HTMLElement>('.label')
    const outside = this.shadow.querySelector<HTMLElement>('.outside-label')
    if (label) {
      label.hidden = showOutside || loading || text === ''
      label.textContent = showOutside ? '' : text
    }
    if (outside) {
      outside.hidden = !showOutside || loading
      outside.textContent = showOutside ? text : ''
    }
    this.classList.toggle('has-outside-label', showOutside && !loading)

    const spinner = btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !loading

    // 开启态自定义主色：以 --oas-color-primary 变量覆盖（焦点环等派生色一并生效）
    const color = this.getAttr('color')
    if (color) {
      btn.style.setProperty('--oas-color-primary', color)
    } else {
      btn.style.removeProperty('--oas-color-primary')
    }
  }
}
