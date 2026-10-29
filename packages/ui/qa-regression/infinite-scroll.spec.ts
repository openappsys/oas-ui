// 复核回归：infinite scroll headless 控制器——真实浏览器滚动/锚定缺陷固化。
//
// 单测跑在 happy-dom（无布局、手动几何），抓不到真实滚动引擎的差异：
// - 浏览器 scroll anchoring 可能与控制器的 prepend 保位重复/冲突；
// - 亚像素/取整几何（小数 scrollTop）下「距底 0.06px」永远到不了精确 0；
// - ResizeObserver 对异步资源撑高的补偿与监听清理。
// 本 spec 不使用文档 demo 页：路由映射 packages/ui/dist 后直接 import 真实构建产物，
// 在真实 scroller 固定 fixture 上验证（Chromium + Firefox 均跑，见 playwright.config）。

import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** packages/ui/dist 真实路径：按本文件位置解析，从任意 cwd 运行都指向同一份产物 */
const builtUiDist = fileURLToPath(new URL('../dist', import.meta.url))

/** 把构建产物按稳定前缀暴露给页面（与 table.spec.ts 同一模式） */
async function serveBuiltUi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/__qa_ui__/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    const relative = decodeURIComponent(pathname.replace(/^\/__qa_ui__\//, ''))
    return route.fulfill({
      path: join(builtUiDist, relative),
      contentType: 'text/javascript',
    })
  })
}

/** 真实 origin 锚点：setContent 后根相对模块说明符才能解析（about:blank 下 import 失败） */
async function openFixture(page: import('@playwright/test').Page, body: string): Promise<void> {
  await page.goto('/404.html')
  await page.setContent(`<!doctype html><html lang="zh-CN"><body style="margin:0;padding:0">${body}</body></html>`)
}

interface FixtureOptions {
  rootSelector?: string
  contentSelector?: string
  direction?: 'bottom' | 'top' | 'both'
  threshold?: number
}

/** 在页面内加载真实 dist 控制器并挂到 window，便于用例分步驱动 */
async function mountController(page: import('@playwright/test').Page, opts: FixtureOptions = {}): Promise<void> {
  await page.evaluate(async (options) => {
    // 运行时 URL 变量：TS 不对页面内路由路径做模块解析（真实文件由 route 映射 dist 提供）
    const moduleUrl: string = '/__qa_ui__/layout/scroll-area/infinite/index.js'
    const mod = (await import(/* @vite-ignore */ moduleUrl)) as {
      createInfiniteScroll: (opts: Record<string, unknown>) => unknown
    }
    const w = window as unknown as {
      __ctl?: unknown
      __loads: Array<{ edge: string }>
      __fixtureLoad?: (ctx: unknown) => Promise<unknown>
    }
    w.__loads = []
    const root = document.querySelector(options.rootSelector ?? '#vp')
    const controllerOptions: Record<string, unknown> = {
      root,
      direction: options.direction ?? 'bottom',
      threshold: options.threshold ?? 0,
    }
    if (options.contentSelector) {
      controllerOptions.content = () => document.querySelector(options.contentSelector!)
    }
    w.__ctl = mod.createInfiniteScroll({
      ...controllerOptions,
      load: async (ctx: { edge: string; signal: AbortSignal }) => {
        w.__loads.push({ edge: ctx.edge })
        if (w.__fixtureLoad) return w.__fixtureLoad(ctx)
        return {}
      },
    })
    ;(w.__ctl as { attach: () => boolean }).attach()
  }, opts)
}

