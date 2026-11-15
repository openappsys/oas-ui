import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// infinite（无限滚动 + cursor 分页）真实浏览器回归：滚动触底 → load-more → 追加 → 到底态 →
// 排序重置。happy-dom 无布局几何（clientHeight/scrollHeight 恒 0），触底阈值与真实滚动链路
// 只能在真实浏览器闭环；mock 宿主写法与 table-server.spec.ts 同构（动态注入 fixture +
// 事件监听经 appendRows 回填）。

const builtUiDist = fileURLToPath(new URL('../dist', import.meta.url))

async function serveBuiltUi(page: Page): Promise<void> {
  await page.route('**/__qa_ui__/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    const relative = decodeURIComponent(pathname.replace(/^\/__qa_ui__\//, ''))
    return route.fulfill({
      path: join(builtUiDist, relative),
      contentType: 'text/javascript',
    })
  })
}

function collectConsoleIssues(page: Page): string[] {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-')))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
  return issues
}

async function gotoTablePage(page: Page): Promise<void> {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
}

interface FixtureOpts {
  /** 总行数（游标分页数据源大小） */
  total: number
  /** 每块行数（一次 load-more 追加多少行） */
  chunk: number
  attrs?: Record<string, string>
}

/**
 * 注入 infinite fixture：监听 oas-rows-request 经 appendRows 异步回填（对齐真实宿主 fetch
 * 时序——不在派发同步栈内重入）。游标 = 下块起始偏移（字符串），cursor>=total 回空块（到底信号）。
 * 数据行 name=`行N`（N 为绝对序），便于断言追加块的行内容与顺序。
 */
async function mountInfiniteFixture(page: Page, id: string, opts: FixtureOpts): Promise<void> {
  await page.evaluate(
    ({ id, opts }) => {
      const el = document.createElement('oas-table')
      el.id = id
      el.setAttribute(
        'columns',
        JSON.stringify([
          { key: 'name', title: '名称', sortable: true },
          { key: 'age', title: '年龄' },
        ]),
      )
      el.setAttribute('infinite', '')
      el.setAttribute('row-key', 'name')
      el.setAttribute('max-height', '400')
      el.setAttribute('data', '[]')
      for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
      const state = {
        reqs: [] as Array<{ requestId: number; reason: string; cursor?: string; start: number; totalKnown: boolean }>,
        appended: [] as Array<{ len: number }>,
      }
      ;(window as any)[`__infState_${id}`] = state
      el.addEventListener('oas-rows-request', (e) => {
        const d = (e as CustomEvent).detail
        state.reqs.push({
          requestId: d.requestId,
          reason: d.reason,
          cursor: d.cursor,
          start: d.start,
          totalKnown: d.totalKnown,
        })
        // 异步回填（setTimeout 0）：对齐真实宿主 fetch 时序，防渲染管线同步重入
        setTimeout(() => {
          const start = typeof d.cursor === 'string' ? Number(d.cursor) : 0
          if (start >= opts.total) {
            ;(el as any).appendRows([], { requestId: d.requestId, cursor: String(opts.total), total: opts.total })
            return
          }
          const end = Math.min(start + opts.chunk, opts.total)
          const rows = Array.from({ length: end - start }, (_, i) => ({
            name: `行${start + i}`,
            age: start + i,
          }))
          ;(el as any).appendRows(rows, {
            requestId: d.requestId,
            cursor: String(end >= opts.total ? opts.total : end),
            total: opts.total,
          })
          state.appended.push({ len: rows.length })
        }, 0)
      })
      // fixed 定位隔离容器：fixture 不进文档流（文档站 aside 浮层不拦 pointer 事件，同
      // table-server.spec.ts 先例）；容器限宽防表体横向撑爆
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px;width:420px'
      host.appendChild(el)
      document.body.appendChild(host)
    },
    { id, opts },
  )
}

const stateOf = (page: Page, id: string) => page.evaluate((id) => (window as any)[`__infState_${id}`], id)

