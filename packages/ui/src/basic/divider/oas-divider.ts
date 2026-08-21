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
}
/* vertical 行内语境：高度 = 1em 文字行高（min-height 兜底）；有内容（文字在两线段间）时由内容撑高。
   flex/grid 容器语境：容器默认 align-items:stretch 拉伸 host，.divider height:100% 跟随——
   两语境都成立，无需 JS 探测容器。 */
:host([direction='vertical']) .divider {
  flex-direction: column;
  width: var(--oas-divider-width, 1px);
  height: 100%;
  min-height: 1em;
  margin: 0 var(--oas-space-3);
  align-items: stretch;
}
:host([direction='vertical']) .divider::before,
:host([direction='vertical']) .divider::after {
  flex: 1;
  width: var(--oas-divider-width, 1px);
  height: auto;
  background: var(--oas-divider-color, var(--oas-color-border-strong));
}
/* vertical 内容对齐：top 贴顶（before 线段缩为 title-inset，内容被推到顶部）、bottom 贴底（after 线段缩短）；
   与水平 left/right 同机制（线短一侧内容贴向），仅 vertical 生效 */
:host([direction='vertical']) .divider.top::before {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
:host([direction='vertical']) .divider.bottom::after {
  flex: 0 0 var(--oas-divider-title-inset, 5%);
}
.divider {
  display: flex;
  align-items: center;
  margin: var(--oas-divider-spacing, var(--oas-space-4)) 0;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  gap: var(--oas-space-3);
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
   仅水平布局生效（同 size 惯例）；宽度走变量开口。 */
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
/* strong 强调文字：对齐主流库默认标题体观感（600 字重） */
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
        <slot></slot>
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