/** 等两帧（滚动/布局副作用落地），替代固定 waitForTimeout */
async function nextFrames(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

/** 收集 console error 与页面异常（零告警门禁） */
function collectErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

const item = (key: string, height = 40): string =>
  `<div class="item" data-key="${key}" style="height:${height}px;box-sizing:border-box">${key}</div>`

test('top prepend：真实滚动锚点 rect 不变、异步撑高补偿一次、destroy 后监听清空', async ({ page }) => {
  const errors = collectErrors(page)
  await serveBuiltUi(page)
  await openFixture(
    page,
    // overflow-anchor:none 关闭浏览器自带滚动锚定：保位只能来自控制器补偿
    `<div id="vp" style="width:400px;height:200px;overflow:auto;overflow-anchor:none">
      <div id="list">${Array.from({ length: 12 }, (_, i) => item(String(i))).join('')}</div>
    </div>`,
  )
  await page.evaluate(() => {
    const w = window as unknown as { __fixtureLoad?: unknown }
    w.__fixtureLoad = async (ctx: { edge: string; signal: AbortSignal }) => {
      if (ctx.edge !== 'top') return {}
      await new Promise((resolve) => setTimeout(resolve, 30))
      if (ctx.signal.aborted) return {}
      const list = document.getElementById('list')!
      const pre = document.createElement('div')
      pre.className = 'item'
      pre.dataset.key = 'pre'
      pre.style.cssText = 'height:60px;box-sizing:border-box'
      pre.textContent = 'pre'
      list.prepend(pre)
      return {}
    }
  })
  await mountController(page, { contentSelector: '#list', direction: 'top', threshold: 0 })
  // 等首轮 top 加载落地（prepend 60px + 控制器锚定补偿；浏览器滚动锚定已关闭）
  await page.waitForFunction(
    () => {
      const ctl = (window as unknown as { __ctl: { state: { top: { status: string } } } }).__ctl
      const vp = document.getElementById('vp')!
      return ctl.state.top.status === 'idle' && Math.abs(vp.scrollTop - 60) <= 1
    },
    undefined,
    { timeout: 5000 },
  )
  const afterPrepend = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const anchor = document.querySelector<HTMLElement>('[data-key="0"]')!
    return { scrollTop: vp.scrollTop, anchorTop: anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top }
  })
  // 锚点仍是同一行且视口内位置不变（prepend 60px 被 60px scrollTop 补偿抵消）
  expect(afterPrepend.anchorTop).toBeCloseTo(0, 1)
  expect(afterPrepend.scrollTop).toBeCloseTo(60, 0)

  // 异步资源撑高：load 事件后纳入 RO，再变高 40px → 锚点继续保位
  await page.evaluate(() => {
    const list = document.getElementById('list')!
    const spacer = document.createElement('div')
    spacer.id = 'spacer'
    spacer.style.height = '0px'
    list.insertBefore(spacer, list.firstChild)
    spacer.dispatchEvent(new Event('load')) // 资源 load 不冒泡，控制器 capture 监听
  })
  // load 事件同步建立资源观察；直接触发高度变化，由 RO 帧回调补偿
  await page.evaluate(() => {
    document.getElementById('spacer')!.style.height = '40px'
  })
  await page.waitForFunction(
    () => {
      const vp = document.getElementById('vp')!
      return Math.abs(vp.scrollTop - 100) <= 1
    },
    undefined,
    { timeout: 5000 },
  )
  const afterGrow = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const anchor = document.querySelector<HTMLElement>('[data-key="0"]')!
    return anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top
  })
  expect(afterGrow).toBeCloseTo(0, 1)

  // destroy 后监听清空：继续滚动/资源事件不再发起加载
  const beforeDestroy = await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)
  await page.evaluate(() => {
    ;(window as unknown as { __ctl: { destroy: () => void } }).__ctl.destroy()
    const vp = document.getElementById('vp')!
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    vp.scrollTop = vp.scrollHeight
    vp.dispatchEvent(new Event('scroll'))
  })
  // destroy 同步移除监听：上面的 scroll 若仍被监听会同步触发 load，无需额外等待
  const afterDestroy = await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)
  expect(afterDestroy).toBe(beforeDestroy)
  expect(errors).toEqual([])
})

