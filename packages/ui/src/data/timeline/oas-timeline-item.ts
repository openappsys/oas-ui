import { OASElement } from '@oas-ui/core'

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
[hidden] {
  display: none !important;
}
/* ===== 行结构：grid 三列（对侧 | 轴 | 主体），默认单侧（左轴右内容） ===== */
.row {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--oas-space-3);
  padding-bottom: var(--oas-space-5);
}
.axis {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  width: 10px;
}
.body {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}
/* 连接线：自本行圆点下方延伸至行底（含条目间距），与下一行圆点衔接；末条目断线。
   grid item 的 align stretch 只到 content-box（不含 .row 的 padding-bottom），
   故 bottom 用负值穿过 padding 区域（space-5），线才真正接到下一 item 顶部的圆点。
   再下延 4px 覆盖下一 item 圆点的 top 偏移（dot 顶距 item 顶 4px），点线无缝隙相接。
   此前 bottom:0 只画到内容底，点与点之间留下 padding 空隙无线（用户实测点线不连） */
.axis::after {
  content: '';
  position: absolute;
  top: 14px;
  bottom: calc(-1 * var(--oas-space-5) - 4px);
  left: 4px;
  width: 2px;
  background: var(--oas-color-border);
}
:host(:last-child) .axis::after {
  display: none;
}
/* ===== 圆点 ===== */
.dot {
  position: absolute;
  top: 4px;
  left: 0;
  width: var(--oas-timeline-dot-size, 10px);
  height: var(--oas-timeline-dot-size, 10px);
  /* border-box：总宽 10px、圆心 5px，与连接线（left:4px + 2px 宽 → 中心 5px）对齐 */
  box-sizing: border-box;
  border-radius: 50%;
  /* 任意色开口：--oas-timeline-dot-color 优先于 type 语义色 */
  background: var(--oas-timeline-dot-color, var(--dot-color, var(--oas-color-primary)));
  /* 实心圆点不带底色描边：连接线从圆点底缘（4+10=14px）起笔无缝衔接；
     原 2px 底色描边让彩色圆心止于 12px，与 14px 起笔的线留出 2px 视觉断口（用户实测） */
  z-index: 1;
}
.dot[data-type='success'] { --dot-color: var(--oas-color-success); }
.dot[data-type='warning'] { --dot-color: var(--oas-color-warning); }
.dot[data-type='danger'] { --dot-color: var(--oas-color-danger); }
.dot[data-type='info'] { --dot-color: var(--oas-color-info-text); }
.dot[data-type='neutral'] { --dot-color: var(--oas-color-text-secondary); }
/* outlined 空心变体：透明底 + type 色描边（描边即圆点视觉，连接线触描边底缘） */
.dot[data-variant='outlined'] {
  background: transparent;
  border: 2px solid var(--oas-timeline-dot-color, var(--dot-color, var(--oas-color-primary)));
}
/* icon 属性节点：图标替换圆点，颜色跟随 type；图标尺寸大于圆点盒，
   中心锚定到圆点心（左 50% 线心 / 上 圆心 4px+半尺寸）——与连接线同轴对齐 */