/** 滚动 infinite 表的滚动容器到指定位置（真实滚动事件链） */
async function scrollInfiniteTable(page: Page, id: string, top: number): Promise<void> {
  await page.evaluate(
    ({ id, top }) => {
      const wrap = document.querySelector(`#${id}`)!.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      wrap.scrollTop = top
      wrap.dispatchEvent(new Event('scroll'))
    },
    { id, top },
  )
}

const noMoreRow = (page: Page, id: string) => page.locator(`#${id} [part="no-more-row"]`)

/** 等 N 个真实渲染帧（触底检测走 requestAnimationFrame——确定性等待，不用固定 sleep） */
async function runScrollFrames(page: Page, frames = 4): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let n = 0
        const tick = (): void => {
          if (++n >= frames) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    frames,
  )
}

test('table infinite：滚动触底 load-more → 追加 → 到底态 → 排序重置 + A11y + console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)
  await mountInfiniteFixture(page, 'table-inf-e2e', { total: 60, chunk: 30 })

  // ① init：挂载即派首载（totalKnown=true——total 经回填提供前属性未在，首请求 totalKnown=false）
  const state0 = await stateOf(page, 'table-inf-e2e')
  expect(state0.reqs.length, 'init 请求恰好一次').toBe(1)
  expect(state0.reqs[0]!.reason).toBe('init')
  expect(state0.reqs[0]!.cursor).toBeUndefined()
  expect(state0.reqs[0]!.start).toBe(0)
  // total 属性未预置：首请求 totalKnown=false（unknown-total 起步）
  expect(state0.reqs[0]!.totalKnown).toBe(false)

  // 首块回填：30 行渲染 + total 同步 + aria-rowcount 用已知 total
  //（shadow 边界：waitForFunction 里必须显式进 shadowRoot——原生 querySelectorAll 不穿透）
  await page.waitForFunction(
    () => document.querySelector('#table-inf-e2e')!.shadowRoot!.querySelectorAll('[part="row"]').length === 30,
    null,
    {
      timeout: 5000,
    },
  )
  expect(await page.locator('#table-inf-e2e').getAttribute('total')).toBe('60')
  expect(
    await page.evaluate(() =>
      document.querySelector('#table-inf-e2e')!.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
    ),
  ).toBe('60')

  // ② 滚到中上部（距底 > 阈值）：不触发 load-more（等触底检测 rAF 窗口走完）
  await scrollInfiniteTable(page, 'table-inf-e2e', 80)
  await runScrollFrames(page)
  let state = await stateOf(page, 'table-inf-e2e')
  expect(state.reqs.filter((r: any) => r.reason === 'load-more').length, '未接近底部不触发').toBe(0)

  // ③ 滚到底 → load-more（detail.cursor 回传 '30'、start=已装载 30）
  await scrollInfiniteTable(page, 'table-inf-e2e', 100000)
  await page.waitForFunction(
    () => (window as any)['__infState_table-inf-e2e'].reqs.some((r: any) => r.reason === 'load-more'),
    null,
    { timeout: 5000 },
  )
  state = await stateOf(page, 'table-inf-e2e')
  const loadMore = state.reqs.find((r: any) => r.reason === 'load-more')!
  expect(loadMore.cursor).toBe('30')
  expect(loadMore.start).toBe(30)
  expect(loadMore.totalKnown).toBe(true) // 回填已同步 total=60

  // 第二块回填：60 行全渲染、在途 loading 收敛
  await page.waitForFunction(
    () => document.querySelector('#table-inf-e2e')!.shadowRoot!.querySelectorAll('[part="row"]').length === 60,
    null,
    {
      timeout: 5000,
    },
  )
  // 追加块内容接在首块之后（装载顺序 = 宿主块序）
  const firstName = await page.evaluate(
    () => document.querySelector('#table-inf-e2e')!.shadowRoot!.querySelector('[part="row"]')!.textContent,
  )
  expect(firstName).toContain('行0')

  // ④ 再滚到底 → 宿主回空块 → 到底信号 → 「已到底」提示行渲染 + 后续滚动不再派发
  await scrollInfiniteTable(page, 'table-inf-e2e', 100000)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#table-inf-e2e')!
      return el.shadowRoot!.querySelector('[part="no-more-row"]') != null
    },
    null,
    { timeout: 5000 },
  )
  const reqsAfterEnd = (await stateOf(page, 'table-inf-e2e')).reqs.length
  await scrollInfiniteTable(page, 'table-inf-e2e', 100000)
  await runScrollFrames(page)
  expect((await stateOf(page, 'table-inf-e2e')).reqs.length, '到底后滚动不再派发').toBe(reqsAfterEnd)
  expect(await noMoreRow(page, 'table-inf-e2e').textContent()).not.toBe('')

  // ⑤ 点击表头排序 → 重置装载缓冲 + 派 sort 请求（cursor 缺省、start=0）+ 行清空后回填首块
  await page.locator('#table-inf-e2e th.sortable').click()
  await page.waitForFunction(
    () => (window as any)['__infState_table-inf-e2e'].reqs.some((r: any) => r.reason === 'sort'),
    null,
    { timeout: 5000 },
  )
  state = await stateOf(page, 'table-inf-e2e')
  const sortReq = state.reqs.find((r: any) => r.reason === 'sort')!
  expect(sortReq.cursor).toBeUndefined()
  expect(sortReq.start).toBe(0)
  // 重置缓冲后 no-more-row 消失（到底信号复位）
  expect(await noMoreRow(page, 'table-inf-e2e').count()).toBe(0)
  // 回填新首块（宿主按新排序返回的块）
  await page.waitForFunction(
    () => document.querySelector('#table-inf-e2e')!.shadowRoot!.querySelectorAll('[part="row"]').length === 30,
    null,
    {
      timeout: 5000,
    },
  )

  // console 零告警（error / [oas-] warning / pageerror）
  expect(issues, `console 告警：\n${issues.join('\n')}`).toEqual([])
})