test('top 加载中替换列表容器（replaceList）：新容器仍补偿且不续载', async ({ page }) => {
  const errors = collectErrors(page)
  await serveBuiltUi(page)
  await openFixture(
    page,
    `<div id="vp" style="width:400px;height:200px;overflow:auto;overflow-anchor:none">
      <div id="list">${Array.from({ length: 12 }, (_, i) => item(String(i))).join('')}</div>
    </div>`,
  )
  await page.evaluate(() => {
    const w = window as unknown as { __fixtureLoad?: (ctx: { edge: string; signal: AbortSignal }) => Promise<unknown> }
    w.__fixtureLoad = async (ctx: { edge: string; signal: AbortSignal }) => {
      if (ctx.edge !== 'top') return {}
      await new Promise((resolve) => setTimeout(resolve, 30))
      if (ctx.signal.aborted) return {}
      // 宿主整只替换列表容器（同 id 供 content getter 重新解析），而不是在旧容器内 prepend
      const old = document.getElementById('list')!
      const next = document.createElement('div')
      next.id = 'list'
      next.innerHTML =
        '<div class="item" data-key="pre" style="height:60px;box-sizing:border-box">pre</div>' +
        Array.from(
          { length: 12 },
          (_, i) => `<div class="item" data-key="${i}" style="height:40px;box-sizing:border-box">${i}</div>`,
        ).join('')
      old.replaceWith(next)
      return {}
    }
  })
  await mountController(page, { contentSelector: '#list', direction: 'top', threshold: 0 })

  await page.waitForFunction(
    () => {
      const ctl = (window as unknown as { __ctl: { state: { top: { status: string } } } }).__ctl
      const vp = document.getElementById('vp')!
      return ctl.state.top.status === 'idle' && Math.abs(vp.scrollTop - 60) <= 1
    },
    undefined,
    { timeout: 5000 },
  )
  const afterReplace = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const anchor = document.querySelector<HTMLElement>('[data-key="0"]')!
    return {
      anchorTop: anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top,
      scrollTop: vp.scrollTop,
      listId: document.getElementById('list')!.id,
      loads: (window as unknown as { __loads: Array<{ edge: string }> }).__loads.map((l) => l.edge),
    }
  })
  // 新容器里的稳定 key 被重查命中，控制器补偿 60px；浏览器滚动锚定已关闭
  expect(Math.abs(afterReplace.anchorTop)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterReplace.scrollTop - 60)).toBeLessThanOrEqual(1)
  expect(afterReplace.listId).toBe('list')
  expect(afterReplace.loads).toEqual(['top'])

  // 容器替换 + 内容增长后不得在原地反复自动续载
  await nextFrames(page)
  await nextFrames(page)
  expect(await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)).toBe(1)
  expect(errors).toEqual([])
})

test('用户滚到顶触发第二次 top 加载：新锚点 delta≈0，不自动续载', async ({ page }) => {
  const errors = collectErrors(page)
  await serveBuiltUi(page)
  await openFixture(
    page,
    // 关闭浏览器滚动锚定：两次 prepend 的保位都必须由控制器完成
    `<div id="vp" style="width:400px;height:200px;overflow:auto;overflow-anchor:none">
      <div id="list">${Array.from({ length: 12 }, (_, i) => item(String(i))).join('')}</div>
    </div>`,
  )
  await page.evaluate(() => {
    const w = window as unknown as {
      __fixtureLoad?: (ctx: { edge: string; signal: AbortSignal }) => Promise<unknown>
      __loads: Array<{ edge: string }>
    }
    w.__fixtureLoad = async (ctx: { edge: string; signal: AbortSignal }) => {
      if (ctx.edge !== 'top') return {}
      // 第 1 次 prepend 60px，第 2 次 50px：两次都换新 key，验证新锚点仍贴视口
      const seq = w.__loads.length
      await new Promise((resolve) => setTimeout(resolve, 20))
      if (ctx.signal.aborted) return {}
      const list = document.getElementById('list')!
      const pre = document.createElement('div')
      pre.className = 'item'
      pre.dataset.key = `pre-${seq}`
      pre.style.cssText = `height:${seq === 1 ? 60 : 50}px;box-sizing:border-box`
      pre.textContent = `pre-${seq}`
      list.prepend(pre)
      return {}
    }
  })
  await mountController(page, { contentSelector: '#list', direction: 'top', threshold: 0 })

  // 首轮自动 top 加载：scrollTop 60，原首项 0 贴视口顶
  await page.waitForFunction(
    () => {
      const ctl = (window as unknown as { __ctl: { state: { top: { status: string } } } }).__ctl
      const vp = document.getElementById('vp')!
      return ctl.state.top.status === 'idle' && Math.abs(vp.scrollTop - 60) <= 1
    },
    undefined,
    { timeout: 5000 },
  )

  // 真实滚轮滚回顶部，触发第二次 top 加载
  const box = await page.locator('#vp').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, -400)
    await nextFrames(page)
    const state = await page.evaluate(() => ({
      top: document.getElementById('vp')!.scrollTop,
      loads: (window as unknown as { __loads: unknown[] }).__loads.length,
    }))
    // 到达顶部或第二次加载已经触发即停：不能等补偿把 scrollTop 推离顶部后再滚一次
    if (state.top <= 0.5 || state.loads >= 2) break
  }
  await page.waitForFunction(() => (window as unknown as { __loads: unknown[] }).__loads.length === 2, undefined, {
    timeout: 5000,
  })
  await page.waitForFunction(
    () => {
      const ctl = (window as unknown as { __ctl: { state: { top: { status: string } } } }).__ctl
      const vp = document.getElementById('vp')!
      // 读者滚到顶时视口顶是首轮 prepend 的 pre-1；第二次 prepend 50px 后补偿到 50
      return ctl.state.top.status === 'idle' && Math.abs(vp.scrollTop - 50) <= 1
    },
    undefined,
    { timeout: 5000 },
  )

  const result = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    // 第二次加载前的新锚点 = 滚到顶后的首个可见项 pre-1
    const anchor = document.querySelector<HTMLElement>('[data-key="pre-1"]')!
    return {
      anchorTop: anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top,
      scrollTop: vp.scrollTop,
      loads: (window as unknown as { __loads: Array<{ edge: string }> }).__loads.map((l) => l.edge),
    }
  })
  expect(Math.abs(result.anchorTop)).toBeLessThanOrEqual(1)
  expect(Math.abs(result.scrollTop - 50)).toBeLessThanOrEqual(1)
  expect(result.loads).toEqual(['top', 'top'])

  // 第二次落地后 scrollTop 已离开顶部：不得再自动续载
  await nextFrames(page)
  await nextFrames(page)
  expect(await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)).toBe(2)
  expect(errors).toEqual([])
})

