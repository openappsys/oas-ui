import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { subscribeConfigProvider } from '@oas-ui/core'
import './index.js'

interface SystemMediaStub {
  mql: MediaQueryList
  add: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  setDark(dark: boolean): void
}

/** 可控系统主题媒体查询：只替换浏览器输入，provider 与通知链仍走真实实现。 */
function stubSystemMedia(initialDark = false): SystemMediaStub {
  let dark = initialDark
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const add = vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
    if (type === 'change') listeners.add(listener)
  })
  const remove = vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
    if (type === 'change') listeners.delete(listener)
  })
  const mql = {
    get matches() {
      return dark
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: add,
    removeEventListener: remove,
  } as unknown as MediaQueryList
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    expect(query).toBe('(prefers-color-scheme: dark)')
    return mql
  })
  return {
    mql,
    add,
    remove,
    setDark(next: boolean) {
      dark = next
      const event = { matches: next, media: mql.media } as MediaQueryListEvent
      for (const listener of [...listeners]) listener(event)
    },
  }
}

function mountTheme(theme: string | null, storageKey?: string): HTMLElement {
  const cp = document.createElement('oas-config-provider')
  if (theme !== null) cp.setAttribute('theme', theme)
  if (storageKey !== undefined) cp.setAttribute('theme-storage-key', storageKey)
  document.body.appendChild(cp)
  return cp
}

