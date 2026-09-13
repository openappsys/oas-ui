// 复核回归：image——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('image-group：容器收集子图为共享图集，点击打开共享预览、prev/next 切换 current、动态增删同步', async ({
  page,
}) => {
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#image-group-demo')
  // 收集：内部预览宿主 preview-src-list 展平子图数；容器 role=group 语义
  const collected = await page.evaluate(() => {
    const g = document.querySelector('#image-group-demo')!
    const inner = g.shadowRoot!.querySelector('oas-image')!
    return {
      children: g.querySelectorAll('oas-image').length,
      list: JSON.parse(inner.getAttribute('preview-src-list') || '[]').length,
      role: g.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role'),
      ariaLabel: g.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label'),
    }
  })
  expect(collected.children).toBeGreaterThanOrEqual(3)
  expect(collected.list, '图集列表应收集全部子图').toBe(collected.children)
  expect(collected.role).toBe('group')
  expect(collected.ariaLabel).toBe('图集')

  // 点击第 2 张 → 共享预览从 2/N 起开；子图自身预览被接管（自身遮罩保持关闭）
  await page.locator('#image-group-demo oas-image').nth(1).click()
  await page.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })
  const opened = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const mask = portal.shadowRoot!.querySelector('.preview-mask')!
    const counter = portal.shadowRoot!.querySelector('[part="preview-counter"]')!
    const g = document.querySelector('#image-group-demo')!
    const childMask = g.querySelectorAll('oas-image')[1]!.shadowRoot!.querySelector('.preview-mask')!
    return {
      maskHidden: mask.hasAttribute('hidden'),
      counter: counter.textContent,
      childMaskHidden: childMask.hasAttribute('hidden'),
      current: g.getAttribute('current'),
    }
  })
  expect(opened.maskHidden).toBe(false)
  expect(opened.counter).toBe(`2/${collected.children}`)
  expect(opened.childMaskHidden, '子图自身预览应被容器接管').toBe(true)
  // 非受控模式不反射 current（保持点击哪张从哪张开的直觉）
  expect(opened.current).toBeNull()

  // prev/next 在整组间切换：next → current 反射 2，页码 3/N
  await page.evaluate(() => {
    document
      .querySelector('[data-oas-image-preview-portal]')!
      .shadowRoot!.querySelector<HTMLElement>('[part="preview-next"]')!
      .click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-oas-image-preview-portal]')!
        .shadowRoot!.querySelector('[part="preview-counter"]')!
        .textContent!.startsWith('3/'),
    null,
    { timeout: 15000 },
  )
  expect(await page.$eval('#image-group-demo', (el) => el.getAttribute('current'))).toBeNull()

  // Esc 关闭共享预览：portal 拆除，无孤儿浮层
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('[data-oas-image-preview-portal]') === null, null, {
    timeout: 15000,
  })

  // 动态增删子图：图集列表同步（+1 / 还原）
  const synced = await page.evaluate(async () => {
    const g = document.querySelector('#image-group-demo')!
    const read = () =>
      JSON.parse(g.shadowRoot!.querySelector('oas-image')!.getAttribute('preview-src-list') || '[]').length
    const before = read()
    const el = document.createElement('oas-image')
    el.setAttribute('src', 'https://picsum.photos/seed/isui-group-added/480/300')
    g.appendChild(el)
    await new Promise((r) => setTimeout(r, 100))
    const afterAdd = read()
    el.remove()
    await new Promise((r) => setTimeout(r, 100))
    const afterRemove = read()
    return { before, afterAdd, afterRemove }
  })
  expect(synced.afterAdd).toBe(synced.before + 1)
  expect(synced.afterRemove).toBe(synced.before)
})