test('滚到底触发 bottom：真实滚轮滚动 + 只回调一次', async ({ page }) => {
  const errors = collectErrors(page)
  await serveBuiltUi(page)
  await openFixture(
    page,
    `<div id="vp" style="width:400px;height:200px;overflow:auto;margin:40px;overflow-anchor:none">
      <div id="list">${Array.from({ length: 25 }, (_, i) => item(String(i))).join('')}</div>
    </div>`,
  )
  await mountController(page, { direction: 'bottom', threshold: 0 })
  expect(await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)).toBe(0)

  const box = await page.locator('#vp').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  // 多轮真实滚轮：单次大 delta 在 Firefox 下可能被钳制/合并，分多次稳定滚到底
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 400)
    await nextFrames(page)
    const atBottom = await page.evaluate(() => {
      const vp = document.getElementById('vp')!
      return vp.scrollHeight - vp.scrollTop - vp.clientHeight <= 1
    })
    if (atBottom) break
  }
  await page.waitForFunction(
    () => (window as unknown as { __loads: Array<{ edge: string }> }).__loads.some((l) => l.edge === 'bottom'),
    undefined,
    { timeout: 5000 },
  )
  const result = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const loads = (window as unknown as { __loads: Array<{ edge: string }> }).__loads
    return { edges: loads.map((l) => l.edge), distance: vp.scrollHeight - vp.scrollTop - vp.clientHeight }
  })
  expect(result.edges).toEqual(['bottom'])
  expect(result.distance).toBeLessThanOrEqual(1)
  expect(errors).toEqual([])
})

test('亚像素/取整几何：实测距底 ≤1px 触发，>1px 不触发', async ({ page }) => {
  const errors = collectErrors(page)
  await serveBuiltUi(page)
  // 内容 300.75px / 视口 200px：模拟亚像素/取整几何。浏览器会把 scrollTop 吸附到
  // 自己的精度（Chromium 整数 / Firefox 向下取整），所以断言以「实测 distance」为准：
  // 目标 2.5px 吸附后仍 >1px（不触发）；目标 0.75px 吸附后 ≤1px（容差内触发）。
  await openFixture(
    page,
    `<div id="vp" style="width:400px;height:200px;overflow:auto;overflow-anchor:none">
      <div style="height:300.75px"></div>
    </div>`,
  )
  const farDistance = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const max = vp.scrollHeight - vp.clientHeight
    vp.scrollTop = max - 2.5
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight
  })
  expect(farDistance).toBeGreaterThan(1)
  await mountController(page, { direction: 'bottom', threshold: 0 })
  // 距底 >1px：attach 内的 update 不可能同步发起加载，直接断言即可
  expect(await page.evaluate(() => (window as unknown as { __loads: unknown[] }).__loads.length)).toBe(0)

  const nearDistance = await page.evaluate(() => {
    const vp = document.getElementById('vp')!
    const max = vp.scrollHeight - vp.clientHeight
    vp.scrollTop = max - 0.75
    vp.dispatchEvent(new Event('scroll'))
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight
  })
  expect(nearDistance).toBeLessThanOrEqual(1)
  await page.waitForFunction(() => (window as unknown as { __loads: unknown[] }).__loads.length === 1, undefined, {
    timeout: 5000,
  })
  expect(errors).toEqual([])
})
