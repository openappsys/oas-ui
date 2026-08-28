import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  position: relative;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* 内容铺满容器（absolute inset 0），超宽/超高裁切保持比例 */
.content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
`

/** 非法/缺省 ratio 的回退值 */
const FALLBACK_RATIO = '1 / 1'

/** 预定义 ratio token：名字映射常用比例（token 名优先于分式/小数语法匹配） */
const RATIO_TOKENS: Record<string, string> = {
  square: '1 / 1',
  landscape: '4 / 3',
  portrait: '3 / 4',
  wide: '16 / 9',
  ultrawide: '21 / 9',
  golden: '1.618 / 1',
}

const warnedInvalidRatio = new Set<string>()

/** 非法 ratio 告警：console.warn 一次（同值去重，对齐库内惯例），值本身走调用处的回落 */
function warnInvalidRatio(value: string): void {
  if (warnedInvalidRatio.has(value)) return
  warnedInvalidRatio.add(value)
  console.warn(
    `[oas-aspect-ratio] 非法 ratio "${value}"，已回落 1 / 1；` +
      '合法值：square/landscape/portrait/wide/ultrawide/golden、分式（16/9、4:3）、小数（1.5）',
  )
}

/**
 * oas-aspect-ratio —— 等比容器（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `ratio`：宽高比，支持预定义名 `square` / `landscape` / `portrait` / `wide` /
 *   `ultrawide` / `golden`，或分式 `16/9`、`4:3`、`16 / 9`、小数 `1.5`；
 *   亦可用 number property 赋值（`el.ratio = 1.5`，反射到属性统一解析）。
 *   缺失/非法（含 0 分子或分母）回退 `1 / 1`，非法值 dev 告警一次（同值去重）
 *
 * 实现：宿主 inline `aspect-ratio`（width 100% 由 :host 样式保证），
 * 高度由比例推导；内容 slot 经 absolute inset 0 铺满。无子内容时
 * 宿主仍按比例占位（aspect-ratio 独立于内容存在）。
 */
export class OASAspectRatio extends OASElement {
  static override get observedAttributes(): string[] {
    return ['ratio']
  }

  /** Vue/React 走 property 赋值（number 类型）时反射到 attribute，统一解析链路 */
  get ratio(): string {
    return this.getAttr('ratio', '')
  }
  set ratio(value: string | number) {
    this.setAttribute('ratio', String(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="content" part="content"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；aspect-ratio 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（内容容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="content"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.style.aspectRatio = this.resolveRatio()
  }

  private resolveRatio(): string {
    const raw = this.getAttr('ratio', '').trim()
    if (!raw) return FALLBACK_RATIO

    const resolved = this.parseRatio(raw)
    if (resolved) return resolved

    warnInvalidRatio(raw)
    return FALLBACK_RATIO
  }

  /** token 名优先匹配，其次分式（16/9、4:3、16 / 9），最后小数（1.5）；无法解析返回 null */
  private parseRatio(raw: string): string | null {
    const token = RATIO_TOKENS[raw]
    if (token) return token

    // 分式形式：16/9、4:3、16 / 9（分子分母均为正数）
    const frac = raw.match(/^(\d*\.?\d+)\s*[/:]\s*(\d*\.?\d+)$/)
    if (frac) {
      const w = Number(frac[1])
      const h = Number(frac[2])
      if (w > 0 && h > 0) return `${w} / ${h}`
      return null
    }

    // 小数形式：1.5 → 1.5 / 1（与分式归一化一致）
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return `${n} / 1`
    return null
  }
}
