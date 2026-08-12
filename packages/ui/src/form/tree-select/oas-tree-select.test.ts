import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTreeSelect } from './index.js'

const OPTIONS = JSON.stringify([
  {
    label: '前端',
    value: 'fe',
    children: [
      {
        label: '框架',
        value: 'framework',
        children: [
          { label: 'React', value: 'react' },
          { label: 'Vue', value: 'vue' },
        ],
      },
      { label: '样式', value: 'css' },
    ],
  },
  { label: '后端', value: 'be', children: [{ label: 'Node', value: 'node' }] },
])

function mount(attrs: Record<string, string> = {}): OASTreeSelect {
  const el = new OASTreeSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASTreeSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function nodes(el: OASTreeSelect): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('.node')] as HTMLElement[]
}

describe('OASTreeSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger + 树面板，点击展开显示树节点', async () => {
    const el = mount()
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    trigger(el).click()
    expect(nodes(el).length).toBeGreaterThanOrEqual(2)
  })

  it('多选：勾选叶子更新 value 数组并派发 oas-change', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const byLabel = (label: string): HTMLElement =>
      [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
        n.textContent?.includes(label),
      ) as HTMLElement
    byLabel('前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel('框架')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel('React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toContain('react')
    expect(detail).toEqual({ value: ['react'] })
  })

  it('多选勾选父节点级联选中全部子节点', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toContain('fe')
    expect(value).toContain('framework')
    expect(value).toContain('react')
    expect(value).toContain('css')
  })

  it('单选：点击节点 value 为该值并关闭', () => {
    const el = mount()
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.querySelector('.toggle')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const cssNode = [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
      n.textContent?.includes('样式'),
    ) as HTMLElement
    cssNode.click()
    expect(el.getAttribute('value')).toBe('css')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })
})

describe('OASTreeSelect focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(
      el.shadowRoot!.querySelector('button[part="trigger"]'),
    )
  })
})
