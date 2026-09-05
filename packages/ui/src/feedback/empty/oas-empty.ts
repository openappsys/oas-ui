import { OASElement, escapeAttr } from '@oas-ui/core'
import { iconRegistry, iconNames } from '@oas-ui/icons'

export type EmptySize = 'small' | 'medium' | 'large'
export type EmptyAlign = 'center' | 'start' | 'end'
export type EmptyVariant = '' | 'outlined' | 'filled'

const VALID_SIZES: readonly string[] = ['small', 'medium', 'large']
const VALID_ALIGNS: readonly string[] = ['center', 'start', 'end']
const VALID_VARIANTS: readonly string[] = ['', 'outlined', 'filled']

const warnedSizes = new Set<string>()
const warnedAligns = new Set<string>()
const warnedVariants = new Set<string>()
const warnedIcons = new Set<string>()

/** 非法值单次 warn（同值去重，样式回落由 CSS 原始属性选择器自然实现） */
function warnInvalid(raw: string, valid: readonly string[], label: string, warned: Set<string>): void {
  if (valid.includes(raw)) return
  if (!warned.has(raw)) {
    warned.add(raw)
    console.warn(`[oas-empty] 非法 ${label} "${raw}"，已回落默认；合法值：${valid.map((v) => (v === '' ? '(空)' : v)).join('/')}`)
  }
}

/** 非法 icon 名单次 warn（无回落值，按未提供处理走后续优先级） */
function warnInvalidIcon(raw: string): void {
  if (!warnedIcons.has(raw)) {
    warnedIcons.add(raw)
    console.warn(`[oas-empty] 非法 icon "${raw}"，已忽略；合法值为 @oas-ui/icons registry 图标名`)
  }
}

const ICON_NAMES = new Set<string>(iconNames)

const STYLE = `
:host {
  display: block;
  box-sizing: border-box;
  padding: var(--oas-space-6);
  font-family: inherit;
  color: var(--oas-color-text-secondary);
  /* 文字档位变量（宿主可覆盖）；媒体尺寸由 JS 按 size/image-size 同步为数值 */
  --oas-empty-title-size: var(--oas-font-size-lg);
  --oas-empty-desc-size: var(--oas-font-size-md);
  /* 图标型媒体颜色（圆形底色指示器 + 字形共用），宿主可用 CSS 变量覆盖 */
  --oas-empty-icon-color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
:host([size='small']) {
  --oas-empty-title-size: var(--oas-font-size-md);
  --oas-empty-desc-size: var(--oas-font-size-sm);
}
:host([size='large']) {
  --oas-empty-title-size: var(--oas-font-size-xl);
  --oas-empty-desc-size: var(--oas-font-size-lg);
}
/* 容器变体：整体描边 / 底色（配合半径），默认无容器 */
:host([variant='outlined']) {
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-lg);
}
:host([variant='filled']) {
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-lg);
}
/* 布局：默认纵向居中；align=start/end 切横向（媒体在逻辑起始/结束侧，RTL 自适应） */
.body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 100%;
}
:host([align='start']) .body,
:host([align='end']) .body {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  column-gap: var(--oas-space-5);
  text-align: start;
}
:host([align='end']) .body {
  flex-direction: row-reverse;
}
.image {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: var(--oas-space-3);
}
:host([align='start']) .image,
:host([align='end']) .image {
  margin-bottom: 0;
}
:host([hide-image]) .image {
  display: none;
}
.illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.illustration svg,
.illustration img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* 仅内置插画（默认/简约两套）做降透明处理，自定义与图标型媒体保持原样 */
.illustration[data-default] svg {
  opacity: 0.7;
}
/* 图标型媒体：圆形底色指示器 + 字形（颜色共用 --oas-empty-icon-color） */
.illustration[data-mode='icon'] {
  border-radius: 50%;
  background: color-mix(in srgb, var(--oas-empty-icon-color) 12%, transparent);
  color: var(--oas-empty-icon-color);
}
.illustration[data-mode='icon'] svg {
  width: 50%;
  height: 50%;
  opacity: 1;
}
/* slot 内容直接参与 .image 的 flex 居中布局 */
slot[name='illustration'] {
  display: contents;
}
/* hidden 属性会被作者级 display 规则覆盖，需显式补回 */
.illustration[hidden],
slot[name='illustration'][hidden],
.text[hidden] {
  display: none;
}
::slotted(svg),
::slotted(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.text {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
:host([align='start']) .text,
:host([align='end']) .text {
  align-items: flex-start;
}
.title {
  font-size: var(--oas-empty-title-size);
  font-weight: 600;
  line-height: 1.5;
  color: var(--oas-color-text-primary);
  margin-bottom: var(--oas-space-2);
}
.title[hidden] {
  display: none;
}
.description {
  font-size: var(--oas-empty-desc-size);
  line-height: 1.6;
}
.description[hidden] {
  display: none;
}
::slotted([slot='action']) {
  margin-top: var(--oas-space-3);
}
`

/** 内置默认插画（原创：档案盒 + 主色圆点） */
const ILLUSTRATION = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="28" y="36" width="64" height="44" rx="8" fill="var(--oas-color-border)" stroke="var(--oas-color-text-disabled)" stroke-width="2"/>
  <line x1="28" y1="50" x2="92" y2="50" stroke="var(--oas-color-text-disabled)" stroke-width="2"/>
  <line x1="40" y1="60" x2="80" y2="60" stroke="var(--oas-color-border)" stroke-width="2" stroke-linecap="round"/>
  <line x1="48" y1="68" x2="72" y2="68" stroke="var(--oas-color-border)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="60" cy="84" r="14" fill="var(--oas-color-primary)" opacity="0.15"/>
  <circle cx="60" cy="84" r="5" fill="var(--oas-color-primary)"/>
