import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import './index.js'
import '../../feedback/empty/index.js'
import '../../basic/button/index.js'
import '../../basic/tag/index.js'
import '../../floating/scroll-area/index.js'
import '../../feedback/modal/index.js'

/**
 * config-provider 注入机制测试：
 * - 包裹内组件正确读取注入的 locale/size
 * - 自身属性优先于注入值
 * - 就近优先（内层 config-provider 覆盖外层）
 * - theme 写入 data-theme 到子树
 */
describe('oas-config-provider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    registerLocale(en)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('包裹内组件读取注入的 locale（t() 就近翻译）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('locale', 'en')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)

    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('No data')
  })

  it('无 config-provider 时回退全局 locale', () => {
    const empty = document.createElement('oas-empty')
    document.body.appendChild(empty)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')
  })

  it('包裹内组件读取注入的 size', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.textContent = '大按钮'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('large')).toBe(true)
    expect(btnEl.classList.contains('medium')).toBe(false)
  })

  it('自身属性优先于注入值（size）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.setAttribute('size', 'small')
    btn.textContent = '自身小按钮'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('small')).toBe(true)
    expect(btnEl.classList.contains('large')).toBe(false)
  })

  it('自身属性未设置时才走注入值（size）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.textContent = '走注入值'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('large')).toBe(true)
  })

  it('就近优先：内层 config-provider 覆盖外层（locale）', () => {
    const outer = document.createElement('oas-config-provider')
    outer.setAttribute('locale', 'en')

    const inner = document.createElement('oas-config-provider')
    inner.setAttribute('locale', 'zh-CN')

    const emptyInner = document.createElement('oas-empty')
    inner.appendChild(emptyInner)

    const emptyOuter = document.createElement('oas-empty')
    outer.appendChild(emptyOuter)
    outer.appendChild(inner)

    document.body.appendChild(outer)

    // 内层包裹的组件用内层 locale（zh-CN）
    const descInner = emptyInner.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(descInner.textContent).toBe('暂无数据')
    // 外层包裹（未再嵌套）的组件用外层 locale（en）
    const descOuter = emptyOuter.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(descOuter.textContent).toBe('No data')
  })

  it('就近优先：内层 config-provider 覆盖外层（size）', () => {
    const outer = document.createElement('oas-config-provider')
    outer.setAttribute('size', 'large')

    const inner = document.createElement('oas-config-provider')
    inner.setAttribute('size', 'small')

    const btnInner = document.createElement('oas-button')
    btnInner.textContent = '内层按钮'
    inner.appendChild(btnInner)

    const btnOuter = document.createElement('oas-button')
    btnOuter.textContent = '外层按钮'
    outer.appendChild(btnOuter)
    outer.appendChild(inner)

    document.body.appendChild(outer)

    const innerEl = btnInner.shadowRoot!.querySelector('button')!
    expect(innerEl.classList.contains('small')).toBe(true)
    const outerEl = btnOuter.shadowRoot!.querySelector('button')!
    expect(outerEl.classList.contains('large')).toBe(true)
  })

  it('theme 属性写入 data-theme 到自身（子树继承主题 token）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('theme', 'dark')
    document.body.appendChild(cp)
    expect(cp.getAttribute('data-theme')).toBe('dark')

    cp.removeAttribute('theme')
    expect(cp.getAttribute('data-theme')).toBeNull()
  })

  it('locale 属性变化时包裹组件即时重刷文案', () => {
    const cp = document.createElement('oas-config-provider')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')

    cp.setAttribute('locale', 'en')
    expect(desc.textContent).toBe('No data')

    cp.removeAttribute('locale')
    expect(desc.textContent).toBe('暂无数据')
  })

  it('全局 setLocale 与 config-provider 注入并存时，注入值就近优先', async () => {
    const { setLocale } = await import('@oas-ui/i18n')
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('locale', 'zh-CN')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)

    // 全局切到 en，但 config-provider 注入 zh-CN → 包裹组件仍显示中文
    setLocale(en)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')

    setLocale('zh-CN')
  })

  describe('config JSON 组件级默认配置', () => {
    it('button variant 未显式设置时读注入值', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('config', '{"oas-button":{"variant":"outlined"}}')
      const btn = document.createElement('oas-button')
      btn.textContent = '注入按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.classList.contains('outlined')).toBe(true)
      expect(btnEl.classList.contains('solid')).toBe(false)
    })

    it('button 显式 variant 优先于注入值', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('config', '{"oas-button":{"variant":"outlined"}}')
      const btn = document.createElement('oas-button')
      btn.setAttribute('variant', 'dashed')
      btn.textContent = '显式按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.classList.contains('dashed')).toBe(true)
      expect(btnEl.classList.contains('outlined')).toBe(false)
    })

    it('嵌套 config-provider 就近覆盖（config）', () => {
      const outer = document.createElement('oas-config-provider')
      outer.setAttribute('config', '{"oas-button":{"variant":"outlined"}}')

      const inner = document.createElement('oas-config-provider')
      inner.setAttribute('config', '{"oas-button":{"variant":"dashed"}}')

      const btnInner = document.createElement('oas-button')
      btnInner.textContent = '内层按钮'
      inner.appendChild(btnInner)

      const btnOuter = document.createElement('oas-button')
      btnOuter.textContent = '外层按钮'
      outer.appendChild(btnOuter)
      outer.appendChild(inner)

      document.body.appendChild(outer)

      const innerEl = btnInner.shadowRoot!.querySelector('button')!
      expect(innerEl.classList.contains('dashed')).toBe(true)
      const outerEl = btnOuter.shadowRoot!.querySelector('button')!
      expect(outerEl.classList.contains('outlined')).toBe(true)
    })

    it('config 属性变化时包裹 button 即时重刷 variant', () => {
      const cp = document.createElement('oas-config-provider')
      const btn = document.createElement('oas-button')
      btn.textContent = '动态按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.classList.contains('outlined')).toBe(false)

      cp.setAttribute('config', '{"oas-button":{"variant":"outlined"}}')
      expect(btnEl.classList.contains('outlined')).toBe(true)

      cp.setAttribute('config', '{"oas-button":{"variant":"filled"}}')
      expect(btnEl.classList.contains('filled')).toBe(true)
      expect(btnEl.classList.contains('outlined')).toBe(false)

      cp.removeAttribute('config')
      expect(btnEl.classList.contains('filled')).toBe(false)
    })

    it('无 config 或键缺失时回落默认 solid', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('config', '{"oas-tag":{"size":"large"}}')
      const btn = document.createElement('oas-button')
      btn.textContent = '无 variant 键'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.classList.contains('solid')).toBe(false) // solid 为默认不加 class
      expect(btnEl.classList.contains('outlined')).toBe(false)
    })

    it('非法 JSON：忽略 + dev 告警（同值去重）', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const cp = document.createElement('oas-config-provider')
        cp.setAttribute('config', '{bad json')
        document.body.appendChild(cp)
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('[oas-config-provider] 非法 config JSON'),
        )

        // 同值跨元素去重：不重复告警
        const cp2 = document.createElement('oas-config-provider')
        cp2.setAttribute('config', '{bad json')
        document.body.appendChild(cp2)
        expect(warn).toHaveBeenCalledTimes(1)

        // 合法 JSON 但非对象（数组）同样告警
        const cp3 = document.createElement('oas-config-provider')
        cp3.setAttribute('config', '[1,2]')
        document.body.appendChild(cp3)
        expect(warn).toHaveBeenCalledTimes(2)

        // 非法 config 不影响 button 默认形态
        const btn = document.createElement('oas-button')
        btn.textContent = '非法 config 下的按钮'
        cp.appendChild(btn)
        const btnEl = btn.shadowRoot!.querySelector('button')!
        expect(btnEl.classList.contains('outlined')).toBe(false)
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('direction 全局方向注入', () => {
    it('direction 写入宿主 dir 属性（CSS direction 穿透子树）', () => {
      const cp = document.createElement('oas-config-provider')
      document.body.appendChild(cp)

      cp.setAttribute('direction', 'rtl')
      expect(cp.getAttribute('dir')).toBe('rtl')
      cp.setAttribute('direction', 'ltr')
      expect(cp.getAttribute('dir')).toBe('ltr')
      cp.removeAttribute('direction')
      expect(cp.getAttribute('dir')).toBeNull()
    })

    it('scroll-area 消费注入方向（provider direction=rtl → 横向滚轮负值转译）', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('direction', 'rtl')
      const sa = document.createElement('oas-scroll-area')
      cp.appendChild(sa)
      document.body.appendChild(cp)

      const vp = sa.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
      // happy-dom 无布局：模拟横向可滚（client 100 / scroll 400 → maxX = 300）
      Object.defineProperty(vp, 'clientWidth', { value: 100, configurable: true })
      Object.defineProperty(vp, 'clientHeight', { value: 100, configurable: true })
      Object.defineProperty(vp, 'scrollWidth', { value: 400, configurable: true })
      Object.defineProperty(vp, 'scrollHeight', { value: 100, configurable: true })

      const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 50 })
      vp.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
      // RTL 语义：scrollLeft 为负值区间 [-300, 0]，前进方向与 LTR 相反
      expect(vp.scrollLeft).toBe(-50)
    })

    it('非法 direction：回落 ltr + dev 告警（同值去重）', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const cp = document.createElement('oas-config-provider')
        cp.setAttribute('direction', 'sideways')
        document.body.appendChild(cp)
        expect(cp.getAttribute('dir')).toBe('ltr')
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('[oas-config-provider] 非法 direction'),
        )

        // 同值跨元素去重：不重复告警
        const cp2 = document.createElement('oas-config-provider')
        cp2.setAttribute('direction', 'sideways')
        document.body.appendChild(cp2)
        expect(warn).toHaveBeenCalledTimes(1)
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('z-index 浮层全局起始值', () => {
    it('合法正整数写入 --oas-z-index-base，移除属性时清掉', () => {
      const cp = document.createElement('oas-config-provider')
      document.body.appendChild(cp)

      cp.setAttribute('z-index', '2000')
      expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('2000')

      cp.removeAttribute('z-index')
      expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('')
    })

    it('浮层组件 z-index 带 --oas-z-index-base 回落链', () => {
      const modal = document.createElement('oas-modal')
      document.body.appendChild(modal)
      const style = modal.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain('calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050))')
    })

    it('非法 z-index：忽略 + dev 告警（同值去重）', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const cp = document.createElement('oas-config-provider')
        document.body.appendChild(cp)
        cp.setAttribute('z-index', '2000')
        expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('2000')

        // 非正整数（负值/小数/0）→ 忽略（清掉已有写入）+ 告警
        cp.setAttribute('z-index', '-5')
        expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('')
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('[oas-config-provider] 非法 z-index'),
        )

        cp.setAttribute('z-index', '10.5')
        expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('')
        expect(warn).toHaveBeenCalledTimes(2)

        cp.setAttribute('z-index', '0')
        expect(cp.style.getPropertyValue('--oas-z-index-base')).toBe('')
        expect(warn).toHaveBeenCalledTimes(3)

        // 同值跨元素去重：不重复告警
        const cp2 = document.createElement('oas-config-provider')
        cp2.setAttribute('z-index', '-5')
        document.body.appendChild(cp2)
        expect(warn).toHaveBeenCalledTimes(3)
      } finally {
        warn.mockRestore()
      }
    })
  })

  describe('disabled 全局禁用注入', () => {
    it('注入生效：provider disabled 时子树 button 无显式 disabled 即禁用', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      const btn = document.createElement('oas-button')
      btn.textContent = '注入按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(true)
    })

    it('显式 disabled 恒禁（自身属性优先，无注入也禁用）', () => {
      const cp = document.createElement('oas-config-provider')
      const btn = document.createElement('oas-button')
      btn.setAttribute('disabled', '')
      btn.textContent = '显式禁用'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(true)
    })

    it('disabled-skip 逃逸：provider disabled 下单个组件保持可用', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      const btn = document.createElement('oas-button')
      btn.setAttribute('disabled-skip', '')
      btn.textContent = '逃逸按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(false)
    })

    it('disabledExempt 整类豁免：config JSON 声明 tag 后该类组件不禁用', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      cp.setAttribute('config', '{"disabledExempt":["oas-button"]}')
      const btn = document.createElement('oas-button')
      btn.textContent = '豁免按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(false)
    })

    it('disabledExempt 只豁免声明的 tag：未声明 tag 仍继承禁用', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      cp.setAttribute('config', '{"disabledExempt":["oas-link"]}')
      const btn = document.createElement('oas-button')
      btn.textContent = '未豁免按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(true)
    })

    it('嵌套就近：内层无 disabled 的 provider 覆盖外层禁用', () => {
      const outer = document.createElement('oas-config-provider')
      outer.setAttribute('disabled', '')

      const inner = document.createElement('oas-config-provider')
      const btnInner = document.createElement('oas-button')
      btnInner.textContent = '内层按钮'
      inner.appendChild(btnInner)

      const btnOuter = document.createElement('oas-button')
      btnOuter.textContent = '外层按钮'
      outer.appendChild(btnOuter)
      outer.appendChild(inner)

      document.body.appendChild(outer)

      const innerEl = btnInner.shadowRoot!.querySelector('button')!
      const outerEl = btnOuter.shadowRoot!.querySelector('button')!
      expect(outerEl.disabled).toBe(true)
      expect(innerEl.disabled).toBe(false)
    })

    it('provider disabled 属性移除后子树恢复可用（变化通知重刷）', () => {
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      const btn = document.createElement('oas-button')
      btn.textContent = '动态按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(true)

      cp.removeAttribute('disabled')
      expect(btnEl.disabled).toBe(false)

      // 再开再关：值变化与移除均即时重刷
      cp.setAttribute('disabled', '')
      expect(btnEl.disabled).toBe(true)
    })

    it('provider disabled 变化即时重刷子树（已渲染组件跟随）', () => {
      const cp = document.createElement('oas-config-provider')
      const btn = document.createElement('oas-button')
      btn.textContent = '动态按钮'
      cp.appendChild(btn)
      document.body.appendChild(cp)

      const btnEl = btn.shadowRoot!.querySelector('button')!
      expect(btnEl.disabled).toBe(false)

      cp.setAttribute('disabled', '')
      expect(btnEl.disabled).toBe(true)
    })
  })
})
