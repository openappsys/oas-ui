// 复核回归：barrage 增删/暂停/清空必须反映到真实 DOM 与动画状态。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('barrage 发一条 → 出现；暂停 → 冻结；清空 → 移除', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-demo')

  const demo = page.locator('#bg-demo')
  const items = demo.locator('.item')
  await expect(items).toHaveCount(0)

  await page.click('#bg-add')
  await expect(items).toHaveCount(1)
  // 动画真的在跑（animationName + duration 已写入）
  const anim = await demo.evaluate((el) => {
    const item = (el as HTMLElement).shadowRoot!.querySelector('.item') as HTMLElement
    const cs = getComputedStyle(item)
    return { name: cs.animationName, duration: cs.animationDuration }
  })
  expect(anim.name).toBe('oas-barrage-move')
  // getComputedStyle 的 animation-duration 在浏览器里以秒返回（如 "3.65s"）
  expect(anim.duration.endsWith('s')).toBe(true)
  expect(parseFloat(anim.duration)).toBeGreaterThan(1)

  await page.click('#bg-pause')
  await expect
    .poll(() =>
      demo.evaluate((el) => (el as HTMLElement).shadowRoot!.querySelector('.stage')!.classList.contains('paused')),
    )
    .toBe(true)
  const playState = await demo.evaluate((el) => {
    const item = (el as HTMLElement).shadowRoot!.querySelector('.item') as HTMLElement
    return getComputedStyle(item).animationPlayState
  })
  expect(playState).toBe('paused')
  await expect(items).toHaveCount(1)

  await page.click('#bg-clear')
  await expect(items).toHaveCount(0)
})

test('barrage 断开重连：在场弹幕保留，动画按剩余时间定位（不回到起点）', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-single')

  await page.evaluate(() => {
    const el = document.getElementById('bg-single') as HTMLElement & { add: (t: string) => void }
    // 慢速拉长动画窗口，便于测量「已流逝进度」
    el.setAttribute('speed', '200')
    el.add('断开重连回归')
  })

  const read = () =>
    page.evaluate(() => {
      const el = document.getElementById('bg-single')
      const item = el?.shadowRoot?.querySelector('.item') as HTMLElement | null
      if (!item) return null
      // 动画位移（translateX）：负值越大表示漂得越远
      const x = new DOMMatrix(getComputedStyle(item).transform).m41
      return { x, delay: item.style.animationDelay, count: el!.shadowRoot!.querySelectorAll('.item').length }
    })

  await expect.poll(async () => (await read())?.count ?? 0).toBe(1)
  // 等动画真正漂离进场位（条件等待，不用固定 sleep）
  await page.waitForFunction(
    () => {
      const item = document.querySelector('#bg-single')?.shadowRoot?.querySelector('.item') as HTMLElement | null
      return !!item && new DOMMatrix(getComputedStyle(item).transform).m41 < -100
    },
    undefined,
    { timeout: 8000 },
  )
  const before = await read()

  // 摘挂宿主（路由缓存 / 条件渲染）：CSS 动画在重挂后从头播放，组件须按剩余时间校正进度。
  // 摘挂前在页面内记时间戳，重挂后按实测流逝时长换算期望位移——不依赖固定等待值。
  const detachedAt = await page.evaluate(() => {
    const w = window as unknown as { __bgSingle?: { el: Element; parent: Element } }
    const el = document.getElementById('bg-single')!
    w.__bgSingle = { el, parent: el.parentElement! }
    const t = performance.now()
    el.remove()
    return t
  })
  // 真实时间流逝 ≥600ms 后才挂回（CSS 动画进度由合成器时钟驱动，必须等真实时间）
  await page.evaluate(
    (target) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now()
        const tick = () => (performance.now() - t0 >= target ? resolve() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
        setTimeout(resolve, target + 200)
      }),
    600,
  )
  const after = await page.evaluate((t0) => {
    const w = window as unknown as { __bgSingle?: { el: Element; parent: Element } }
    const held = w.__bgSingle!
    held.parent.appendChild(held.el)
    const el = document.getElementById('bg-single')
    const item = el?.shadowRoot?.querySelector('.item') as HTMLElement | null
    if (!item) return null
    return {
      x: new DOMMatrix(getComputedStyle(item).transform).m41,
      delay: item.style.animationDelay,
      count: el!.shadowRoot!.querySelectorAll('.item').length,
      elapsed: performance.now() - t0,
    }
  }, detachedAt)

  expect(after!.count, '重连不得清空在场弹幕').toBe(1)
  expect(after!.delay, 'CSS 动画必须按剩余时间负向延迟').toMatch(/^-\d+(?:\.\d+)?ms$/)
  // 重挂后位移 = 摘挂时位移 - 摘挂期间应走的距离（speed=200px/s）；重置到起点会差一整个已流逝距离
  const travel = (200 * after!.elapsed) / 1000
  expect(Math.abs(after!.x - (before!.x - travel)), '重连后动画必须续接到原进度').toBeLessThan(30)

  // JS 离场计时同口径：之后按原定时刻消失（不滞留、不提前）
  await expect.poll(async () => (await read())?.count ?? 0, { timeout: 15000 }).toBe(0)
})

