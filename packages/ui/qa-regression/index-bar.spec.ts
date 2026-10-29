// 复核回归：index-bar（oas-index-bar）——移动端索引栏真实浏览器固化。
// 覆盖：点字母跳转分节（scrollTop + 高亮 + sticky 对齐）、滚动联动高亮（scrollspy + oas-change 可见反馈）、
// 侧栏拖拽经过字母跳转、条目点击 oas-item-click 可见反馈、RTL 侧栏位于 inline-end。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('index-bar 点字母跳转：滚动到分节、高亮迁移、分节头吸顶对齐', async ({ page }) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-basic')

  const initial = await page.evaluate(() => {
    const host = document.querySelector('#ib-basic') as HTMLElement
    const root = host.shadowRoot!
    const active = root.querySelector('[part="letter"][aria-current="true"]') as HTMLElement
    return { active: active?.textContent, scrollTop: (root.querySelector('[part="list"]') as HTMLElement).scrollTop }
  })
  expect(initial.active, '初始高亮首字母 A').toBe('A')
  expect(initial.scrollTop, '初始未滚动').toBe(0)

  // 真实点击字母 C（pointerdown 路径）
  await page.locator('#ib-basic [part="letter"]', { hasText: 'C' }).click()

  await page.waitForFunction(
    () => {
      const host = document.querySelector('#ib-basic') as HTMLElement
      const root = host.shadowRoot!
      const list = root.querySelector('[part="list"]') as HTMLElement
      const sec = root.querySelectorAll('[part="section"]')[2] as HTMLElement
      const active = root.querySelector('[part="letter"][aria-current="true"]') as HTMLElement
      if (active?.textContent !== 'C') return false
      const delta = Math.abs(sec.getBoundingClientRect().top - list.getBoundingClientRect().top)
      return list.scrollTop > 0 && delta < 30
    },
    { timeout: 5000 },
  )
})

test('index-bar 点字母落定：可滚动 fixture 只派发一次；短内容 + 固定高度（目标不可达）保持选中项、500ms 后仍仅 1 次', async ({
  page,
}) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-basic')

  // 动态夹具：不依赖文档页 demo 数据，锁定两种真实几何
  await page.evaluate(() => {
    const make = (id: string, height: string, perSection: number, sections: number) => {
      const el = document.createElement('oas-index-bar')
      el.id = id
      el.setAttribute('height', height)
      el.setAttribute(
        'sections',
        JSON.stringify(
          Array.from({ length: sections }, (_, s) => ({
            key: String.fromCharCode(65 + s),
            title: String.fromCharCode(65 + s),
            items: Array.from({ length: perSection }, (_, i) => ({
              label: `${String.fromCharCode(65 + s)}${i}`,
            })),
          })),
        ),
      )
      document.body.appendChild(el)
    }
    // 可滚动：3 节 × 12 条目，height=200（点 B 可达，列表内 scrollTop > 0）
    make('ib-qa-scrollable', '200', 12, 3)
    // 不可滚动：2 节 × 1 条目，height=320（内容远短于固定高度，scrollTop 写不进去）
    make('ib-qa-unreachable', '320', 1, 2)
  })
  await up(page, '#ib-qa-scrollable')
  await up(page, '#ib-qa-unreachable')

  for (const fixture of [
    { id: 'ib-qa-scrollable', scrollable: true },
    { id: 'ib-qa-unreachable', scrollable: false },
  ]) {
    await page.evaluate((id) => {
      const w = window as unknown as Window & { __ibEvents: Array<{ key: string }> }
      w.__ibEvents = []
      document.getElementById(id)?.addEventListener('oas-change', (e) => w.__ibEvents.push((e as CustomEvent).detail))
    }, fixture.id)

    // 点击字母 B（第二个）：真实指针点击（pointerdown → jumpTo → 平滑滚动落定）
    await page.locator(`#${fixture.id} [part="letter"]`).nth(1).click()
    // 500ms > 动画 300ms：轮询窗口内的「一次」不是侥幸，落定后仍是用户选中项
    await page.waitForTimeout(500)

    const state = await page.evaluate((id) => {
      const w = window as unknown as Window & { __ibEvents: Array<{ key: string }> }
      const host = document.getElementById(id)!
      const root = host.shadowRoot!
      const list = root.querySelector('[part="list"]') as HTMLElement
      const active = root.querySelector('[part="letter"][aria-current="true"]') as HTMLElement | null
      return { events: w.__ibEvents, active: active?.textContent ?? null, scrollTop: list.scrollTop }
    }, fixture.id)

    expect(state.events, `${fixture.id}：点击后 500ms 事件仍恰好 1 次（不得回退二次派发）`).toEqual([{ key: 'B' }])
    expect(state.active, `${fixture.id}：aria-current 保持目标 B`).toBe('B')
    if (fixture.scrollable) {
      expect(state.scrollTop, `${fixture.id}：可滚动列表应真实滚动`).toBeGreaterThan(0)
    } else {
      expect(state.scrollTop, `${fixture.id}：短内容 scrollTop 恒 0（目标不可达）`).toBe(0)
    }
  }
})

