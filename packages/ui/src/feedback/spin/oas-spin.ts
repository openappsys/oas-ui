import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.indicator {
  display: inline-block;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  border: 3px solid var(--oas-color-bg-hover);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-spin-rotate 0.8s linear infinite;
}
/* 五档尺寸：xs/small/medium/large/xl；旧缩写 sm/md/lg 保留别名兼容（CSS 两组选择器并存） */
.indicator[data-size='xs'] { width: var(--oas-control-height-xs); height: var(--oas-control-height-xs); border-width: 2px; margin: -10px 0 0 -10px; }
.indicator[data-size='sm'],
.indicator[data-size='small'] { width: var(--oas-control-height-sm); height: var(--oas-control-height-sm); border-width: 2px; margin: -12px 0 0 -12px; }
.indicator[data-size='md'],
.indicator[data-size='medium'] { margin: -16px 0 0 -16px; }
.indicator[data-size='lg'],
.indicator[data-size='large'] { width: var(--oas-control-height-lg); height: var(--oas-control-height-lg); margin: -20px 0 0 -20px; }
.indicator[data-size='xl'] { width: var(--oas-control-height-xl); height: var(--oas-control-height-xl); margin: -24px 0 0 -24px; }
.wrap {
  position: relative;
  display: inline-block;
}
.wrap > .indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
}
.mask {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--oas-color-bg) 70%, transparent);
  display: none;
}
.wrap.spinning .mask {
  display: block;
}
.wrap.empty > .indicator {
  position: static;
  margin: 0;
}
.wrap > .indicator {
  display: none;
}
.wrap.spinning > .indicator,
.wrap.empty > .indicator {
  display: inline-block;
}
@keyframes oas-spin-rotate {
  to { transform: rotate(360deg); }
}
`

/** 五档 + 旧缩写别名统一归一化为全拼（sm→small、md→medium、lg→large），非法值回落 medium */
const SPIN_SIZE_ALIASES: Record<string, string> = {
  xs: 'xs',
  sm: 'small',
  small: 'small',
  md: 'medium',
  medium: 'medium',
  lg: 'large',
  large: 'large',
  xl: 'xl',
}

function normalizeSpinSize(raw: string): string {
  return SPIN_SIZE_ALIASES[raw] ?? SPIN_SIZE_ALIASES.medium!
}

export class OASSpin extends OASElement {
  static override get observedAttributes(): string[] {
    return ['size', 'spinning']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap">
        <div class="mask" part="mask"></div>
        <slot></slot>
        <span class="indicator" part="indicator" data-size="${normalizeSpinSize(this.getAttr('size', 'md'))}" role="status"></span>
      </div>
    `
  }

  /** 无事件绑定（render 与水合路径共用，结构校验由 hydrate 完成） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（wrap 容器与 indicator 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="wrap"]')) return false
    if (!this.shadow.querySelector('[part="indicator"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const spinning = this.hasAttr('spinning')
    this.setAttribute('aria-busy', String(spinning))
    const wrap = this.shadow.querySelector('[part="wrap"]')
    if (wrap) {
      wrap.classList.toggle('spinning', spinning)
      const hasContent = (
        this.shadow.querySelector('slot') as HTMLSlotElement | null
      )?.assignedNodes().length
        ? true
        : false
      wrap.classList.toggle('empty', !hasContent)
    }
    this.shadow
      .querySelector('[part="indicator"]')
      ?.setAttribute('data-size', normalizeSpinSize(this.getAttr('size', 'md')))
  }
}
