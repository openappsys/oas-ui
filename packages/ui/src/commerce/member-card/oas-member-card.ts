import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-member-card —— 会员卡（commerce 族）。
 *
 * 等级 / 权益卡：`grade`（等级名徽章——可见文本即等级标识，不只靠颜色）、权益插槽
 * （`perks`——权益条目归宿主渲染）、有效期（`expire` 文本 + i18n 前缀）、操作区按钮
 * 插槽（`actions`——续费 / 升级按钮归宿主，组件提供槽位与布局）；底色 `variant`
 * `solid`（缺省）/ `gradient` 两档 token 化（组件出口 `--oas-member-card-bg` /
 * `--oas-member-card-gradient` 可整卡接管，默认值全部引用主题 token，暗色自动跟随）。
 *
 * 纯展示卡（零事件）：操作区按钮的点击行为与可访问名由宿主按钮自带（组件不搬运、
 * 不包壳插槽内容）；无需宿主事件协议。
 *
 * 属性（kebab-case）：
 * - `grade`：等级名（如「黄金会员」）；缺省不渲染徽章。等级标识的信息传达 = 徽章
 *   可见文本（sr-only 前缀「会员等级」增强读屏语义），不依赖底色/图标。
 * - `variant`：`solid`（缺省，纯色底）/ `gradient`（渐变底）；非法值回落 solid 并
 *   告警一次；当前档反射 `data-variant` attribute（宿主可从外部定向）。
 * - `expire`：有效期文本（宿主给日期或文案）；缺省不渲染有效期行。
 *
 * 插槽：
 * - `perks`：权益区（无内容时整体隐藏）。
 * - `actions`：操作区（无内容时整体隐藏；按钮文案与可访问名归宿主）。
 *
 * a11y：卡片 `role="group"` + `aria-label`（「会员卡：{grade}」，缺省「会员卡」）；
 * 等级徽章可见文本即等级 + sr-only 前缀（不只靠颜色）；有效期前缀 i18n（语义标签
 * 可读）。颜色全走 token（暗色自动跟随），布局走逻辑属性（RTL 安全）。
 */
export type MemberCardVariant = 'solid' | 'gradient'