// 回归：自定义工具栏——模板克隆替换默认按钮组 + oas-toolbar-render 命令通道实际生效。
test('image 自定义工具栏：模板克隆替换默认按钮组，actions 命令接线后缩放/翻页实际生效', async ({ page }) => {
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#image-custom-toolbar')
  await page.locator('#image-custom-toolbar').click()
  await page.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })

  // 模板克隆进工具栏区、默认按钮组被替换；图集页码 1/3
  const toolbarState = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const bar = portal.shadowRoot!.querySelector('[part="preview-toolbar"]')!
    return {
      customCount: bar.querySelectorAll('[data-cmd]').length,
      hasDefaultTool: bar.querySelector('.tool') !== null,
      counter: portal.shadowRoot!.querySelector('[part="preview-counter"]')!.textContent,
    }
  })
  expect(toolbarState.customCount).toBe(8)
  expect(toolbarState.hasDefaultTool).toBe(false)
  expect(toolbarState.counter).toBe('1/3')

  // 点击自定义「放大」→ 预览图 transform 实际变化（命令通道接线生效）
  await page.evaluate(() => {
    document
      .querySelector('[data-oas-image-preview-portal]')!
      .shadowRoot!.querySelector<HTMLElement>('[data-cmd="zoom-in"]')!
      .click()
  })
  await page.waitForFunction(
    () => {
      const portal = document.querySelector('[data-oas-image-preview-portal]')!
      const img = portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!
      return img.style.transform.includes('scale(1.5)')
    },
    null,
    { timeout: 15000 },
  )

  // 点击自定义「下一张」→ 页码 2/3
  await page.evaluate(() => {
    document
      .querySelector('[data-oas-image-preview-portal]')!
      .shadowRoot!.querySelector<HTMLElement>('[data-cmd="next"]')!
      .click()
  })
  await page.waitForFunction(
    () =>
      document.querySelector('[data-oas-image-preview-portal]')!.shadowRoot!.querySelector('[part="preview-counter"]')!
        .textContent === '2/3',
    null,
    { timeout: 15000 },
  )

  // 焦点陷阱（真实浏览器）：shadow 内聚焦在 document 层重定向到 host，
  // 首尾环绕必须读 shadow activeElement——从最后按钮 Tab 不得逃逸出浮层
  const focusWrap = await page.evaluate(() => {
    const root = document.querySelector('[data-oas-image-preview-portal]')!.shadowRoot!
    const last = root.querySelector<HTMLElement>('[data-cmd="close"]')!
    const first = root.querySelector<HTMLElement>('[data-cmd="zoom-out"]')!
    last.focus()
    const seq: Array<string | null> = []
    for (let i = 0; i < root.querySelectorAll('[data-cmd]').length + 2; i++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
      seq.push(root.activeElement?.getAttribute('data-cmd') ?? root.activeElement?.getAttribute('part') ?? null)
    }
    // Shift+Tab 从首个按钮往回环绕
    first.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    )
    const shiftWrap = root.activeElement?.getAttribute('data-cmd') ?? root.activeElement?.getAttribute('part') ?? null
    return { seq, shiftWrap }
  })
  // Tab 循环始终落在浮层内（自定义按钮或翻页箭头上），不出现 null（逃逸到 body）；
  // 当前为 2/3（prev 启用），首项为 DOM 顺序首个可聚焦元素（prev 翻页箭头或首个自定义按钮）
  expect(focusWrap.seq.every((s) => s !== null)).toBe(true)
  expect(['preview-prev', 'zoom-out']).toContain(focusWrap.seq[0])
  // Shift+Tab 从首个按钮环绕到浮层内最后一项（关闭按钮或翻页箭头）
  expect(focusWrap.shiftWrap).not.toBeNull()

  // Esc 关闭：portal 拆除，无孤儿浮层
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('[data-oas-image-preview-portal]') === null, null, {
    timeout: 15000,
  })
})

test('image 懒加载：视口外图片不加载（img 无 src、占位显示），滚动进入视口后逐图加载', async ({ page }) => {
  // 回归：lazy 必须真正延迟加载——视口外 img 没有 src，进入视口后才发起加载。
  // 外部图床（picsum）不可靠：断网可能一直挂起而不返回错误，导致 error 事件不触发、
  // fallback 不接管、aria-busy 永远不复位。这里统一拦截 picsum 让其立即失败，
  // 走「外链失败 → fallback」的确定性路径，校验用户实际看到的状态。
  await page.route('**/picsum.photos/**', (route) => route.abort())
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-image[lazy]')
  // 动态创建的懒加载列表由 demo onMounted 填充，静态首图存在不代表列表已建完
  await page.waitForFunction(() => document.querySelectorAll('#image-lazy-list oas-image[lazy]').length >= 6, null, {
    timeout: 15000,
  })
  // 懒加载列表块整体位于页面首屏之外（demo 页需先滚页面才可见）——
  // 仅滚内层容器时列表块仍在视口外，IO 永远不触发。先把列表整体滚入页面视口。
  await page.evaluate(() => document.querySelector('#image-lazy-list')?.scrollIntoView())
  await page.locator('#image-lazy-list').evaluate((el) => (el.scrollTop = 0))
  const state = await page.evaluate(() => {
    const list = document.querySelector('#image-lazy-list')!
    const imgs = [...list.querySelectorAll('oas-image[lazy]')]
    const noSrc = imgs.filter((i) => {
      const img = i.shadowRoot?.querySelector('img')
      return img && !img.hasAttribute('src')
    })
    return { total: imgs.length, noSrc: noSrc.length }
  })
  expect(state.total).toBeGreaterThan(5)
  expect(state.noSrc, '列表底部应有未加载的图片').toBeGreaterThan(0)
  // 逐步滚动内层列表到底部（模拟真实浏览：每屏都经过视口，IO 逐屏触发加载；
  // 一次滚到底会跳过中间项，这些项从未进入视口 → 永远不加载，属于正确懒加载行为）。
  // 注意：懒加载图片读入后从占位高度（160）长到真实尺寸（约 287），列表 scrollHeight
  // 随加载持续变大，故每轮必须重读 max，直到 scrollTop 停在稳定底部（内容不再增长）。
  await page.evaluate(async () => {
    const list = document.querySelector('#image-lazy-list') as HTMLElement
    let lastMax = -1
    let stable = 0
    let guard = 0
    while (guard < 400) {
      const max = list.scrollHeight - list.clientHeight
      if (list.scrollTop < max) {
        list.scrollTop = Math.min(list.scrollTop + 150, max)
      } else if (max === lastMax) {
        stable++
        if (stable >= 3) break
      } else {
        stable = 0
      }
      lastMax = max
      await new Promise((r) => setTimeout(r, 80))
      guard++
    }
  })
  await page.waitForFunction(
    () => {
      const list = document.querySelector('#image-lazy-list')!
      const imgs = [...list.querySelectorAll('oas-image[lazy]')]
      return (
        imgs.length > 0 &&
        imgs.every((i) => {
          const img = i.shadowRoot?.querySelector('img')
          return img && img.hasAttribute('src')
        })
      )
    },
    null,
    { timeout: 20000 },
  )
  // 状态机收尾：首批（列表首个）加载完成后 aria-busy 从 true 复位为 false
  await page.waitForFunction(
    () => {
      const first = document.querySelector('#image-lazy-list oas-image[lazy]')!
      return first.getAttribute('aria-busy') === 'false'
    },
    null,
    { timeout: 15000 },
  )
})

