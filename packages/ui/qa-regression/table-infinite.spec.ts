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

/**
 * 真实滚轮手势滚动到底（wheel 事件 → cancelScrollIntent 手势豁免路径）：指针悬停表格区域，
 * 连续多格滚轮向下——「连续滚到底不离开」的真实用户动作。不用 scrollTop 直设：程序化设值
 * 非用户手势，不在吞位豁免面（零行为漂移红线），会引入时序竞态。
 */
async function wheelToBottom(page: Page, id: string): Promise<void> {
  const box = await page.locator(`#${id}`).boundingBox()
  if (!box) throw new Error(`#${id} 无几何（不可见）`)
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 100))
  for (let i = 0; i < 25; i++) await page.mouse.wheel(0, 120) // 25 格 × 120px ≫ 全量内容高，必达底
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

test('table infinite：连续滚到底不离开仍持续加载（滚轮手势不被回波吞位卡死）+ console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)
  // 块 10 行（≈360px）< 触底阈值 max(200, 400×1.5)=600：每块追加后视口仍在阈值内，
  // 覆盖「块高小于视口+阈值时连续触底」的真实用户路径（盲区：此前只有「先离开再回」）
  const totalRows = 90
  const chunkSize = 10
  await mountInfiniteFixture(page, 'table-inf-continuous', { total: totalRows, chunk: chunkSize })

  await page.waitForFunction(() => (window as any)['__infState_table-inf-continuous'].appended.length >= 1, null, {
    timeout: 5000,
  })

  // 循环：每轮真实滚轮手势滚到底（不离开底部、不制造「离开再回」机会），直到到底态。
  // 修复前：追加渲染链路布防回波吞位 → 手势后的真实 scroll 拍被吞 → 触底检测不执行 →
  // 连续滚动卡死（无前进判据永不满足 → waitForFunction 超时即红）；修复后手势清除吞位 +
  // 追加后视口仍在阈值内即主动续派。
  const noMore = page.locator('#table-inf-continuous [part="no-more-row"]')
  for (let round = 0; round < 12; round++) {
    if ((await noMore.count()) > 0) break
    const before = await stateOf(page, 'table-inf-continuous')
    await wheelToBottom(page, 'table-inf-continuous')
    // 前进判据：请求序列增长（每次 load-more 派发即入列）或到底行出现（装满 total 渲染）
    await page.waitForFunction(
      ({ appended, reqs }) => {
        const s = (window as any)['__infState_table-inf-continuous']
        const ended =
          document.querySelector('#table-inf-continuous')!.shadowRoot!.querySelector('[part="no-more-row"]') != null
        return s.appended.length > appended || s.reqs.length > reqs || ended
      },
      { appended: before.appended.length, reqs: before.reqs.length },
      { timeout: 5000 },
    )
  }

  // 终态断言：期望序列由 fixture 参数现算（total/chunk 数据驱动，与布局无关）：
  // init + load-more×(total/chunk - 1)——第 8 次回填后装载满 total，hasMore 翻转 →
  // 不再发第 9 次请求，组件自渲染「已到底」行（空块请求仅 total 未知场景）
  const state = await stateOf(page, 'table-inf-continuous')
  const reasons = state.reqs.map((r: any) => r.reason)
  expect(reasons[0], '首请求为 init').toBe('init')
  const expectLoadMoreCount = totalRows / chunkSize - 1
  const expectCursors = Array.from({ length: expectLoadMoreCount }, (_, i) => String((i + 1) * chunkSize))
  const expectStarts = Array.from({ length: expectLoadMoreCount }, (_, i) => (i + 1) * chunkSize)
  const loadMores = state.reqs.filter((r: any) => r.reason === 'load-more')
  expect(loadMores.length, 'load-more 次数 = 数据块数（装满 total 即到底，不发空块请求）').toBe(expectLoadMoreCount)
  expect(
    loadMores.map((r: any) => r.cursor),
    'cursor 逐块递进',
  ).toEqual(expectCursors)
  expect(loadMores.map((r: any) => r.start)).toEqual(expectStarts)
  // 全部行渲染
  await page.waitForFunction(
    ({ rows }) =>
      document.querySelector('#table-inf-continuous')!.shadowRoot!.querySelectorAll('[part="row"]').length === rows,
    { rows: totalRows },
    { timeout: 5000 },
  )
  // 到底行出现且非空
  expect(await noMore.textContent()).not.toBe('')
  // 到底后滚轮手势不再派发（hasMore 守卫；确定性帧等待——不用固定 sleep）
  const reqsAtEnd = (await stateOf(page, 'table-inf-continuous')).reqs.length
  await wheelToBottom(page, 'table-inf-continuous')
  await runScrollFrames(page)
  expect((await stateOf(page, 'table-inf-continuous')).reqs.length, '到底后滚动不再派发').toBe(reqsAtEnd)

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

test('table infinite：挂载带 current="3" 仅 1 次 init，回填与属性写零续发（记录/比对签名同口径，防无界请求循环）+ console 零告警', async ({
  page,
}) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)
  await mountInfiniteFixture(page, 'table-inf-current3', {
    total: 60,
    chunk: 30,
    attrs: { current: '3' },
  })

  // 挂载恰一次 init（infinite 下 current 不适用、不参与请求签名——文档契约）
  await page.waitForFunction(() => (window as any)['__infState_table-inf-current3'].reqs.length >= 1, null, {
    timeout: 5000,
  })
  // 宿主回填完成（appendRows → update → 签名比对是循环的真实触发链）
  await page.waitForFunction(() => (window as any)['__infState_table-inf-current3'].appended.length >= 1, null, {
    timeout: 5000,
  })
  // 多轮属性写给潜在续发现形机会：每次属性写都触发 update，修复前（记录侧存 raw
  // current=3、比对侧归一化 current=1）每轮 update 都推得 paginate 续发 → reqs 无界增长
  await page.evaluate(() => {
    const el = document.querySelector('#table-inf-current3')!
    el.setAttribute('striped', '')
    el.setAttribute('total', '60')
    el.setAttribute('current', '5')
  })
  const state = await stateOf(page, 'table-inf-current3')
  expect(state.reqs).toHaveLength(1)
  // totalKnown=false：挂载时 total 属性未在场（fixture 经 appendRows options.total 才同步）
  // ——未知总数场景 totalKnown 随 total 属性在场性的放宽契约
  expect(state.reqs[0]).toMatchObject({ reason: 'init', start: 0, totalKnown: false })

  expect(issues, `console 告警：\n${issues.join('\n')}`).toEqual([])
})
