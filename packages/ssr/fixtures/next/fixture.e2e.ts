import { test, expect, type Page } from '@playwright/test'

/**
 * T11 Next fixture 验收（生产构建 + `next start`）：
 * 1. 冷/热混合 locale 请求：同一进程连续请求 zh-CN / en-US / ar，再回到 zh-CN（热），逐 ID 校验文案；
 * 2. 禁 JS：DSD 快照必须自带全部文本与结构（区分服务端渲染 vs 客户端补渲染）；
 * 3. 水合：延迟客户端 chunk 后给快照 shadow 内的 style 打标，客户端注册完成后标记必须仍在
 *    （证明真水合复用原 shadow root，而不是重建）；
 * 4. tool-call 真实点击：展开/收起各一次，`oas-toggle` 每次点击恰好一次；
 * 5. 三种 locale 导航 console error/warning 与 pageerror 均为零。
 */

const CASES = [
  { path: '/zh-CN', request: 'zh-CN', render: 'zh-CN', empty: '暂无数据', select: '请选择', tool: '已完成' },
  { path: '/en-US', request: 'en-US', render: 'en', empty: 'No data', select: 'Please select', tool: 'Completed' },
  { path: '/ar', request: 'ar', render: 'ar', empty: 'لا توجد بيانات', select: 'يرجى الاختيار', tool: 'مكتمل' },
] as const

const HOSTS = {
  empty: 'oas-empty',
  table: 'oas-table',
  select: 'oas-select',
  tool: 'oas-tool-call',
} as const