.dot[data-icon] {
  background: transparent;
  border-color: transparent;
  color: var(--oas-timeline-dot-color, var(--dot-color, var(--oas-color-primary)));
  width: auto;
  height: auto;
  left: calc(var(--oas-timeline-dot-size, 10px) / 2);
  top: calc(4px + var(--oas-timeline-dot-size, 10px) / 2);
  transform: translate(-50%, -50%);
}
/* dot 插槽自定义节点：完全交给宿主内容，同样中心锚定到圆点心 */
.dot[data-custom] {
  background: transparent;
  border-color: transparent;
  width: auto;
  height: auto;
  left: calc(var(--oas-timeline-dot-size, 10px) / 2);
  top: calc(4px + var(--oas-timeline-dot-size, 10px) / 2);
  transform: translate(-50%, -50%);
}
.dot oas-icon {
  display: block;
  font-size: var(--oas-timeline-dot-size, 12px);
  line-height: 1;
}
/* ===== 主体文本 ===== */
.time {
  /* 次级文本按比例跟随 host（原 xs/md ≈ 12/14） */
  font-size: 0.857em;
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-1);
}
.title {
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: var(--oas-space-1);
}
.content {
  line-height: 1.6;
}
.pending-text {
  color: var(--oas-color-text-secondary);
  /* 次级文本按比例跟随 host（原 sm/md ≈ 13/14） */
  font-size: 0.929em;
  margin: 0;
}
/* ===== 进行中（pending）节点：空心圆点 + 脉冲 + 虚线连接 ===== */
:host([pending]) .dot {
  background: var(--oas-color-bg);
  border: 2px solid var(--oas-timeline-dot-color, var(--dot-color, var(--oas-color-primary)));
  animation: oas-timeline-pulse 1.6s ease-in-out infinite;
}
:host([pending]) .axis::after {
  background: transparent;
  border-left: 2px dashed var(--oas-color-border);
  width: 0;
}
/* 进行中尾节点：保留一截短虚线桩（其余末条目完全断线） */
:host([pending]:last-child) .axis::after {
  display: block;
  bottom: auto;
  height: var(--oas-space-2);
}
@keyframes oas-timeline-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* ===== 单节点 loading：圆点变旋转环 ===== */
:host([loading]) .dot {
  background: transparent;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-timeline-dot-color, var(--dot-color, var(--oas-color-primary)));
  animation: oas-timeline-spin 0.9s linear infinite;
}
@keyframes oas-timeline-spin {
  to { transform: rotate(360deg); }
}
/* ===== mode=right：轴在右、内容在左 ===== */
:host([data-mode='right']) .row {
  grid-template-columns: 1fr auto;
}
:host([data-mode='right']) .axis {
  grid-column: 2;
}
:host([data-mode='right']) .body {
  grid-column: 1;
}
/* ===== mode=alternate：轴居中、内容左右交替（首项在左，时间在轴外侧由 opposite 插槽承担） ===== */
:host([data-mode='alternate']) .row {
  grid-template-columns: 1fr auto 1fr;
}
:host([data-mode='alternate']) .axis {
  grid-column: 2;
}
:host([data-mode='alternate']:nth-child(odd)) .body {
  grid-column: 1;
  text-align: end;
}
:host([data-mode='alternate']:nth-child(odd)) .opp {
  grid-column: 3;
  grid-row: 1;
}
:host([data-mode='alternate']:nth-child(even)) .body {
  grid-column: 3;
}
:host([data-mode='alternate']:nth-child(even)) .opp {
  grid-column: 1;
  grid-row: 1;
  text-align: end;
}
.opp {
  min-width: 0;
}
/* ===== direction=horizontal：横向时间轴（条目成为行内列，轴横贯） ===== */
:host([data-direction='horizontal']) {
  flex: 1 1 0;
  min-width: 0;
}
:host([data-direction='horizontal']) .row {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  height: 100%;
  padding-bottom: 0;
  padding-right: var(--oas-space-5);
}
:host([data-direction='horizontal']) .axis {
  width: auto;
  height: var(--oas-timeline-dot-size, 10px);
  flex: none;
}
:host([data-direction='horizontal']) .dot {
  top: 0;
  left: 0;
}
/* 横向 icon/自定义节点：中心锚定到轴心（左 半尺寸 / 上 轴高一半） */
:host([data-direction='horizontal']) .dot[data-icon],
:host([data-direction='horizontal']) .dot[data-custom] {
  left: calc(var(--oas-timeline-dot-size, 10px) / 2);
  top: calc(var(--oas-timeline-dot-size, 10px) / 2);
  transform: translate(-50%, -50%);
}
:host([data-direction='horizontal']) .axis::after {
  /* 线中心对齐 dot 中心：dot 高 dot-size(10px) 中心在 5px；线高 2px 需 top=5-1=4px 才使线中心=5=dot中心 */
  top: calc(var(--oas-timeline-dot-size, 10px) / 2 - 1px);
  left: calc(var(--oas-timeline-dot-size, 10px) / 2); /* 从 dot 中心横穿（此前 left:14px 在 dot 右缘外留 4px 左缝） */
  right: calc(-1 * var(--oas-space-5) - 4px); /* 穿过 padding-right + 下一列圆点 left 偏移，横线接下一列圆点无缝 */
  bottom: auto;
  width: auto;
  height: 2px;
}
:host([data-direction='horizontal']:last-child) .axis::after {
  display: none;
}
:host([data-direction='horizontal'][pending]) .axis::after {
  background: transparent;
  border-left: none;
  border-top: 2px dashed var(--oas-color-border);
  height: 0;
}
:host([data-direction='horizontal'][pending]:last-child) .axis::after {
  display: block;
  right: auto;
  width: var(--oas-space-2);
}
/* 横向 mode=right：内容在轴上方 */
:host([data-direction='horizontal'][data-mode='right']) .body {
  order: -1;
}
/* 横向 alternate：内容上下交替（奇数项在轴下方，偶数项在上方） */
:host([data-direction='horizontal'][data-mode='alternate']:nth-child(even)) .body {
  order: -1;
}
`

/** type 语义色枚举（color 旧值仅保留迁移映射，任意色走 --oas-timeline-dot-color） */
const TYPES = new Set(['primary', 'success', 'warning', 'danger', 'info', 'neutral'])
/** color 旧值 → type 迁移映射：green→success、red→danger、gray→neutral */
const LEGACY_COLOR: Record<string, string> = {
  green: 'success',
  red: 'danger',
  gray: 'neutral',
}

export class OASTimelineItem extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'time',
      'type',
      'color',
      'pending',
      'loading',
      'variant',
      'icon',
      'data-mode',
      'data-direction',
    ]
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="row" part="row">
        <div class="opp" part="opposite" hidden><slot name="opposite"></slot></div>
        <div class="axis" part="axis">
          <span class="dot" part="dot" data-type="primary" data-variant="filled">
            <slot name="dot"></slot>
          </span>
        </div>
        <div class="body" part="body">
          <div class="time" part="time" hidden></div>
          <div class="title" part="title" hidden><slot name="title"></slot></div>
          <div class="content" part="content">
            <slot></slot>
            <p class="pending-text" part="pending-text" hidden></p>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    for (const name of ['opposite', 'dot', 'title', '']) {
      this.shadow
        .querySelector<HTMLSlotElement>(name === '' ? 'slot:not([name])' : `slot[name="${name}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    const body = this.shadow.querySelector<HTMLElement>('[part="body"]')
    body?.addEventListener('click', () => {
      this.emit('click', { index: this.rowIndex() })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（row 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="row"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const dot = this.shadow.querySelector<HTMLElement>('[part="dot"]')
    if (!dot) return
    // type 归一化：type 优先；color 旧值映射（迁移兼容）；缺省 primary
    const type = this.getAttr('type', '')
    const legacy = LEGACY_COLOR[this.getAttr('color', '')]
    dot.setAttribute('data-type', TYPES.has(type) ? type : legacy ?? 'primary')
    dot.setAttribute(
      'data-variant',
      this.getAttr('variant', '') === 'outlined' ? 'outlined' : 'filled',
    )

    // icon 属性：oas-icon 替换圆点（slot="dot" 优先于 icon）
    const dotSlot = dot.querySelector<HTMLSlotElement>('slot[name="dot"]')!
    const custom = dotSlot.assignedNodes().some((n) => {
      return n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== ''
    })
    dot.toggleAttribute('data-custom', custom)
    const icon = this.getAttr('icon', '')
    dot.toggleAttribute('data-icon', !custom && icon !== '')
    let iconEl = dot.querySelector('oas-icon')
    if (!custom && icon !== '') {
      if (!iconEl) {
        iconEl = document.createElement('oas-icon')
        dot.appendChild(iconEl)
      }
      iconEl.setAttribute('name', icon)
    } else if (iconEl) {
      iconEl.remove()
    }

    // 时间文本
    const time = this.getAttr('time', '')
    const timeEl = this.shadow.querySelector<HTMLElement>('[part="time"]')
    if (timeEl) {
      timeEl.textContent = time
      timeEl.hidden = time === ''
    }

    // 标题行：slot="title" 有内容时显示
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    if (titleEl && titleSlot) {
      titleEl.hidden = !titleSlot.assignedNodes().some((n) => {
        return n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== ''
      })
    }

    // 对侧内容：alternate 模式下才显示（其余模式隐藏，文档明示）
    const oppEl = this.shadow.querySelector<HTMLElement>('[part="opposite"]')
    const oppSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="opposite"]')
    if (oppEl && oppSlot) {
      const hasOpp = oppSlot.assignedNodes().some((n) => {
        return n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== ''
      })
      oppEl.hidden = !(hasOpp && this.getAttr('data-mode', '') === 'alternate')
    }

    // pending 无内容兜底文案（time 不算是内容）
    const defaultSlot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    const hasContent = defaultSlot
      ? defaultSlot.assignedNodes().some((n) => {
          return n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== ''
        })
      : false
    const hasTitle = titleEl ? !titleEl.hidden : false
    const pendingText = this.shadow.querySelector<HTMLElement>('[part="pending-text"]')
    if (pendingText) {
      const show = this.hasAttr('pending') && !hasContent && !hasTitle
      pendingText.hidden = !show
      if (show) pendingText.textContent = this.t('timeline.pending')
    }

    // loading：内容区 aria-busy
    const contentEl = this.shadow.querySelector<HTMLElement>('[part="content"]')
    if (contentEl) contentEl.setAttribute('aria-busy', String(this.hasAttr('loading')))
  }

  /** 在父时间线中的序号（非时间线子项返回 null） */
  private rowIndex(): number | null {
    const parent = this.parentElement
    if (!parent || parent.tagName.toLowerCase() !== 'oas-timeline') return null
    return Array.prototype.indexOf.call(parent.children, this)
  }
}