test('table infinite × 虚拟滚动（height）可叠加：触底 load-more 照常 + console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)
  await mountInfiniteFixture(page, 'table-inf-virtual', {
    total: 60,
    chunk: 30,
    attrs: { height: '320' },
  })

  // 首块 30 行进入装载缓冲（虚拟窗口只渲染视口内行，但缓冲全量）
  await page.waitForFunction(
    () => (window as any)['__infState_table-inf-virtual'].reqs.some((r: any) => r.reason === 'init'),
    null,
    { timeout: 5000 },
  )
  await page.waitForFunction(() => (window as any)['__infState_table-inf-virtual'].appended.length >= 1, null, {
    timeout: 5000,
  })

  // 滚到底（虚拟容器 height=320、内容 30 行超高）→ load-more 派发
  await scrollInfiniteTable(page, 'table-inf-virtual', 100000)
  await page.waitForFunction(
    () => (window as any)['__infState_table-inf-virtual'].reqs.some((r: any) => r.reason === 'load-more'),
    null,
    { timeout: 5000 },
  )
  const state = await stateOf(page, 'table-inf-virtual')
  const loadMore = state.reqs.find((r: any) => r.reason === 'load-more')!
  expect(loadMore.cursor).toBe('30')

  // 第二块回填后再次触底 → 空块 → 到底提示行
  await page.waitForFunction(() => (window as any)['__infState_table-inf-virtual'].appended.length >= 2, null, {
    timeout: 5000,
  })
  await scrollInfiniteTable(page, 'table-inf-virtual', 100000)
  await page.waitForFunction(
    () => document.querySelector('#table-inf-virtual')!.shadowRoot!.querySelector('[part="no-more-row"]') != null,
    null,
    { timeout: 5000 },
  )

  expect(issues, `console 告警：\n${issues.join('\n')}`).toEqual([])
})