test('barrage RTL 断开重连：镜像关键帧保持 + 负延迟续播（自原进度继续向右）', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-rtl')

  await page.evaluate(() => {
    const el = document.getElementById('bg-rtl') as HTMLElement & { add: (t: string) => void }
    // 拉长动画窗口，便于测量已流逝进度
    el.setAttribute('speed', '200')
    el.add('RTL 重连回归')
  })

  const read = () =>
    page.evaluate(() => {
      const el = document.getElementById('bg-rtl')
      const item = el?.shadowRoot?.querySelector('.item') as HTMLElement | null
      if (!item) return null
      return {
        x: new DOMMatrix(getComputedStyle(item).transform).m41,
        delay: item.style.animationDelay,
        name: getComputedStyle(item).animationName,
        rtl: el!.hasAttribute('data-rtl'),
        count: el!.shadowRoot!.querySelectorAll('.item').length,
      }
    })

  await expect.poll(async () => (await read())?.count ?? 0).toBe(1)
  // RTL 弹幕向右推进（正向位移）：等它真正离开进场位
  await page.waitForFunction(
    () => {
      const item = document.querySelector('#bg-rtl')?.shadowRoot?.querySelector('.item') as HTMLElement | null
      return !!item && new DOMMatrix(getComputedStyle(item).transform).m41 > 60
    },
    undefined,
    { timeout: 8000 },
  )
  const before = (await read())!
  expect(before.name, 'RTL 下必须使用镜像关键帧').toBe('oas-barrage-move-rtl')
  expect(before.rtl).toBe(true)

  const detachedAt = await page.evaluate(() => {
    const w = window as unknown as { __bgRtl?: { el: Element; parent: Element } }
    const el = document.getElementById('bg-rtl')!
    w.__bgRtl = { el, parent: el.parentElement! }
    const t = performance.now()
    el.remove()
    return t
  })
  await page.evaluate(
    (target) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now()
        const tick = () => (performance.now() - t0 >= target ? resolve() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
        setTimeout(resolve, target + 200)
      }),
    600,
  )
  const after = await page.evaluate((t0) => {
    const w = window as unknown as { __bgRtl?: { el: Element; parent: Element } }
    const held = w.__bgRtl!
    held.parent.appendChild(held.el)
    const el = document.getElementById('bg-rtl')
    const item = el?.shadowRoot?.querySelector('.item') as HTMLElement | null
    if (!item) return null
    return {
      x: new DOMMatrix(getComputedStyle(item).transform).m41,
      delay: item.style.animationDelay,
      name: getComputedStyle(item).animationName,
      rtl: el!.hasAttribute('data-rtl'),
      count: el!.shadowRoot!.querySelectorAll('.item').length,
      elapsed: performance.now() - t0,
    }
  }, detachedAt)

  expect(after!.count, 'RTL 重连不得清空在场弹幕').toBe(1)
  expect(after!.rtl, '重连后 RTL 标记仍在（镜像关键帧不回落 LTR）').toBe(true)
  expect(after!.name, '重连后仍是 RTL 镜像关键帧').toBe('oas-barrage-move-rtl')
  expect(after!.delay, 'RTL 重连同样按剩余时间负向延迟').toMatch(/^-\d+(?:\.\d+)?ms$/)
  // 向右位移继续累加（speed=200px/s）；重置到起点会明显偏小
  const travel = (200 * after!.elapsed) / 1000
  expect(Math.abs(after!.x - (before!.x + travel)), 'RTL 重连后动画必须续接到原进度').toBeLessThan(30)
  await expect.poll(async () => (await read())?.count ?? 0, { timeout: 15000 }).toBe(0)
})

