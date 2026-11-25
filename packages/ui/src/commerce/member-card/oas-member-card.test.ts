import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASMemberCard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASMemberCard {
  const el = new OASMemberCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASMemberCard, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

describe('oas-member-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('grade 渲染等级徽章：可见文本即等级（不只靠颜色）+ sr-only「会员等级」前缀；卡片 aria-label 含等级', () => {
    const el = mount({ grade: '黄金会员' })
    const grade = part(el, 'grade')!
    expect(grade.textContent).toContain('黄金会员')
    // sr-only 前缀提供语义（读屏先读「会员等级」再读等级名）
    expect(grade.textContent).toContain('会员等级')
    expect(el.getAttribute('aria-label')).toBe('会员卡：黄金会员')
  })

  it('grade 缺省不渲染徽章（无可显示等级）；卡片 aria-label 回落 i18n 组件名', () => {
    const el = mount()
    expect(part(el, 'grade')!.hidden).toBe(true)
    expect(el.getAttribute('aria-label')).toBe('会员卡')
  })

  it('variant：solid（缺省）/ gradient 两档 data-variant 落盘；非法值回落 solid 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const solid = mount({ grade: '白银会员' })
    expect(solid.getAttribute('data-variant')).toBe('solid')
    const grad = mount({ grade: '黑金会员', variant: 'gradient' })
    expect(grad.getAttribute('data-variant')).toBe('gradient')
    // 宿主元素 attribute 反射（CSS :host([data-variant]) 可外部定向）
    const bad = mount({ variant: 'glitter' })
    expect(bad.getAttribute('data-variant')).toBe('solid')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0])).toContain('glitter')
  })

  it('expire 渲染有效期行（i18n 前缀 + 宿主文本）；缺省不渲染', () => {
    const el = mount({ grade: '黄金会员', expire: '2027-11-25' })
    const expire = part(el, 'expire')!
    expect(expire.hidden).toBe(false)
    expect(expire.textContent).toContain('有效期')
    expect(expire.textContent).toContain('2027-11-25')
    const bare = mount({ grade: '黄金会员' })
    expect(part(bare, 'expire')!.hidden).toBe(true)
  })

  it('perks 权益插槽：有内容显示权益区，无内容隐藏', async () => {
    const el = mount({ grade: '黄金会员' })
    const perks = part(el, 'perks')!
    expect(perks.hidden).toBe(true)
    const item = document.createElement('div')
    item.slot = 'perks'
    item.textContent = '每月 2 张免邮券'
    el.appendChild(item)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(perks.hidden).toBe(false)
  })

  it('actions 操作区插槽：有内容显示（按钮可访问名由宿主按钮自带），无内容隐藏', async () => {
    const el = mount({ grade: '黄金会员' })
    const actions = part(el, 'actions')!
    expect(actions.hidden).toBe(true)
    const btn = document.createElement('button')
    btn.slot = 'actions'
    btn.textContent = '立即续费'
    el.appendChild(btn)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(actions.hidden).toBe(false)
    // 宿主按钮保留在 light DOM（组件不搬运、不包壳）
    expect(btn.parentElement).toBe(el)
  })

  it('variant 变化即时重渲染（data-variant 跟随 attribute）', () => {
    const el = mount({ grade: '黄金会员' })
    expect(el.getAttribute('data-variant')).toBe('solid')
    el.setAttribute('variant', 'gradient')
    expect(el.getAttribute('data-variant')).toBe('gradient')
    el.removeAttribute('variant')
    expect(el.getAttribute('data-variant')).toBe('solid')
  })

  it('grade / expire 更新即时同步（attribute 通道增量更新）', () => {
    const el = mount({ grade: '黄金会员' })
    el.setAttribute('grade', '钻石会员')
    expect(part(el, 'grade')!.textContent).toContain('钻石会员')
    expect(el.getAttribute('aria-label')).toBe('会员卡：钻石会员')
    el.setAttribute('expire', '2028-01-01')
    expect(part(el, 'expire')!.textContent).toContain('2028-01-01')
  })
})
