import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASHighlight } from './index.js'

/**
 * oas-highlight（D1，data 族）—— 文本命中高亮。
 *
 * 设计前必答清单（AGENTS.md 六问）：
 * 1. 取消路径：纯展示组件，无用户操作；属性变化即重算，无浮层/计时器/监听器（零孤儿产物）。
 * 2. 属性默认值：`text` 缺省 ''（渲染空）；`highlight` 缺省 ''（零高亮）；三个开关布尔在场语义，
 *    缺省均「不敏感」（大小写敏感关 / 整词关 / 重音敏感关，重音折叠走 NFD 去组合符）。
 * 3. 多步交互失败点：highlight JSON 数组解析失败 → 回退按空白分隔拆词；空关键词 → 零高亮；
 *    oas-count 在内容重算后派发（count=0 也派发），同内容指纹不变不重复派发（含水合首帧不重复）。
 * 4. 破坏性选项：无破坏性操作。
 * 5. 键盘/ARIA：纯展示不可聚焦；输出保持原文顺序（文本节点与 mark 交替），读屏按自然顺序阅读；
 *    mark 不改变语义结构，无 aria 状态需同步。
 * 6. 受控/非受控：纯属性驱动展示（声明式单通道），无内部状态；宿主框架桥接为普通 attribute
 *    读写——`text` / `highlight` 均非 DOM 内建 property（HTMLElement 无此内建），Vue/React 桥接安全。
 *
 * happy-dom 限制：getComputedStyle 不解析 var()/color-mix()——颜色断言锁「样式表含 token 表达式」
 * 的机制形态，真实配色由 e2e（qa-regression/highlight.spec.ts）在浏览器复核。
 */

function mount(attrs: Record<string, string> = {}): OASHighlight {
  const el = new OASHighlight()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

/** shadow 内内容容器 */
function root(el: OASHighlight): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="root"]')!
}

/** 内容序列化为「文本段|命中段」数组（.m = mark）便于断言 */
function segments(el: OASHighlight): Array<{ text: string; hit: boolean }> {
  return Array.from(root(el).childNodes).map((n) =>
    n.nodeType === Node.TEXT_NODE
      ? { text: n.textContent ?? '', hit: false }
      : { text: n.textContent ?? '', hit: true },
  )
}

function marks(el: OASHighlight): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('mark[part="highlight"]'))
}

