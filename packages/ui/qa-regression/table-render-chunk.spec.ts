import { expect, test, type Page } from '@playwright/test'

// render-chunk 分批渲染（时间切片）真实浏览器回归：首帧恰好 chunk 行（evaluate 内同步断言，
// 无 rAF 间隙，确定性强）、逐帧追加至全量、滚动可用、aria-rowcount 首帧全量、
// 虚拟滚动同开告警接管。单测（fake rAF）覆盖逐帧计数与代次取消，本文件只补真实浏览器面。

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

test('table render-chunk：2000 行首帧 200 → 逐帧追加至全量 → 滚动可用 + A11y + console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)

  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-table')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '200')
    el.setAttribute('max-height', '400')
    el.setAttribute(
      'data',
      JSON.stringify(Array.from({ length: 2000 }, (_, i) => ({ name: `用户 ${i + 1}`, age: i + 1 }))),
    )
    // fixed 定位隔离容器：fixture 不进文档流（同 table-infinite.spec.ts 先例）
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px;width:420px'
    host.appendChild(el)
    document.body.appendChild(host)

    const rows = () => el.shadowRoot!.querySelectorAll('tbody tr.row').length
    // 同步首帧：appendChild 触发的渲染同步完成，evaluate 内无 rAF 间隙——恰好 chunk 行
    const first = rows()
    const firstRowcount = el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')
    // 逐帧推进直至全量；记录每帧后的行数（验证「逐帧追加」且每帧不超 chunk 的增量节奏）
    const perFrame: number[] = []
    await new Promise<void>((resolve) => {
      let last = first
      let guard = 0
      const probe = (): void => {
        const n = rows()
        if (n !== last) {
          perFrame.push(n)
          last = n
        }
        if (n >= 2000 || ++guard > 600) resolve()
        else requestAnimationFrame(probe)
      }
      requestAnimationFrame(probe)
    })
    const table = el.shadowRoot!.querySelector('table')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    const scrollable = wrap.scrollHeight > wrap.clientHeight
    const before = wrap.scrollTop
    wrap.scrollTop = wrap.scrollHeight
    wrap.dispatchEvent(new Event('scroll'))
    const lastRowText = el.shadowRoot!.querySelector('tbody tr.row:last-child')!.textContent ?? ''
    return {
      first,
      firstRowcount,
      perFrame,
      total: rows(),
      rowcount: table.getAttribute('aria-rowcount'),
      scrollable,
      scrolled: wrap.scrollTop > before,
      lastRowText,
    }
  })

  expect(r.first, '同步首帧恰好 chunk 行（200）').toBe(200)
  expect(r.firstRowcount, '首帧 aria-rowcount 即全量（读屏口径不随分批变化）').toBe('2000')
  expect(r.perFrame.length, '多帧追加（时间切片真实发生）').toBeGreaterThan(2)
  for (let i = 0; i < r.perFrame.length; i++) {
    const prev = i === 0 ? r.first : r.perFrame[i - 1]!
    expect(r.perFrame[i]! - prev, `第 ${i + 1} 帧增量不超 chunk`).toBeLessThanOrEqual(200)
  }
  expect(r.total, '最终全量行').toBe(2000)
  expect(r.rowcount, '完成后 aria-rowcount 仍为全量').toBe('2000')
  expect(r.scrollable, '表体可滚动（max-height 限高下滚动容器有溢出）').toBe(true)
  expect(r.scrolled, '滚动位置可写').toBe(true)
  expect(r.lastRowText, '末行内容完整渲染').toContain('用户 2000')
  expect(issues, `console 告警集：\n${issues.join('\n')}`).toEqual([])
})

