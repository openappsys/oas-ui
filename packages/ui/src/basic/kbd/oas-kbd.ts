import { OASElement } from '@oas-ui/core'

export type KbdVariant = 'raised' | 'outline' | 'subtle' | 'plain'
export type KbdSize = 'small' | 'medium' | 'large'

const VALID_VARIANTS = ['raised', 'outline', 'subtle', 'plain'] as const
const VALID_SIZES = ['small', 'medium', 'large'] as const

/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；统一协议见 ui-spec §4.1） */
export type KbdPresetColor =
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

export const KBD_PRESET_COLORS: readonly KbdPresetColor[] = [
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

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(`[oas-kbd] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
}

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
kbd {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  background: var(--oas-kbd-bg, var(--oas-color-bg-hover));
  border: 1px solid var(--oas-kbd-border, var(--oas-color-border-strong));
  border-radius: var(--oas-radius-sm);
  /* 细边框 + 内阴影（键帽底缘） */
  box-shadow: inset 0 -2px 0 var(--oas-color-border);
  color: var(--oas-kbd-text, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
}
/* variant 形态：raised 为默认（现状样式） */
kbd.outline {
  background: transparent;
  box-shadow: none;
}
kbd.subtle {
  background: var(--oas-kbd-bg, var(--oas-color-bg-hover));
  border-color: transparent;
  box-shadow: none;
}
kbd.plain {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  padding: 0 var(--oas-space-1);
}
/* size 档位（medium 为现状零回归） */
kbd.small {
  padding: 0 var(--oas-space-1);
  font-size: 10px;
}
kbd.large {
  padding: var(--oas-space-2) var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
}
kbd .keys[hidden] {
  display: none;
}
kbd .key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  padding: 0 var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  box-shadow: inset 0 -1px 0 var(--oas-color-border);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
kbd .sep {
  color: var(--oas-color-text-secondary);
}
/* color 统一协议：预设名/任意色值注入 --oas-kbd-color（键帽底色染 12% 浅底 + 描边），
   文字色预设走 -text 达标 token（--oas-kbd-text）、自定义色值用本色（责任在宿主）。
   has-color 时键帽底缘阴影也跟随弱化 */
kbd.has-color {
  background: color-mix(in srgb, var(--oas-kbd-color) 12%, transparent);
  border-color: var(--oas-kbd-color);
  color: var(--oas-kbd-text, var(--oas-kbd-color));
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--oas-kbd-color) 30%, transparent);
}
kbd.has-color .key {
  background: color-mix(in srgb, var(--oas-kbd-color) 18%, var(--oas-color-bg));
  border-color: color-mix(in srgb, var(--oas-kbd-color) 40%, var(--oas-color-border));
}
`

export class OASKbd extends OASElement {
  static override get observedAttributes(): string[] {
    return ['keys', 'variant', 'size', 'color']
  }

  private kbdEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private keysEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <kbd part="kbd" role="text">
        <slot></slot>
        <span class="keys" part="keys"></span>
      </kbd>
    `
  }

  /** 缓存节点引用 + 绑定 slotchange（render 与水合路径共用）；监听注册 onCleanup 防断开泄漏 */
  private bind(): void {
    this.kbdEl = this.shadow.querySelector<HTMLElement>('[part="kbd"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot')
    this.keysEl = this.shadow.querySelector<HTMLElement>('.keys')
    const onSlotChange = () => this.update()
    this.slotEl?.addEventListener('slotchange', onSlotChange)
    this.onCleanup(() => this.slotEl?.removeEventListener('slotchange', onSlotChange))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（键帽容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="kbd"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const kbd = this.kbdEl
    if (!kbd || !this.keysEl) return

    // variant 形态（非法值回落 raised + 告警）
    let variant: KbdVariant = 'raised'
    const rawVariant = this.getAttr('variant', '')
    if (rawVariant) {
      if ((VALID_VARIANTS as readonly string[]).includes(rawVariant)) {
        variant = rawVariant as KbdVariant
      } else {
        warnOnce('variant', rawVariant, 'raised', VALID_VARIANTS)
      }
    }

    // size 档位（非法值回落 medium + 告警）
    let size: KbdSize = 'medium'
    const rawSize = this.getAttr('size', '')
    if (rawSize) {
      if ((VALID_SIZES as readonly string[]).includes(rawSize)) {
        size = rawSize as KbdSize
      } else {
        warnOnce('size', rawSize, 'medium', VALID_SIZES)
      }
    }

    // className 整体赋值（非 toggle 逐个）——toggle(false) 会留空 class 属性残留进 SSR 快照
    const classes = [variant !== 'raised' ? variant : '', size !== 'medium' ? size : '']
      .filter(Boolean)
      .join(' ')
    if (classes) kbd.className = classes
    else kbd.removeAttribute('class')

    // color 统一协议：预设名映射 --oas-preset-* token（键帽底色）+ --oas-preset-*-text（文字达标色）；
    // 任意 CSS 色值直注入本色（文字对比度责任在宿主）；移除后回落默认
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (KBD_PRESET_COLORS as readonly string[]).includes(color)
      kbd.style.setProperty('--oas-kbd-color', isPreset ? `var(--oas-preset-${color})` : color)
      kbd.style.setProperty('--oas-kbd-text', isPreset ? `var(--oas-preset-${color}-text)` : color)
      kbd.classList.add('has-color')
    } else {
      kbd.style.removeProperty('--oas-kbd-color')
      kbd.style.removeProperty('--oas-kbd-text')
      // 只在当前有才 remove——happy-dom 对 remove 不存在的 class 也会留空 class 属性残留进 SSR 快照
      if (kbd.classList.contains('has-color')) kbd.classList.remove('has-color')
    }

    const hasSlot = (this.slotEl?.assignedNodes().length ?? 0) > 0
    this.keysEl.hidden = hasSlot
    if (hasSlot) return

    // 按空格拆分渲染多块 + 加号连接；空 keys 渲染单空块
    const keys = this.getAttr('keys', '').split(/\s+/).filter(Boolean)
    const list = keys.length > 0 ? keys : ['']
    this.keysEl.replaceChildren()
    list.forEach((key, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.setAttribute('part', 'sep')
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = '+'
        this.keysEl!.appendChild(sep)
      }
      const cap = document.createElement('kbd')
      cap.className = 'key'
      cap.setAttribute('part', 'key')
      cap.textContent = key
      this.keysEl!.appendChild(cap)
    })
  }
}
