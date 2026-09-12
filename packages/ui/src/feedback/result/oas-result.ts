import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ResultStatus = 'success' | 'error' | 'warning' | 'info' | '403' | '404' | '500'
export type ResultSize = 'small' | 'medium' | 'large'

const VALID_STATUSES: readonly string[] = ['success', 'error', 'warning', 'info', '403', '404', '500']
const VALID_SIZES: readonly string[] = ['small', 'medium', 'large']

const warnedStatuses = new Set<string>()
const warnedSizes = new Set<string>()

/** 非法值单次 warn（同值去重，样式回落由 CSS 原始属性选择器自然实现） */
function warnInvalid(raw: string, valid: readonly string[], label: string, warned: Set<string>): void {
  if (valid.includes(raw)) return
  if (!warned.has(raw)) {
    warned.add(raw)
    console.warn(`[oas-result] 非法 ${label} "${raw}"，已回落默认；合法值：${valid.join('/')}`)
  }
}

/** status 归一化：非法值回落 success（字形/色板/aria 使用归一化结果）并单次告警 */
function normalizeStatus(raw: string): ResultStatus {
  if ((VALID_STATUSES as readonly string[]).includes(raw)) return raw as ResultStatus
  warnInvalid(raw, VALID_STATUSES, 'status', warnedStatuses)
  return 'success'
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  text-align: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-primary);
  /* 文字档位变量（宿主可覆盖）；图标直径由 JS 按 size 同步为数值 */
  --oas-result-title-size: var(--oas-font-size-xl);
  --oas-result-desc-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
:host([size='small']) {
  --oas-result-title-size: var(--oas-font-size-lg);
  --oas-result-desc-size: var(--oas-font-size-sm);
}
:host([size='large']) {
  --oas-result-title-size: calc(var(--oas-font-size-xl) * 1.2);
  --oas-result-desc-size: var(--oas-font-size-lg);
}
.icon {
  margin: 0 auto var(--oas-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* 圆形底色指示器：语义色 10% 浅底 + 语义色字形（含暗色变体自动适配） */
  background: color-mix(in srgb, var(--result-color, var(--oas-color-primary)) 10%, transparent);
  color: var(--result-color, var(--oas-color-primary));
}
.icon[data-status='success'] {
  --result-color: var(--oas-color-success);
}
.icon[data-status='warning'],
.icon[data-status='403'] {
  --result-color: var(--oas-color-warning);
}
.icon[data-status='error'],
.icon[data-status='500'] {
  --result-color: var(--oas-color-danger);
}
.icon[data-status='info'],
.icon[data-status='404'] {
  --result-color: var(--oas-color-primary);
}
/* 自定义图标插槽：有内容时进入中性态（去语义色与底色，任意内容自定样式） */
.icon[data-custom] {
  background: none;
  color: inherit;
}
.icon-glyph {
  display: flex;
  width: 60%;
  height: 60%;
}
.icon-glyph svg {
  display: block;
  width: 100%;
  height: 100%;
}
.icon-glyph[hidden] {
  display: none;
}
.title {
  font-size: var(--oas-result-title-size);
  font-weight: 600;
}
.title[hidden],
.description[hidden] {
  display: none;
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-result-desc-size);
  color: var(--oas-color-text-secondary);
}
.content {
  margin-top: var(--oas-space-3);
  font-size: var(--oas-result-desc-size);
  color: var(--oas-color-text-secondary);
}
.content[hidden] {
  display: none;
}
::slotted([slot='extra']) {
  margin-top: var(--oas-space-4);
  display: inline-block;
}
`

/** 四语义状态图标：复用库内语义图标映射（与 alert/modal/message 一致），走 oas-icon registry 内联 SVG */
const STATUS_ICONS: Record<ResultStatus, IconName> = {
  success: 'check-circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
  '403': 'warning',
  '404': 'info',
  '500': 'error',
}

/** HTTP 错误页图标字形（原创自绘，16 viewBox 与 registry 同风格：圆环 + 语义图形）。
 *  非 registry 键，自研 SVG 受控常量直接内嵌，避免改动 @oas-ui/icons 包 */
const HTTP_GLYPHS: Partial<Record<ResultStatus, string>> = {
  '403':
    // 挂锁：无权限
    '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M6.6 7.6 V6 a1.4 1.4 0 0 1 2.8 0 v1.6"/><rect x="5" y="7.2" width="6" height="5" rx="1.2"/></g>',
  '404':
    // 问号：页面/资源不存在（几何与 message 内置 question 图标同语言）
    '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M9.4 6.2 C9.4 4.7 6.6 4.7 6.6 6.2 C6.6 7.3 7.6 7.7 8 8.5"/><path d="M8 10.9 H8.01"/></g>',
  '500':
    // 服务器机架：内部错误
    '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><rect x="4.3" y="5.8" width="7.4" height="4.8" rx="1.1"/><path d="M5.9 7.6 h4.2 M5.9 9.2 h4.2"/></g>',
}

/** SVG 外壳：registry / 自研字形统一包装（currentColor 跟随容器颜色） */
function iconSvg(inner: string): string {
  return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`
}

