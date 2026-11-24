import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASBarrage } from './index.js'

/** 慢速舞台：条目在测试期间不会离场（duration ≈ (800 + w) / 1 秒） */
function mount(attrs: Record<string, string> = {}): OASBarrage {
  const el = new OASBarrage()
  el.setAttribute('speed', '1')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function items(el: OASBarrage): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
}

function likeOf(item: HTMLElement): HTMLElement | null {
  return item.querySelector<HTMLElement>('[part="like"]')
}

describe('OASBarrage 屏蔽词（banned-words）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('逗号分隔命中即不渲染（add 通道），未命中的照常入场', () => {
    const el = mount({ 'banned-words': '广告, 刷屏' })
    el.add('这是一条广告')
    el.add('刷屏内容')
    el.add('正常弹幕')
    expect(items(el)).toHaveLength(1)
    expect(items(el)[0]!.textContent).toBe('正常弹幕')
  })

  it('大小写不敏感 + 全角逗号分隔', () => {
    const el = mount({ 'banned-words': 'SPAM，Ad' })
    el.add('this is spam')
    el.add('bad ad here')
    el.add('hello')
    expect(items(el).map((item) => item.textContent)).toEqual(['hello'])
  })

  it('JSON 数组形态等价；非法 JSON 一次性告警且不过滤', () => {
    const el = mount({ 'banned-words': JSON.stringify(['广告']) })
    el.add('广告内容')
    el.add('正常')
    expect(items(el)).toHaveLength(1)

    document.body.innerHTML = ''
    const warn2 = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el2 = mount({ 'banned-words': '[广告' })
    el2.add('广告内容')
    expect(items(el2)).toHaveLength(1)
    const messages = warn2.mock.calls.map((call) => String(call[0])).join('\n')
    expect(messages).toContain('banned-words')
  })

  it('items 声明式通道同样过滤（属性变化只入队未命中的条目）', () => {
    const el = mount({ 'banned-words': '广告', items: JSON.stringify(['广告语', '好弹幕']) })
    expect(items(el).map((item) => item.textContent)).toEqual(['好弹幕'])
  })
})

describe('OASBarrage 点赞（likeable / oas-like）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('未开 likeable：条目不渲染点赞控件（默认渲染零漂移）', () => {
    const el = mount()
    el.add('普通弹幕')
    const item = items(el)[0]!
    expect(likeOf(item)).toBeNull()
    expect(item.textContent).toBe('普通弹幕')
  })

  it('likeable：点按切换点赞态并派发 oas-like（detail 含 liked / count）', () => {
    const el = mount({ likeable: '' })
    el.add('点我点赞', { key: 'k1' })
    const item = items(el)[0]!
    const like = likeOf(item)!
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-like', (e) => details.push((e as CustomEvent).detail as Record<string, unknown>))

    like.click()
    expect(details).toEqual([{ text: '点我点赞', key: 'k1', color: '', liked: true, count: 1 }])
    expect(like.getAttribute('data-liked')).toBe('true')
    expect(el.isLiked('k1')).toBe(true)
    expect(el.likeCount('k1')).toBe(1)

    like.click()
    expect(details[1]).toMatchObject({ liked: false, count: 0 })
    expect(like.hasAttribute('data-liked')).toBe(false)
    expect(el.isLiked('k1')).toBe(false)
  })

  it('点赞态按 key 记忆：离场后同 key 再入场仍是已赞', () => {
    const el = mount({ likeable: '' })
    el.add('记忆弹幕', { key: 'k2' })
    likeOf(items(el)[0]!)!.click()
    el.clear()
    el.add('记忆弹幕', { key: 'k2' })
    const again = items(el)[0]!
    expect(likeOf(again)!.getAttribute('data-liked')).toBe('true')
    expect(el.likeCount('k2')).toBe(1)
  })

  it('装饰态（缺省）：点赞控件不可聚焦且 aria-hidden（不含 aria-hidden-focus 违规）', () => {
    const el = mount({ likeable: '' })
    el.add('装饰点赞')
    const like = likeOf(items(el)[0]!)!
    expect(like.getAttribute('aria-hidden')).toBe('true')
    expect(like.hasAttribute('tabindex')).toBe(false)
    expect(like.hasAttribute('role')).toBe(false)
  })

  it('accessible + likeable：点赞控件是键盘可达的 button 角色，条目本身不再叠 button（nested-interactive 防线）', () => {
    const el = mount({ likeable: '', accessible: '' })
    el.add('可读点赞')
    const item = items(el)[0]!
    const like = likeOf(item)!
    expect(like.getAttribute('role')).toBe('button')
    expect(like.getAttribute('tabindex')).toBe('0')
    expect(like.getAttribute('aria-pressed')).toBe('false')
    expect(like.getAttribute('aria-label')).toBe('点赞')
    expect(item.hasAttribute('role')).toBe(false)

    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-like', (e) => details.push((e as CustomEvent).detail as Record<string, unknown>))
    like.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    expect(details).toHaveLength(1)
    expect(like.getAttribute('aria-pressed')).toBe('true')
  })

  it('运行时开 / 关 likeable：既有在场条目补控件与撤控件（状态按记忆回填）', () => {
    const el = mount()
    el.add('运行时切换', { key: 'k3' })
    expect(likeOf(items(el)[0]!)).toBeNull()
    el.setAttribute('likeable', '')
    expect(likeOf(items(el)[0]!)?.tagName).toBe('SPAN')
    el.removeAttribute('likeable')
    expect(likeOf(items(el)[0]!)).toBeNull()
  })
})