const VARIANTS: readonly string[] = ['solid', 'gradient']

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-4);
  border-radius: var(--oas-radius-lg);
  color: var(--oas-color-text-on-primary);
  background: var(--oas-member-card-bg, var(--oas-color-primary));
  min-width: 0;
}
:host([data-variant='gradient']) .card {
  background: var(--oas-member-card-gradient, linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-primary-active)));
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  min-width: 0;
}
.grade {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  border: 1px solid color-mix(in srgb, var(--oas-color-text-on-primary) 45%, transparent);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.grade[hidden] {
  display: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  min-width: 0;
}
.perks {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  min-width: 0;
}
.perks[hidden] {
  display: none;
}
.expire {
  font-size: var(--oas-font-size-xs);
}
.expire[hidden] {
  display: none;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  border-block-start: 1px solid color-mix(in srgb, var(--oas-color-text-on-primary) 20%, transparent);
  padding-block-start: var(--oas-space-3);
}
.actions[hidden] {
  display: none;
}
`

export class OASMemberCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['grade', 'variant', 'expire']
  }

  private gradeEl: HTMLElement | null = null
  private gradeTextEl: HTMLElement | null = null
  private perksEl: HTMLElement | null = null
  private expireEl: HTMLElement | null = null
  private expireTextEl: HTMLElement | null = null
  private actionsEl: HTMLElement | null = null
  private perksSlot: HTMLSlotElement | null = null
  private actionsSlot: HTMLSlotElement | null = null

  private warnedVariant = false
  /** aria-label 所有权追踪：组件上次写入的派生值（宿主显式值 ≠ 此值时不覆盖） */
  private lastOwnedAriaLabel: string | null = null

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="card" part="card">
        <div class="head" part="head">
          <span class="grade" part="grade" hidden>
            <span class="sr-only" part="grade-label"></span>
            <span part="grade-text"></span>
          </span>
        </div>
        <div class="body" part="body">
          <div class="perks" part="perks" hidden>
            <slot name="perks"></slot>
          </div>
          <div class="expire" part="expire" hidden>
            <span part="expire-prefix"></span>
            <span part="expire-text"></span>
          </div>
        </div>
        <div class="actions" part="actions" hidden>
          <slot name="actions"></slot>
        </div>
      </section>
    `
  }

  private bind(): void {
    this.gradeEl = this.shadow.querySelector<HTMLElement>('[part="grade"]')
    this.gradeTextEl = this.shadow.querySelector<HTMLElement>('[part="grade-text"]')
    this.perksEl = this.shadow.querySelector<HTMLElement>('[part="perks"]')
    this.expireEl = this.shadow.querySelector<HTMLElement>('[part="expire"]')
    this.expireTextEl = this.shadow.querySelector<HTMLElement>('[part="expire-text"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.perksSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="perks"]')
    this.actionsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')

    this.perksSlot?.addEventListener('slotchange', this.onSlotChange)
    this.actionsSlot?.addEventListener('slotchange', this.onSlotChange)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private readonly onSlotChange = (): void => {
    this.update()
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private resolveVariant(): MemberCardVariant {
    const raw = this.getAttr('variant').trim()
    if (raw === '') return 'solid'
    if (VARIANTS.includes(raw)) return raw as MemberCardVariant
    if (!this.warnedVariant) {
      this.warnedVariant = true
      devWarn(`[oas-member-card] variant "${raw}" 非法（solid / gradient），已回落 solid`)
    }
    return 'solid'
  }

  private hasSlotContent(slot: HTMLSlotElement | null): boolean {
    return (
      slot
        ?.assignedNodes({ flatten: true })
        .some((node) => (node.textContent ?? '').trim() !== '' || node.nodeType === Node.ELEMENT_NODE) ?? false
    )
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    const card = this.shadow.querySelector<HTMLElement>('[part="card"]')
    if (!card) return
    const variant = this.resolveVariant()
    if (this.getAttribute('data-variant') !== variant) this.setAttribute('data-variant', variant)

    // 可访问性挂在宿主（host 即可访问节点——shadow 内容器不重复挂 group 语义）。
    // aria-label 所有权追踪（oas-compact 守卫先例的增强）：宿主预置/改写的值 ≠ 组件上次派生值
    // → 视为宿主显式命名，组件不覆盖；宿主未动（值 = 组件上次写的）→ 组件跟随 grade 更新。
    const grade = this.getAttr('grade').trim()
    const derived = grade === '' ? this.t('memberCard.label') : `${this.t('memberCard.label')}：${grade}`
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group')
    const current = this.getAttribute('aria-label')
    if (current === null || current === this.lastOwnedAriaLabel) {
      if (current !== derived) this.setAttribute('aria-label', derived)
      this.lastOwnedAriaLabel = derived
    }
    if (this.gradeEl) this.gradeEl.hidden = grade === ''
    if (this.gradeTextEl) this.gradeTextEl.textContent = grade
    const gradeLabel = this.shadow.querySelector<HTMLElement>('[part="grade-label"]')
    if (gradeLabel) gradeLabel.textContent = this.t('memberCard.gradeLabel')

    const expire = this.getAttr('expire').trim()
    if (this.expireEl) this.expireEl.hidden = expire === ''
    const expirePrefix = this.shadow.querySelector<HTMLElement>('[part="expire-prefix"]')
    if (expirePrefix) expirePrefix.textContent = `${this.t('memberCard.expirePrefix')}：`
    if (this.expireTextEl) this.expireTextEl.textContent = expire

    if (this.perksEl) this.perksEl.hidden = !this.hasSlotContent(this.perksSlot)
    if (this.actionsEl) this.actionsEl.hidden = !this.hasSlotContent(this.actionsSlot)
  }
}
