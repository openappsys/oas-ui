import { OASElement } from '@oas-ui/core'

export type DividerDirection = 'horizontal' | 'vertical'
/** 内容位置：水平布局 left/center/right，垂直布局 top/center/bottom（跨方向使用非法词会回落 center 并告警） */
export type DividerPosition = 'left' | 'center' | 'right' | 'top' | 'bottom'
export type DividerVariant = 'solid' | 'dashed' | 'dotted' | 'double'
export type DividerSize = 'small' | 'medium' | 'large'

/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；统一协议见 ui-spec §4.1） */
export type DividerPresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const DIVIDER_PRESET_COLORS: readonly DividerPresetColor[] = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
]

const VALID_VARIANTS = ['solid', 'dashed', 'dotted', 'double'] as const
const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_HORIZONTAL_POSITIONS = ['left', 'center', 'right'] as const
const VALID_VERTICAL_POSITIONS = ['top', 'center', 'bottom'] as const
const VALID_TEXT_ORIENTATIONS = ['horizontal', 'vertical'] as const

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(
    `[oas-divider] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`,
  )
}

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
}
:host([direction='vertical']) {
  display: inline-block;
  width: auto;
  vertical-align: middle;
  /* flex/grid 容器语境：撑满容器交叉轴高度（确定高度，打破 host 高度由内容撑 →
     .divider height:100% → 线段分配的循环依赖） */
  align-self: stretch;
}
/* vertical 行内语境：高度 = 1em 文字行高（min-height 兜底）；有内容（文字在两线段间）时由内容撑高。
   flex/grid 容器语境：容器默认 align-items:stretch 拉伸 host，.divider height:100% 跟随。
   内容包 .content 层（span 包裹 slot）：纯文本直接成 flex 子项时（slot display:contents），
   伪元素线段的 flex:1 高度分配失效（线段 height 0 不显示）；包 span 后成为确定 flex item，分配可靠。
   基础布局用 column flex（线段 flex:1 分配、top/bottom 用 flex-basis % 相对高度对齐）；
   仅 inset/middle 切换 grid 行模板——flex 只有 3 个子项（线段/内容/线段），无法表达
   "留空+线段+内容+线段+留空" 五段结构，grid 行 % 相对容器高度（margin % 相对宽度不适用垂直） */
:host([direction='vertical']) .divider {
  flex-direction: column;
  /* 容器宽度由内容（文字）撑，线段宽度单独控制在 ::before/::after——
     容器不设线宽（否则文字被压成竖排） */
  height: 100%;
  min-height: 1em;
  margin: 0 var(--oas-space-3);
  align-items: center;
}
:host([direction='vertical']) .divider::before,
:host([direction='vertical']) .divider::after {
  flex: 1 1 0;
  width: var(--oas-divider-width, 1px);
  /* 覆盖基础 height:1px：grid（inset/middle）模式 align-self 默认 stretch 需 height:auto 才能
     撑满线段行（否则竖线缩成 1px×1px 点不显示）；flex 模式由 flex-basis:0 接管主轴高度 */
  height: auto;
  min-height: 0;
  background: var(--oas-divider-color, var(--oas-color-border-strong));
}
/* vertical 内容对齐：top 贴顶（before 线段缩为 title-inset，内容被推向顶部）、bottom 贴底（after 线段缩短）；
   flex-basis % 相对容器高度，与水平 left/right 同机制（线短一侧内容贴向），仅 vertical 生效 */
