import { OASElement } from '@oas-ui/core'
import type { OASButton } from '../button/oas-button.js'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
[part='group'] {
  display: inline-flex;
}
:host([vertical]) [part='group'] {
  flex-direction: column;
  align-items: stretch;
}
/* 相邻按钮/嵌套组贴合，边框合并 */
::slotted(oas-button),
::slotted(oas-button-group) {
  position: relative;
}
::slotted(oas-button:not(:first-child)),
::slotted(oas-button-group:not(:first-child)) {
  margin-left: -1px;
}
:host([vertical]) ::slotted(oas-button:not(:first-child)),
:host([vertical]) ::slotted(oas-button-group:not(:first-child)) {
  margin-left: 0;
  margin-top: -1px;
}
/* 有色实心组：分段缝常驻可见（白 35% 细线），静止也能读出「多选一」结构。
   缝画在后项宿主外侧 1px（margin -1px 重叠区，后项压住前项边框）；
   hover/选中项 z-index 提升后其边框自动盖过缝线，状态优先不打架 */
:host([type='primary']:not([vertical])) ::slotted(oas-button:not(:first-child)),
:host([type='success']:not([vertical])) ::slotted(oas-button:not(:first-child)),
:host([type='warning']:not([vertical])) ::slotted(oas-button:not(:first-child)),
:host([type='danger']:not([vertical])) ::slotted(oas-button:not(:first-child)) {
  box-shadow: -1px 0 0 0 rgb(255 255 255 / 0.35);
}
:host([vertical][type='primary']) ::slotted(oas-button:not(:first-child)),
:host([vertical][type='success']) ::slotted(oas-button:not(:first-child)),
:host([vertical][type='warning']) ::slotted(oas-button:not(:first-child)),
:host([vertical][type='danger']) ::slotted(oas-button:not(:first-child)) {
  box-shadow: 0 -1px 0 0 rgb(255 255 255 / 0.35);
}
/* 分隔符：贴合参与组内布局、线置顶覆盖相邻按钮边框，不参与圆角合并 */
::slotted(oas-button-group-separator) {
  position: relative;
  z-index: 2;
}
/* hover / 聚焦 / 选中时只亮当前项（置于相邻按钮之上；分隔符 z-index 更高始终可见） */
::slotted(oas-button:hover),
::slotted(oas-button:focus-visible),
::slotted(oas-button[aria-pressed='true']),
::slotted(oas-button-group:hover),
::slotted(oas-button-group:focus-visible),
::slotted(oas-button-group[aria-pressed='true']) {
  z-index: 1;
}
/* 横向：首/尾圆角，中间直角（::slotted 后不支持链 ::part，经自定义属性穿透到 button 内部）。
   嵌套组作为整体一项：外层把首/尾单值经 --oas-button-group-start-radius/end-radius 穿透，
   由内层再映射到自身首/尾按钮；独立使用（变量未注入）时回落自身圆角。 */
::slotted(oas-button:first-child),
::slotted(oas-button-group:first-child) {
  --oas-button-group-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md);
  --oas-button-group-start-radius: var(--oas-radius-md);
  --oas-button-group-end-radius: 0;
}
::slotted(oas-button:last-child),
::slotted(oas-button-group:last-child) {
  --oas-button-group-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: var(--oas-radius-md);
}
::slotted(oas-button:not(:first-child):not(:last-child)),
::slotted(oas-button-group:not(:first-child):not(:last-child)) {
  --oas-button-group-radius: 0;
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: 0;
}
::slotted(oas-button:only-child),
::slotted(oas-button-group:only-child) {
  --oas-button-group-radius: var(--oas-radius-md);
  --oas-button-group-start-radius: var(--oas-radius-md);
  --oas-button-group-end-radius: var(--oas-radius-md);
}
/* pill 胶囊：首/尾圆角改用 radius full（999px），组整体呈胶囊（横向：首左圆/尾右圆） */
:host([pill]) ::slotted(oas-button:first-child),
:host([pill]) ::slotted(oas-button-group:first-child) {
  --oas-button-group-radius: var(--oas-radius-full, 999px) 0 0 var(--oas-radius-full, 999px);
  --oas-button-group-start-radius: var(--oas-radius-full, 999px);
  --oas-button-group-end-radius: 0;
}
:host([pill]) ::slotted(oas-button:last-child),
:host([pill]) ::slotted(oas-button-group:last-child) {
  --oas-button-group-radius: 0 var(--oas-radius-full, 999px) var(--oas-radius-full, 999px) 0;
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: var(--oas-radius-full, 999px);
}
:host([pill]) ::slotted(oas-button:not(:first-child):not(:last-child)),
:host([pill]) ::slotted(oas-button-group:not(:first-child):not(:last-child)) {
  --oas-button-group-radius: 0;
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: 0;
}
:host([pill]) ::slotted(oas-button:only-child),
:host([pill]) ::slotted(oas-button-group:only-child) {
  --oas-button-group-radius: var(--oas-radius-full, 999px);
  --oas-button-group-start-radius: var(--oas-radius-full, 999px);
  --oas-button-group-end-radius: var(--oas-radius-full, 999px);
}
/* 纵向：上/下圆角，中间直角 */
:host([vertical]) ::slotted(oas-button) {
  --oas-button-group-width: 100%;
}
:host([vertical]) ::slotted(oas-button:first-child),
:host([vertical]) ::slotted(oas-button-group:first-child) {
  --oas-button-group-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
  --oas-button-group-start-radius: var(--oas-radius-md);
  --oas-button-group-end-radius: 0;
}
:host([vertical]) ::slotted(oas-button:last-child),
:host([vertical]) ::slotted(oas-button-group:last-child) {
  --oas-button-group-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: var(--oas-radius-md);
}
:host([vertical]) ::slotted(oas-button:only-child),
:host([vertical]) ::slotted(oas-button-group:only-child) {
  --oas-button-group-radius: var(--oas-radius-md);
  --oas-button-group-start-radius: var(--oas-radius-md);
  --oas-button-group-end-radius: var(--oas-radius-md);
}
/* 纵向 pill：首上圆/尾下圆 */
:host([vertical][pill]) ::slotted(oas-button:first-child),
:host([vertical][pill]) ::slotted(oas-button-group:first-child) {
  --oas-button-group-radius: var(--oas-radius-full, 999px) var(--oas-radius-full, 999px) 0 0;
  --oas-button-group-start-radius: var(--oas-radius-full, 999px);
  --oas-button-group-end-radius: 0;
}
:host([vertical][pill]) ::slotted(oas-button:last-child),
:host([vertical][pill]) ::slotted(oas-button-group:last-child) {
  --oas-button-group-radius: 0 0 var(--oas-radius-full, 999px) var(--oas-radius-full, 999px);
  --oas-button-group-start-radius: 0;
  --oas-button-group-end-radius: var(--oas-radius-full, 999px);
}
:host([vertical][pill]) ::slotted(oas-button:only-child),
:host([vertical][pill]) ::slotted(oas-button-group:only-child) {
  --oas-button-group-radius: var(--oas-radius-full, 999px);
  --oas-button-group-start-radius: var(--oas-radius-full, 999px);
  --oas-button-group-end-radius: var(--oas-radius-full, 999px);
}
/* spread 均分铺满：宿主占满父容器宽度，组内按钮 flex 等宽均分
   （移动端操作栏 / 表单底部按钮组形态）；均分覆盖横向与纵向，纵向本就拉伸铺满 */