test('barrage reduced-motion 重连：20ms 时长显式生效（不按舞台宽度重算）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-single')
  // 同一次任务内：挂载（20ms 时长）→ 立即暂停（冻结剩余时间并清计时器），保证重连时有在场弹幕
  await page.evaluate(() => {
    const el = document.getElementById('bg-single') as HTMLElement & { add: (t: string) => void }
    el.removeAttribute('paused')
    el.add('降级重连')
    el.setAttribute('paused', '')
  })
  const mounted = await page.evaluate(() => {
    const el = document.getElementById('bg-single')!
    const item = el.shadowRoot!.querySelector('.item') as HTMLElement | null
    return item
      ? { duration: item.style.animationDuration, count: el.shadowRoot!.querySelectorAll('.item').length }
      : null
  })
  expect(mounted, 'reduced-motion 下仍需有在场弹幕（暂停冻结）').toEqual({ duration: '20ms', count: 1 })

  await page.evaluate(() => {
    const w = window as unknown as { __bgReduced?: { el: Element; parent: Element } }
    const el = document.getElementById('bg-single')!
    w.__bgReduced = { el, parent: el.parentElement! }
    el.remove()
  })
  await page.waitForFunction(() => {
    const w = window as unknown as { __bgReduced?: { el: Element } }
    return !!w.__bgReduced && !document.body.contains(w.__bgReduced.el)
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const t0 = performance.now()
        const tick = () => (performance.now() - t0 >= 250 ? resolve() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
  )
  const after = await page.evaluate(() => {
    const w = window as unknown as { __bgReduced?: { el: Element; parent: Element } }
    const held = w.__bgReduced!
    held.parent.appendChild(held.el)
    const el = document.getElementById('bg-single')!
    const item = el.shadowRoot!.querySelector('.item') as HTMLElement | null
    return item
      ? {
          count: el.shadowRoot!.querySelectorAll('.item').length,
          duration: item.style.animationDuration,
          delay: item.style.animationDelay,
          paused: el.shadowRoot!.querySelector('.stage')!.classList.contains('paused'),
        }
      : { count: 0, duration: '', delay: '', paused: false }
  })
  expect(after.count, 'reduced-motion 重连保留在场弹幕').toBe(1)
  expect(after.duration, '重连后仍是 20ms 降级时长（不按舞台宽度重算）').toBe('20ms')
  // 负延迟不得超过 20ms 窗口（冻结位置在窗口内）
  expect(Math.abs(Number.parseFloat(after.delay || '0')), '负延迟应落在 20ms 窗口内').toBeLessThanOrEqual(20)
  expect(after.paused, '重连后暂停态保持').toBe(true)

  // 恢复：JS 离场计时按剩余时间（≤20ms）重挂，弹幕不滞留
  await page.evaluate(() => document.getElementById('bg-single')!.removeAttribute('paused'))
  await expect
    .poll(
      () => page.evaluate(() => document.getElementById('bg-single')!.shadowRoot!.querySelectorAll('.item').length),
      { timeout: 3000 },
    )
    .toBe(0)
})

test('barrage 点击弹幕派发 oas-item-click（暂停后点，目标位置固定）', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-demo')

  const demo = page.locator('#bg-demo')
  const output = page.locator('#bg-output')
  await page.click('#bg-add')
  await expect(demo.locator('.item')).toHaveCount(1)
  // 冻结动画：漂移中的弹幕点击目标不稳定（demo 自己也有暂停按钮）。
  // 满载 webkit 下点暂停按钮后动画收尾有延迟，actionable click 轮询会一直重试直至测试
  // 超时——改为直接置 paused 属性（与 RTL 用例同通道）并轮询冻结生效，再元素级点击
  await demo.evaluate((el) => el.setAttribute('paused', ''))
  await expect
    .poll(() =>
      demo.evaluate((el) => {
        const item = el.shadowRoot!.querySelector('.item') as HTMLElement
        return getComputedStyle(item).animationPlayState
      }),
    )
    .toBe('paused')
  // 满载 webkit 下弹幕冻结停驻点可能落在裁剪边缘/被遮挡处，actionable click 轮询会耗尽
  // 测试预算（CI run 1774 实发 120s×2）——元素级派发 click：组件「点击弹幕 → oas-item-click」
  // 的接线同一事件通道，与命中测试无关
  await demo.locator('.item').first().dispatchEvent('click')
  await expect(output).toHaveText(/oas-item-click/)
})

