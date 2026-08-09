import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASToolbar } from './index.js'
import '../../basic/button/index.js'

function mount(innerHTML = ''): OASToolbar {
  const el = new OASToolbar()
  el.innerHTML = innerHTML
  document.body.appendChild(el)
  return el
}

function buttons(el: OASToolbar): HTMLButtonElement[] {
  return [...el.querySelectorAll<HTMLButtonElement>('button')]
}

describe('OASToolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('宿主 role=toolbar + aria-label（locale 默认）', () => {
    const el = mount('<button>加粗</button><button>斜体</button>')
    expect(el.getAttribute('role')).toBe('toolbar')
    expect(el.getAttribute('aria-label')).toBe('工具栏')
  })

  it('aria-label 随 locale 切换', () => {
    const el = mount('<button>加粗</button>')
    setLocale(en)
    expect(el.getAttribute('aria-label')).toBe('Toolbar')
    setLocale('zh-CN')
    expect(el.getAttribute('aria-label')).toBe('工具栏')
  })

  it('roving tabindex：仅首项可 Tab 到达', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    expect(btns[0]!.getAttribute('tabindex')).toBe('0')
    expect(btns[1]!.getAttribute('tabindex')).toBe('-1')
    expect(btns[2]!.getAttribute('tabindex')).toBe('-1')
  })

  it('ArrowRight 移动焦点到下一按钮，ArrowLeft 回退', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[1])
    expect(btns[1]!.getAttribute('tabindex')).toBe('0')
    expect(btns[0]!.getAttribute('tabindex')).toBe('-1')
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(document.activeElement).toBe(btns[0])
  })

  it('ArrowRight 到末尾循环到第一项', () => {
    const el = mount('<button>加粗</button><button>斜体</button>')
    const btns = buttons(el)
    btns[1]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[0])
  })

  it('Home / End 跳转', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    btns[1]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }))
    expect(document.activeElement).toBe(btns[0])
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('禁用按钮不参与 roving', () => {
    const el = mount('<button>加粗</button><button disabled>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    expect(btns[0]!.getAttribute('tabindex')).toBe('0')
    expect(btns[2]!.getAttribute('tabindex')).toBe('-1')
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('data-toolbar-ignore 排除项不参与', () => {
    const el = mount(
      '<button>加粗</button><button data-toolbar-ignore>忽略</button><button>斜体</button>',
    )
    const btns = buttons(el)
    expect(btns[1]!.getAttribute('tabindex')).toBeNull()
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('自定义元素（oas-button）参与 roving', () => {
    const el = mount('<oas-button>加粗</oas-button><oas-button>斜体</oas-button>')
    const items = [...el.children] as HTMLElement[]
    expect(items[0]!.getAttribute('tabindex')).toBe('0')
    expect(items[1]!.getAttribute('tabindex')).toBe('-1')
    ;(items[0] as HTMLElement).focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(items[1])
    expect(items[1]!.getAttribute('tabindex')).toBe('0')
  })

  it('slotchange 后新增按钮自动参与 roving', () => {
    const el = mount('<button>加粗</button>')
    const btn = document.createElement('button')
    btn.textContent = '斜体'
    el.appendChild(btn)
    // slotchange 异步触发，需微任务等待
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(btn.getAttribute('tabindex')).toBe('-1')
        resolve()
      })
    })
  })

  it('空工具栏不报错', () => {
    const el = mount()
    expect(el.getAttribute('role')).toBe('toolbar')
  })
})
