import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** 窗口操作动作（与 oas-titlebar 的 window-actions 同一契约） */
export type TrafficLightAction = 'minimize' | 'maximize' | 'close'

/** macOS 交通灯左右顺序（LTR：关闭 / 最小化 / 最大化） */
const ORDER: readonly TrafficLightAction[] = ['close', 'minimize', 'maximize']

/** 悬停时在各圆点上显示的符号（原创 SVG，currentColor） */
const GLYPHS: Record<TrafficLightAction, string> = {
  close:
    '<svg viewBox="0 0 10 10" width="6" height="6" aria-hidden="true" focusable="false"><path d="M2 2l6 6M8 2l-6 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  minimize:
    '<svg viewBox="0 0 10 10" width="6" height="6" aria-hidden="true" focusable="false"><path d="M2 5h6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  maximize:
    '<svg viewBox="0 0 10 10" width="6" height="6" aria-hidden="true" focusable="false"><path d="M2 2l3 3 3-3M2 8l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  /* 各圆点色走组件变量（macOS 惯例固定色，宿主可覆写；明暗主题一致） */
  --oas-traffic-lights-close: #ff5f57;
  --oas-traffic-lights-minimize: #febc2e;
  --oas-traffic-lights-maximize: #28c840;
  --oas-traffic-lights-size: 12px;
  --oas-traffic-lights-gap: 8px;
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.group {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-traffic-lights-gap);
}
/* RTL：顺序镜像（逻辑方向） */
:host([data-rtl]) .group {
  flex-direction: row-reverse;
}
.dot {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-traffic-lights-size);
  height: var(--oas-traffic-lights-size);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-full, 999px);
  cursor: pointer;
  color: transparent;
  transition: color var(--oas-transition-fast, 120ms) ease;
}
.dot[data-action='close'] {
  background: var(--oas-traffic-lights-close);
}
.dot[data-action='minimize'] {
  background: var(--oas-traffic-lights-minimize);
}
.dot[data-action='maximize'] {
  background: var(--oas-traffic-lights-maximize);
}
/* 组内悬停 / 键盘聚焦时，各点显示符号（macOS 行为）；符号色随圆点底色取深色 */
.group:hover .dot,
.group:focus-within .dot {
  color: color-mix(in srgb, var(--oas-color-text-primary) 55%, transparent);
}
.dot:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) .dot {
  cursor: not-allowed;
  opacity: 0.5;
}
.dot svg {
  display: block;
}
`

/**
 * oas-traffic-lights —— macOS 交通灯窗口控件（关闭 / 最小化 / 最大化 三圆点）。
 *
 * 置于 `oas-titlebar` 的 `slot="leading"` 即得 macOS 形态（左侧交通灯 + 居中标题）。
 * 点击派发 `oas-window-action`（detail `{ action }`），与 `oas-titlebar` 的 `window-actions`
 * 同一事件契约——宿主统一处理窗口动作，无需区分来源。
 *
 * 属性：`disabled`（布尔，全禁）；`dir`（方向，RTL 顺序镜像）。
 * 事件：`oas-window-action`（detail `{ action: 'close'|'minimize'|'maximize' }`）。
 * 部件：`group` / `dot`。
 * ARIA：容器 `role="group"` + 可读名；每点 `aria-label`（i18n，随 locale）。
 */
export class OASTrafficLights extends OASElement {
  static override get observedAttributes(): string[] {
    return ['disabled', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    const dots = ORDER.map(
      (a) =>
        `<button class="dot" part="dot" data-action="${a}" type="button" aria-label="${this.t(`titlebar.${a}`)}">${GLYPHS[a]}</button>`,
    ).join('')
    return `<style>${STYLE}</style><div class="group" part="group" role="group" aria-label="${this.t('titlebar.label')}">${dots}</div>`
  }

  private bind(): void {
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('.dot')) {
      btn.addEventListener('click', () => {
        if (this.hasAttr('disabled')) return
        this.emit('window-action', { action: btn.dataset.action })
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('.dot')) {
      const action = btn.dataset.action as TrafficLightAction | undefined
      if (action) btn.setAttribute('aria-label', this.t(`titlebar.${action}`))
      btn.disabled = this.hasAttr('disabled')
    }
    const group = this.shadow.querySelector<HTMLElement>('[part="group"]')
    group?.setAttribute('aria-label', this.t('titlebar.label'))
  }
}