/** 读自定义元素 shadow root 的文本（DSD 解析后与升级后都可用） */
async function shadowText(page: Page, caseId: keyof typeof HOSTS): Promise<string> {
  return page
    .locator(`[data-case="${caseId}"] ${HOSTS[caseId]}`)
    .evaluate((el) => (el.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim())
}

test.describe('Next.js App Router fixture', () => {
  test('冷/热混合 locale 请求逐 ID 语言正确且请求互不串扰', async ({ page, request }) => {
    // 顺序：zh-CN（冷）→ en-US → ar → zh-CN（热，验证无全局 locale 锁）
    const order = [...CASES, CASES[0]]

    for (const item of order) {
      // 原始响应即含 DSD 与目标语言文本（不是客户端补渲染）
      const response = await request.get(item.path)
      expect(response.status(), item.path).toBe(200)
      const html = await response.text()
      expect(html, item.path).toContain('shadowrootmode="open"')
      expect(html, item.path).toContain(`data-locale="${item.render}"`)
      expect(html, item.path).toContain(`data-request-locale="${item.request}"`)
      expect(html, `${item.path} empty`).toContain(item.empty)
      expect(html, `${item.path} tool`).toContain(item.tool)
      expect(html, `${item.path} select`).toContain(item.select)
      for (const other of CASES) {
        if (other.path === item.path) continue
        expect(html, `${item.path} 不应含 ${other.request} 文案`).not.toContain(other.empty)
        expect(html, `${item.path} 不应含 ${other.request} 文案`).not.toContain(other.tool)
        expect(html, `${item.path} 不应含 ${other.request} 文案`).not.toContain(other.select)
      }

      await page.goto(item.path)
      expect(await page.locator('main').getAttribute('data-locale')).toBe(item.render)
      expect(await page.locator('main').getAttribute('dir')).toBe(item.render === 'ar' ? 'rtl' : 'ltr')
      // 文档级语义：<html lang> 跟随内容语言（en-US 请求归一为 en），<html dir> 为 RTL/LTR
      expect(await page.locator('html').getAttribute('lang')).toBe(item.render)
      expect(await page.locator('html').getAttribute('dir')).toBe(item.render === 'ar' ? 'rtl' : 'ltr')
      await expect.poll(() => shadowText(page, 'empty'), { message: `${item.path} oas-empty` }).toContain(item.empty)
      await expect.poll(() => shadowText(page, 'table'), { message: `${item.path} oas-table` }).toContain(item.empty)
      await expect.poll(() => shadowText(page, 'select'), { message: `${item.path} oas-select` }).toContain(item.select)
      await expect.poll(() => shadowText(page, 'tool'), { message: `${item.path} oas-tool-call` }).toContain(item.tool)
    }
  })

  test('禁 JS 时 DSD 快照逐 ID 可见（服务端渲染证据）', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      for (const item of CASES) {
        const response = await page.goto(item.path)
        expect(response?.status(), item.path).toBe(200)

        const snapshot = await page.evaluate(() => {
          const read = (id: string, tag: string) => {
            const el = document.querySelector(`[data-case="${id}"] ${tag}`)
            return {
              host: el !== null,
              shadow: el?.shadowRoot !== null && el?.shadowRoot !== undefined,
              text: (el?.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim(),
            }
          }
          return {
            empty: read('empty', 'oas-empty'),
            table: read('table', 'oas-table'),
            select: read('select', 'oas-select'),
            tool: read('tool', 'oas-tool-call'),
            // DSD 模板已被 HTML 解析器消费：页面上不应残留可再次解析的 shadowrootmode 模板
            leftoverTemplates: document.querySelectorAll('template[shadowrootmode]').length,
            clientRegistered: typeof customElements.get === 'function' && !!customElements.get('oas-empty'),
          }
        })

        for (const [id, expected] of [
          ['empty', item.empty],
          ['table', item.empty],
          ['select', item.select],
          ['tool', item.tool],
        ] as const) {
          const seen = snapshot[id]
          expect(seen.host, `${item.path} ${id} 宿主存在`).toBe(true)
          expect(seen.shadow, `${item.path} ${id} 已附加 shadow root`).toBe(true)
          expect(seen.text, `${item.path} ${id} 文案`).toContain(expected)
        }
        expect(snapshot.leftoverTemplates, `${item.path} DSD 模板不残留`).toBe(0)
        // 禁 JS 场景下组件不可能被注册/升级：文本只能来自服务端快照
        expect(snapshot.clientRegistered, `${item.path} 组件未注册`).toBe(false)
      }
      // 暗色同样禁 JS：token 来自根级 data-theme（middleware 把 ?theme= 提升为请求头）
      await page.goto('/zh-CN?theme=dark')
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
      await expect.poll(() => shadowText(page, 'empty')).toContain('暂无数据')
    } finally {
      await context.close()
    }
  })

  test('水合复用 DSD shadow root（style/meta 节点引用不重建）', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`[console.${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))

    // 延迟客户端 chunk：在升级发生前给快照节点打标（goto commit + 等 DSD 解析，不触发 load 等待链）
    await page.route('**/_next/static/**/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await route.continue()
    })
    await page.goto('/zh-CN', { waitUntil: 'commit' })
    await page.locator('[data-case="empty"] oas-empty').waitFor({ state: 'attached' })

    const stamped = await page.evaluate(() => {
      const map: Record<string, boolean> = {}
      for (const [id, tag] of Object.entries({
        empty: 'oas-empty',
        table: 'oas-table',
        select: 'oas-select',
        tool: 'oas-tool-call',
      })) {
        const el = document.querySelector(`[data-case="${id}"] ${tag}`)
        const style = el?.shadowRoot?.querySelector('style')
        const meta = el?.shadowRoot?.querySelector('meta[data-oas-ssr]')
        if (style) style.setAttribute('data-hydration-mark', id)
        map[id] = !!style && !!meta
      }
      return map
    })
    expect(stamped).toEqual({ empty: true, table: true, select: true, tool: true })

    // 客户端注册完成 → 组件按 DSD 指纹水合
    await page.waitForFunction(
      () => ['oas-empty', 'oas-table', 'oas-select', 'oas-tool-call'].every((tag) => !!customElements.get(tag)),
      undefined,
      { timeout: 30_000 },
    )
    await page.waitForTimeout(500)

    const after = await page.evaluate(() => {
      const result: Record<string, { mark: string | null; meta: boolean; styleCount: number }> = {}
      for (const [id, tag] of Object.entries({
        empty: 'oas-empty',
        table: 'oas-table',
        select: 'oas-select',
        tool: 'oas-tool-call',
      })) {
        const el = document.querySelector(`[data-case="${id}"] ${tag}`)
        result[id] = {
          mark: el?.shadowRoot?.querySelector('style')?.getAttribute('data-hydration-mark') ?? null,
          meta: !!el?.shadowRoot?.querySelector('meta[data-oas-ssr]'),
          styleCount: el?.shadowRoot?.querySelectorAll('style').length ?? 0,
        }
      }
      return result
    })
    for (const id of Object.keys(HOSTS)) {
      expect(after[id]?.mark, `${id} 的 style 节点被重建（水合未复用快照）`).toBe(id)
      expect(after[id]?.meta, `${id} 的 SSR 指纹 meta 未被消费（hydrate 未接管，走了 render 重建）`).toBe(false)
      // 水合不得重复注入样式表（render 回退会多出一份 style）
      expect(after[id]?.styleCount, `${id} 水合后 shadow 内 style 数量`).toBe(1)
    }
    // 水合后仍是同一语言文案
    await expect.poll(() => shadowText(page, 'empty')).toContain('暂无数据')
    expect(problems).toEqual([])
  })

  test('tool-call 点击展开/收起，oas-toggle 每次点击恰好一次', async ({ page }) => {
    await page.goto('/zh-CN')
    await page.waitForFunction(() => !!customElements.get('oas-tool-call'))

    const host = page.locator('[data-case="tool"] oas-tool-call')
    const head = host.locator('[part="head"]')
    const body = host.locator('[part="body"]')
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(body).toBeHidden()

    await page.evaluate(() => {
      const el = document.querySelector('[data-case="tool"] oas-tool-call')
      const events: Array<{ open: boolean; name: string }> = []
      ;(window as unknown as { __toggleEvents: typeof events }).__toggleEvents = events
      el?.addEventListener('oas-toggle', (event) => {
        events.push((event as CustomEvent).detail)
      })
    })

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(body).toBeVisible()
    await expect.poll(() => host.getAttribute('open')).toBe('')

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(body).toBeHidden()
    await expect.poll(() => host.getAttribute('open')).toBeNull()

    const events = await page.evaluate(
      () => (window as unknown as { __toggleEvents: Array<{ open: boolean; name: string }> }).__toggleEvents,
    )
    expect(events).toEqual([
      { open: true, name: 'search_docs' },
      { open: false, name: 'search_docs' },
    ])
  })

  test('locale 导航 console error/warning 与 pageerror 均为零', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`[console.${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))

    for (const item of CASES) {
      await page.goto(item.path)
      await page.waitForFunction(() => (window as unknown as { __oasClientReady?: boolean }).__oasClientReady === true)
      await expect.poll(() => shadowText(page, 'empty')).toContain(item.empty)
    }
    expect(problems).toEqual([])
  })
})
