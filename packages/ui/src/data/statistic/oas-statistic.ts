import { OASElement } from '@oas-ui/core'
import { arrowDownPath, arrowUpPath } from '@oas-ui/icons'
import { resolveLocale } from '../../form/calendar/date-grid.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
  /* 大数字默认档位固定（语义同 h1，不随外层 font-size 意外变化）；
     定制开口：组件级变量 --oas-statistic-font（如 32px） */
  font-size: var(--oas-statistic-font, var(--oas-font-size-lg));
}
:host([hidden]) {
  display: none;
}
/* 内部 part 的 hidden 显隐：作者层 display 规则优先于 UA [hidden]，必须显式兜底
   （否则 [part=trend] display:inline-flex 等会压过 hidden 属性，骨架/箭头永远可见） */
[hidden] {
  display: none !important;
}
[part='statistic'] {
  display: inline-flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
[part='title'] {
  font-size: var(--oas-font-size-md);
  font-weight: 400;
  color: var(--oas-color-text-secondary);
}
[part='body'] {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
}
[part='prefix'] {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
[part='suffix'] {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
[part='trend'] {
  display: inline-flex;
  align-self: center;
  /* 趋势涨跌色开口：默认走语义 token（含 dark 变体） */
  color: var(--oas-color-text-secondary);
}
:host([trend='up']) [part='trend'] {
  color: var(--oas-statistic-trend-up-color, var(--oas-color-success-text));
}
:host([trend='down']) [part='trend'] {
  color: var(--oas-statistic-trend-down-color, var(--oas-color-danger-text));
}
[part='value'] {
  font-weight: 600;
  line-height: 1;
}
[part='extra'] {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.skeleton {
  width: 120px;
}
`

/** 趋势箭头图标（原创 SVG，arrowUp/DownPath 取自 @oas-ui/icons 图标集） */
const TREND_ICONS = {
  up: `<svg class="trend-up" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${arrowUpPath}</svg>`,
  down: `<svg class="trend-down" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${arrowDownPath}</svg>`,
}

export class OASStatistic extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'precision', 'prefix', 'suffix', 'group-separator', 'loading', 'title', 'extra', 'trend']
  }

  /** Element 内建只读 getter prefix 会让 Vue 走 property 赋值；访问器遮蔽并反射到 attribute */
  override get prefix(): string {
    return this.getAttr('prefix', '')
  }
  override set prefix(value: string) {
    this.setAttribute('prefix', value)
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  title 是原生全局属性——残留会让悬停弹出浏览器原生提示（与可见标题重复的视觉干扰），
   *  按库内既有约定（list-item 同构）渲染进标题区后即从宿主移除。 */
  private titleCache: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="statistic" part="statistic">
        <div class="title" part="title" hidden><slot name="title"><span class="title-text" data-fallback></span></slot></div>
        <div class="body" part="body">
          <span class="prefix" part="prefix" hidden><slot name="prefix"><span data-fallback></span></slot></span>
          <span class="trend" part="trend" hidden>${TREND_ICONS.up}${TREND_ICONS.down}</span>
          <span class="value" part="value"><span class="value-inner" part="value-inner"><slot name="value"><span class="value-text" data-fallback></span></slot></span><oas-skeleton class="skeleton" active title rows="0" hidden></oas-skeleton></span>
          <span class="suffix" part="suffix" hidden><slot name="suffix"><span data-fallback></span></slot></span>
        </div>
        <div class="extra" part="extra" hidden><slot name="extra"><span data-fallback></span></slot></div>
      </div>
    `
  }

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private slotHasContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 缓存节点引用 + 绑定 slotchange（render 与水合路径共用；title/extra/value 插槽增删时重刷） */
  private bind(): void {
    for (const sel of ['slot[name="title"]', 'slot[name="extra"]', 'slot[name="value"]']) {
      this.shadow.querySelector<HTMLSlotElement>(sel)?.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（statistic 骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="statistic"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"] [data-fallback]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    const stat = this.shadow.querySelector<HTMLElement>('[part="statistic"]')
    if (!stat) return

    // ---- title 吸收（状态机同 list-item）：属性在场（含空串）= 宿主意图 → 更新缓存并移除；
    // 属性缺席 = 吸收后的常态 → 保持已渲染标题（清空请用 title=""） ----
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('[part="title"] [data-fallback]')
    if (titleEl && titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      const hasTitle = this.slotHasContent(titleSlot) || this.titleCache !== null
      titleFallback.hidden = this.slotHasContent(titleSlot)
      titleEl.hidden = !hasTitle
    }

    // ---- extra 双通道（非原生全局属性，不吸收）：属性文本兜底；slot="extra" 优先 ----
    const extraEl = this.shadow.querySelector<HTMLElement>('[part="extra"]')
    const extraSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="extra"]')
    const extraFallback = this.shadow.querySelector<HTMLElement>('[part="extra"] [data-fallback]')
    if (extraEl && extraSlot && extraFallback) {
      const attr = this.getAttr('extra', '')
      extraFallback.textContent = attr
      const hasExtra = this.slotHasContent(extraSlot) || attr !== ''
      extraFallback.hidden = this.slotHasContent(extraSlot)
      extraEl.hidden = !hasExtra
    }

    // ---- 前后缀双通道：属性文本兜底；slot 分发优先 ----
    for (const name of ['prefix', 'suffix'] as const) {
      const affixEl = this.shadow.querySelector<HTMLElement>(`[part="${name}"]`)
      const affixSlot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      const affixFallback = this.shadow.querySelector<HTMLElement>(`[part="${name}"] [data-fallback]`)
      if (!affixEl || !affixSlot || !affixFallback) continue
      const attr = this.getAttr(name, '')
      affixFallback.textContent = attr
      const hasAffix = this.slotHasContent(affixSlot) || attr !== ''
      affixFallback.hidden = this.slotHasContent(affixSlot)
      affixEl.hidden = !hasAffix
    }

    // ---- trend 趋势指示：up/down 显隐（涨跌色走 :host([trend]) token 选择器） ----
    const trendEl = this.shadow.querySelector<HTMLElement>('[part="trend"]')
    if (trendEl) {
      const trend = this.getAttr('trend', '')
      const direction = trend === 'up' || trend === 'down' ? trend : null
      trendEl.hidden = direction === null
      trendEl.querySelector('.trend-up')?.toggleAttribute('hidden', direction !== 'up')
      trendEl.querySelector('.trend-down')?.toggleAttribute('hidden', direction !== 'down')
    }

    // ---- 数值区：loading 骨架占位 / slot="value" 分发 / Intl 格式化兜底 ----
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="value"]')
    const valueSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="value"]')
    const valueFallback = this.shadow.querySelector<HTMLElement>('[part="value"] [data-fallback]')
    const skeleton = this.shadow.querySelector<HTMLElement>('[part="value"] .skeleton')
    if (!valueEl || !valueFallback || !skeleton) return
    const loading = this.hasAttr('loading')
    if (valueSlot) valueFallback.hidden = this.slotHasContent(valueSlot)
    valueFallback.textContent = this.formatNumber()
    skeleton.hidden = !loading
  }

  private formatNumber(): string {
    const numeric = Number(this.getAttr('value', '0'))
    const precision = Math.max(0, Number(this.getAttr('precision', '0')) || 0)
    const useGrouping = this.getAttr('group-separator', 'true') !== 'false'
    const locale = resolveLocale(this)
    return new Intl.NumberFormat(locale, {
      useGrouping,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(numeric)
  }
}