</svg>
`

/** 内置第二套简约插画（原创：空托盘 + 悬浮主色圆点，极小体积） */
const SIMPLE_ILLUSTRATION = `
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="48" cy="62" rx="30" ry="9" fill="var(--oas-color-primary)" opacity="0.08"/>
  <ellipse cx="48" cy="62" rx="30" ry="9" fill="none" stroke="var(--oas-color-text-disabled)" stroke-width="2" stroke-dasharray="4 3"/>
  <circle cx="48" cy="36" r="9" fill="var(--oas-color-primary)" opacity="0.25"/>
</svg>
`

/** 图标型媒体 SVG 外壳：registry 内联 path（currentColor 跟随容器颜色） */
function iconSvg(path: string): string {
  return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${path}</svg>`
}

export class OASEmpty extends OASElement {
  static override get observedAttributes(): string[] {
    return ['description', 'hide-image', 'illustration', 'image-size', 'title', 'icon', 'size', 'align', 'variant']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="body">
        <div class="image" part="image">
          <slot name="illustration"></slot>
          <div class="illustration" part="illustration"></div>
        </div>
        <div class="text">
          <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
          <div class="description" part="description"></div>
          <slot></slot>
          <slot name="action"></slot>
        </div>
      </div>
    `
  }

  /** 绑定事件（render 与水合路径共用）：媒体/标题/描述三类插槽内容增减时重刷双通道 */
  private bind(): void {
    const slots = this.shadow.querySelectorAll<HTMLSlotElement>('slot')
    for (const slot of slots) slot.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 image/title/description 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="image"]')) return false
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="description"]')) return false
    // title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，防水合后首次 update 把标题清掉
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle.trim() !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性通道的判空依据 */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 媒体区尺寸：image-size 数值精调优先，否则按 size 档联动（small 72 / medium 96 / large 120） */
  private mediaSize(): number {
    const n = Number(this.getAttr('image-size'))
    if (Number.isFinite(n) && n > 0) return Math.round(n)
    const map: Record<string, number> = { small: 72, medium: 96, large: 120 }
    return map[this.getAttr('size', 'medium')] ?? 96
  }

  protected override update(): void {
    // 非法档位单次告警（CSS 用原始属性选择器命中档位样式；非法值自然回落默认）
    warnInvalid(this.getAttr('size', 'medium'), VALID_SIZES, 'size', warnedSizes)
    warnInvalid(this.getAttr('align', 'center'), VALID_ALIGNS, 'align', warnedAligns)
    warnInvalid(this.getAttr('variant', ''), VALID_VARIANTS, 'variant', warnedVariants)

    // title 吸收 + 双通道（slot 富内容优先，无则渲染缓存文本；全空时隐藏整层）
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    const titleWrap = this.shadow.querySelector<HTMLElement>('.title')
    if (titleSlot && titleFallback && titleWrap) {
      const hasRich = this.hasSlotContent(titleSlot)
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = hasRich
      titleWrap.hidden = !hasRich && !(this.titleCache && this.titleCache.trim() !== '')
    }

    // description 双通道：默认 slot 富内容优先，无则属性文案，再缺省 locale 默认文案
    const descSlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    const desc = this.shadow.querySelector<HTMLElement>('[part="description"]')
    if (descSlot && desc) {
      const hasRich = this.hasSlotContent(descSlot)
      desc.hidden = hasRich
      if (!hasRich) {
        const text = this.hasAttr('description') ? this.getAttr('description') : this.t('empty.noData')
        if (desc.textContent !== text) desc.textContent = text
      }
    }

    // 媒体区尺寸
    const image = this.shadow.querySelector<HTMLElement>('.image')
    if (!image) return
    const px = this.mediaSize()
    image.style.width = `${px}px`
    image.style.height = `${px}px`

    // 媒体优先级：slot="illustration" > illustration 属性（markup/URL/simple 第二套内置） > icon 属性（图标型媒体） > 默认插画
    const content = this.shadow.querySelector<HTMLElement>('[part="illustration"]')
    const illuSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="illustration"]')
    if (!content || !illuSlot) return
    const hasSlotContent = this.hasSlotContent(illuSlot)
    illuSlot.hidden = !hasSlotContent
    content.hidden = hasSlotContent
    if (hasSlotContent) return

    const illu = this.getAttr('illustration')
    const icon = this.getAttr('icon')
    let markup = ILLUSTRATION
    let mode = 'media'
    if (illu !== '') {
      if (illu === 'simple') {
        markup = SIMPLE_ILLUSTRATION
      } else if (illu.trim().startsWith('<')) {
        markup = illu
      } else {
        markup = `<img src="${escapeAttr(illu)}" alt="" aria-hidden="true">`
      }
    } else if (icon !== '') {
      if (ICON_NAMES.has(icon)) {
        markup = iconSvg(iconRegistry[icon as keyof typeof iconRegistry])
        mode = 'icon'
      } else {
        warnInvalidIcon(icon)
      }
    }
    const dim = markup === ILLUSTRATION || markup === SIMPLE_ILLUSTRATION
    if (content.dataset.markup !== markup || content.dataset.mode !== mode) {
      content.innerHTML = markup
      content.dataset.markup = markup
      content.dataset.mode = mode
    }
    content.toggleAttribute('data-default', dim)
  }
}