function styleText(el: OASHighlight): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ---------- 空态 ----------

  it('空态：无 text 渲染空内容，零 mark', () => {
    const el = mount()
    expect(root(el).textContent).toBe('')
    expect(marks(el).length).toBe(0)
  })

  it('空态：有 text 无 highlight → 原文原样渲染，零高亮', () => {
    const el = mount({ text: 'Hello World 你好世界' })
    expect(root(el).textContent).toBe('Hello World 你好世界')
    expect(marks(el).length).toBe(0)
  })

  it('空态：highlight 只有空白 → 拆词后为空 → 零高亮', () => {
    const el = mount({ text: 'Hello World', highlight: '   ' })
    expect(root(el).textContent).toBe('Hello World')
    expect(marks(el).length).toBe(0)
  })

  it('空态：JSON 数组全空串/非字符串项被过滤 → 零高亮', () => {
    const el = mount({ text: 'Hello World', highlight: '["", ""]' })
    expect(marks(el).length).toBe(0)
    const el2 = mount({ text: 'Hello World', highlight: '[1, null]' })
    expect(marks(el2).length).toBe(0)
  })

  // ---------- 基础命中 ----------

  it('单关键词命中：<mark part="highlight"> 渲染，前后文本保持', () => {
    const el = mount({ text: 'the quick brown fox', highlight: 'quick' })
    const segs = segments(el)
    expect(segs).toEqual([
      { text: 'the ', hit: false },
      { text: 'quick', hit: true },
      { text: ' brown fox', hit: false },
    ])
  })

  it('多次命中同一关键词：每处一个 mark', () => {
    const el = mount({ text: 'dog chased dog, dog won', highlight: 'dog' })
    expect(marks(el).length).toBe(3)
    expect(marks(el).every((m) => m.textContent === 'dog')).toBe(true)
  })

  it('多关键词空格分隔：各词独立命中', () => {
    const el = mount({ text: 'alpha beta gamma delta', highlight: 'beta delta' })
    const segs = segments(el)
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(['beta', 'delta'])
    expect(segs.filter((s) => !s.hit).map((s) => s.text)).toEqual(['alpha ', ' gamma '])
    expect(marks(el).length).toBe(2)
  })

  it('highlight 为 JSON 数组：按数组项命中', () => {
    const el = mount({ text: 'alpha beta gamma', highlight: '["alpha","gamma"]' })
    const segs = segments(el)
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(['alpha', 'gamma'])
  })

  it('JSON 非法回退按空白分隔拆词（[alpha 作为普通词不命中，beta 命中）', () => {
    const el = mount({ text: 'alpha beta', highlight: '[alpha beta' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('beta')
  })

  it('多关键词部分重叠区间合并为单个 mark（不嵌套）：abc/cde 在 abcde 上合并', () => {
    const el = mount({ text: 'abcde', highlight: 'abc cde' })
    const segs = segments(el)
    expect(segs).toEqual([{ text: 'abcde', hit: true }])
    expect(marks(el).length).toBe(1)
  })

  it('空格分隔的相邻词命中不相触时保持独立 mark', () => {
    const el = mount({ text: 'foo bar baz', highlight: 'foo bar' })
    const segs = segments(el)
    expect(segs).toEqual([
      { text: 'foo', hit: true },
      { text: ' ', hit: false },
      { text: 'bar', hit: true },
      { text: ' baz', hit: false },
    ])
    expect(marks(el).length).toBe(2)
  })

  it('相邻命中合并（foo+bar 相触）', () => {
    const el = mount({ text: 'xfoobar', highlight: 'foo bar' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('foobar')
  })

  // ---------- 大小写 ----------

  it('大小写默认不敏感：hello 命中 HELLO', () => {
    const el = mount({ text: 'say HELLO world', highlight: 'hello' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('HELLO')
  })

  it('case-sensitive 在场：大小写敏感，不再命中', () => {
    const el = mount({ text: 'say HELLO world', highlight: 'hello', 'case-sensitive': '' })
    expect(marks(el).length).toBe(0)
    const el2 = mount({ text: 'say HELLO world', highlight: 'HELLO', 'case-sensitive': '' })
    expect(marks(el2).length).toBe(1)
  })

  // ---------- 重音（diacritic 折叠） ----------

  it('重音默认不敏感：cafe 命中 café（NFD 折叠）', () => {
    const el = mount({ text: 'un café au lait', highlight: 'cafe' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('café')
  })

  it('重音默认不敏感（反向）：café 命中 cafe', () => {
    const el = mount({ text: 'a cafe on the corner', highlight: 'café' })
    expect(marks(el).length).toBe(1)
  })

  it('accent-sensitive 在场：不再折叠重音，不命中', () => {
    const el = mount({ text: 'un café au lait', highlight: 'cafe', 'accent-sensitive': '' })
    expect(marks(el).length).toBe(0)
    const el2 = mount({ text: 'un café au lait', highlight: 'café', 'accent-sensitive': '' })
    expect(marks(el2).length).toBe(1)
  })

  it('大小写+重音组合折叠：Café 命中 cafe（全不敏感）', () => {
    const el = mount({ text: 'Drink Café now', highlight: 'cafe' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('Café')
  })

  // ---------- 整词 ----------

  it('whole-word 在场：cat 不命中 category，命中独立 cat', () => {
    const el = mount({ text: 'the category has a cat', highlight: 'cat', 'whole-word': '' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('cat')
  })

  it('whole-word 缺省：cat 命中 category 内部', () => {
    const el = mount({ text: 'the category', highlight: 'cat' })
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('cat')
  })

  it('whole-word：标点为边界', () => {
    const el = mount({ text: 'cat, "cat". (cat)', highlight: 'cat', 'whole-word': '' })
    expect(marks(el).length).toBe(3)
  })

  it('whole-word：数字也是词字符（v2 不命中 v2x）', () => {
    const el = mount({ text: 'version v2 and v2x', highlight: 'v2', 'whole-word': '' })
    expect(marks(el).length).toBe(1)
  })

  it('whole-word：CJK 汉字相邻视为词字符（不命中）', () => {
    const el = mount({ text: '搜索内容中包含搜字', highlight: '搜', 'whole-word': '' })
    expect(marks(el).length).toBe(0)
  })

  it('whole-word + 大小写不敏感组合', () => {
    const el = mount({ text: 'Cat catapult CAT', highlight: 'cat', 'whole-word': '' })
    expect(marks(el).length).toBe(2)
    expect(marks(el).map((m) => m.textContent)).toEqual(['Cat', 'CAT'])
  })

  // ---------- oas-count 事件 ----------

  it('oas-count：首次渲染后派发 detail { count, matches }', () => {
    let detail: { count?: number; matches?: string[] } | null = null
    const el = new OASHighlight()
    el.addEventListener('oas-count', (e) => (detail = (e as CustomEvent).detail))
    el.setAttribute('text', 'alpha beta alpha')
    el.setAttribute('highlight', 'alpha')
    document.body.appendChild(el)
    expect(detail).toEqual({ count: 2, matches: ['alpha'] })
  })

  it('oas-count：count=0（无命中）也派发，matches 为空数组', () => {
    let detail: { count?: number; matches?: string[] } | null = null
    const el = new OASHighlight()
    el.addEventListener('oas-count', (e) => (detail = (e as CustomEvent).detail))
    el.setAttribute('text', 'nothing here')
    el.setAttribute('highlight', 'zzz')
    document.body.appendChild(el)
    expect(detail).toEqual({ count: 0, matches: [] })
  })

  it('oas-count：同内容重复 update 不重复派发', () => {
    let calls = 0
    const el = new OASHighlight()
    el.addEventListener('oas-count', () => calls++)
    el.setAttribute('text', 'alpha beta')
    el.setAttribute('highlight', 'alpha')
    document.body.appendChild(el)
    expect(calls).toBe(1)
    el.requestUpdate()
    el.requestUpdate()
    expect(calls).toBe(1)
    // 重设相同值（attributeChangedCallback 仍触发）也不重复派发
    el.setAttribute('text', 'alpha beta')
    expect(calls).toBe(1)
  })

  it('oas-count：属性变化重算后重新派发', () => {
    const details: Array<{ count: number; matches: string[] }> = []
    const el = new OASHighlight()
    el.addEventListener('oas-count', (e) => details.push((e as CustomEvent).detail))
    el.setAttribute('text', 'alpha beta')
    el.setAttribute('highlight', 'alpha')
    document.body.appendChild(el)
    el.setAttribute('highlight', 'beta alpha')
    expect(details).toEqual([
      { count: 1, matches: ['alpha'] },
      { count: 2, matches: ['beta', 'alpha'] },
    ])
  })

  it('oas-count：matches 为命中的关键词去重列表（保输入顺序）', () => {
    let detail: { count?: number; matches?: string[] } | null = null
    const el = new OASHighlight()
    el.addEventListener('oas-count', (e) => (detail = (e as CustomEvent).detail))
    el.setAttribute('text', 'foo bar foo')
    el.setAttribute('highlight', 'bar foo foo')
    document.body.appendChild(el)
    // count = 合并后 mark 片段数（foo×2 + bar×1 = 3，互不相触）；matches = 实际命中过的关键词（去重、保输入顺序）
    expect(detail).toEqual({ count: 3, matches: ['bar', 'foo'] })
  })

  // ---------- 运行时更新 ----------

  it('运行时改 text/highlight 即时重渲染', () => {
    const el = mount({ text: 'alpha beta', highlight: 'alpha' })
    expect(marks(el).length).toBe(1)
    el.setAttribute('text', 'gamma delta')
    expect(marks(el).length).toBe(0)
    expect(root(el).textContent).toBe('gamma delta')
    el.setAttribute('highlight', 'delta')
    expect(marks(el).length).toBe(1)
  })

  it('运行时移除开关属性恢复默认（不敏感）', () => {
    const el = mount({ text: 'HELLO', highlight: 'hello', 'case-sensitive': '' })
    expect(marks(el).length).toBe(0)
    el.removeAttribute('case-sensitive')
    expect(marks(el).length).toBe(1)
  })

  // ---------- 安全（XSS） ----------

  it('text/highlight 含 HTML 时按纯文本渲染（零 innerHTML 注入面）', () => {
    const el = mount({
      text: 'before <img src=x onerror=alert(1)> after',
      highlight: '<img',
    })
    expect(el.shadowRoot!.querySelector('img')).toBeNull()
    expect(root(el).querySelector('img')).toBeNull()
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('<img')
    expect(root(el).textContent).toContain('<img src=x onerror=alert(1)>')
  })

  // ---------- 样式机制（token 配色；真实配色由浏览器 e2e 复核） ----------

  it('mark 配色走 CSS 变量 token（无硬编码色值），dark 随 token 自动适配', () => {
    const el = mount({ text: 'hello world', highlight: 'hello' })
    const css = styleText(el)
    // 高亮底色：预设 gold token 派生（color-mix），可被 --oas-highlight-bg 覆盖
    expect(css).toContain('var(--oas-preset-gold)')
    expect(css).toContain('color-mix')
    expect(css).toContain('--oas-highlight-bg')
    // 文字色与正文色走语义 token
    expect(css).toContain('var(--oas-color-text-primary)')
    expect(css).toContain('--oas-highlight-color')
    // 零硬编码色值（#xxx / rgb( 形态）
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it('结构性样式：host inline 参与行内流 + [hidden] 兜底', () => {
    const el = mount({ text: 'hello', highlight: 'hello' })
    const css = styleText(el)
    expect(css).toContain(':host([hidden])')
    expect(el.shadowRoot!.querySelector('mark')!.getAttribute('part')).toBe('highlight')
  })

  // ---------- DSD 真水合 ----------

  it('DSD 真水合：快照 + 指纹接管（shadow 不重建、指纹移除、结构保持、内容正确）', () => {
    const ref = new OASHighlight()
    ref.setAttribute('text', 'hello brave world')
    ref.setAttribute('highlight', 'brave')
    document.body.appendChild(ref)
    const snapshot = ref.shadowRoot!.innerHTML
    expect(snapshot).toContain('<style>')
    ref.remove()

    const el = new OASHighlight()
    el.setAttribute('text', 'hello brave world')
    el.setAttribute('highlight', 'brave')
    const tag = 'oas-highlight'
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${snapshot}`
    const styleRef = el.shadowRoot!.querySelector('style')
    document.body.appendChild(el)

    // hydrate 接管：style 为同一 DOM 对象（shadow 未重建）
    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(marks(el).length).toBe(1)
    expect(root(el).textContent).toBe('hello brave world')
  })

  it('DSD 回退：快照缺关键结构时 render 全量重建', () => {
    const el = new OASHighlight()
    el.setAttribute('text', 'hello')
    el.setAttribute('highlight', 'hello')
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-highlight" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(marks(el).length).toBe(1)
  })

  it('水合后属性变化仍可增量更新', () => {
    const ref = new OASHighlight()
    ref.setAttribute('text', 'hello brave world')
    ref.setAttribute('highlight', 'brave')
    document.body.appendChild(ref)
    const snapshot = ref.shadowRoot!.innerHTML
    ref.remove()

    const el = new OASHighlight()
    el.setAttribute('text', 'hello brave world')
    el.setAttribute('highlight', 'brave')
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-highlight" data-oas-ssr-v="1">${snapshot}`
    document.body.appendChild(el)

    el.setAttribute('highlight', 'world')
    expect(marks(el).length).toBe(1)
    expect(marks(el)[0]!.textContent).toBe('world')
  })
})
