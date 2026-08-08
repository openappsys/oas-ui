import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMentions } from './index.js'

const OPTIONS = JSON.stringify([
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
])

function mount(attrs: Record<string, string> = {}): OASMentions {
  const el = new OASMentions()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function ta(el: OASMentions): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

/** 模拟输入：设置 value + 光标到末尾 + 派发 input */
function type(el: OASMentions, value: string): HTMLTextAreaElement {
  const t = ta(el)
  t.value = value
  t.selectionStart = t.selectionEnd = value.length
  t.dispatchEvent(new Event('input'))
  return t
}

function key(t: HTMLTextAreaElement, key: string): void {
  t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function rows(el: OASMentions): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.option'))
}

describe('OASMentions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 textarea，value 受控同步', () => {
    const el = mount({ value: '@Alice ', options: OPTIONS })
    expect(ta(el).tagName).toBe('TEXTAREA')
    expect(ta(el).value).toBe('@Alice ')
  })

  it('输入 prefix（@）后弹出建议浮层，列出全部选项', () => {
    const el = mount({ options: OPTIONS })
    type(el, '你好 @')
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.classList.contains('open')).toBe(true)
    expect(rows(el).length).toBe(3)
    expect(ta(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('关键词过滤：prefix 后输入关键字只显示匹配项', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@ap')
    expect(rows(el).length).toBe(2)
    expect(rows(el).map((r) => r.textContent)).toEqual(['Apple', 'Apricot'])
  })

  it('无匹配显示空态', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@zzz')
    const empty = el.shadowRoot!.querySelector('.empty')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toBe('无匹配提及')
  })

  it('无 prefix 触发时浮层不弹出', () => {
    const el = mount({ options: OPTIONS })
    type(el, '普通文本')
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.classList.contains('open')).toBe(false)
  })

  it('自定义 prefix 属性生效', () => {
    const el = mount({ options: OPTIONS, prefix: '#' })
    type(el, '任务 #ba')
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toBe('Banana')
  })

  it('↑↓ 选择 + Enter 插入选中项（并入文本），派发 oas-select/oas-change', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '@a')
    const selects: unknown[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    key(t, 'ArrowDown')
    key(t, 'Enter')
    expect(t.value).toBe('@Apricot ')
    expect(selects).toEqual([{ value: 'apricot', label: 'Apricot' }])
    expect(changes).toEqual([{ value: '@Apricot ' }])
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.classList.contains('open')).toBe(false)
  })

  it('Enter 插入时替换 prefix+关键词片段，并聚焦回 textarea', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '你好 @ap')
    key(t, 'Enter')
    expect(t.value).toBe('你好 @Apple ')
    expect(el.shadowRoot!.activeElement).toBe(t)
  })

  it('Esc 关闭浮层', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '@a')
    key(t, 'Escape')
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.classList.contains('open')).toBe(false)
    expect(ta(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('外部点击关闭浮层（composedPath 检测）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@a')
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.classList.contains('open')).toBe(false)
  })

  it('点击选项插入提及', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@ba')
    const row = el.shadowRoot!.querySelector('.option') as HTMLElement
    row.click()
    expect(ta(el).value).toBe('@Banana ')
  })

  it('断开连接后无孤儿监听（外部点击不再抛错/操作）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@a')
    el.remove()
    expect(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow()
  })

  it('外部改 options 属性后过滤刷新', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@l')
    expect(rows(el).map((r) => r.textContent)).toEqual(['Apple'])
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
      ]),
    )
    expect(rows(el).map((r) => r.textContent)).toEqual(['Alpha'])
  })

  it('disabled 透传到 textarea', () => {
    const el = mount({ options: OPTIONS, disabled: '' })
    expect(ta(el).disabled).toBe(true)
  })
})
