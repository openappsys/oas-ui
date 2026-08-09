import { test, expect } from '@playwright/test'

// 复核回归：把历次人工复核发现并修复的缺陷固化为断言，防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { timeout: 15000 })
  await p.waitForFunction(
    (s) => document.querySelector(s)?.shadowRoot != null,
    sel,
    { timeout: 15000 },
  )
}

test('button-group 单选选中态可见（primary 字 + 浅底）', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[value]')!
    const sel = [...group.querySelectorAll('oas-button')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )!
    const cs = getComputedStyle(sel.shadowRoot!.querySelector('[part=button]')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).not.toBe('rgb(24, 24, 27)') // 不能与普通按钮同色
  expect(r.bg).not.toBe('rgb(255, 255, 255)')
})

test('button-group 多选点击切换选中态', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[multiple] oas-button')
  const b = page.locator('oas-button-group[multiple] oas-button[value="b"]')
  const before = await b.getAttribute('aria-pressed')
  await b.click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-button-group[multiple] oas-button[value="b"]')
        ?.getAttribute('aria-pressed') !== 'false',
    null,
    { timeout: 5000 },
  )
  const after = await b.getAttribute('aria-pressed')
  expect(after).toBe('true')
  expect(before).toBe('false')
})

test('button-group 纵向布局生效 + 圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[vertical] oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[vertical]')!
    const inner = group.shadowRoot!.querySelector('[part=group]')!
    const cs = getComputedStyle(inner)
    const btns = [...group.querySelectorAll('oas-button')]
    const boxes = btns.map((b) => b.getBoundingClientRect())
    const radii = btns.map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius},${c.borderBottomRightRadius},${c.borderBottomLeftRadius}`
    })
    return {
      flexDirection: cs.flexDirection,
      stackedVertically: boxes[1]!.y > boxes[0]!.y && boxes[1]!.x === boxes[0]!.x,
      radii,
    }
  })
  expect(r.flexDirection).toBe('column')
  expect(r.stackedVertically).toBe(true)
  expect(r.radii[0]).toBe('6px,6px,0px,0px') // 首：上圆角
  expect(r.radii[1]).toBe('0px,0px,0px,0px') // 中：直角
  expect(r.radii[2]).toBe('0px,0px,6px,6px') // 尾：下圆角
})

test('button-group 横向圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group')!
    return [...group.querySelectorAll('oas-button')].map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius}`
    })
  })
  expect(r[0]).toBe('6px,0px')
  expect(r[1]).toBe('0px,0px')
  expect(r[2]).toBe('0px,6px')
})

test('tag primary clickable hover 文字可读（白字）', async ({ page }) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[clickable][type="primary"]')
  const tag = page.locator('oas-tag[clickable][type="primary"]').first()
  await tag.hover()
  const r = await tag.evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot!.querySelector('.tag')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).toBe('rgb(255, 255, 255)') // 白字不被主题色覆盖
  expect(r.bg).not.toBe(r.color) // 底与字不同色
})

test('link href="#" 点击不滚动页面', async ({ page }) => {
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const link = page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-link')
  await link.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const before = await page.evaluate(() => window.scrollY)
  await link.click()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => window.scrollY)
  expect(after).toBe(before)
  expect(after).toBeGreaterThan(0)
})

test('input addon 属性在 Vue demo 中存活并渲染', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input[addon-before]')
  const attrs = await page.evaluate(
    () => [...document.querySelectorAll('oas-input')].map((el) => el.getAttribute('addon-before')),
  )
  expect(attrs.some((v) => v !== null)).toBe(true)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-input[addon-before]')!
    return el.shadowRoot?.querySelector('[part="prepend"]')?.textContent ?? null
  })
  expect(r).toBe('http://')
})

test('demo 事件反馈（点击 button 弹出 message）', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-button').click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const n = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  expect(n).toBeGreaterThan(0)
})

test('table SPA 导航后数据不丢（Vue property 赋值反射到 attribute）', async ({ page }) => {
  // 曾现 bug：oas-table 的 data/columns 是 class 字段，Vue SPA 渲染时走 property 赋值而非
  // setAttribute，组件只读 attribute → 表格空，强刷（SSR attribute 水合）才有数据。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('a[href="/components/table.html"]', {
    state: 'attached',
    timeout: 10000,
  })
  // 折叠侧栏里的链接不可见，直接 DOM click 走 Vue Router（等价用户 SPA 点进去）
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/components/table.html"]')!.click()
  })
  await page.waitForURL('**/components/table.html')
  await page.waitForSelector('oas-table', { timeout: 10000 })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-table')].map((t) => ({
      rows: t.shadowRoot?.querySelectorAll('tbody tr').length ?? -1,
      dataLen: t.getAttribute('data')?.length ?? 0,
    })),
  )
  // dataLen>2（非空 data="[]"）的表格必须渲染出数据行
  const nonEmpty = r.filter((t) => t.dataLen > 2)
  expect(nonEmpty.length).toBeGreaterThan(5)
  for (const t of nonEmpty) {
    expect(t.rows, `表格数据 ${t.dataLen}B 但行数 ${t.rows}`).toBeGreaterThan(0)
  }
})

test('tree 虚拟滚动渲染真实 label 而非 [object Object]', async ({ page }) => {
  // 曾现 bug：virtual-list 先写 String(item) 兜底文本再派发 oas-item，
  // tree 填充的行与 "[object Object]" 并存。修复为先派发、宿主没填才兜底。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-virtual')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-virtual')!
    const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
    const items = [...vlist.shadowRoot!.querySelectorAll('[part=item]')]
    return {
      hasObjectObject: items.some((el) => el.textContent?.includes('[object Object')),
      firstLabel: items[0]?.querySelector('.row .label')?.textContent ?? '',
    }
  })
  expect(r.hasObjectObject).toBe(false)
  expect(r.firstLabel).toContain('节点')
})

test('timeline 圆点中心与连接线中心对齐', async ({ page }) => {
  // 曾现 bug：.dot 未设 box-sizing，content-box 下总宽 14px 圆心 7px，线心 5px，偏右 2px。
  await page.goto('/components/timeline.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-timeline')
  const r = await page.evaluate(() => {
    const item = document.querySelector('oas-timeline')!.shadowRoot!.querySelector('.item')!
    const dot = item.querySelector('.dot')!
    const dotBox = dot.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    return {
      diff: Math.abs(dotBox.left + dotBox.width / 2 - (itemBox.left + 5)),
      dotWidth: dotBox.width,
    }
  })
  expect(r.dotWidth).toBe(10)
  expect(r.diff).toBeLessThanOrEqual(1)
})