export class OASResult extends OASElement {
  static override get observedAttributes(): string[] {
    return ['status', 'title', 'description', 'size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="icon" part="icon" role="status">
        <slot name="icon"></slot>
        <span class="icon-glyph"></span>
      </div>
      <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
      <div class="description" part="description"><slot name="description"></slot><span class="description-text"></span></div>
      <div class="content" part="content" hidden><slot></slot></div>
      <slot name="extra"></slot>
    `
  }

  /** 绑定事件（render 与水合路径共用）：所有插槽内容增减时重刷双通道/显隐 */
  private bind(): void {
    const slots = this.shadow.querySelectorAll<HTMLSlotElement>('slot')
    for (const slot of slots) slot.addEventListener('slotchange', () => this.update())
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（icon/title/description 部件存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="icon"]')) return false
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="description"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** 图标直径：small 56 / medium 72 / large 88 */
  private iconSize(): number {
    const map: Record<string, number> = { small: 56, medium: 72, large: 88 }
    return map[this.getAttr('size', 'medium')] ?? 72
  }

  protected override update(): void {
    // size 非法值单次告警（CSS 用原始属性选择器命中档位；非法值自然回落默认）
    warnInvalid(this.getAttr('size', 'medium'), VALID_SIZES, 'size', warnedSizes)

    // status 归一化同步：语义色 + 内联 SVG 字形 + role/aria（自定义图标插槽时进入中性态）
    const status = normalizeStatus(this.getAttr('status', 'success') || 'success')
    const icon = this.shadow.querySelector<HTMLElement>('.icon')
    const glyph = this.shadow.querySelector<HTMLElement>('.icon-glyph')
    const iconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')
    if (!icon || !glyph || !iconSlot) return

    const custom = this.hasSlotContent(iconSlot)
    icon.toggleAttribute('data-custom', custom)
    icon.setAttribute('data-status', status)
    if (custom) {
      icon.removeAttribute('role')
      icon.removeAttribute('aria-label')
      glyph.hidden = true
      glyph.innerHTML = ''
    } else {
      icon.setAttribute('role', 'status')
      icon.setAttribute('aria-label', status)
      glyph.hidden = false
      // 字形：HTTP 状态自研字形 > registry 语义图标（403/404/500 复用同色语义图标映射）
      const inner = HTTP_GLYPHS[status] ?? iconRegistry[STATUS_ICONS[status]]
      const markup = iconSvg(inner)
      if (glyph.dataset.glyph !== markup) {
        glyph.innerHTML = markup
        glyph.dataset.glyph = markup
      }
    }
    const px = this.iconSize()
    // 中性自定义态不约束图标区尺寸（内容自定大小）；内置态固定圆形直径
    icon.style.width = custom ? '' : `${px}px`
    icon.style.height = custom ? '' : `${px}px`

    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    if (titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = this.hasSlotContent(titleSlot)
    }

    // description 双通道：slot="description" 富内容优先，无则属性文案；两者皆空隐藏整层
    const descSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="description"]')
    const desc = this.shadow.querySelector<HTMLElement>('.description')
    const descText = this.shadow.querySelector<HTMLElement>('.description-text')
    if (descSlot && desc && descText) {
      const rich = this.hasSlotContent(descSlot)
      descText.textContent = this.getAttr('description', '')
      descText.hidden = rich
      desc.hidden = !rich && this.getAttr('description', '') === ''
    }

    // 默认 slot 内容区：错误详情清单等，置于描述与 extra 之间；无内容隐藏
    const content = this.shadow.querySelector<HTMLElement>('.content')
    const bodySlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (content && bodySlot) {
      content.hidden = !this.hasSlotContent(bodySlot)
    }
  }
}
