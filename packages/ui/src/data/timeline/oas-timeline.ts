import { OASElement } from '@oas-ui/core'
import { normalizeSize, ALL_SIZES } from '../../shared/size.js'
import type { OASTimelineItem } from './oas-timeline-item.js'

/** size 五档 → 圆点直径（medium 10px 为既有默认；档位经 --oas-timeline-dot-size 下发，子项样式按变量刻画） */
const SIZE_DOT: Record<string, string> = {
  xs: '6px',
  small: '8px',
  medium: '10px',
  large: '12px',
  xl: '16px',
}

/** size 五档 → 字号（medium 缺省清空，跟随外层字号——展示型组件字号继承惯例；次级文本按 em 比例跟随） */
const SIZE_FONT: Record<string, string> = {
  xs: 'var(--oas-font-size-xs)',
  small: 'var(--oas-font-size-sm)',
  medium: '',
  large: 'var(--oas-font-size-lg)',
  xl: 'var(--oas-font-size-xl)',
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 时间线内容跟随外层字号；定制开口：--oas-timeline-font（次级文本按 em 比例跟随） */
  font-size: var(--oas-timeline-font, inherit);
}
:host([hidden]) {
  display: none;
}
/* 纵向：条目纵向堆叠；reverse 视觉倒序（DOM 顺序不变，朗读/焦点顺序稳定） */
.timeline {
  display: flex;
  flex-direction: column;
}
.timeline[data-reverse='true'] {
  flex-direction: column-reverse;
}
/* 横向：条目横向排布（reverse 同理） */
.timeline[data-direction='horizontal'] {
  flex-direction: row;
  align-items: stretch;
}
.timeline[data-direction='horizontal'][data-reverse='true'] {
  flex-direction: row-reverse;
}
`

/**
 * oas-timeline —— 时间线容器（数据下发型：布局上下文与尺寸档位经属性/变量下发子项）。
 *
 * 属性：`direction`（vertical/horizontal）、`mode`（left/right/alternate）、`reverse`（视觉倒序）、
 * `size` 五档（xs/small/medium/large/xl，sm/md/lg 别名等价；非法值回落 medium）——
 * 档位经 `--oas-timeline-dot-size`（圆点直径 6/8/10/12/16px，连接线起止随动）与
 * `--oas-timeline-font`（字号 token，medium 清空跟随外层）下发，子项 shadow 样式按变量刻画。
 */
export class OASTimeline extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'mode', 'reverse', 'size', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="timeline" part="timeline"><slot></slot></div>
    `
  }

  private observer: MutationObserver | null = null

  /** 缓存节点引用（render 与水合路径共用）+ 子项增删监听（上下文下发） */
  private bind(): void {
    // 条目增删/重排后重发上下文（data-direction / data-mode）
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => {
      this.observer?.disconnect()
      this.observer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（timeline 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="timeline"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector('[part="timeline"]')
    if (!wrap) return
    const direction = this.getAttr('direction', '') === 'horizontal' ? 'horizontal' : 'vertical'
    const modeAttr = this.getAttr('mode', '')
    const mode = modeAttr === 'right' || modeAttr === 'alternate' ? modeAttr : 'left'
    wrap.setAttribute('data-direction', direction)
    wrap.setAttribute('data-mode', mode)
    wrap.setAttribute('data-reverse', String(this.hasAttr('reverse')))
    // size 五档：档位经 CSS 变量下发（--oas-timeline-dot-size / --oas-timeline-font，
    // 子项 shadow 样式已按这两个变量刻画，自定义属性沿 DOM 继承进子项 shadow）；
    // medium/缺省清除变量回落现状（零回归）；sm/md/lg 别名经 shared/size 等价；非法值回落 medium
    const size = normalizeSize(this.getAttr('size', 'medium'), ALL_SIZES, 'medium')
    if (size === 'medium') {
      this.style.removeProperty('--oas-timeline-dot-size')
      this.style.removeProperty('--oas-timeline-font')
    } else {
      this.style.setProperty('--oas-timeline-dot-size', SIZE_DOT[size]!)
      const font = SIZE_FONT[size]!
      if (font) this.style.setProperty('--oas-timeline-font', font)
      else this.style.removeProperty('--oas-timeline-font')
    }
    // 布局上下文下发给每个条目（条目自包含行，据此刻画轴/线/分列）
    for (const item of this.querySelectorAll('oas-timeline-item') as NodeListOf<OASTimelineItem>) {
      item.setAttribute('data-direction', direction)
      item.setAttribute('data-mode', mode)
    }
  }
}
