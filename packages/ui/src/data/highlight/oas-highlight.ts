import { OASElement } from '@oas-ui/core'

/**
 * oas-highlight —— 文本命中高亮（data 族，D1）。
 *
 * 纯展示：`text`（原文）+ `highlight`（关键词，空格多词或 JSON 数组）按大小写/整词/重音
 * 三开关计算命中区间，命中片段渲染为 `<mark part="highlight">`（配色走 token，dark 自动适配）。
 * 每次内容重算后派发 `oas-count`（detail `{ count, matches }`：count 为合并后命中片段数、
 * matches 为实际命中的关键词去重列表）。
 *
 * 渲染安全：输出一律走 DOM API（textContent / createElement），零 innerHTML 注入面。
 *
 * 重音折叠：NFD 分解后剥离组合附加符（U+0300–U+036F）。匹配在「折叠串」上进行，
 * 折叠期间维护 码元→原码点 的索引映射，命中区间映射回原文切片——原文保持原样渲染
 * （é 高亮显示 é，不显示折叠后的 e）。
 */

const STYLE = `
:host {
  display: inline;
  color: var(--oas-color-text-primary);
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.root {
  display: inline;
}
mark {
  background: var(--oas-highlight-bg, color-mix(in srgb, var(--oas-preset-gold) 22%, transparent));
  color: var(--oas-highlight-color, var(--oas-color-text-primary));
  border-radius: var(--oas-radius-xs);
}
`

/** 命中片段（原码点索引区间，start 排他 end） */
interface Range {
  start: number
  end: number
}

/** 输出片段：hit=true 渲染为 mark */
interface Segment {
  text: string
  hit: boolean
}

/** 组合附加符（Mn 主区）：NFD 分解后剥离，实现重音折叠 */
const COMBINING_RE = /[\u0300-\u036f]/g

/** 词字符（整词边界判定）：Unicode 字母/数字 + 下划线；汉字属 \p{L}，相邻汉字不算词边界 */
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u

/** 折叠串与「码元 → 原码点」索引映射（命中在折叠串上求出后映射回原文切片） */
interface FoldedText {
  text: string
  map: number[]
}

export class OASHighlight extends OASElement {
  static override get observedAttributes(): string[] {
    return ['text', 'highlight', 'case-sensitive', 'whole-word', 'accent-sensitive']
  }

