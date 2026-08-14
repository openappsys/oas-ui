import { OASElement } from '@oas-ui/core'

/** 参与贴合合并的表单控件（相邻 -1px 重叠 + 首尾圆角合并协议） */
const CONTROL_SELECTOR = 'oas-button, oas-input, oas-input-number, oas-select'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
:host([vertical]) {
  flex-direction: column;
  align-items: stretch;
}
:host([block]) {
  display: flex;
  width: 100%;
}
/* 贴合项相对定位：hover / 聚焦时盖过相邻项边框（-1px 重叠区） */
::slotted(oas-button),
::slotted(oas-input),
::slotted(oas-input-number),
::slotted(oas-select) {
  position: relative;
}
::slotted(oas-button:hover),
::slotted(oas-button:focus-visible),
::slotted(oas-input:focus-within),
::slotted(oas-input-number:focus-within),
::slotted(oas-select:focus-visible),
::slotted(oas-select[aria-expanded='true']) {
  z-index: 1;
}
`

/**
 * 紧凑容器：slot 内相邻表单控件（oas-button / oas-input / oas-input-number / oas-select）
 * 贴边合并边框（后项 margin -1px 压前项边框）+ 首尾圆角、中间直角。
 *
 * 圆角合并协议与 button-group 单一共享：经 --oas-button-group-radius 自定义属性穿透到控件
 * 内部（button/input/input-number/select 均已消费同名变量），update() 按首/中/尾注入四值圆角。
 *
 * 属性：vertical（纵向贴合，圆角方向改上下）、disabled（透传全组禁用）、block（宽度 100%）。
 */
export class OASCompact extends OASElement {
  static override get observedAttributes(): string[] {
    return ['vertical', 'disabled', 'block']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点 + 监听 slotchange（子项增减后重算贴合/圆角/禁用） */
  private bind(): void {
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：slot 骨架存在即接管 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const vertical = this.hasAttr('vertical')
    const disabled = this.hasAttr('disabled')
    // 组语义：role=group + 可访问名称（默认走 i18n，可被 aria-label 覆盖）
    this.setAttribute('role', 'group')
    if (!this.hasAttr('aria-label')) this.setAttribute('aria-label', this.t('compact.group'))
    const items = this.querySelectorAll<HTMLElement>(`:scope > ${CONTROL_SELECTOR}`)
    const n = items.length

    items.forEach((el, i) => {
      // 相邻贴合：后项沿主轴 -1px 重叠（重叠区后项压前项边框）
      const mainMargin = vertical ? 'marginTop' : 'marginLeft'
      const crossMargin = vertical ? 'marginLeft' : 'marginTop'
      if (i > 0) {
        el.style[mainMargin] = '-1px'
        el.style[crossMargin] = ''
      } else {
        el.style.marginTop = ''
        el.style.marginLeft = ''
      }

      // 首尾圆角、中间直角（协议变量穿透到控件内部；单控件整体圆角）
      let radius: string
      if (n === 1) {
        radius = 'var(--oas-radius-md)'
      } else if (i === 0) {
        radius = vertical
          ? 'var(--oas-radius-md) var(--oas-radius-md) 0 0'
          : 'var(--oas-radius-md) 0 0 var(--oas-radius-md)'
      } else if (i === n - 1) {
        radius = vertical
          ? '0 0 var(--oas-radius-md) var(--oas-radius-md)'
          : '0 var(--oas-radius-md) var(--oas-radius-md) 0'
      } else {
        radius = '0'
      }
      el.style.setProperty('--oas-button-group-radius', radius)

      // 纵向：控件拉满组宽（按钮经 --oas-button-group-width 穿透内部）
      if (vertical) el.style.setProperty('--oas-button-group-width', '100%')
      else el.style.removeProperty('--oas-button-group-width')

      // disabled 透传（各控件 observedAttributes 均含 disabled，设属性即联动禁用）
      el.toggleAttribute('disabled', disabled)
    })
  }
}
