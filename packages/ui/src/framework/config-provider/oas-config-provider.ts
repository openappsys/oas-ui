import { OASElement, notifyConfigProviders } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
}
`

const warnedDirection = new Set<string>()
const warnedZIndex = new Set<string>()
const warnedConfig = new Set<string>()

/**
 * `<oas-config-provider locale size theme config direction z-index disabled>` —— 全局配置注入入口。
 *
 * - locale：包裹子树就近优先（组件 t() 先查最近 config-provider 的 locale 对应翻译器）
 * - size：包裹组件的 size 未显式设置时走注入值（OASElement.injectValue）
 * - theme：设置 data-theme 到自身，子树（含 Shadow DOM）继承对应主题 token
 * - config：组件级默认配置 JSON 通道（`{"oas-button":{"variant":"outlined"}}`），
 *   组件经 core `readConfigValue(el, tag, key)` 就近读取；顶层键 `disabledExempt`（tag 数组）
 *   用于整类豁免全局禁用；非法 JSON 忽略 + dev 告警（同值去重）
 * - direction：全局方向注入（ltr/rtl），设置时写入宿主 `dir` 属性（CSS direction
 *   继承穿透 light/shadow 子树）；组件可经 `injectValue('direction')` 消费；非法值回落 ltr + dev 告警
 * - z-index：浮层全局起始值，设置时在宿主写 `--oas-z-index-base`（CSS 变量穿透 shadow，
 *   浮层组件 `calc(var(--oas-z-index-base, 0) + var(--oas-z-X, <层默认值>))` 消费——
 *   各层在起始值上按层默认值偏移叠加，层间顺序保持）；非法值（非正整数）忽略 + dev 告警
 * - disabled：全局禁用注入——子树内表单族控件（button/input/select/checkbox 等已接入
 *   `injectDisabled()` 的组件）无显式 disabled 属性时继承禁用；组件级逃逸用 `disabled-skip`
 *   属性，整类逃逸用 config JSON 的 `disabledExempt`（如 `{"disabledExempt":["oas-link"]}`）
 *
 * 属性变化时通过 notifyConfigProviders() 通知已订阅的包裹组件重刷 update()。
 */
export class OASConfigProvider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['locale', 'size', 'theme', 'config', 'direction', 'z-index', 'disabled']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板（上下文注入容器，无自身视觉，仅包裹子树） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  /** 真水合：slot 骨架存在即接管（无事件绑定，update 处理 data-theme/dir/--oas-z-index-base 与通知） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('slot') !== null
  }

  protected override update(): void {
    const theme = this.getAttr('theme')
    if (theme) {
      this.dataset.theme = theme
    } else {
      delete this.dataset.theme
    }

    // direction：合法值写入宿主 dir 属性；非法值回落 ltr + dev 告警（同值去重）；
    // 空值（属性移除）删除 dir，交还祖先/文档方向
    const direction = this.getAttr('direction', '')
    if (direction === 'rtl' || direction === 'ltr') {
      this.setAttribute('dir', direction)
    } else if (direction !== '') {
      this.setAttribute('dir', 'ltr')
      if (!warnedDirection.has(direction)) {
        warnedDirection.add(direction)
        console.warn(
          `[oas-config-provider] 非法 direction "${direction}"，已回落 ltr；合法值：ltr/rtl`,
        )
      }
    } else {
      this.removeAttribute('dir')
    }

    // z-index：合法正整数写 --oas-z-index-base（浮层起始值）；非法值忽略（不写入） + dev 告警（同值去重）
    const z = this.getAttr('z-index', '')
    if (z !== '') {
      const n = Number(z)
      if (Number.isInteger(n) && n > 0) {
        this.style.setProperty('--oas-z-index-base', String(n))
      } else {
        this.style.removeProperty('--oas-z-index-base')
        if (!warnedZIndex.has(z)) {
          warnedZIndex.add(z)
          console.warn(
            `[oas-config-provider] 非法 z-index "${z}"，已忽略；合法值：正整数`,
          )
        }
      }
    } else {
      this.style.removeProperty('--oas-z-index-base')
    }

    // config：非法 JSON / 非对象忽略 + dev 告警（同值去重）；合法值由 core readConfigValue 读取
    const config = this.getAttr('config', '')
    if (config !== '') {
      try {
        const v = JSON.parse(config) as unknown
        if (v === null || typeof v !== 'object' || Array.isArray(v)) {
          throw new Error('config 需为 JSON 对象')
        }
      } catch {
        if (!warnedConfig.has(config)) {
          warnedConfig.add(config)
          console.warn(`[oas-config-provider] 非法 config JSON，已忽略：${config}`)
        }
      }
    }

    // 通知包裹组件：locale/size/theme/config/direction/z-index 变化时重刷
    notifyConfigProviders(this)
  }
}
