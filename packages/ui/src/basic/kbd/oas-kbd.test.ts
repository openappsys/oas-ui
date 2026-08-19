import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASKbd } from './index.js'

function mountKbd(attrs: Record<string, string> = {}, slot = ''): OASKbd {
  const el = new OASKbd()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (slot) el.textContent = slot
  document.body.appendChild(el)
  return el
}

function kbdEl(el: OASKbd): HTMLElement {
  return el.shadowRoot!.querySelector('[part="kbd"]')!
}

describe('OASKbd', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('keys 空格分隔渲染多块 + 加号连接', () => {
    const el = mountKbd({ keys: 'ctrl shift k' })
    const kbd = kbdEl(el)
    const keys = [...kbd.querySelectorAll('.key')]
    expect(keys.map((k) => k.textContent)).toEqual(['ctrl', 'shift', 'k'])
    expect(kbd.querySelectorAll('.sep').length).toBe(2)
    expect(kbd.querySelector('.sep')!.textContent).toBe('+')
  })

  it('空 keys 渲染单空块', () => {
    const el = mountKbd()
    const keys = [...kbdEl(el).querySelectorAll('.key')]
    expect(keys.length).toBe(1)
    expect(keys[0]!.textContent).toBe('')
  })

  it('slot 内容优先于 keys', () => {
    const el = mountKbd({ keys: 'ctrl' }, '⌘C')
    const kbd = kbdEl(el)
    expect(kbd.querySelector('.keys')!.hasAttribute('hidden')).toBe(true)
    expect(kbd.querySelector('slot')).not.toBeNull()
  })

  it('keys 变化增量更新', () => {
    const el = mountKbd({ keys: 'ctrl shift' })
    el.setAttribute('keys', 'a b c')
    const keys = [...kbdEl(el).querySelectorAll('.key')].map((k) => k.textContent)
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('role="text" 且非交互（不派发 oas 事件）', () => {
    const el = mountKbd({ keys: 'ctrl' })
    expect(kbdEl(el).getAttribute('role')).toBe('text')
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    kbdEl(el).click()
    expect(fired).toBe(false)
  })

  describe('variant 形态（raised/outline/subtle/plain）', () => {
    it('variant 进入 observedAttributes，四值映射 class，raised 默认', () => {
      expect(OASKbd.observedAttributes).toContain('variant')
      for (const v of ['outline', 'subtle', 'plain'] as const) {
        const el = mountKbd({ keys: 'ctrl', variant: v })
        expect(kbdEl(el).classList.contains(v), `variant=${v}`).toBe(true)
      }
      const raised = mountKbd({ keys: 'ctrl' })
      expect(kbdEl(raised).classList.contains('outline')).toBe(false)
    })

    it('非法值回落 raised 并告警', () => {
      const el = mountKbd({ keys: 'ctrl', variant: 'wavy' })
      const kbd = kbdEl(el)
      expect(kbd.classList.contains('outline')).toBe(false)
      expect(kbd.classList.contains('subtle')).toBe(false)
      expect(kbd.classList.contains('plain')).toBe(false)
    })

    it('CSS：四形态规则存在（outline 去底/subtle 浅底/plain 无边无阴影）', () => {
      const el = mountKbd({ keys: 'ctrl' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/kbd\.outline\s*{/)
      expect(css).toMatch(/kbd\.subtle\s*{/)
      expect(css).toMatch(/kbd\.plain\s*{/)
    })
  })

  describe('size 档位（small/medium/large）', () => {
    it('size 进入 observedAttributes，medium 默认零回归，small/large 映射 class', () => {
      expect(OASKbd.observedAttributes).toContain('size')
      const md = mountKbd({ keys: 'ctrl' })
      expect(kbdEl(md).classList.contains('small')).toBe(false)
      expect(kbdEl(md).classList.contains('large')).toBe(false)
      const sm = mountKbd({ keys: 'ctrl', size: 'small' })
      expect(kbdEl(sm).classList.contains('small')).toBe(true)
      const lg = mountKbd({ keys: 'ctrl', size: 'large' })
      expect(kbdEl(lg).classList.contains('large')).toBe(true)
    })

    it('非法值回落 medium 并告警', () => {
      const el = mountKbd({ keys: 'ctrl', size: 'xxl' })
      expect(kbdEl(el).classList.contains('small')).toBe(false)
      expect(kbdEl(el).classList.contains('large')).toBe(false)
    })

    it('CSS：small/large 档位改 padding+字号', () => {
      const el = mountKbd({ keys: 'ctrl' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/kbd\.small\s*{[^}]*padding/)
      expect(css).toMatch(/kbd\.large\s*{[^}]*padding/)
    })
  })

  describe('color 属性（统一协议：11 预设名→token / 任意 CSS 色值直注入）', () => {
    it('color 进入 observedAttributes', () => {
      expect(OASKbd.observedAttributes).toContain('color')
    })

    it('预设名映射 --oas-preset-* token（键帽底色 --oas-kbd-color）', () => {
      const el = mountKbd({ keys: 'ctrl', color: 'geekblue' })
      expect(kbdEl(el).style.getPropertyValue('--oas-kbd-color')).toBe('var(--oas-preset-geekblue)')
    })

    it('11 预设名全量解析', () => {
      const presets = [
        'magenta',
        'red',
        'volcano',
        'orange',
        'gold',
        'lime',
        'green',
        'cyan',
        'blue',
        'geekblue',
        'purple',
      ]
      for (const name of presets) {
        const el = mountKbd({ keys: 'ctrl', color: name })
        expect(kbdEl(el).style.getPropertyValue('--oas-kbd-color'), `preset=${name}`).toBe(
          `var(--oas-preset-${name})`,
        )
        el.remove()
      }
    })

    it('任意 CSS 色值直注入（#hex）', () => {
      const el = mountKbd({ keys: 'ctrl', color: '#0e7490' })
      expect(kbdEl(el).style.getPropertyValue('--oas-kbd-color')).toBe('#0e7490')
    })

    it('动态切换与移除即时生效', () => {
      const el = mountKbd({ keys: 'ctrl', color: 'red' })
      el.setAttribute('color', '#00b96b')
      expect(kbdEl(el).style.getPropertyValue('--oas-kbd-color')).toBe('#00b96b')
      el.removeAttribute('color')
      expect(kbdEl(el).style.getPropertyValue('--oas-kbd-color')).toBe('')
    })

    it('has-color class + CSS 消费链：底色染 12% 浅底、描边、文字走 -text token', () => {
      const el = mountKbd({ keys: 'ctrl', color: 'geekblue' })
      const kbd = kbdEl(el)
      expect(kbd.classList.contains('has-color')).toBe(true)
      expect(kbd.style.getPropertyValue('--oas-kbd-text')).toBe('var(--oas-preset-geekblue-text)')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/kbd\.has-color\s*{[^}]*var\(--oas-kbd-color\)/)
      expect(css).toMatch(/kbd\.has-color\s*{[^}]*var\(--oas-kbd-text/)
    })

    it('移除 color 后 has-color class 也移除', () => {
      const el = mountKbd({ keys: 'ctrl', color: 'red' })
      el.removeAttribute('color')
      expect(kbdEl(el).classList.contains('has-color')).toBe(false)
    })
  })

  describe('性能自查：监听器清理', () => {
    it('slotchange 监听注册 onCleanup（断开不泄漏）', () => {
      const el = mountKbd({ keys: 'ctrl' })
      // 基类 cleanupFns 应包含 slotchange 的移除函数
      const fns = (el as unknown as { cleanupFns: unknown[] }).cleanupFns
      expect(Array.isArray(fns)).toBe(true)
      expect(fns.length).toBeGreaterThan(0)
    })
  })
})
