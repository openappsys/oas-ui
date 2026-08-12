import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTransfer } from './index.js'

const DATA = [
  { key: 'a', label: '苹果' },
  { key: 'b', label: '香蕉' },
  { key: 'c', label: '橙子', disabled: true },
]

function mount(attrs: Record<string, string> = {}): OASTransfer {
  const el = new OASTransfer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  el.data = DATA
  return el
}

function leftOptions(el: OASTransfer): NodeListOf<Element> {
  return el.shadowRoot!.querySelectorAll('.listbox.left .option')
}

function rightOptions(el: OASTransfer): NodeListOf<Element> {
  return el.shadowRoot!.querySelectorAll('.listbox.right .option')
}

function toRightBtn(el: OASTransfer): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.to-right')!
}

function toLeftBtn(el: OASTransfer): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.to-left')!
}

describe('OASTransfer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('data 属性渲染左右面板，value 中的 key 出现在右侧', async () => {
    const el = mount()
    await Promise.resolve()
    expect(leftOptions(el).length).toBe(3)
    expect(rightOptions(el).length).toBe(0)
    expect(leftOptions(el)[0]!.textContent).toContain('苹果')
  })

  it('value 预置时右侧展示对应项', () => {
    const el = mount({ value: '["a","c"]' })
    expect(rightOptions(el).length).toBe(2)
    expect(rightOptions(el)[0]!.textContent).toContain('苹果')
    expect(leftOptions(el).length).toBe(1)
    expect(leftOptions(el)[0]!.textContent).toContain('香蕉')
  })

  it('选中后点向右按钮：移动并派发 oas-change（value 更新）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(toRightBtn(el).disabled).toBe(false)
    toRightBtn(el).click()
    expect(detail).toEqual({ value: ['a'] })
    expect(el.getAttribute('value')).toBe('["a"]')
    expect(rightOptions(el).length).toBe(1)
    expect(leftOptions(el).length).toBe(2)
  })

  it('disabled 项不可选中，穿梭按钮随选中清空禁用', () => {
    const el = mount()
    ;(leftOptions(el)[2] as HTMLElement).click() // c 是 disabled
    expect(
      el.shadowRoot!.querySelector('.listbox.left .option[aria-disabled="true"]'),
    ).not.toBeNull()
    expect(toRightBtn(el).disabled).toBe(true)
  })

  it('右侧选中后点向左按钮移回左侧', () => {
    const el = mount({ value: '["a"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rightOptions(el)[0] as HTMLElement).click()
    toLeftBtn(el).click()
    expect(detail).toEqual({ value: [] })
    expect(leftOptions(el).length).toBe(3)
  })

  it('全选 checkbox 选中全部可见项，再点向右全部移动', () => {
    const el = mount()
    const check = el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!
    check.click()
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
    toRightBtn(el).click()
    expect(rightOptions(el).length).toBe(2) // disabled 的 c 不移动
    expect(leftOptions(el).length).toBe(1)
  })

  it('searchable：显示搜索框并过滤面板', () => {
    const el = mount({ searchable: '' })
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    expect(search.hidden).toBe(false)
    search.value = '香'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const options = [...leftOptions(el)]
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('香蕉')
  })

  it('键盘：方向键移动选中，Enter 穿梭', () => {
    const el = mount()
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(leftOptions(el)[1]!.getAttribute('aria-selected')).toBe('true')
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: ['b'] })
  })

  it('titles 属性（JSON）驱动面板标题', () => {
    const el = mount({ titles: '["可选","已选"]' })
    expect(el.shadowRoot!.querySelector('.title.source')!.textContent).toBe('可选')
    expect(el.shadowRoot!.querySelector('.title.target')!.textContent).toBe('已选')
  })
})
