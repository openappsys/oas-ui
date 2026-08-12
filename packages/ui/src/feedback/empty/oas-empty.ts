import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  font-family: inherit;
  color: var(--oas-color-text-secondary);
}
.image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
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
/* 仅默认插画做降透明处理，自定义插画保持原样 */
.illustration[data-default] svg {
  opacity: 0.7;
}
:host([hide-image]) .image {
  display: none;
}
/* slot 内容直接参与 .image 的 flex 居中布局 */
slot[name='illustration'] {
  display: contents;
}
/* hidden 属性会被作者级 display 规则覆盖，需显式补回 */
.illustration[hidden],
slot[name='illustration'][hidden] {
  display: none;
}
::slotted(svg),
::slotted(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
::slotted([slot='action']) {
  margin-top: var(--oas-space-3);
}
`

const ILLUSTRATION = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="96" height="96" aria-hidden="true">
  <rect x="28" y="36" width="64" height="44" rx="8" fill="var(--oas-color-border)" stroke="var(--oas-color-text-disabled)" stroke-width="2"/>
  <line x1="28" y1="50" x2="92" y2="50" stroke="var(--oas-color-text-disabled)" stroke-width="2"/>
  <line x1="40" y1="60" x2="80" y2="60" stroke="var(--oas-color-border)" stroke-width="2" stroke-linecap="round"/>
  <line x1="48" y1="68" x2="72" y2="68" stroke="var(--oas-color-border)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="60" cy="84" r="14" fill="var(--oas-color-primary)" opacity="0.15"/>
  <circle cx="60" cy="84" r="5" fill="var(--oas-color-primary)"/>
</svg>
`

/** 转义属性值中的危险字符，避免注入闭合引号/标签 */
function escapeAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export class OASEmpty extends OASElement {
  static override get observedAttributes(): string[] {
    return ['description', 'hide-image', 'illustration', 'image-size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="image" part="image">
        <slot name="illustration"></slot>
        <div class="illustration" part="illustration"></div>
      </div>
      <div class="description" part="description"></div>
      <slot name="action"></slot>
    `
  }

  /** 绑定事件（render 与水合路径共用） */
  private bind(): void {
    // 插画 slot 内容增减时重新同步优先级
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="illustration"]')
      ?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 [part=description] 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="description"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // description 属性优先，缺省走 locale registry 默认文案（setLocale 切换自动刷新）
    const description = this.hasAttr('description')
      ? this.getAttr('description')
      : this.t('empty.noData')
    this.shadow.querySelector<HTMLElement>('[part="description"]')!.textContent = description

    const image = this.shadow.querySelector<HTMLElement>('.image')
    const content = this.shadow.querySelector<HTMLElement>('[part="illustration"]')
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="illustration"]')
    if (!image || !content || !slot) return

    // image-size 控制插画区域尺寸（缺省 96px）
    const size = this.imageSize()
    image.style.width = `${size}px`
    image.style.height = `${size}px`

    // 优先级：slot="illustration" > illustration 属性 > 默认插画
    const hasSlotContent = slot.assignedNodes({ flatten: true }).length > 0
    slot.hidden = !hasSlotContent
    content.hidden = hasSlotContent
    if (hasSlotContent) return

    // illustration 属性：SVG/HTML 标记直接注入，否则按图片 URL 渲染 <img>
    const raw = this.getAttr('illustration')
    const markup = raw
      ? raw.trim().startsWith('<')
        ? raw
        : `<img src="${escapeAttr(raw)}" alt="" aria-hidden="true">`
      : ILLUSTRATION
    // 内容未变化时跳过 innerHTML 重建（增量同步）
    if (content.dataset.markup !== markup) {
      content.innerHTML = markup
      content.dataset.markup = markup
    }
    content.toggleAttribute('data-default', markup === ILLUSTRATION)
  }

  private imageSize(): number {
    const n = Number(this.getAttr('image-size'))
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 96
  }
}