test('table render-chunk：滚到中部后排序（含分批中点击行），末帧恢复滚动位 + 首帧垫高精确', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)

  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-table')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄', sortable: true },
      ]),
    )
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '200')
    el.setAttribute('max-height', '400')
    // 初始数据 age 升序，并先落到「age 升序」排序态：随后点表头 = asc → desc，只写 sort-order
    // 一个属性（单次分批渲染）——首帧垫高可精确断言为排序前表体高度；再点一次 = desc → 无排序
    // （清空 sort-key + sort-order 两个属性 = 连续两次渲染），覆盖「继承滚动位目标」路径
    el.setAttribute('sort-key', 'age')
    el.setAttribute('sort-order', 'asc')
    el.setAttribute(
      'data',
      JSON.stringify(Array.from({ length: 2000 }, (_, i) => ({ name: `用户 ${i + 1}`, age: i + 1 }))),
    )
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px;width:420px'
    host.appendChild(el)
    document.body.appendChild(host)

    const rows = (): number => el.shadowRoot!.querySelectorAll('tbody tr.row').length
    const body = (): HTMLElement => el.shadowRoot!.querySelector('tbody') as HTMLElement
    const pad = (): string => body().style.minHeight
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    const nextFrame = (): Promise<void> =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    const waitFull = async (): Promise<void> => {
      for (let guard = 0; rows() < 2000 && guard < 600; guard++) await nextFrame()
    }
    // 首次分批渲染跑完（2000 行）后再滚到中部，保证目标位置在可达范围内
    await waitFull()
    wrap.scrollTop = 46022
    wrap.dispatchEvent(new Event('scroll'))
    await nextFrame()
    await nextFrame()
    const before = wrap.scrollTop
    const heightBefore = wrap.scrollHeight
    const bodyHeightBefore = body().offsetHeight
    const padBefore = pad()
    // 表头点击排序（真实用户路径）：单属性写入 → 一轮分批渲染
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    const firstFramePad = pad()
    // 分批进行中点击数据行（真实交互，不做任何滚动）：不得让末帧放弃恢复保存位
    const cell = el.shadowRoot!.querySelector<HTMLElement>('tbody tr.row td[data-col="name"]')!
    for (const type of ['pointerdown', 'touchstart', 'pointerup', 'click']) {
      cell.dispatchEvent(new Event(type, { bubbles: true }))
    }
    await waitFull()
    const afterSort = wrap.scrollTop
    const sortedFirstRow = el.shadowRoot!.querySelector('tbody tr.row')!.textContent ?? ''
    // 再点一次：desc → 无排序（清空两个排序属性 = 连续两轮渲染）
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    await waitFull()
    return {
      before,
      heightBefore,
      bodyHeightBefore,
      padBefore,
      firstFramePad,
      afterSort,
      afterClear: wrap.scrollTop,
      afterLeft: wrap.scrollLeft,
      afterHeight: wrap.scrollHeight,
      total: rows(),
      sortedFirstRow,
      lastFramePad: pad(),
    }
  })

  expect(r.total, '分批完成：全量 2000 行').toBe(2000)
  expect(r.padBefore, '排序前无垫高（idle 态）').toBe('')
  // 首帧垫高精确等于排序前表体高度（不依赖任何表头/行高常量；h=0 时垫高会是空串，同样被此断言拦下）
  expect(r.firstFramePad, '首帧垫高 = 排序前 tbody.offsetHeight').toBe(`${r.bodyHeightBefore}px`)
  expect(r.sortedFirstRow, '排序生效（desc 后首行为 age=2000 的用户 2000）').toContain('用户 2000')
  expect(r.afterHeight, '末帧内容高度与排序前一致（行高不变）').toBe(r.heightBefore)
  // 核心行为：单次渲染与连续两次渲染的末帧都恢复排序前 scrollTop
  //（修复前停在首帧可达上界 8845 / 被清空排序时丢到 0）
  expect(r.afterSort, '首轮分批（单次渲染）末帧恢复 scrollTop；分批中点击行不让位').toBe(r.before)
  expect(r.afterClear, '清空排序（连续两轮渲染）末帧仍恢复 scrollTop').toBe(r.before)
  expect(r.afterLeft).toBe(0)
  expect(r.lastFramePad, '末帧内容完整后移除垫高').toBe('')
  expect(issues, `console 告警集：\n${issues.join('\n')}`).toEqual([])
})

test('table render-chunk × height 同开：虚拟窗口渲染接管（devWarn 为 dev-only，由单测覆盖）', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await gotoTablePage(page)

  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-table')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('row-key', 'name')
    el.setAttribute('height', '300')
    el.setAttribute('row-height', '40')
    el.setAttribute('render-chunk', '200')
    el.setAttribute(
      'data',
      JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ name: `用户 ${i + 1}`, age: i + 1 }))),
    )
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px;width:420px'
    host.appendChild(el)
    document.body.appendChild(host)
    // 等虚拟滚动几何稳定（两帧）
    await new Promise<void>((resolve) => {
      let n = 0
      const tick = (): void => {
        if (++n >= 2) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    const rendered = el.shadowRoot!.querySelectorAll('tbody tr.row').length
    // 窗口化判定：可视容量 = 300/40 = 7.5 行 → DOM 行数应在可视容量量级（含少量缓冲），
    // 远小于全量 500（分批被忽略、无全量 DOM）
    const windowCapacity = Math.ceil(300 / 40)
    const table = el.shadowRoot!.querySelector('table')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    return {
      rendered,
      windowCapacity,
      virtual: wrap.getAttribute('data-virtual') === 'true',
      rowcount: table.getAttribute('aria-rowcount'),
    }
  })

  expect(r.rendered, '虚拟窗口渲染（远小于全量 500，分批被忽略）').toBeLessThan(500)
  expect(r.rendered, 'DOM 行数在可视容量量级（窗口化，非全量）').toBeLessThanOrEqual(r.windowCapacity + 4)
  expect(r.rendered, '虚拟窗口非空').toBeGreaterThanOrEqual(1)
  expect(r.virtual, 'height 接管（data-virtual 落位，render-chunk 被忽略）').toBe(true)
  expect(r.rowcount, 'aria-rowcount = total 全量口径').toBe('500')
  // 注：devWarn 一次性告警为 dev-only 行为（生产 dist 编译期静默），由单测覆盖；
  // e2e 只固化「虚拟接管」的浏览器行为面与零 error。
  expect(errors, '无 error / pageerror').toEqual([])
})
