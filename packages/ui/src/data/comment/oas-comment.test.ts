import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n/registry'
import { en } from '@oas-ui/i18n/en'
import { OASComment } from './index.js'

function mount(inner = '', attrs: Record<string, string> = {}): OASComment {
  const el = new OASComment()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

const NAMED_SLOTS = ['avatar', 'author', 'time', 'content', 'actions']

describe('OASComment', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染五个命名插槽 + 默认插槽（子评论）', () => {
    const el = mount()
    const slots = Array.from(el.shadowRoot!.querySelectorAll('slot'))
    const names = slots.map((s) => s.getAttribute('name'))
    for (const name of NAMED_SLOTS) expect(names).toContain(name)
    expect(names).toContain(null) // 默认插槽承载嵌套子评论
  })

  it('无内容时渲染不报错，各区块隐藏', () => {
    const el = mount()
    for (const part of [...NAMED_SLOTS, 'children']) {
      const wrap = el.shadowRoot!.querySelector(`[part="${part}"]`)!
      expect(wrap.hasAttribute('hidden')).toBe(true)
    }
  })

  it('填入插槽内容后对应区块显示，空插槽仍隐藏', async () => {
    const el = mount()
    el.innerHTML = `
      <span slot="author">张三</span>
      <span slot="time">3 分钟前</span>
      <p slot="content">这是一条评论。</p>
    `
    await new Promise((r) => setTimeout(r, 0))
    for (const part of ['author', 'time', 'content']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden')).toBe(false)
    }
    expect(el.shadowRoot!.querySelector('[part="avatar"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="actions"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="children"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('嵌套 oas-comment 子评论走默认插槽并显示缩进容器', async () => {
    const child = new OASComment()
    child.innerHTML = '<span slot="content">子评论</span>'
    const el = mount('<span slot="content">父评论</span>')
    el.appendChild(child)
    await new Promise((r) => setTimeout(r, 0))
    const childrenWrap = el.shadowRoot!.querySelector('[part="children"]')!
    const slot = childrenWrap.querySelector('slot')!
    expect(slot.assignedNodes()).toContain(child)
    expect(childrenWrap.hasAttribute('hidden')).toBe(false)
  })

  it('断开再重连后 slotchange 仍生效', async () => {
    const el = mount()
    el.remove()
    document.body.appendChild(el)
    el.innerHTML = '<span slot="author">张三</span>'
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="author"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('清空插槽内容后区块重新隐藏', async () => {
    const el = mount('<span slot="content">内容</span>')
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(false)
    el.innerHTML = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('align 属性进 observedAttributes；left/right/非法值均不报错', () => {
    expect(OASComment.observedAttributes).toContain('align')
    const el = mount()
    el.setAttribute('align', 'right')
    el.setAttribute('align', 'center') // 非 left/right 取值：CSS 选择器不命中即回落默认
    expect(el.shadowRoot!.querySelectorAll('[part="comment"]').length).toBe(1)
  })

  it('align=right 提供 time 右挤与 actions 右对齐规则（CSS 级，逻辑属性 RTL 安全）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([align="right"])')
    expect(css).toContain('margin-inline-start: auto')
    expect(css).toContain('justify-content: flex-end')
  })

  it('RTL：dir=rtl 下头像/缩进/嵌套线走逻辑属性，渲染无物理翻转残留', () => {
    const el = mount('<span slot="content">内容</span>', { dir: 'rtl' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 子评论缩进、引导线、引用边全部逻辑属性（RTL 自动镜像）
    expect(css).toMatch(/\.children\s*\{[^}]*margin-inline-start:\s*var\(--oas-space-6\)/)
    expect(css).toMatch(/\.children\s*\{[^}]*border-inline-start:\s*1px solid/)
    expect(css).toMatch(/\.reply,\s*\n?\.quote\s*\{[^}]*border-inline-start:\s*2px solid/)
    expect(css).not.toMatch(/margin-left:/)
    expect(css).not.toMatch(/padding-left:/)
    expect(el.shadowRoot!.querySelectorAll('[part="content"]').length).toBe(1)
  })

  it('quote/reply 插槽：结构存在、空隐藏、有内容显示', async () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('slot[name="quote"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('slot[name="reply"]').length).toBe(1)
    for (const part of ['quote', 'reply']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden')).toBe(true)
    }
    el.innerHTML = `
      <span slot="author">张三</span>
      <span slot="reply">回复 @李四</span>
      <blockquote slot="quote" style="margin: 0">被引用的原文</blockquote>
      <p slot="content">赞同 +1</p>
    `
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="reply"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="quote"]')!.hasAttribute('hidden')).toBe(false)
    // 区块顺序：reply 目标在 head 之后，quote 在 content 之前
    const order = ['head', 'reply', 'quote', 'content', 'actions'].map((p) => {
      const node = el.shadowRoot!.querySelector(`[part="${p}"]`)!
      return Array.from(node.parentElement!.children).indexOf(node)
    })
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})

// ===== 内置输入行（P1/P2 批 ③：textarea + 提交，Enter 提交 / Shift+Enter 换行，数据驱动写回）=====

describe('OASComment 内置输入行', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认渲染输入行：textarea + 提交按钮（i18n 占位与按钮文案）', () => {
    const el = mount()
    const composer = el.shadowRoot!.querySelector('[part="composer"]')!
    expect(composer.hasAttribute('hidden')).toBe(false)
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="composer-send"]')!
    expect(textarea).toBeTruthy()
    expect(send).toBeTruthy()
    expect(send.textContent).toBe('提交')
    expect(textarea.getAttribute('aria-label')).toBeTruthy()
  })

  it('Enter 提交：派发 oas-submit detail { text }，随后清空输入并阻止默认换行', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-submit', (e) => events.push((e as CustomEvent).detail))
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    textarea.value = '  第一条评论  '
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(events.length, 'Enter 触发一次提交').toBe(1)
    expect(events[0], 'detail 只携带 trim 后文本').toEqual({ text: '第一条评论' })
    expect(textarea.value, '提交后输入清空').toBe('')
  })

  it('空文本 / 纯空白：Enter 与点击提交均静默不派发', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-submit', (e) => events.push((e as CustomEvent).detail))
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="composer-send"]')!
    // 空文本 Enter
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    // 纯空白 Enter
    textarea.value = '   '
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    // 空白时点击提交按钮
    send.click()
    expect(events.length, '空 / 空白文本均不派发 oas-submit').toBe(0)
    expect(send.disabled, '空白文本时提交按钮禁用').toBe(true)
    // 恢复有文本后按钮可用
    textarea.value = 'ok'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    expect(send.disabled, '有文本后提交按钮恢复可用').toBe(false)
  })

  it('Shift+Enter 不提交且不阻止默认（textarea 原生换行保留）', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-submit', (e) => events.push((e as CustomEvent).detail))
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    textarea.value = '第一行'
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    textarea.dispatchEvent(e)
    expect(events.length, 'Shift+Enter 不派发 oas-submit').toBe(0)
    expect(e.defaultPrevented, 'Shift+Enter 走 textarea 原生换行（不 preventDefault）').toBe(false)
    expect(textarea.value).toBe('第一行')
  })

  it('输入法组合中 Enter 不提交，组合结束后恢复正常', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-submit', (e) => events.push((e as CustomEvent).detail))
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    textarea.value = '拼音输入中'
    textarea.dispatchEvent(new Event('compositionstart'))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(events.length, '组合中 Enter 不提交').toBe(0)
    textarea.dispatchEvent(new Event('compositionend'))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(events.length, '组合结束后 Enter 正常提交').toBe(1)
  })

  it('点击提交按钮提交；inputtable="false" 隐藏输入行（其余值不隐藏）', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-submit', (e) => events.push((e as CustomEvent).detail))
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    textarea.value = '按钮提交'
    // 真实输入路径：赋值后派发 input（否则提交按钮仍处空文本禁用态，disabled click 无效）
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="composer-send"]')!.click()
    expect(events.length).toBe(1)
    expect((events[0] as { text: string }).text).toBe('按钮提交')

    const off = mount('', { inputtable: 'false' })
    expect(off.shadowRoot!.querySelector('[part="composer"]')!.hasAttribute('hidden')).toBe(true)
    for (const v of [undefined, 'true']) {
      const on = v === undefined ? mount() : mount('', { inputtable: v })
      expect(on.shadowRoot!.querySelector('[part="composer"]')!.hasAttribute('hidden')).toBe(false)
    }
    // 运行时切换（宿主框架动态改属性）
    off.setAttribute('inputtable', 'true')
    expect(off.shadowRoot!.querySelector('[part="composer"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('i18n 切换：setLocale(en) 后占位与按钮文案即时切换，恢复 zh-CN 回中文', () => {
    const el = mount()
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="composer-input"]')!
    const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="composer-send"]')!
    expect(send.textContent).toBe('提交')
    setLocale(en)
    expect(send.textContent).toBe('Submit')
    expect(textarea.getAttribute('aria-label')).toBe(textarea.placeholder)
    expect(textarea.placeholder).toMatch(/\S/)
    setLocale('zh-CN')
    expect(send.textContent).toBe('提交')
  })
})