test('barrage RTL：镜像关键帧生效，弹幕自舞台左侧进场', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-rtl')

  const rtl = page.locator('#bg-rtl')
  // dir="rtl" 祖先 → data-rtl 由 update 同步（镜像样式只在 :host([data-rtl]) 下生效）
  await expect(rtl).toHaveAttribute('data-rtl', '')
  await page.click('#bg-rtl-add')
  await expect(rtl.locator('.item')).toHaveCount(1)
  // 冻结动画后再量几何：动画自挂载即开始跑，高负载下一次 expect 的轮询就可能让它漂出几十像素
  await rtl.evaluate((el) => (el as HTMLElement).setAttribute('paused', ''))

  const geom = await rtl.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const item = root.querySelector('.item') as HTMLElement
    const stage = root.querySelector('.stage') as HTMLElement
    const itemRect = item.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    return {
      name: getComputedStyle(item).animationName,
      itemRight: itemRect.right,
      stageLeft: stageRect.left,
      stageWidth: stageRect.width,
    }
  })
  // LTR 是 oas-barrage-move（负向平移）；RTL 必须换成镜像关键帧，否则弹幕整条飞在舞台左侧外
  expect(geom.name).toBe('oas-barrage-move-rtl')
  // 进场起点落在舞台左半边（自左进场）。沿用 LTR 起点会贴右缘外侧，差值 ≈ 一个舞台宽 + 条目宽
  expect(geom.stageWidth).toBeGreaterThan(100)
  expect(geom.itemRight - geom.stageLeft).toBeLessThan(geom.stageWidth / 2)
})

test('barrage auto-play × banned-words：循环重灌不绕过屏蔽词、首轮不重复 mount（回归）', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-demo')
  // 自建实例（演示页不承载「循环 + 屏蔽词」组合）：speed 拉高让多轮循环在 ~1s 内跑完
  await page.evaluate(() => {
    const el = document.createElement('oas-barrage')
    el.id = 'bg-loop-banned'
    el.setAttribute('items', JSON.stringify(['好弹幕', '广告弹幕']))
    el.setAttribute('banned-words', '广告')
    el.setAttribute('auto-play', '')
    el.setAttribute('tracks', '2')
    el.setAttribute('speed', '6000')
    el.setAttribute('height', '80')
    document.querySelector('.demo-block')!.appendChild(el)
  })
  const host = page.locator('#bg-loop-banned')

  // 采样多轮循环：累计出现过的文本里不得有被屏蔽词命中的条目
  const seen = new Set<string>()
  for (let i = 0; i < 25; i++) {
    const texts = await host.evaluate((el) =>
      [...(el as HTMLElement).shadowRoot!.querySelectorAll('.item')].map((n) => n.textContent ?? ''),
    )
    for (const t of texts) seen.add(t)
    // audit-exception: 循环重灌的多轮采样仪器——重灌是定时动画行为（本轮播完才触发），
    // 「观察到足够多轮」的语义就是按固定节奏采样墙钟时间，无单一 DOM 信号可等
    //（与 carousel autoplay 多轮等待同型）；speed=6000 下 25 × 100ms 覆盖 ≥2 轮重灌
    await page.waitForTimeout(100)
  }
  expect([...seen], 'auto-play 重灌必须走同一屏蔽词判据').toEqual(['好弹幕'])

  // 首轮不重复 mount：同一时刻同一文本最多一条（排空瞬间重灌会双份在场、占双倍轨道）
  const duplicates = await host.evaluate((el) => {
    const texts = [...(el as HTMLElement).shadowRoot!.querySelectorAll('.item')].map((n) => n.textContent ?? '')
    return texts.length - new Set(texts).size
  })
  expect(duplicates).toBe(0)
})

test('barrage：likeable 点赞真实可点（oas-like liked 翻转）+ banned-words 命中不渲染', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-like')

  const host = page.locator('#bg-like')
  const items = host.locator('.item')
  // items 声明四条，其中「广告弹幕会被过滤」命中屏蔽词 → 只入场三条
  await expect(items).toHaveCount(3)
  await expect(host.locator('.item', { hasText: '广告' })).toHaveCount(0)

  // 再发一条命中屏蔽词的：仍不渲染
  await page.click('#bg-like-banned')
  await expect(items).toHaveCount(3)

  // 点赞：心形控件可见、点击后进入已赞态并派发 oas-like（detail 回显到 demo）
  // 弹幕在漂移 → 先暂停（元素静止后 Playwright 的稳定性判定才成立），与既有 item-click 用例同口径
  await host.evaluate((el) => (el as HTMLElement & { pause: () => void }).pause())
  const like = items.first().locator('[part="like"]')
  await expect(like).toBeVisible()
  await like.click()
  await expect(like).toHaveAttribute('data-liked', 'true')
  await expect(page.locator('#bg-like-out')).toContainText('已点赞')
  await expect(like).toHaveAttribute('aria-pressed', 'true')

  // 再点取消
  await like.click()
  await expect(like).not.toHaveAttribute('data-liked', 'true')
  await expect(page.locator('#bg-like-out')).toContainText('已取消点赞')

  // 正常弹幕照常入场（解除暂停后新增条目照常派发）
  await host.evaluate((el) => (el as HTMLElement & { resume: () => void }).resume())
  await page.click('#bg-like-send')
  await expect(items).toHaveCount(4)
})