describe('oas-config-provider system theme / storage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })

  afterEach(() => {
    // happy-dom 的 innerHTML 清空不保证 disconnectedCallback；显式 remove 验证并隔离监听清理。
    document.querySelectorAll('oas-config-provider').forEach((el) => el.remove())
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('兼容边界：缺失/空 theme 保持继承，显式 light/dark/high-contrast/custom 原样写入', () => {
    const cp = mountTheme(null)
    expect(cp.hasAttribute('data-theme')).toBe(false)

    cp.setAttribute('theme', '')
    expect(cp.hasAttribute('data-theme')).toBe(false)

    for (const theme of ['light', 'dark', 'high-contrast', 'brand-custom']) {
      cp.setAttribute('theme', theme)
      expect(cp.getAttribute('theme')).toBe(theme)
      expect(cp.getAttribute('data-theme')).toBe(theme)
    }

    cp.removeAttribute('theme')
    expect(cp.hasAttribute('data-theme')).toBe(false)
  })

  it.each([
    ['light', false],
    ['dark', true],
  ])('theme=system 解析为实际 %s，requested 与 effective 不混写', (_effective, dark) => {
    stubSystemMedia(dark)
    const cp = mountTheme('system')
    expect(cp.getAttribute('theme')).toBe('system')
    expect(cp.getAttribute('data-theme')).toBe(dark ? 'dark' : 'light')
  })

  it('系统主题运行中变化只触发一次 provider 通知并刷新实际主题', () => {
    const media = stubSystemMedia(false)
    const cp = mountTheme('system')
    const notify = vi.fn()
    const unsubscribe = subscribeConfigProvider(cp, notify)

    media.setDark(true)
    expect(cp.getAttribute('theme')).toBe('system')
    expect(cp.getAttribute('data-theme')).toBe('dark')
    expect(notify).toHaveBeenCalledTimes(1)

    media.setDark(false)
    expect(cp.getAttribute('data-theme')).toBe('light')
    expect(notify).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('无 storage key 时不读不写共享存储', () => {
    stubSystemMedia(false)
    const get = vi.spyOn(window.localStorage, 'getItem')
    const set = vi.spyOn(window.localStorage, 'setItem')
    const cp = mountTheme('system')
    cp.setAttribute('theme', 'dark')
    cp.setAttribute('theme', 'system')

    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })

  it('首次连接恢复合法显式存储并覆盖 system 默认值，显式 attribute 仍优先', () => {
    const media = stubSystemMedia(false)
    window.localStorage.setItem('theme-test', JSON.stringify({ theme: 'dark' }))
    const cp = mountTheme('system', 'theme-test')
    expect(cp.getAttribute('data-theme')).toBe('dark')

    media.setDark(true)
    expect(cp.getAttribute('data-theme'), '显式存储 dark 不被系统事件覆盖').toBe('dark')

    cp.setAttribute('theme', 'light')
    expect(cp.getAttribute('data-theme')).toBe('light')
    expect(JSON.parse(window.localStorage.getItem('theme-test')!)).toEqual({ theme: 'light' })
  })

  it('用户重新选择 system 会保存 system 偏好并立即恢复跟随系统', () => {
    const media = stubSystemMedia(true)
    window.localStorage.setItem('theme-test', JSON.stringify({ theme: 'light' }))
    const cp = mountTheme('system', 'theme-test')
    expect(cp.getAttribute('data-theme')).toBe('light')

    cp.setAttribute('theme', 'dark')
    cp.setAttribute('theme', 'system')
    expect(JSON.parse(window.localStorage.getItem('theme-test')!)).toEqual({ theme: 'system' })
    expect(cp.getAttribute('data-theme')).toBe('dark')

    media.setDark(false)
    expect(cp.getAttribute('data-theme')).toBe('light')
  })

  it('旧显式存储覆盖期间再次写入同值 system，也视为用户重选并清除覆盖', () => {
    const media = stubSystemMedia(true)
    window.localStorage.setItem('theme-test', JSON.stringify({ theme: 'light' }))
    const cp = mountTheme('system', 'theme-test')
    expect(cp.getAttribute('data-theme')).toBe('light')

    cp.setAttribute('theme', 'system')
    expect(JSON.parse(window.localStorage.getItem('theme-test')!)).toEqual({ theme: 'system' })
    expect(cp.getAttribute('data-theme')).toBe('dark')
    media.setDark(false)
    expect(cp.getAttribute('data-theme')).toBe('light')
  })

  it.each(['{bad json', JSON.stringify({ theme: 'sepia' }), JSON.stringify(null), JSON.stringify('dark')])(
    '坏 JSON/非法存储值安全降级为系统主题：%s',
    (raw) => {
      stubSystemMedia(true)
      window.localStorage.setItem('theme-test', raw)
      const cp = mountTheme('system', 'theme-test')
      expect(cp.getAttribute('data-theme')).toBe('dark')
    },
  )

  it('storage get/set 异常不阻塞恢复降级与后续主题切换', () => {
    const media = stubSystemMedia(false)
    const get = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const cp = mountTheme('system', 'theme-test')
    expect(cp.getAttribute('data-theme')).toBe('light')
    expect(get).toHaveBeenCalledTimes(1)

    get.mockRestore()
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    cp.setAttribute('theme', 'dark')
    expect(cp.getAttribute('data-theme')).toBe('dark')
    cp.setAttribute('theme', 'system')
    media.setDark(true)
    expect(cp.getAttribute('data-theme')).toBe('dark')
  })

  it('storage 事件恢复同键显式偏好，忽略其他键与非法值', () => {
    stubSystemMedia(false)
    const cp = mountTheme('system', 'theme-test')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'theme-test', newValue: JSON.stringify({ theme: 'dark' }) }),
    )
    expect(cp.getAttribute('data-theme')).toBe('dark')

    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: JSON.stringify({ theme: 'light' }) }))
    expect(cp.getAttribute('data-theme')).toBe('dark')

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme-test', newValue: '{bad' }))
    expect(cp.getAttribute('data-theme')).toBe('light')
  })

  it('重复 update 不累积 MQL/storage 监听，disconnect 清理且 reconnect 恢复', () => {
    const media = stubSystemMedia(false)
    const addWindow = vi.spyOn(window, 'addEventListener')
    const removeWindow = vi.spyOn(window, 'removeEventListener')
    const cp = mountTheme('system', 'theme-test')
    const storageAdds = () => addWindow.mock.calls.filter(([type]) => type === 'storage').length
    const storageRemoves = () => removeWindow.mock.calls.filter(([type]) => type === 'storage').length

    cp.setAttribute('size', 'small')
    cp.setAttribute('size', 'large')
    cp.setAttribute('theme-storage-key', 'theme-test')
    expect(media.add).toHaveBeenCalledTimes(1)
    expect(storageAdds()).toBe(1)

    cp.remove()
    expect(media.remove).toHaveBeenCalledTimes(1)
    expect(storageRemoves()).toBe(1)
    media.setDark(true)
    expect(cp.getAttribute('data-theme')).toBe('light')

    document.body.appendChild(cp)
    expect(media.add).toHaveBeenCalledTimes(2)
    expect(storageAdds()).toBe(2)
    media.setDark(false)
    expect(cp.getAttribute('data-theme')).toBe('light')
    expect(media.add).toHaveBeenCalledTimes(2)
  })
})