// ===== resolve 态（resolvable 触发钮 / resolved 已解决样式，宿主写回数据）=====

describe('OASComment resolve 态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('resolvable 缺省：不渲染触发钮（视觉零变化）', () => {
    const el = mount('<span slot="content">内容</span>')
    expect(el.shadowRoot!.querySelector('[part="resolve"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="resolved-flag"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('resolvable 在场渲染触发钮；actions 空插槽时 actions 区因内置钮而显示', () => {
    const el = mount('<span slot="content">内容</span>', { resolvable: '' })
    const resolve = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="resolve"]')!
    expect(resolve.hasAttribute('hidden')).toBe(false)
    expect(resolve.textContent).toBe('标记为已解决')
    expect(resolve.getAttribute('aria-pressed')).toBe('false')
    expect(el.shadowRoot!.querySelector('[part="actions"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('resolve 点击派发 oas-resolve detail { id, resolved: true }；组件不内部切换（宿主写回）', () => {
    const el = mount('<span slot="content">内容</span>', { resolvable: '', 'comment-id': 'c-1' })
    const events: unknown[] = []
    el.addEventListener('oas-resolve', (e) => events.push((e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="resolve"]')!.click()
    expect(events.length, '点击触发一次 oas-resolve').toBe(1)
    expect(events[0]).toEqual({ id: 'c-1', resolved: true })
    expect(el.hasAttribute('resolved'), '组件不内部翻转 resolved（数据由宿主持有并写回属性）').toBe(false)
  })

  it('无 comment-id 时 detail.id 为空串，事件不报错', () => {
    const el = mount('<span slot="content">内容</span>', { resolvable: '' })
    const events: unknown[] = []
    el.addEventListener('oas-resolve', (e) => events.push((e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="resolve"]')!.click()
    expect(events[0]).toEqual({ id: '', resolved: true })
  })

  it('resolved 在场：已解决标记显示 + 钮切 unresolve 文案 + aria-pressed=true；点击派发 resolved:false', () => {
    const el = mount('<span slot="author">张三</span><span slot="time">刚刚</span><p slot="content">已解决的内容</p>', {
      resolvable: '',
      resolved: '',
      'comment-id': 'c-2',
    })
    const flag = el.shadowRoot!.querySelector('[part="resolved-flag"]')!
    expect(flag.hasAttribute('hidden')).toBe(false)
    expect(flag.textContent).toBe('已解决')
    const resolve = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="resolve"]')!
    expect(resolve.textContent).toBe('取消解决')
    expect(resolve.getAttribute('aria-pressed')).toBe('true')
    const events: unknown[] = []
    el.addEventListener('oas-resolve', (e) => events.push((e as CustomEvent).detail))
    resolve.click()
    expect(events.length).toBe(1)
    expect(events[0]).toEqual({ id: 'c-2', resolved: false })
    // 宿主写回：移除 resolved 后回到未解决态
    el.removeAttribute('resolved')
    expect(flag.hasAttribute('hidden')).toBe(true)
    expect(resolve.textContent).toBe('标记为已解决')
    expect(resolve.getAttribute('aria-pressed')).toBe('false')
  })

  it('resolved 样式 token 化：:host([resolved]) 弱色/划线规则存在，无硬编码色值', () => {
    const el = mount('<p slot="content">内容</p>', { resolved: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([resolved])')
    expect(css).toContain('line-through')
    // 划线/弱色全部引用 token
    expect(css).toMatch(/:host\(\[resolved\]\)[^{]*\{[^}]*var\(--oas-color-text-/)
    // 不引入硬编码 hex 色
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('i18n 切换：resolve/unresolve/已解决标记文案即时切换', () => {
    const el = mount('<p slot="content">内容</p>', { resolvable: '', 'comment-id': 'c-3' })
    const resolve = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="resolve"]')!
    const flag = el.shadowRoot!.querySelector('[part="resolved-flag"]')!
    setLocale(en)
    expect(resolve.textContent).toBe('Mark as resolved')
    el.setAttribute('resolved', '')
    expect(resolve.textContent).toBe('Unmark resolution')
    expect(flag.textContent).toBe('Resolved')
    setLocale('zh-CN')
    expect(flag.textContent).toBe('已解决')
  })

  it('RTL：composer 与 resolve 相关样式无物理方向属性残留', () => {
    const el = mount('<p slot="content">内容</p>', { dir: 'rtl', resolvable: '', resolved: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).not.toMatch(/(^|[^-])margin-left:/)
    expect(css).not.toMatch(/(^|[^-])padding-left:/)
    expect(css).not.toMatch(/(^|[^-])border-left:/)
    expect(el.shadowRoot!.querySelectorAll('[part="composer"]').length).toBe(1)
  })
})
