import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** 11 预设色名（color 协议词表，解析为 --oas-preset-* token） */
const PRESET_NAMES = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
] as const

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
}
:host([hidden]) {
  display: none;
}
.btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  min-width: var(--oas-action-bar-button-min-width, 32px);
  height: var(--oas-action-bar-button-height, 32px);
  padding: 0 var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: var(--oas-action-bar-button-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
  color: inherit;
  font: inherit;
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  cursor: pointer;
}
.btn:hover {
  background: var(--oas-action-bar-button-hover-bg, color-mix(in srgb, var(--oas-color-on-ink) 16%, transparent));
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 按压变暗（对齐 transport 惯例：active 即刻反馈） */
.btn:active {
  background: var(--oas-action-bar-button-active-bg, color-mix(in srgb, var(--oas-color-ink-deep) 52%, transparent));
}
.btn[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
/* 选中态：高亮底色（active-tint 优先，缺省主色）；plain 模式只着色不填充。
   data-active 挂在宿主（:host），非内部 .btn——选择器必须用 :host([data-active]) 才能命中
   （把属性选择器写进内部按钮元素的写法永远不匹配，是选中态无视觉的经典翻车点，qa-regression 已固化）。 */
:host([data-active]) .btn {
  background: var(--oas-action-bar-active-tint, var(--oas-color-primary));
  color: var(--oas-color-text-on-primary);
}
:host([data-active]) .btn:active {
  background: var(--oas-action-bar-active-tint, var(--oas-color-primary-active, var(--oas-color-primary)));
}
:host([data-plain]) .btn {
  background: transparent;
}
:host([data-plain]) .btn:hover {
  background: var(--oas-action-bar-button-hover-bg, color-mix(in srgb, var(--oas-color-on-ink) 16%, transparent));
}
:host([data-plain][data-active]) .btn {
  background: transparent;
  color: var(--oas-action-bar-active-tint, var(--oas-color-primary));
  font-weight: 600;
}
/* light 表体下的按钮/井底色：操作栏在 light 主题段下发深色淡底变量（见 oas-action-bar），
   此处保持 on-ink 兜底——宿主给 --oas-action-bar-button-bg 可整体覆写 */
`

/**
 * oas-action-bar-button —— 操作栏命令按钮（原生 button 承载，键盘可达）。
 *
 * 属性（kebab-case）：
 * - `value`：命令标识（oas-action detail 携带）
 * - `active`：布尔，选中态（受控显示——宿主监听 oas-action 回写；组件不自切）
 * - `active-tint`：选中高亮色——11 预设名解析为 `--oas-preset-*`，任意 CSS 色值原样注入
 *   （如录音红 `#e11d48`；文字对比度由宿主负责，对齐 color 协议）
 * - `plain`：布尔，组内无填充（选中只着色不加底）
 * - `disabled`：原生禁用透传
 *
 * 事件：`oas-action`（detail `{ value, active }`——active 为点击时刻状态，bubbles + composed）。
 */
export class OASActionBarButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'active', 'active-tint', 'plain', 'disabled', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="btn" part="button" type="button"><slot></slot></button>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="button"]')?.addEventListener('click', () => {
      this.emit('action', { value: this.getAttr('value', ''), active: this.hasAttr('active') })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（button 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="button"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // 选中态/无填充钩子（CSS 按属性选择器切态）
    this.toggleAttribute('data-active', this.hasAttr('active'))
    this.toggleAttribute('data-plain', this.hasAttr('plain'))
    const btn = this.shadow.querySelector<HTMLButtonElement>('[part="button"]')
    if (btn) {
      // disabled 透传原生（禁点、禁聚焦）+ aria-disabled 同步
      const disabled = this.injectDisabled()
      btn.disabled = disabled
      if (disabled) btn.setAttribute('aria-disabled', 'true')
      else btn.removeAttribute('aria-disabled')
    }
    // active-tint：预设名 → preset token；任意色值原样注入；空值撤除
    const tint = this.getAttr('active-tint', '').trim()
    if (tint === '') this.style.removeProperty('--oas-action-bar-active-tint')
    else if ((PRESET_NAMES as readonly string[]).includes(tint)) {
      this.style.setProperty('--oas-action-bar-active-tint', `var(--oas-preset-${tint})`)
    } else {
      this.style.setProperty('--oas-action-bar-active-tint', tint)
    }
  }
}