:host([direction='vertical']) .divider.top::before {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
:host([direction='vertical']) .divider.bottom::after {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
/* vertical 缩进留空：inset 顶部留空 / middle 上下留空——切换 grid 行模板，首/末空白行 % 相对容器高度
   （与水平同变量 --oas-divider-title-inset / --oas-divider-middle-inset）。线段显式 grid-row 定位
   到 1fr 行（空白行挤占首/末位），align-self 默认 stretch + height:auto 撑满线段行。
   inset/middle 组合 top/bottom 时以 inset/middle 的空白行为准（后者源序靠后覆盖） */
:host([direction='vertical']) .divider.inset,
:host([direction='vertical']) .divider.middle {
  display: grid;
  justify-items: center;
  /* 覆盖通用 .divider 的 align-items:center（grid 下会把线段块轴居中 → auto 高度 0 不显示），
     stretch 让线段撑满 1fr 行；水平居中由 justify-items:center 承担 */
  align-items: stretch;
}
:host([direction='vertical']) .divider.inset {
  grid-template-rows: var(--oas-divider-title-inset, 5%) 1fr auto 1fr;
}
:host([direction='vertical']) .divider.inset::before {
  grid-row: 2;
}
:host([direction='vertical']) .divider.inset .content {
  grid-row: 3;
}
:host([direction='vertical']) .divider.inset::after {
  grid-row: 4;
}
:host([direction='vertical']) .divider.middle {
  grid-template-rows: var(--oas-divider-middle-inset, 16.67%) 1fr auto 1fr var(--oas-divider-middle-inset, 16.67%);
}
:host([direction='vertical']) .divider.middle::before {
  grid-row: 2;
}
:host([direction='vertical']) .divider.middle .content {
  grid-row: 3;
}
:host([direction='vertical']) .divider.middle::after {
  grid-row: 4;
}
.divider {
  display: flex;
  align-items: center;
  margin: var(--oas-divider-spacing, var(--oas-space-4)) 0;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  gap: var(--oas-space-3);
}
/* 内容包裹层：承载 slot 投影的文字/内容，作为确定的 flex 子项（替代 slot display:contents
   直接暴露文本节点，保证线段在 vertical/horizontal 下的 flex 空间分配可靠） */
.divider .content {
  display: block;
}
/* text-orientation=vertical：垂直分割线里文字竖排（跟随竖线方向，从上到下，中文竖排习惯） */
:host([direction='vertical']) .divider.text-vertical .content {
  writing-mode: vertical-rl;
}
.divider.empty {
  gap: 0;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: var(--oas-divider-width, 1px);
  background: var(--oas-divider-color, var(--oas-color-border-strong));
}
.divider.left::before {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
.divider.right::after {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
/* 线型：dashed/dotted 用 repeating-linear-gradient（渐变线不受 height 约束），double 靠双层高度 */
.divider.dashed::before,
.divider.dashed::after {
  background: repeating-linear-gradient(
    to right,
    var(--oas-divider-color, var(--oas-color-border-strong)) 0,
    var(--oas-divider-color, var(--oas-color-border-strong)) 4px,
    transparent 4px,
    transparent 8px
  );
}
.divider.dotted::before,
.divider.dotted::after {
  background: repeating-linear-gradient(
    to right,
    var(--oas-divider-color, var(--oas-color-border-strong)) 0,
    var(--oas-divider-color, var(--oas-color-border-strong)) 2px,
    transparent 2px,
    transparent 6px
  );
}
.divider.double::before,
.divider.double::after {
  /* 双线 = 上线 + 透明间隙 + 下线（各取线宽，间隙默认 3px 保证 1x 屏肉眼可辨） */
  height: calc(2 * var(--oas-divider-width, 1px) + var(--oas-divider-double-gap, 3px));
  border-top: var(--oas-divider-width, 1px) solid var(--oas-divider-color, var(--oas-color-border-strong));
  border-bottom: var(--oas-divider-width, 1px) solid var(--oas-divider-color, var(--oas-color-border-strong));
  background: transparent;
}
/* 缩进：inset 起始侧留空 / middle 两侧留空——线段外推留空（margin），线本身 flex:1 贯通。
   仅水平布局生效（同 size 惯例）；宽度走变量开口。垂直缩进不走 margin（margin % 相对宽度不适用），
   由上方 grid 行模板的空白行实现（行 % 相对容器高度） */
:host(:not([direction='vertical'])) .divider.inset::before {
  margin-left: var(--oas-divider-title-inset, 5%);
}
:host(:not([direction='vertical'])) .divider.middle::before {
  margin-left: var(--oas-divider-middle-inset, 16.67%);
}
:host(:not([direction='vertical'])) .divider.middle::after {
  margin-right: var(--oas-divider-middle-inset, 16.67%);
}
/* size 间距档（仅水平布局生效；vertical 分支 margin 固定） */
.divider.small {
  margin: var(--oas-divider-spacing, var(--oas-space-2)) 0;
}
.divider.large {
  margin: var(--oas-divider-spacing, var(--oas-space-6)) 0;
}
/* strong 强调文字：标题体观感（600 字重） */
.divider.strong {
  font-weight: 600;
}
`

export class OASDivider extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'direction',
      'dashed',
      'content-position',
      'text-orientation',
      'variant',
      'inset',
      'middle',
      'size',
      'strong',
      'color',
    ]
  }

  private dividerEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="divider" part="divider" role="separator">
        <span class="content" part="content"><slot></slot></span>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.dividerEl = this.shadow.querySelector('.divider')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 .divider 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.divider')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const el = this.dividerEl
    if (!el) return
    const direction = this.getAttr('direction', 'horizontal') as DividerDirection
    // content-position 按方向分流：水平 left/center/right，垂直 top/center/bottom；
    // 跨方向词（horizontal+top、vertical+left 等）回落 center 并告警
    let position: DividerPosition = 'center'
    const rawPosition = this.getAttr('content-position', '')
    const validPositions = direction === 'vertical' ? VALID_VERTICAL_POSITIONS : VALID_HORIZONTAL_POSITIONS
    if (rawPosition) {
      if ((validPositions as readonly string[]).includes(rawPosition)) {
        position = rawPosition as DividerPosition
      } else {
        warnOnce('content-position', rawPosition, 'center', validPositions)
      }
    }

    // 线型：显式 variant 优先；否则 dashed 布尔兼容映射；默认 solid
    let variant: DividerVariant = 'solid'
    const rawVariant = this.getAttr('variant', '')
    if (rawVariant) {
      if ((VALID_VARIANTS as readonly string[]).includes(rawVariant)) {
        variant = rawVariant as DividerVariant
      } else {
        warnOnce('variant', rawVariant, 'solid', VALID_VARIANTS)
      }
    } else if (this.hasAttr('dashed')) {
      variant = 'dashed'
    }

    // size 间距档（仅水平布局生效）
    let size: DividerSize = 'medium'
    const rawSize = this.getAttr('size', '')
    if (direction === 'horizontal' && rawSize) {
      if ((VALID_SIZES as readonly string[]).includes(rawSize)) {
        size = rawSize as DividerSize
      } else {
        warnOnce('size', rawSize, 'medium', VALID_SIZES)
      }
    }

    el.classList.toggle('dashed', variant === 'dashed')
    el.classList.toggle('dotted', variant === 'dotted')
    el.classList.toggle('double', variant === 'double')
    el.classList.toggle('left', position === 'left')
    el.classList.toggle('right', position === 'right')
    el.classList.toggle('top', position === 'top')
    el.classList.toggle('bottom', position === 'bottom')
    el.classList.toggle('inset', this.hasAttr('inset'))
    el.classList.toggle('middle', this.hasAttr('middle'))
    el.classList.toggle('small', size === 'small')
    el.classList.toggle('large', size === 'large')
    el.classList.toggle('strong', this.hasAttr('strong'))
    // text-orientation：仅 vertical 分割线有意义（水平分割线忽略）。vertical 值 → 文字竖排
    let textVertical = false
    const rawTextOrientation = this.getAttr('text-orientation', '')
    if (rawTextOrientation) {
      if (rawTextOrientation === 'vertical' || rawTextOrientation === 'horizontal') {
        textVertical = rawTextOrientation === 'vertical'
      } else {
        warnOnce('text-orientation', rawTextOrientation, 'horizontal', VALID_TEXT_ORIENTATIONS)
      }
    }
    el.classList.toggle('text-vertical', direction === 'vertical' && textVertical)
    // color 统一协议：预设名解析 --oas-preset-* token；任意 CSS 色值直注入（优先即胜）；缺省清空回落边框 token
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (DIVIDER_PRESET_COLORS as readonly string[]).includes(color)
      el.style.setProperty('--oas-divider-color', isPreset ? `var(--oas-preset-${color})` : color)
    } else {
      el.style.removeProperty('--oas-divider-color')
    }
    el.setAttribute('aria-orientation', direction)
    const slot = el.querySelector('slot') as HTMLSlotElement | null
    el.classList.toggle('empty', !slot?.assignedNodes().length)
  }
}