test('image 预览：双指捏合缩放可用（pointer 双触点驱动 scale，与单指拖拽共存）', async ({ page }) => {
  // 固化缺口：预览缩放只有滚轮 + 按钮步进，触屏无 pinch。修复：预览舞台 pointer 双触点
  // 捏合（touch-action:none 既有），指距比例驱动缩放、锚定双指中点；单指拖拽平移不受影响。
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#image-preview')
  await page.locator('#image-preview').click()
  await page.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })
  const t0 = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const img = portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!
    return img.style.transform
  })
  await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const stage = portal.shadowRoot!.querySelector<HTMLElement>('.preview-stage')!
    stage.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 300, button: 0, pointerId: 1 }))
    stage.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 300, button: 0, pointerId: 2 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 300, pointerId: 1 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 300, pointerId: 2 }))
  })
  const t1 = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    return portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!.style.transform
  })
  expect(t0).toContain('scale(1)')
  // 指距 200 → 300（1.5 倍），双指中点右移 → scale 1.5 且带平移跟随
  expect(t1).toContain('scale(1.5)')
  expect(t1).not.toBe(t0)
  // 抬起一指后结束：剩余指针移动不再缩放
  await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const stage = portal.shadowRoot!.querySelector<HTMLElement>('.preview-stage')!
    stage.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 300, pointerId: 1 }))
  })
  const t2 = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    return portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!.style.transform
  })
  expect(t2).toContain('scale(1.5)')
})

// —— 移动端视觉复核缺陷：预览工具栏窄屏挤压，7 个工具钮标签竖排两行（「放/大」分行）——
// 修复：工具钮 white-space:nowrap 不竖排分行；coarse 下工具栏限宽横向滚动收纳。
test('image 预览工具栏窄屏（coarse 375/320）：工具钮单行等高不竖排，工具栏横向滚动收纳', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 667 } })
  const p = await ctx.newPage()
  await p.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(p, '#image-preview')
  await p.locator('#image-preview').click()
  await p.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })
  const r = await p.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const bar = portal.shadowRoot!.querySelector<HTMLElement>('.preview-toolbar')!
    const tools = [...bar.querySelectorAll<HTMLElement>('.tool')]
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const heights = tools.map((t) => t.getBoundingClientRect().height)
    return {
      coarse,
      count: tools.length,
      maxH: Math.max(...heights),
      minH: Math.min(...heights),
      barOverflowX: getComputedStyle(bar).overflowX,
      barClientW: bar.clientWidth,
      barScrollW: bar.scrollWidth,
    }
  })
  expect(r.coarse, 'touch context 应命中 pointer: coarse').toBe(true)
  expect(r.count).toBeGreaterThanOrEqual(7)
  // 竖排分行的直接特征：某个钮被压成两行高（>40px）或同排钮高不一致
  expect(r.maxH, '工具钮应保持单行高度（≤40px）').toBeLessThanOrEqual(40)
  expect(r.maxH - r.minH, '同排工具钮高度应一致').toBeLessThanOrEqual(1)
  expect(r.barOverflowX, 'coarse 下工具栏应横向滚动收纳').toBe('auto')
  await ctx.close()
})