:host([spread]) {
  display: flex;
  width: 100%;
}
:host([spread]) [part='group'] {
  display: flex;
  width: 100%;
}
:host([spread]) ::slotted(oas-button) {
  flex: 1 1 0;
  --oas-button-group-width: 100%;
}
/* 嵌套组作为整体一项等宽均分，不透传拉满到内部按钮（由嵌套组自身布局管理） */
:host([spread]) ::slotted(oas-button-group) {
  flex: 1 1 0;
}
`

export class OASButtonGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'size',
      'variant',
      'round',
      'vertical',
      'value',
      'multiple',
      'disabled',
      'aria-label',
      'pill',
      'spread',
    ]
  }

  private groupEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div part="group" role="group"><slot></slot></div>
    `
  }

  /** 缓存节点 + 绑定 slotchange / 组代理点击（render 与水合路径共用） */
  private bind(): void {
    this.groupEl = this.shadow.querySelector<HTMLElement>('[part="group"]')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
    // 子按钮点击统一由组代理（oas-click 冒泡到组）
    this.addEventListener('oas-click', this.handleItemClick)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（组容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const type = this.getAttr('type', '')
    const size = this.getAttr('size', '')
    const variant = this.getAttr('variant', '')
    const round = this.hasAttr('round')
    const disabled = this.hasAttr('disabled')
    const vertical = this.hasAttr('vertical')
    const selected = this.selectedValues

    // type/size/variant/round 透传与选值标记只作用于直接子按钮；嵌套组作为整体一项自行管理内部按钮
    const buttons = [...this.querySelectorAll<OASButton>(':scope > oas-button')]
    for (const btn of buttons) {
      // type/size/variant/round 透传（组设置时统一覆盖子按钮，与 type/size 同构：移除组属性不回写子按钮）
      if (type) btn.setAttribute('type', type)
      if (size) btn.setAttribute('size', size)
      if (variant) btn.setAttribute('variant', variant)
      if (round) btn.setAttribute('round', '')
      btn.toggleAttribute('disabled', disabled)
      if (btn.hasAttribute('value')) {
        const val = btn.getAttribute('value') ?? ''
        btn.setAttribute('aria-pressed', selected.includes(val) ? 'true' : 'false')
      } else {
        btn.removeAttribute('aria-pressed')
      }
    }

    // 外层 disabled 统一覆盖到嵌套组宿主（其自身 update 会禁用内部按钮）
    const subs = [...this.querySelectorAll<OASButtonGroup>(':scope > oas-button-group')]
    for (const sub of subs) sub.toggleAttribute('disabled', disabled)

    // 分隔符方向跟随组朝向：横向组渲染竖线、纵向组渲染横线（由分隔符 :host([vertical]) CSS 切换）。
    // 只作用于直接子分隔符——嵌套组内的分隔符由嵌套组自身同步，避免外层覆盖其独立朝向
    for (const sep of this.querySelectorAll<HTMLElement>(':scope > oas-button-group-separator')) {
      sep.toggleAttribute('vertical', vertical)
    }

    // 容器 role="group" + aria-label（默认走 i18n，可被 aria-label 属性覆盖）
    this.groupEl?.setAttribute(
      'aria-label',
      this.getAttr('aria-label', this.t('buttonGroup.group')),
    )
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
    // 嵌套组内的按钮由嵌套组自行处理（嵌套组作为整体一项，外层不透传选值）
    if (btn.closest('oas-button-group') !== this) return
    if (this.hasAttr('disabled')) return
    const val = btn.getAttribute('value') ?? ''
    const current = this.selectedValues
    const multiple = this.hasAttr('multiple')

    if (multiple) {
      const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val]
      this.setAttribute('value', next.join(','))
      this.emit('change', { value: next })
    } else {
      if (current.includes(val)) return
      this.setAttribute('value', val)
      this.emit('change', { value: val })
    }
  }
}
