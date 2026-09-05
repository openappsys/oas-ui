import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASPopover } from './index.js'

// 本文件验证「contextmenu 能力晚加入（late-join）」：宿主构造/连接时能力注册表为空，
// 之后能力包才注册（入口求值顺序、打包器重排、按需反向引入、动态 import 等场景），
// 宿主应经订阅通知幂等补齐 contextmenu 能力 controller（触屏长按随 hostConnected 绑定触发元素），
// 而不是永久静默失效。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点（首个动态 import 前 contextmenu 未注册）。
// 长按为唯一纯能力 DOM 行为（core 不绑 touch 监听）：未注入时长按不打开、注入后长按打开。

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底） */
function touchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

/** 真实计时器等待（长按延时断言） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('OASPopover contextmenu 能力晚加入（late-join）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('构造/连接后才注册的 contextmenu 能力应补齐注入（长按绑定生效）', async () => {
    const el = new OASPopover()
    el.setAttribute('trigger', 'contextmenu')
    el.setAttribute('long-press-delay', '20')
    el.innerHTML = '<button>右键菜单</button>'
    document.body.appendChild(el)
    const btn = el.querySelector('button')!
    // 连接时注册表为空：core 不绑 touch 监听，长按不打开
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 10, clientY: 10 }]))
    await sleep(60)
    expect(el.hasAttribute('open')).toBe(false)

    // 晚加入：动态 import contextmenu 能力包（模拟入口求值顺序/打包器重排/按需反向引入）
    await import('./contextmenu/index.js')

    // 订阅通知 → 幂等 attach → hostConnected 已向触发元素绑定 touch 监听 → 长按打开
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 10, clientY: 10 }]))
    await sleep(60)
    expect(el.hasAttribute('open')).toBe(true)
    el.remove()
  })

  it('断开的宿主退订：重连仍经 catch-up 补齐（多次重连幂等重绑、不泄漏）', async () => {
    // 注册表已含 contextmenu（上一条用例已 import）：构造注入 + 连接即绑定
    const el = new OASPopover()
    el.setAttribute('trigger', 'contextmenu')
    el.setAttribute('long-press-delay', '20')
    el.innerHTML = '<button>右键菜单</button>'
    document.body.appendChild(el)
    // 多次断开/重连：connectedCallback 重新订阅 + catch-up attach（幂等），
    // hostConnected 重绑触屏监听后长按仍只打开一次（不重复绑定/不泄漏）
    for (let i = 0; i < 2; i++) {
      el.remove()
      document.body.appendChild(el)
    }
    el.querySelector('button')!.dispatchEvent(
      touchEvent('touchstart', [{ clientX: 20, clientY: 20 }]),
    )
    await sleep(60)
    expect(el.hasAttribute('open')).toBe(true)
    el.remove()
  })
})
