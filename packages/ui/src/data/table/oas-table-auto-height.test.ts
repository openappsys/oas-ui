import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
import { registerTableCapability } from './oas-table-capability.js'
import type { TableAutoHeightCapability } from './oas-table.js'
import type { ReactiveController } from '@oas-ui/core/oas-element'
import { HeightCache, computeDynamicWindow } from '../virtual-list/dynamic-height.js'

/**
 * row-auto-height 核心接缝测试：几何消费（窗口/spacer/行高）走注册能力提供的前缀和，
 * 锚定 =（展示序行身份, 行内偏移）。测试用 stub 能力（HeightCache + computeDynamicWindow 真身）
 * 手动喂测量值——真实 ResizeObserver 生命周期由 auto-height L3 模块承担（另测）。
 *
 * 注意：能力注册是模块级一次性的——「未注册告警」用例必须最先执行（本文件内顺序保证）。
 */

class StubAutoHeight implements TableAutoHeightCapability {
  readonly cache = new HeightCache()
  configure(count: number, estimated: number): void {
    this.cache.configure(count, estimated)
  }
  measure(i: number, h: number): boolean {
    return this.cache.measure(i, h)
  }
  offsets(): number[] {
    return this.cache.offsets()
  }
  offsetOf(i: number): number {
    return this.cache.offsetOf(i)
  }
  heightAt(i: number): number {
    return this.cache.heightAt(i)
  }
  total(): number {
    return this.cache.total()
  }
  window(scrollTop: number, viewport: number): { start: number; end: number } {
    return computeDynamicWindow(this.cache.offsets(), this.cache.length, scrollTop, viewport)
  }
}

/** 最近 attach 的 stub 实例（工厂按元素调用，测试经此取回喂测量） */
let lastStub: StubAutoHeight | null = null

/** rAF 冲刷：滚动帧是 rAF 调度的，await 后组件帧已完成（组件帧先注册先执行） */
const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

let registered = false
function ensureRegistered(): void {
  if (registered) return
  registered = true
  registerTableCapability('auto-height', () => {
    lastStub = new StubAutoHeight()
    return lastStub as unknown as ReactiveController
  })
}

function mountAuto(attrs: Record<string, string>): { el: OASTable; wrap: HTMLElement } {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
  return { el, wrap }
}

const rows100 = () => JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ name: `行${i}` })))

describe('oas-table row-auto-height 接缝（几何消费 + 身份锚定）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    lastStub = null
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('能力未注册：devWarn 一次 + 按定高渲染（不静默忽略 opt-in 请求）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    expect(wrap.getAttribute('data-virtual')).toBe('true')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('auto-height')
    // 定高渲染：等高校验
    const trs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')]
    expect(trs.every((tr) => tr.style.height === '40px')).toBe(true)
    warn.mockRestore()
  })

  it('注册后：未测量时与定高逐位等价（预估 = row-height 档）', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const trs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')]
    expect(trs.length).toBeGreaterThan(0)
    expect(trs.every((tr) => tr.style.height === '40px')).toBe(true)
    // 展示序下标打点（measure 映射通道）
    expect(trs[0]!.dataset.oasDisplayIdx).toBeDefined()
    // 底部占位 = 未渲染行 × 40（前缀和总高与定高口径一致）
    const bottom = el.shadowRoot!.querySelector('tbody tr.spacer:last-child td') as HTMLElement
    const rendered = trs.length
    expect(Number.parseInt(bottom.style.height)).toBe((100 - rendered) * 40)
  })

  it('测量回填 + requestAutoHeightSync：视口顶内容保持不跳（锚定行=测量前几何捕获）', () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 视口停在行 2 顶（scrollTop=80）。测量行 0/1 变高 100px（各 +60）后，
    // scrollTop=80 落入行 0（新底 100）内——正确锚定 = 行 0 offset 80：视口顶仍是同一内容，scrollTop 不变
    wrap.scrollTop = 80
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 100)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop).toBe(80)
    // 首渲染行 = 行 0（视口顶内容未跳）
    const first = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(first.getAttribute('data-row-index')).toBe('0')
    // spacer 几何按新前缀和：底占位 = 总高（100+100+98×40=4120）− 窗口末偏移
    const bottom = el.shadowRoot!.querySelector('tbody tr.spacer:last-child td') as HTMLElement
    const winEnd = Number.parseInt(bottom.style.height)
    expect(4120 - winEnd).toBeGreaterThan(80)
  })

  it('判别性：测量只影响视口上方的行时，视口首行跟随新行顶（不跳字）', async () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 先深滚到行 10 顶（scrollTop=400）并等滚动帧渲染稳定——渲染态缓存此刻捕获「测量前」锚点
    wrap.scrollTop = 400
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 行 0/1 实测变高 100px（都在视口上方）：行 10 顶从 400 → 400+120 = 520
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 100)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop).toBe(520)
    // 窗口含上方 buffer 4 行：首「可见」行是行 10，首「渲染」行是行 6
    const first = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(first.getAttribute('data-row-index')).toBe('6')
    expect(el.shadowRoot!.querySelector('tbody tr[data-row-index="10"]')).not.toBeNull()
    // 顶 spacer = 窗口起点行 6 的新顶 = 100+100+4×40 = 360
    const topSpacer = el.shadowRoot!.querySelector('tbody tr.spacer td') as HTMLElement
    expect(Number.parseInt(topSpacer.style.height)).toBe(360)
  })

  it('测量差 <0.5px 视为未变（measure 返回 false，不同步不重建）', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    expect(stub.measure(0, 40.2)).toBe(false)
    expect(stub.measure(0, 40.5)).toBe(true)
    expect(stub.measure(0, 41)).toBe(true)
    expect(stub.measure(-1, 100)).toBe(false)
    expect(stub.measure(100, 100)).toBe(false)
    void el
  })

  it('windowed + row-auto-height + 能力在场：版本范围 devWarn 一次 + 仍定高渲染', () => {
    ensureRegistered()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountAuto({
      'row-auto-height': '',
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('仅支持本地虚拟'))).toBe(true)
    // windowed 路径零变化：绝对行号铺位渲染照常
    expect(el.shadowRoot!.querySelector('tbody tr[part="row"]')).not.toBeNull()
    warn.mockRestore()
  })

  it('编辑中的行：同步跳过（不重建不取消编辑），编辑结束后再同步带上', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    // 模拟编辑态：给某个 td 打 editing class（edit 能力的真实类名）
    const td = el.shadowRoot!.querySelector('tbody tr[part="row"] td') as HTMLElement
    td.classList.add('editing')
    const before = el.shadowRoot!.querySelector('tbody')!.innerHTML
    lastStub!.measure(3, 120)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(el.shadowRoot!.querySelector('tbody')!.innerHTML).toBe(before)
    // 编辑态清除后同步生效
    td.classList.remove('editing')
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    const tr3 = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')].find(
      (tr) => tr.dataset.oasDisplayIdx === '3',
    )
    if (tr3) expect(tr3.style.height).toBe('120px')
  })
})
