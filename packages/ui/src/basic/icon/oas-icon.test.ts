import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASIcon, registerIcon, registerIconLibrary } from './index.js'

function mount(attrs: Record<string, string> = {}): OASIcon {
  const el = new OASIcon()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svg(el: OASIcon): SVGSVGElement | null {
  return el.shadowRoot!.querySelector('svg')
}

/** 构造带命名空间的 slot 内联 svg */
function makeSlotSvg(viewBox: string, inner: string): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', viewBox)
  s.innerHTML = inner
  return s
}

describe('OASIcon', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 name 时渲染空 svg（骨架保留，不报错）', () => {
    const el = mount()
    const s = svg(el)
    expect(s).not.toBeNull()
    expect(s!.childNodes.length).toBe(0)
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('未知 name 渲染空 svg（空态兜底）', () => {
    const el = mount({ name: 'not-exist' })
    const s = svg(el)
    expect(s).not.toBeNull()
    expect(s!.childNodes.length).toBe(0)
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('按 name 渲染对应图标 SVG', () => {
    const el = mount({ name: 'check' })
    expect(svg(el)).not.toBeNull()
    expect(svg(el)!.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(el.shadowRoot!.querySelector('path')?.getAttribute('d')).toContain('M3.5 8.5')
  })

  it('size 属性控制宽度/高度，默认 1em', () => {
    const el = mount({ name: 'check' })
    expect(svg(el)!.getAttribute('width')).toBe('1em')
    expect(svg(el)!.getAttribute('height')).toBe('1em')
    el.setAttribute('size', '24')
    const s = svg(el)!
    expect(s.getAttribute('width')).toBe('24')
    expect(s.getAttribute('height')).toBe('24')
  })

  it('color 通过 style.color 应用，默认 currentColor', () => {
    const el = mount({ name: 'check' })
    expect(el.style.color).toBe('')
    el.setAttribute('color', 'red')
    expect(el.style.color).toBe('red')
  })

  it('默认 aria-hidden，设置 label 时 role=img 且 aria-label 同步', () => {
    const el = mount({ name: 'check' })
    expect(el.getAttribute('aria-hidden')).toBe('true')
    el.setAttribute('label', '对勾')
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toBe('对勾')
  })

  it('属性变化增量更新：切换 name 不重建宿主引用', () => {
    const el = mount({ name: 'check' })
    const host = el.shadowRoot!.querySelector('svg')
    el.setAttribute('name', 'close')
    expect(el.shadowRoot!.querySelector('svg')).toBe(host)
    expect(el.shadowRoot!.querySelector('path')?.getAttribute('d')).toContain('M4 4 L12 12')
  })

  describe('spin / rotate / flip', () => {
    it('spin 属性 → svg 无限旋转动画，移除后清除', () => {
      const el = mount({ name: 'loading', spin: '' })
      expect(svg(el)!.style.animation).toBe('oas-icon-spin 1s linear infinite')
      el.removeAttribute('spin')
      expect(svg(el)!.style.animation).toBe('')
    })

    it('rotate 属性 → 静态角度旋转', () => {
      const el = mount({ name: 'check', rotate: '45' })
      expect(svg(el)!.style.transform).toContain('rotate(45deg)')
      el.setAttribute('rotate', '90')
      expect(svg(el)!.style.transform).toContain('rotate(90deg)')
    })

    it('flip 属性 → 镜像翻转，与 rotate 可叠加', () => {
      const el = mount({ name: 'check', flip: 'x' })
      expect(svg(el)!.style.transform).toContain('scaleX(-1)')
      el.setAttribute('flip', 'y')
      expect(svg(el)!.style.transform).toContain('scaleY(-1)')
      el.setAttribute('flip', 'both')
      const t = svg(el)!.style.transform
      expect(t).toContain('scaleX(-1)')
      expect(t).toContain('scaleY(-1)')
      el.setAttribute('rotate', '45')
      const combined = svg(el)!.style.transform
      expect(combined).toContain('rotate(45deg)')
      expect(combined).toContain('scaleX(-1)')
      expect(combined).toContain('scaleY(-1)')
    })
  })

  describe('自定义图标（src / slot）', () => {
    it('src 属性 → fetch 加载内联渲染（viewBox 同步、fill 走 currentColor）', async () => {
      const svgStr = '<svg viewBox="0 0 24 24"><path d="M1 1 L5 5"/></svg>'
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve(svgStr) }),
      )
      vi.stubGlobal('fetch', fetchMock)
      try {
        const el = mount({ name: 'check', src: '/demo-icon.svg' })
        await vi.waitFor(() => {
          expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('M1 1 L5 5')
        })
        expect(svg(el)!.getAttribute('viewBox')).toBe('0 0 24 24')
        expect(fetchMock).toHaveBeenCalledWith('/demo-icon.svg')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('src 加载失败静默兜底（空 svg，aria-hidden）', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('network'))),
      )
      try {
        const el = mount({ name: 'check', src: '/missing.svg' })
        await vi.waitFor(() => {
          expect(svg(el)!.childNodes.length).toBe(0)
        })
        expect(el.getAttribute('aria-hidden')).toBe('true')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('slot 内联 svg 优先于 name 渲染', () => {
      const el = mount({ name: 'check' })
      el.appendChild(makeSlotSvg('0 0 32 32', '<path d="M0 0 L9 9"/>'))
      el.setAttribute('size', '32') // 触发 update
      expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('M0 0 L9 9')
      expect(svg(el)!.getAttribute('viewBox')).toBe('0 0 32 32')
      // 仍保留组件统一的外观控制（宽度来自 size）
      expect(svg(el)!.getAttribute('width')).toBe('32')
    })
  })

  describe('registerIcon 图标库注册', () => {
    it('注册后 name 可用（自定义注册优先于内置注册表）', () => {
      // 注意：用独有名字避免污染其他测试文件对内置 'check' 的断言（模块级注册表跨文件共享）
      registerIcon('custom-heart', '<path d="M2 2 L14 14"/>')
      const el = mount({ name: 'custom-heart' })
      expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('M2 2 L14 14')
      expect(el.shadowRoot!.querySelector('path')).not.toBeNull()
    })
  })

  describe('registerIconLibrary 远程图标库', () => {
    it('注册后 <oas-icon library name> 调 resolver + fetch 加载并内联渲染', async () => {
      const resolver = vi.fn((name: string) => `/icons/${name}.svg`)
      registerIconLibrary('lib-demo', { resolver })
      const svgStr = '<svg viewBox="0 0 24 24"><path d="M2 2 L20 20"/></svg>'
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve(svgStr) }),
      )
      vi.stubGlobal('fetch', fetchMock)
      try {
        const el = mount({ library: 'lib-demo', name: 'heart' })
        expect(resolver).toHaveBeenCalledWith('heart', undefined, undefined)
        await vi.waitFor(() => {
          expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('M2 2 L20 20')
        })
        expect(fetchMock).toHaveBeenCalledWith('/icons/heart.svg')
        expect(svg(el)!.getAttribute('viewBox')).toBe('0 0 24 24')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('加载失败静默兜底（空 svg，aria-hidden）', async () => {
      registerIconLibrary('lib-fail', { resolver: (name: string) => `/nope/${name}.svg` })
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('network'))),
      )
      try {
        const el = mount({ library: 'lib-fail', name: 'star' })
        await vi.waitFor(() => {
          expect(svg(el)!.childNodes.length).toBe(0)
        })
        expect(el.getAttribute('aria-hidden')).toBe('true')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('mutator 在加载内联后调用，收到渲染中的内部 svg 元素', async () => {
      const mutator = vi.fn()
      registerIconLibrary('lib-mut', {
        resolver: (name: string) => `/m/${name}.svg`,
        mutator,
      })
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>'),
          }),
        ),
      )
      try {
        const el = mount({ library: 'lib-mut', name: 'star' })
        await vi.waitFor(() => {
          expect(mutator).toHaveBeenCalledTimes(1)
        })
        const mutatorArg = mutator.mock.calls[0]?.[0]
        expect(mutatorArg).toBe(svg(el))
        // 内联内容已就位（mutator 在内容写入之后执行）
        expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('M1 1')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('spriteSheet 模式渲染 <use href="url#name">，不 fetch 不内联', () => {
      const resolver = vi.fn(() => '/demo-sprite.svg')
      registerIconLibrary('lib-sprite', { resolver, spriteSheet: true })
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      try {
        const el = mount({ library: 'lib-sprite', name: 'heart' })
        const use = svg(el)!.querySelector('use')
        expect(use).not.toBeNull()
        expect(use!.getAttribute('href')).toBe('/demo-sprite.svg#heart')
        expect(fetchMock).not.toHaveBeenCalled()
        // 外观控制仍生效（width 来自 size）
        expect(svg(el)!.getAttribute('width')).toBe('1em')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('library 未注册回退 name 逻辑（内置/registerIcon 均可用）', () => {
      registerIcon('fallback-custom', '<path d="M1 1 L9 9"/>')
      const builtin = mount({ library: 'unregistered', name: 'check' })
      expect(builtin.shadowRoot!.querySelector('path')?.getAttribute('d')).toContain('M3.5 8.5')
      const custom = mount({ library: 'unregistered', name: 'fallback-custom' })
      expect(custom.shadowRoot!.querySelector('path')?.getAttribute('d')).toBe('M1 1 L9 9')
    })

    it('library 未注册且无有效 name → 空态兜底', () => {
      const el = mount({ library: 'unregistered' })
      expect(svg(el)!.childNodes.length).toBe(0)
      expect(el.getAttribute('aria-hidden')).toBe('true')
    })

    it('family/variant 属性透传给 resolver', async () => {
      const resolver = vi.fn(
        (name: string, family?: string, variant?: string) => `/x/${family}/${variant}/${name}.svg`,
      )
      registerIconLibrary('lib-fv', { resolver })
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>') }),
      )
      vi.stubGlobal('fetch', fetchMock)
      try {
        const el = mount({ library: 'lib-fv', name: 'arrow-right', family: 'outlined', variant: 'sharp' })
        expect(resolver).toHaveBeenCalledWith('arrow-right', 'outlined', 'sharp')
        await vi.waitFor(() => {
          expect(fetchMock).toHaveBeenCalledWith('/x/outlined/sharp/arrow-right.svg')
        })
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('library 异步加载防竞态：切换图标后旧响应不覆盖', async () => {
      let resolveA!: (r: { ok: boolean; text: () => Promise<string> }) => void
      let resolveB!: (r: { ok: boolean; text: () => Promise<string> }) => void
      registerIconLibrary('lib-race', { resolver: (name: string) => `/race/${name}.svg` })
      const fetchMock = vi.fn((url: string) =>
        url.includes('a.svg')
          ? new Promise((r) => {
              resolveA = r
            })
          : new Promise((r) => {
              resolveB = r
            }),
      )
      vi.stubGlobal('fetch', fetchMock)
      try {
        const el = mount({ library: 'lib-race', name: 'a' })
        el.setAttribute('name', 'b') // 后发请求先完成
        resolveA({ ok: true, text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="A"/></svg>') })
        await Promise.resolve()
        resolveB({ ok: true, text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="B"/></svg>') })
        await vi.waitFor(() => {
          expect(svg(el)!.querySelector('path')?.getAttribute('d')).toBe('B')
        })
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('library 图标支持 size/color/spin/rotate/flip/depth 外观组合', async () => {
      registerIconLibrary('lib-look', { resolver: (name: string) => `/look/${name}.svg` })
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>'),
          }),
        ),
      )
      try {
        const el = mount({
          library: 'lib-look',
          name: 'gear',
          size: '24',
          color: 'var(--oas-color-primary)',
          spin: '',
          rotate: '45',
          flip: 'x',
          depth: '2',
        })
        await vi.waitFor(() => {
          expect(svg(el)!.querySelector('path')).not.toBeNull()
        })
        expect(svg(el)!.getAttribute('width')).toBe('24')
        expect(el.style.color).toBe('var(--oas-color-primary)')
        expect(svg(el)!.style.animation).toContain('oas-icon-spin')
        const t = svg(el)!.style.transform
        expect(t).toContain('rotate(45deg)')
        expect(t).toContain('scaleX(-1)')
        expect(svg(el)!.style.opacity).toBe('0.8')
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })

  describe('animation 动画预设', () => {
    it('各预设映射到对应 CSS animation 简写', () => {
      const cases: Array<[string, string]> = [
        ['spin', 'oas-icon-spin 1s linear infinite'],
        ['spin-pulse', 'oas-icon-spin 1.2s steps(8, end) infinite'],
        ['spin-reverse', 'oas-icon-spin-reverse 1s linear infinite'],
        ['spin-snap', 'oas-icon-spin-snap 2.4s ease-in-out infinite'],
        ['beat', 'oas-icon-beat 1.2s ease-in-out infinite'],
        ['fade', 'oas-icon-fade 1.5s ease-in-out infinite'],
        ['beat-fade', 'oas-icon-beat-fade 1.6s ease-in-out infinite'],
        ['bounce', 'oas-icon-bounce 1.5s ease-in-out infinite'],
        ['shake', 'oas-icon-shake 0.8s linear infinite'],
        ['swing', 'oas-icon-swing 2s ease-in-out infinite'],
        ['wag', 'oas-icon-wag 1.5s ease-in-out infinite'],
        ['buzz', 'oas-icon-buzz 0.9s linear infinite'],
        ['float', 'oas-icon-float 3s ease-in-out infinite'],
        ['jello', 'oas-icon-jello 1.2s linear infinite'],
      ]
      for (const [anim, expected] of cases) {
        const el = mount({ name: 'check', animation: anim })
        expect(svg(el)!.style.animation).toBe(expected)
        el.remove()
      }
    })

    it('非法 animation 值清空动画', () => {
      const el = mount({ name: 'check', animation: 'nope' })
      expect(svg(el)!.style.animation).toBe('')
    })

    it('spin 属性优先于 animation 时以 animation 为准（预设更完整）', () => {
      const el = mount({ name: 'check', spin: '', animation: 'beat' })
      expect(svg(el)!.style.animation).toContain('oas-icon-beat')
    })

    it('shadow 内定义全部 keyframes 且尊重 prefers-reduced-motion', () => {
      const el = mount({ name: 'check' })
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toContain('@keyframes oas-icon-spin')
      expect(css).toContain('@keyframes oas-icon-jello')
      expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    })
  })

  describe('duotone 双色', () => {
    it('duotone/swap-opacity 切换 svg data 标记', () => {
      const el = mount({ name: 'check', duotone: '' })
      expect(svg(el)!.getAttribute('data-duotone')).toBe('true')
      expect(svg(el)!.getAttribute('data-swap')).toBeNull()
      el.setAttribute('swap-opacity', '')
      expect(svg(el)!.getAttribute('data-swap')).toBe('true')
      el.removeAttribute('duotone')
      expect(svg(el)!.getAttribute('data-duotone')).toBeNull()
      // swap-opacity 独立于 duotone 存在
      expect(svg(el)!.getAttribute('data-swap')).toBe('true')
      el.removeAttribute('swap-opacity')
      expect(svg(el)!.getAttribute('data-swap')).toBeNull()
    })

    it('shadow 样式定义变量默认值（primary 1 / secondary 0.4）与分层着色规则', () => {
      const el = mount({ name: 'check', duotone: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent
      expect(css).toContain('--oas-icon-primary-opacity: 1')
      expect(css).toContain('--oas-icon-secondary-opacity: 0.4')
      expect(css).toContain("svg[data-duotone='true'] > :first-child")
      expect(css).toContain("svg[data-duotone='true'] > :nth-child(2)")
    })
  })

  describe('canvas 占位框模式', () => {
    it('canvas 各模式控制 svg 宽高，size 显式优先', () => {
      const el = mount({ name: 'check' })
      expect(svg(el)!.getAttribute('width')).toBe('1em')
      expect(svg(el)!.getAttribute('height')).toBe('1em')
      el.setAttribute('canvas', 'fixed')
      expect(svg(el)!.getAttribute('width')).toBe('1.25em')
      expect(svg(el)!.getAttribute('height')).toBe('1em')
      el.setAttribute('canvas', 'square')
      expect(svg(el)!.getAttribute('width')).toBe('1.25em')
      expect(svg(el)!.getAttribute('height')).toBe('1.25em')
      el.setAttribute('canvas', 'roomy')
      expect(svg(el)!.getAttribute('width')).toBe('1.5em')
      expect(svg(el)!.getAttribute('height')).toBe('1.5em')
      el.setAttribute('canvas', 'auto')
      expect(svg(el)!.getAttribute('width')).toBeNull()
      expect(svg(el)!.getAttribute('height')).toBe('1em')
      // size 显式优先于 canvas
      el.setAttribute('size', '24')
      expect(svg(el)!.getAttribute('width')).toBe('24')
      expect(svg(el)!.getAttribute('height')).toBe('24')
    })
  })

  describe('depth 透明度层级', () => {
    it('depth 1-5 对应 100%→20% 透明度', () => {
      const el = mount({ name: 'check', depth: '1' })
      expect(svg(el)!.style.opacity).toBe('1')
      el.setAttribute('depth', '2')
      expect(svg(el)!.style.opacity).toBe('0.8')
      el.setAttribute('depth', '3')
      expect(svg(el)!.style.opacity).toBe('0.6')
      el.setAttribute('depth', '4')
      expect(svg(el)!.style.opacity).toBe('0.4')
      el.setAttribute('depth', '5')
      expect(svg(el)!.style.opacity).toBe('0.2')
      el.removeAttribute('depth')
      expect(svg(el)!.style.opacity).toBe('')
    })

    it('非法 depth 忽略', () => {
      const el = mount({ name: 'check', depth: '9' })
      expect(svg(el)!.style.opacity).toBe('')
    })
  })
})