  private rootEl: HTMLElement | null = null
  /** 上次渲染内容指纹：同内容不重建 DOM、不重复派发 oas-count */
  private lastFingerprint: string | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root"></div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
  }

  /** 真水合：校验 SSR 快照结构（root 容器存在）后接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    const rootEl = this.shadow.querySelector<HTMLElement>('.root')
    if (!rootEl) return false
    this.rootEl = rootEl
    return true
  }

  protected override update(): void {
    if (!this.rootEl) return
    const segments = this.computeSegments()
    // 指纹并入 highlight 原值：渲染片段相同但关键词改写（如大小写变化）时 matches 不陈旧
    const fingerprint =
      this.getAttr('highlight') +
      '\u0003' +
      segments.map((s) => `${s.hit ? '\u0001' : '\u0000'}${s.text}`).join('\u0002')
    if (fingerprint === this.lastFingerprint) return
    this.lastFingerprint = fingerprint
    this.renderSegments(segments)
    // 渲染后派发命中数（count=0 也派发：宿主可据此展示「无结果」态）
    const count = segments.filter((s) => s.hit).length
    const matches = this.collectMatches()
    this.emit('count', { count, matches })
  }

  /** 计算命中区间（原码点索引，已合并重叠）；无命中返回空数组 */
  private computeRanges(points: string[], fold: (s: string) => string, wholeWord: boolean): Range[] {
    const { text: foldedText, map } = OASHighlight.foldWithMap(points, fold)
    const ranges: Range[] = []
    for (const kw of this.parseKeywords()) {
      // 关键词逐码点折叠（与 foldWithMap 同口径）——整串 fold 是上下文相关映射
      // （希腊语尾 sigma 等），与文本逐码点折叠不一致会漏配（review 实测）
      const foldedKw = Array.from(kw)
        .map((c) => fold(c))
        .join('')
      if (foldedKw === '') continue
      let from = 0
      for (;;) {
        const fs = foldedText.indexOf(foldedKw, from)
        if (fs < 0) break
        from = fs + 1
        const ps = map[fs]!
        let pe = map[fs + foldedKw.length - 1]! + 1
        // 字素簇边界：向后吞并紧随的「折叠为空」的组合符（组合符依附前一个基础字符，
        // 不吞会把重音切到 mark 外、原文被拆成两个渲染节点——coder review 实测）
        while (pe < points.length && fold(points[pe]!) === '') pe++
        if (wholeWord) {
          if (ps > 0 && WORD_CHAR_RE.test(points[ps - 1]!)) continue
          if (pe < points.length && WORD_CHAR_RE.test(points[pe]!)) continue
        }
        ranges.push({ start: ps, end: pe })
      }
    }
    if (ranges.length === 0) return []
    // 排序 + 合并重叠/相触区间（mark 不嵌套）
    ranges.sort((a, b) => a.start - b.start || a.end - b.end)
    const merged: Range[] = []
    for (const r of ranges) {
      const last = merged[merged.length - 1]
      if (last && r.start <= last.end) {
        if (r.end > last.end) last.end = r.end
      } else {
        merged.push({ ...r })
      }
    }
    return merged
  }

  /** 计算「原文 → 片段序列」（文本段与命中段交替） */
  private computeSegments(): Segment[] {
    const text = this.getAttr('text')
    if (text === '') return []
    if (this.parseKeywords().length === 0) return [{ text, hit: false }]

    const points = Array.from(text)
    const fold = this.foldFn()
    const merged = this.computeRanges(points, fold, this.hasAttr('whole-word'))
    if (merged.length === 0) return [{ text, hit: false }]

    const segments: Segment[] = []
    let cursor = 0
    for (const r of merged) {
      if (r.start > cursor) segments.push({ text: points.slice(cursor, r.start).join(''), hit: false })
      segments.push({ text: points.slice(r.start, r.end).join(''), hit: true })
      cursor = r.end
    }
    if (cursor < points.length) segments.push({ text: points.slice(cursor).join(''), hit: false })
    return segments
  }

  /** 折叠函数：大小写敏感关 → toLowerCase；重音敏感关 → NFD 去组合符（缺省均折叠） */
  private foldFn(): (s: string) => string {
    const caseSensitive = this.hasAttr('case-sensitive')
    const accentSensitive = this.hasAttr('accent-sensitive')
    return (s: string): string => {
      let r = s
      if (!caseSensitive) {
        r = r.toLowerCase()
        // 希腊语尾 sigma：ς（词尾形）与 σ（常规形）统一为 σ（Unicode 全尺寸折叠的已知特例，
        // toLowerCase 对 ς 不变；两形语义等价，不统一会漏配——review 实测）
        r = r.replace(/ς/g, 'σ')
      }
      if (!accentSensitive) r = r.normalize('NFD').replace(COMBINING_RE, '')
      return r
    }
  }

  /** 逐码点折叠并构建「折叠码元 → 原码点」映射（同一原码点可展开为多个折叠字符） */
  private static foldWithMap(points: string[], fold: (s: string) => string): FoldedText {
    const chars: string[] = []
    const map: number[] = []
    points.forEach((ch, i) => {
      for (const fc of fold(ch)) {
        chars.push(fc)
        map.push(i)
      }
    })
    return { text: chars.join(''), map }
  }

  /** 关键词解析：JSON 数组（非法/非数组回退）或空白分隔；过滤空串与非字符串项 */
  private parseKeywords(): string[] {
    const raw = this.getAttr('highlight').trim()
    if (raw === '') return []
    if (raw.startsWith('[')) {
      let parsed: unknown = null
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = null
      }
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      }
    }
    return raw.split(/\s+/).filter((w) => w !== '')
  }

  /** 实际命中的关键词去重列表（保输入顺序，供 oas-count detail.matches） */
  private collectMatches(): string[] {
    const text = this.getAttr('text')
    if (text === '') return []
    const points = Array.from(text)
    const fold = this.foldFn()
    const wholeWord = this.hasAttr('whole-word')
    const { text: foldedText, map } = OASHighlight.foldWithMap(points, fold)
    const words: string[] = []
    for (const kw of this.parseKeywords()) {
      if (words.includes(kw)) continue
      // 逐码点折叠（与 computeRanges 同口径）：整串 NFD 会按 canonical combining class 重排跨码点
      // 组合符（希伯来 niqqud 等），与逐码点折叠的文本错位漏报（确认轮实测 count/matches 分歧）
      const foldedKw = Array.from(kw)
        .map((c) => fold(c))
        .join('')
      if (foldedKw === '') continue
      if (OASHighlight.hasHit(foldedText, map, points, foldedKw, wholeWord, fold)) words.push(kw)
    }
    return words
  }

  /** 单关键词命中判定（与 computeRanges 同折叠/整词口径；仅用于 matches 列表） */
  private static hasHit(
    foldedText: string,
    map: number[],
    points: string[],
    foldedKw: string,
    wholeWord: boolean,
    fold: (s: string) => string,
  ): boolean {
    let from = 0
    for (;;) {
      const fs = foldedText.indexOf(foldedKw, from)
      if (fs < 0) return false
      const ps = map[fs]!
      // 与 computeRanges 同口径：pe 向后吞并折叠为空的组合符（否则 count/matches 与实际高亮分歧）
      let pe = map[fs + foldedKw.length - 1]! + 1
      while (pe < points.length && fold(points[pe]!) === '') pe++
      if (!wholeWord) return true
      const prevOk = ps === 0 || !WORD_CHAR_RE.test(points[ps - 1]!)
      const nextOk = pe >= points.length || !WORD_CHAR_RE.test(points[pe]!)
      if (prevOk && nextOk) return true
      from = fs + 1
    }
  }

  /** 片段序列 → DOM（文本节点 + mark；纯 DOM API，零注入面） */
  private renderSegments(segments: Segment[]): void {
    const rootEl = this.rootEl
    if (!rootEl) return
    rootEl.textContent = ''
    for (const seg of segments) {
      if (seg.text === '') continue
      if (seg.hit) {
        const mark = document.createElement('mark')
        mark.setAttribute('part', 'highlight')
        mark.textContent = seg.text
        rootEl.appendChild(mark)
      } else {
        rootEl.appendChild(document.createTextNode(seg.text))
      }
    }
  }
}
