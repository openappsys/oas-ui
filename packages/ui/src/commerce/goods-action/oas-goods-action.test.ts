import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASGoodsAction } from './index.js'

function mount(attrs: Record<string, string> = {}): OASGoodsAction {
  const el = new OASGoodsAction()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function iconButtons(el: OASGoodsAction): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="icon-button"]')]
}

function actionButtons(el: OASGoodsAction): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="button"]')]
}

const ITEMS = JSON.stringify([{ key: 'favorite', badge: 0 }, { key: 'shop' }, { key: 'cart', badge: 120 }])

const ACTIONS = JSON.stringify([
  { key: 'cart', text: '加入购物车' },
  { key: 'buy', text: '立即购买', primary: true },
])

describe('oas-goods-action', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('icon 组：按 key 取 i18n 默认文案，未知名回退 key', () => {
    const el = mount({ items: ITEMS })
    const btns = iconButtons(el)
    expect(btns).toHaveLength(3)
    expect(btns[0]!.getAttribute('aria-label')).toBe('收藏')
    expect(btns[1]!.getAttribute('aria-label')).toBe('店铺')
    // 角标数值并入可访问名称（读屏可听到数量）
    expect(btns[2]!.getAttribute('aria-label')).toBe('购物车 120')
  })

  it('icon 组：内置图标按 key 映射渲染（收藏/店铺/购物车）', () => {
    const el = mount({ items: ITEMS })
    const icons = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="icon"] svg')]
    expect(icons).toHaveLength(3)
    // 三个默认图标各自独立（不同 path），不是同一图标复用
    const paths = icons.map((svg) => svg.innerHTML)
    expect(new Set(paths).size).toBe(3)
  })

  it('角标：>0 显示，>99 收敛为 99+，0/缺省不渲染', () => {
    const el = mount({ items: ITEMS })
    const badges = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="badge"]')].filter((n) => !n.hidden)
    expect(badges).toHaveLength(1)
    expect(badges[0]!.textContent).toBe('99+')
    expect(iconButtons(el)[0]!.querySelector<HTMLElement>('[part="badge"]')!.hidden).toBe(true)
  })

  it('icon：属性可覆盖默认图标（自定义注册名优先）', () => {
    const el = mount({ items: JSON.stringify([{ key: 'favorite', icon: 'star' }]) })
    const svg = el.shadowRoot!.querySelector('[part="icon"] svg')!
    expect(svg.innerHTML).toContain('<path')
    expect(iconButtons(el)[0]!.getAttribute('aria-label')).toBe('收藏')
  })

  it('active 项：aria-pressed=true 且带 data-active', () => {
    const el = mount({ items: JSON.stringify([{ key: 'favorite', active: true }]) })
    const btn = iconButtons(el)[0]!
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-active')).toBe('true')
  })

  it('点击 icon 派发 oas-action-click（source=icon）', () => {
    const el = mount({ items: ITEMS })
    let detail: { key?: string; source?: string } | null = null
    el.addEventListener('oas-action-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    iconButtons(el)[2]!.click()
    expect(detail).toEqual({ key: 'cart', source: 'icon' })
  })

  it('主按钮组：渲染文本，primary 标记主次，点击派发 source=button', () => {
    const el = mount({ items: ITEMS, actions: ACTIONS })
    const btns = actionButtons(el)
    expect(btns).toHaveLength(2)
    expect(btns[0]!.textContent).toBe('加入购物车')
    expect(btns[0]!.getAttribute('data-primary')).toBe('false')
    expect(btns[1]!.getAttribute('data-primary')).toBe('true')
    let detail: { key?: string; source?: string } | null = null
    el.addEventListener('oas-action-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    btns[1]!.click()
    expect(detail).toEqual({ key: 'buy', source: 'button' })
  })

  it('单项 disabled 与宿主 disabled：按钮禁用且不派发事件', () => {
    const el = mount({
      items: ITEMS,
      actions: JSON.stringify([{ key: 'buy', text: '立即购买', primary: true, disabled: true }]),
    })
    let fired = 0
    el.addEventListener('oas-action-click', () => {
      fired++
    })
    const btn = actionButtons(el)[0]!
    expect(btn.disabled).toBe(true)
    btn.click()
    expect(fired).toBe(0)
    el.setAttribute('disabled', '')
    expect(iconButtons(el)[0]!.disabled).toBe(true)
    iconButtons(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('nav 可访问名称：缺省走 i18n，label 属性可覆盖', () => {
    const el = mount({ items: ITEMS })
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('商品操作')
    el.setAttribute('label', '底部操作')
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('底部操作')
  })

  it('非法 JSON / 非数组：不抛错且渲染空骨架', () => {
    const el = mount({ items: '{bad json', actions: '{"a":1}' })
    expect(iconButtons(el)).toHaveLength(0)
    expect(actionButtons(el)).toHaveLength(0)
  })

  it('样式只走 token 且布局为逻辑方向（RTL 安全）', () => {
    const el = mount({ items: ITEMS })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })
})