test('index-bar 滚动联动：scrollspy 高亮最近越顶分节 + oas-change demo 可见反馈', async ({ page }) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-events')

  await page.evaluate(() => {
    const host = document.querySelector('#ib-events') as HTMLElement
    const root = host.shadowRoot!
    const list = root.querySelector('[part="list"]') as HTMLElement
    const sec = root.querySelectorAll('[part="section"]')[2] as HTMLElement
    const target = list.scrollTop + sec.getBoundingClientRect().top - list.getBoundingClientRect().top
    list.scrollTop = target
    list.dispatchEvent(new Event('scroll'))
  })

  await page.waitForFunction(
    () => {
      const host = document.querySelector('#ib-events') as HTMLElement
      const root = host.shadowRoot!
      const active = root.querySelector('[part="letter"][aria-current="true"]') as HTMLElement
      return active?.textContent === 'C'
    },
    { timeout: 5000 },
  )
  // demo 可见反馈：oas-change 明细文本更新（非 console）
  await expect(page.locator('#ib-change-out')).toHaveText(/key: "C"/, { timeout: 5000 })
})

test('index-bar 侧栏拖拽：按下经过字母即跳转分节', async ({ page }) => {
  // reduced-motion：平滑滚动瞬时落定（满负载下 Firefox 平滑滚动与 waitForFunction 赛跑曾超时）
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-basic')
  // e2e 指针先 scrollIntoView：720px 视口下字母栏底两个字母可能出屏（x/y 实测），
  // 裸坐标拖拽落空 active 恒 A（Firefox 实抓 30s 超时）
  await page.locator('#ib-basic').scrollIntoViewIfNeeded()

  const letters = page.locator('#ib-basic [part="letter"]')
  const first = await letters.nth(0).boundingBox()
  const last = await letters.nth(5).boundingBox()
  expect(first).not.toBeNull()
  expect(last).not.toBeNull()

  await page.mouse.move(first!.x + first!.width / 2, first!.y + first!.height / 2)
  await page.mouse.down()
  // 逐字母中心点停驻移动：满负载下 pointermove 会被合并，一气呵成的大步移动经过字母覆盖不全
  //（实抓超时）——逐字母停顿给每帧留出发送窗口，与负载无关
  for (let i = 1; i <= 5; i++) {
    const b = (await letters.nth(i).boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForTimeout(60)
  }
  await page.mouse.up()

  await page.waitForFunction(
    () => {
      const host = document.querySelector('#ib-basic') as HTMLElement
      const root = host.shadowRoot!
      const list = root.querySelector('[part="list"]') as HTMLElement
      const letters = [...root.querySelectorAll<HTMLElement>('[part="letter"]')]
      const active = letters.find((l) => l.getAttribute('aria-current') === 'true')
      // 落点容差：两引擎字体度量差会让指针落点映射差 1 个字母（实抓 Chromium=F / Firefox=E）——
      // 锁「跳转到拖拽经过的后段字母」而非精确字母
      return active != null && ['D', 'E', 'F'].includes(active.textContent ?? '') && list.scrollTop > 0
    },
    { timeout: 5000 },
  )
})

test('index-bar 条目点击：oas-item-click 详情写入可见反馈', async ({ page }) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-events')

  await page.locator('#ib-events [part="item"]').first().click()
  await expect(page.locator('#ib-item-out')).toHaveText(/value: "adam"/, { timeout: 5000 })
  await expect(page.locator('#ib-item-out')).toHaveText(/section: "A"/, { timeout: 5000 })
})

test('index-bar 无障碍：分节容器 role=group + aria-labelledby 指向自身分节头（generic 禁命名）', async ({ page }) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-basic')

  const a11y = await page.evaluate(() => {
    const root = document.querySelector('#ib-basic')!.shadowRoot!
    const sections = [...root.querySelectorAll<HTMLElement>('[part="section"]')]
    return sections.map((sec) => {
      const idref = sec.getAttribute('aria-labelledby')
      const target = idref ? root.getElementById(idref) : null
      return {
        role: sec.getAttribute('role'),
        idref,
        targetIsOwnHeader:
          target != null && target === sec.querySelector('[part="section-header"]') && target.id === idref,
        headerRole: target?.getAttribute('role') ?? '',
        headerLevel: target?.getAttribute('aria-level') ?? '',
      }
    })
  })
  expect(a11y.length).toBeGreaterThan(0)
  for (const sec of a11y) {
    // aria-labelledby 挂在无 role 的 div 上是 generic 禁命名（名称会被 AT 丢弃）
    expect(sec.role).toBe('group')
    expect(sec.idref, 'aria-labelledby 必须有值').toBeTruthy()
    expect(sec.targetIsOwnHeader, 'aria-labelledby 必须指向本节分节头').toBe(true)
    expect(sec.headerRole).toBe('heading')
    expect(sec.headerLevel).toBe('2')
  }
})

test('index-bar RTL：侧栏位于 inline-end（LTR 右 / RTL 左）', async ({ page }) => {
  await page.goto('/components/index-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ib-basic')
  await up(page, '#ib-rtl')

  const read = (sel: string) =>
    page.evaluate((s) => {
      const host = document.querySelector(s) as HTMLElement
      const root = host.shadowRoot!
      const list = (root.querySelector('[part="list"]') as HTMLElement).getBoundingClientRect()
      const bar = (root.querySelector('[part="bar"]') as HTMLElement).getBoundingClientRect()
      return { listLeft: list.left, barLeft: bar.left, barRight: bar.right, listRight: list.right }
    }, sel)

  const ltr = await read('#ib-basic')
  expect(ltr.barLeft, 'LTR：侧栏在列表右侧').toBeGreaterThan(ltr.listLeft)

  const rtl = await read('#ib-rtl')
  expect(rtl.barLeft, 'RTL：侧栏在列表左侧').toBeLessThan(rtl.listLeft)
})
