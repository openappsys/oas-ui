import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASText, OASTitle, OASParagraph } from './index.js'

function mount<T extends HTMLElement>(
  Ctor: new () => T,
  attrs: Record<string, string> = {},
  slot = '文本',
): T {
  const el = new Ctor()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

describe('OAS typography', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('oas-text 渲染 span，type 映射 class', async () => {
    const el = mount(OASText, { type: 'secondary' }, '正文')
    await Promise.resolve()
    const span = el.shadowRoot!.querySelector('.text')!
    expect(span.classList.contains('secondary')).toBe(true)
    expect(el.textContent).toContain('正文')
  })

  it('oas-text ellipsis 加省略类', () => {
    const el = mount(OASText, { ellipsis: '' }, '长文本')
    expect(el.shadowRoot!.querySelector('.text')!.classList.contains('ellipsis')).toBe(true)
  })

  it('oas-text copyable 渲染复制按钮并派发 oas-copy', async () => {
    const writeText = () => Promise.resolve()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const el = mount(OASText, { copyable: '' }, '可复制内容')
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('复制')
    let fired = 0
    el.addEventListener('oas-copy', () => fired++)
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(fired).toBe(1)
  })

  it('oas-title level 1-5 映射标题元素', () => {
    const h2 = mount(OASTitle, { level: '2' }, '标题')
    expect(h2.shadowRoot!.querySelector('h2')).not.toBeNull()
    h2.remove()
    const h4 = mount(OASTitle, { level: '4' }, '标题')
    expect(h4.shadowRoot!.querySelector('h4')).not.toBeNull()
  })

  it('oas-paragraph 渲染 p，type 映射 class', () => {
    const el = mount(OASParagraph, { type: 'warning' }, '段落')
    expect(el.shadowRoot!.querySelector('.text')!.classList.contains('warning')).toBe(true)
  })

  describe('修饰布尔（strong/mark/code/underline/delete/italic，三件共用）', () => {
    const bools = ['strong', 'mark', 'code', 'underline', 'delete', 'italic'] as const
    for (const b of bools) {
      it(`${b}：oas-text 映射 class 并进入 observedAttributes`, () => {
        expect(OASText.observedAttributes).toContain(b)
        const el = mount(OASText, { [b]: '' }, '文本')
        // code/delete 换原生语义标签（.text 根即 <code>/<del>），class 仍同步；其余保留默认标签
        expect(el.shadowRoot!.querySelector('.text')!.classList.contains(b)).toBe(true)
      })
    }
    it('修饰布尔对 title/paragraph 同样生效', () => {
      const t = mount(OASTitle, { strong: '' }, '标题')
      expect(t.shadowRoot!.querySelector('.text')!.classList.contains('strong')).toBe(true)
      const p = mount(OASParagraph, { delete: '' }, '段落')
      expect(p.shadowRoot!.querySelector('.text')!.classList.contains('delete')).toBe(true)
    })
    it('修饰布尔动态切换即时生效', () => {
      const el = mount(OASText, {}, '文本')
      const span = el.shadowRoot!.querySelector('.text')!
      el.setAttribute('strong', '')
      expect(span.classList.contains('strong')).toBe(true)
      el.removeAttribute('strong')
      expect(span.classList.contains('strong')).toBe(false)
    })
    it('mark/code/delete 用语义标签渲染（mark/code/del 元素）', () => {
      const el = mount(OASText, { mark: '', code: '' }, '文本')
      // code 与 mark 组合时 code 换标签语义优先（原生 <code>），class 与样式规则同步
      const codeEl = el.shadowRoot!.querySelector('.text')!
      expect(codeEl.classList.contains('mark')).toBe(true)
      expect(codeEl.classList.contains('code')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.text\.mark\s*{/)
      expect(css).toMatch(/\.text\.code\s*{/)
      expect(css).toMatch(/\.text\.delete\s*{/)
      expect(css).toMatch(/\.text\.underline\s*{/)
      expect(css).toMatch(/\.text\.strong\s*{/)
      expect(css).toMatch(/\.text\.italic\s*{/)
    })
  })

  describe('copy-text 自定义复制内容', () => {
    it('copy-text 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('copy-text')
    })
    it('copy-text 覆盖复制内容（不写 textContent）', async () => {
      let captured = ''
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (t: string) => {
            captured = t
            return Promise.resolve()
          },
        },
        configurable: true,
      })
      const el = mount(OASText, { copyable: '', 'copy-text': '预设复制文案' }, '展示文本')
      el.shadowRoot!.querySelector('button')!.click()
      await Promise.resolve()
      await Promise.resolve()
      expect(captured).toBe('预设复制文案')
    })
    it('缺省仍复制 textContent（零回归）', async () => {
      let captured = ''
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (t: string) => {
            captured = t
            return Promise.resolve()
          },
        },
        configurable: true,
      })
      const el = mount(OASText, { copyable: '' }, '原样复制')
      el.shadowRoot!.querySelector('button')!.click()
      await Promise.resolve()
      await Promise.resolve()
      expect(captured).toBe('原样复制')
    })
  })

  describe('ellipsis-suffix 省略保留后缀', () => {
    it('ellipsis-suffix 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('ellipsis-suffix')
    })
    it('suffix 元素存在且带文本（仅 ellipsis 开启时）', () => {
      const el = mount(OASText, { ellipsis: '', 'ellipsis-suffix': '--结尾' }, '长长长长长长长')
      const suffix = el.shadowRoot!.querySelector('.suffix')
      expect(suffix).not.toBeNull()
      expect(suffix!.textContent).toBe('--结尾')
    })
    it('无 ellipsis 时 suffix 隐藏', () => {
      const el = mount(OASText, { 'ellipsis-suffix': '--结尾' }, '文本')
      const suffix = el.shadowRoot!.querySelector('.suffix') as HTMLElement
      expect(suffix.hidden).toBe(true)
    })
  })

  describe('actions 操作条（slot=actions + actions-position）', () => {
    it('actions-position 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('actions-position')
    })
    it('slot=actions 内容渲染到 actions 区域', () => {
      const el = mount(OASText, {}, '文本')
      const btn = document.createElement('button')
      btn.setAttribute('slot', 'actions')
      btn.textContent = '赞'
      el.appendChild(btn)
      const actions = el.shadowRoot!.querySelector('.actions')
      expect(actions).not.toBeNull()
      expect(actions!.querySelector('slot[name="actions"]')).not.toBeNull()
    })
    it('actions-position=start：actions 在文本前（order 换序）', () => {
      const el = mount(OASText, { 'actions-position': 'start' }, '文本')
      const actions = el.shadowRoot!.querySelector('.actions') as HTMLElement
      expect(actions.classList.contains('start')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.actions\.start\s*{[^}]*order:\s*0/)
      expect(css).toMatch(/\.wrap\s*{[^}]*display:\s*inline-flex/)
    })
    it('缺省 actions-position=end（在文本后，零回归）', () => {
      const el = mount(OASText, {}, '文本')
      const actions = el.shadowRoot!.querySelector('.actions') as HTMLElement
      expect(actions.classList.contains('start')).toBe(false)
    })
    it('actions 与 copyable 共存：复制按钮在 actions 区域内', () => {
      const el = mount(OASText, { copyable: '' }, '文本')
      const actions = el.shadowRoot!.querySelector('.actions')!
      expect(actions.querySelector('.copy-btn')).not.toBeNull()
    })
  })

  describe('line-clamp 多行省略', () => {
    it('line-clamp 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('line-clamp')
    })
    it('line-clamp="2" 渲染多行省略 class + 行数变量', () => {
      const el = mount(OASText, { 'line-clamp': '2' }, '很长很长很长的文本')
      const span = el.shadowRoot!.querySelector('.text')!
      expect(span.classList.contains('line-clamp')).toBe(true)
      expect((span as HTMLElement).style.getPropertyValue('--oas-line-clamp')).toBe('2')
    })
    it('line-clamp 与 ellipsis 互斥（line-clamp 优先，ellipsis 失效）', () => {
      const el = mount(OASText, { ellipsis: '', 'line-clamp': '3' }, '长文本')
      const span = el.shadowRoot!.querySelector('.text')!
      expect(span.classList.contains('line-clamp')).toBe(true)
      expect(span.classList.contains('ellipsis')).toBe(false)
    })
    it('line-clamp 非法值（0/负数/非数字）忽略不生效', () => {
      const el = mount(OASText, { 'line-clamp': '0' }, '长文本')
      expect(el.shadowRoot!.querySelector('.text')!.classList.contains('line-clamp')).toBe(false)
      const bad = mount(OASText, { 'line-clamp': 'abc' }, '长文本')
      expect(bad.shadowRoot!.querySelector('.text')!.classList.contains('line-clamp')).toBe(false)
    })
    it('line-clamp + ellipsis-suffix：suffix 在多行省略时同样展示', () => {
      const el = mount(OASText, { 'line-clamp': '2', 'ellipsis-suffix': '--结尾' }, '长文本')
      const suffix = el.shadowRoot!.querySelector('.suffix') as HTMLElement
      expect(suffix).not.toBeNull()
      expect(suffix.hidden).toBe(false)
    })
  })

  describe('tag 换标签（sub/sup/ins 等原生语义）', () => {
    it('tag 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('tag')
    })
    it('tag="sub" 渲染 sub 元素', () => {
      const el = mount(OASText, { tag: 'sub' }, '下标')
      expect(el.shadowRoot!.querySelector('.text')!.tagName).toBe('SUB')
    })
    it('tag="mark" 渲染 mark 元素', () => {
      const el = mount(OASText, { tag: 'mark' }, '标记')
      expect(el.shadowRoot!.querySelector('.text')!.tagName).toBe('MARK')
    })
    it('tag 非法值（script 等危险标签）忽略回落 span', () => {
      const el = mount(OASText, { tag: 'script' }, '文本')
      expect(el.shadowRoot!.querySelector('script')).toBeNull()
      expect(el.shadowRoot!.querySelector('.text')!.tagName).toBe('SPAN')
    })
    it('tag 动态切换即时生效（换元素重建引用）', () => {
      const el = mount(OASText, {}, '文本')
      const span = el.shadowRoot!.querySelector('.text')!
      el.setAttribute('tag', 'b')
      const b = el.shadowRoot!.querySelector('.text')!
      expect(b).not.toBe(span)
      // slot 投影在新标签内：文本随结构迁移
      expect(el.textContent).toBe('文本')
    })
  })

  describe('depth 三档弱化', () => {
    it('depth 进入 observedAttributes', () => {
      expect(OASText.observedAttributes).toContain('depth')
    })
    it('depth="1|2|3" 映射弱化 class', () => {
      for (const d of ['1', '2', '3']) {
        const el = mount(OASText, { depth: d }, '文本')
        expect(el.shadowRoot!.querySelector('.text')!.classList.contains(`depth-${d}`)).toBe(true)
        el.remove()
      }
    })
    it('depth 非法值忽略', () => {
      const el = mount(OASText, { depth: '4' }, '文本')
      const span = el.shadowRoot!.querySelector('.text')!
      expect(span.className).not.toMatch(/depth/)
    })
    it('depth 与 type 同设：type 语义色优先（depth 忽略）', () => {
      const el = mount(OASText, { type: 'success', depth: '1' }, '文本')
      const span = el.shadowRoot!.querySelector('.text')!
      expect(span.classList.contains('success')).toBe(true)
      expect(span.className).not.toMatch(/depth-1/)
    })
  })

  it('locale：复制按钮文案随 setLocale 切换', async () => {
    const el = mount(OASText, { copyable: '' }, '可复制内容')
    await Promise.resolve()
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.textContent).toBe('复制')
    expect(btn.getAttribute('aria-label')).toBe('复制')

    setLocale(en)
    expect(btn.textContent).toBe('Copy')
    expect(btn.getAttribute('aria-label')).toBe('Copy')

    setLocale('zh-CN')
    expect(btn.textContent).toBe('复制')
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith<T extends HTMLElement>(el: T, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('oas-text：接管后节点引用保持、copyable 事件已绑定、type 同步到 class', async () => {
      const el = new OASText()
      el.setAttribute('copyable', '')
      el.setAttribute('type', 'secondary')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-text')
      const span = el.shadowRoot!.querySelector('.text')!
      const copyBtn = el.shadowRoot!.querySelector('button')!
      el.textContent = '正文'
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.text')).toBe(span)
      expect(el.shadowRoot!.querySelector('button')).toBe(copyBtn)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常：type 同步 class
      expect(span.classList.contains('secondary')).toBe(true)
      // copyable 事件已绑定
      let fired = 0
      el.addEventListener('oas-copy', () => fired++)
      copyBtn.click()
      await Promise.resolve()
      await Promise.resolve()
      expect(fired).toBe(1)
    })

    it('oas-title：level 映射的标题元素在水合时不被重建', () => {
      const el = new OASTitle()
      el.setAttribute('level', '2')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-title')
      const h2 = el.shadowRoot!.querySelector('.text')!
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('h2')).toBe(h2)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })

    it('指纹 tag 不匹配：oas-paragraph 回退 render() 重建', () => {
      const el = new OASParagraph()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-text')
      const pre = el.shadowRoot!.querySelector('p')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('p')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
