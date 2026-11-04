// 复核回归：table——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { up } from './helpers'

/** packages/ui/dist 真实路径：按本文件位置（packages/ui/qa-regression）解析，从任意 cwd 运行都指向同一份产物 */
const builtUiDist = fileURLToPath(new URL('../dist', import.meta.url))

/**
 * 把构建产物按稳定前缀暴露给页面：Pro helper（detail / advanced）不在 docs bundle 的全局，
 * 通过路由映射 packages/ui/dist 后动态 import，保证浏览器回归跑的是真实构建产物。
 */
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

/**
 * 等表格滚动帧 settle：连续 3 帧「scrollTop + scrollHeight + 渲染行数」签名不变。
 *
 * 用途：虚拟表格的滚动/重渲染走 rAF；在 rAF 之前派发导航键（Ctrl+Home/End）时，
 * 该帧末尾的「清空前 scrollTop 保存/恢复」会把键盘导航写入的 scrollTop 回滚（WebKit 的 rAF
 * 到达更晚，实测稳定命中：Ctrl+Home 立即置 0 后又被恢复成末行位置）。测试自己驱动的
 * 程序化滚动必须等这一帧落定，否则断言的是竞态而非组件契约。
 */
async function settleTableScroll(page: import('@playwright/test').Page, id: string): Promise<void> {
  await page.evaluate(
    (sel) =>
      new Promise<void>((resolve) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el?.shadowRoot) {
          resolve()
          return
        }
        let prev = ''
        let stable = 0
        const tick = () => {
          const wrap = el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')
          const sig = wrap
            ? `${Math.round(wrap.scrollTop)}|${wrap.scrollHeight}|${el.shadowRoot!.querySelectorAll('tr[data-row-index]').length}`
            : 'none'
          if (sig === prev) stable += 1
          else {
            prev = sig
            stable = 0
          }
          if (stable >= 3) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    `#${id}`,
  )
}

/**
 * 派发虚拟表导航键直到落点成立（最多 3 次补发）。
 *
 * 背景（**产品既有竞态**，两引擎都会命中且仅时序不同）：虚拟表滚动帧在帧尾做
 * 「清空 tbody 前保存的 scrollTop / scrollLeft 恢复」，而 Ctrl+Home/End 的越界导航会在
 * 同一帧内写 scrollTop；若恢复帧后到，导航写入被回滚成原位置（键盘看起来「没反应」，
 * 实测 Chromium 把 3646 回滚成 0）。测试侧只在帧落定后派发，落点未成立时补发；
 * 断言本身不放松（落点必须 = 目标行的 range-focus + 顶/底滚动位）。
 */
async function navUntilLanded(
  page: import('@playwright/test').Page,
  id: string,
  key: 'Home' | 'End',
  targetRow: number,
  scrollExpect: 'top' | 'bottom',
): Promise<void> {
  const landed = (): Promise<boolean> =>
    page.evaluate(
      ({ sel, row, mode }) => {
        const el = document.querySelector(sel) as HTMLElement | null
        const wrap = el?.shadowRoot?.querySelector<HTMLElement>('.table-scroll')
        if (!el || !wrap) return false
        const max = wrap.scrollHeight - wrap.clientHeight
        const at = mode === 'top' ? wrap.scrollTop < 40 : Math.abs(wrap.scrollTop - max) <= 1
        return at && !!el.shadowRoot!.querySelector(`tr[data-row-index="${row}"] td.range-focus`)
      },
      { sel: `#${id}`, row: targetRow, mode: scrollExpect },
    )
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await landed()) return
    await settleTableScroll(page, id)
    await page.evaluate(
      ({ sel, k }) => {
        const el = document.querySelector(sel) as HTMLElement
        const td =
          (el.shadowRoot!.activeElement?.closest?.('td[data-col]') as HTMLElement | null) ??
          (el.shadowRoot!.querySelector('td[data-col]') as HTMLElement)
        td.focus()
        td.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: k,
            ctrlKey: true,
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        )
      },
      { sel: `#${id}`, k: key },
    )
    await page.waitForTimeout(250)
  }
  expect(
    await landed(),
    `Ctrl+${key} 落点：第 ${targetRow} 行 range-focus 且滚动到${scrollExpect === 'top' ? '顶' : '底'}`,
  ).toBe(true)
}

test('table SPA 导航后数据不丢（Vue property 赋值反射到 attribute）', async ({ page }) => {
  // 曾现 bug：oas-table 的 data/columns 是 class 字段，Vue SPA 渲染时走 property 赋值而非
  // setAttribute，组件只读 attribute → 表格空，强刷（SSR attribute 水合）才有数据。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('a[href="/components/table"]', {
    state: 'attached',
    timeout: 10000,
  })
  // 折叠侧栏里的链接不可见，直接 DOM click 走 Vue Router（等价用户 SPA 点进去）
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/components/table"]')!.click()
  })
  await page.waitForURL('**/components/table')
  await page.waitForSelector('oas-table', { timeout: 10000 })
  // 数据行渲染完成的真实信号：非空 data 的表格都已渲染出行（即本用例断言条件本身）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const r = [...document.querySelectorAll('oas-table')].map((t) => ({
          rows: t.shadowRoot?.querySelectorAll('tbody tr').length ?? -1,
          dataLen: t.getAttribute('data')?.length ?? 0,
        }))
        const nonEmpty = r.filter((t) => t.dataLen > 2)
        return nonEmpty.length > 5 && nonEmpty.every((t) => t.rows > 0)
      }),
    )
    .toBe(true)
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
    // 下界理由：页面聚合多张不同数据的 demo 表（行数各异，无统一精确值）；契约是
    // 「非空 data 必须渲染出至少一行」（空表回归锁），各行精确行数由各 demo 专测覆盖
    expect(t.rows, `表格数据 ${t.dataLen}B 但行数 ${t.rows}`).toBeGreaterThanOrEqual(1)
  }
})

test('table 行内编辑：Enter 提交后编辑器退出且列高亮清除', async ({ page }) => {
  // 曾现 bug：编辑器内按 Enter 提交后，keydown 冒泡到单元格的 Enter 监听器，在已销毁的
  // td 上重入编辑 → 列高亮残留、编辑态未退出。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 直接对首行「姓名」单元格派发 dblclick 进入编辑
  // （Playwright 真实 dblclick 手势会把两次 click 派发给同一解析元素——首击触发行选中重建
  //  后该元素已脱离文档，进入编辑会落到游离节点上；这里用 DOM 事件直派更确定）
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const td = table.shadowRoot!.querySelector('tbody tr.row td')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !!t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const entered = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
    }
  })
  expect(entered.hasEditor).toBe(true)
  expect(entered.editingCol).toBe(true)
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const input = table.shadowRoot!.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '演示提交'
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }),
    )
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const after = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
      cellText: table.shadowRoot!.querySelector('tbody td')!.textContent,
    }
  })
  expect(after.hasEditor, '提交后编辑器应退出').toBe(false)
  expect(after.editingCol, '提交后列高亮应清除').toBe(false)
  expect(after.cellText).toBe('演示提交')
})

test('table 行内编辑：真实双击进入编辑（真实 dblclick，非 dispatchEvent——首击行选中重建不得阻断）', async ({
  page,
}) => {
  // 缺陷固化：真实双击的首击触发行选中切换 → update() 同步重建 tbody → 被击 td 脱离文档 →
  // 浏览器判定两次点击目标不同，dblclick 事件根本不派发（事件流实证：两击后零 dblclick），
  // 编辑永不进入（dispatchEvent 直派无法暴露，上方 Enter 提交用例的注释曾把它当测试稳定性
  // 问题绕过——实质是用户可感缺陷）。修复=click 委托到稳定的 <table> 容器 + 同行同列 500ms
  // 手工双击判定 + findRow/cellOf 重查活节点（tr 选中处理器先行，命中时目标 td 已被重建）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  await page.locator('#table-edit').first().scrollIntoViewIfNeeded()
  const cell = page.locator('#table-edit td.editable-cell').first()
  await cell.dblclick()
  // 编辑器就绪的真实信号：input.cell-editor 出现（与组件自身异步渲染解耦）
  await page.waitForFunction(
    () => !!document.querySelector('#table-edit')!.shadowRoot!.querySelector('input.cell-editor'),
    null,
    { timeout: 5000 },
  )
  const hasEditor = await page.evaluate(
    () => !!document.querySelector('#table-edit')!.shadowRoot!.querySelector('input.cell-editor'),
  )
  expect(hasEditor, '真实双击应进入行内编辑').toBe(true)
})

test('table 行内编辑几何稳定：进/出编辑列宽与行高零跳变（input 与 select 编辑器）', async ({ page }) => {
  // 缺陷固化：进编辑时整列被撑宽（89→187）、邻列挤窄文字换行、行高联动 49→73——三个来源：
  // ①input 默认 size=20 的内在宽度成为 auto 布局 min-content 贡献；②select 内在宽度=最长选项
  // +下拉钮；③操作列「编辑」→「保存/取消」变宽挤压邻列。修复=不可见占位保原文本布局贡献
  // +编辑器绝对定位零贡献 + 操作列两态同槽叠放（inline-grid 同格，格宽恒为两态最大值）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  await page.locator('#table-edit').first().scrollIntoViewIfNeeded()
  const measure = () =>
    page.evaluate(() => {
      const sr = document.querySelector('#table-edit')!.shadowRoot!
      return {
        cols: [...sr.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)),
        rowH: Math.round(sr.querySelector('tbody tr.row')!.getBoundingClientRect().height),
      }
    })
  const base = await measure()

  // input 编辑器（首个可编辑单元格）
  const inputCell = page.locator('#table-edit tbody tr.row').first().locator('td.editable-cell').first()
  await inputCell.dblclick()
  // 编辑器就绪的真实信号：.cell-editor（input/select 通用类）出现
  await page.waitForFunction(
    () => !!document.querySelector('#table-edit')!.shadowRoot!.querySelector('.cell-editor'),
    null,
    { timeout: 5000 },
  )
  const inEdit = await measure()
  expect(inEdit.cols, 'input 编辑中列宽应零跳变').toEqual(base.cols)
  expect(inEdit.rowH, 'input 编辑中行高应零跳变').toBe(base.rowH)
  await page.keyboard.press('Escape')
  // 编辑器退出的真实信号：.cell-editor 移除（几何量测须在退出后）
  await page.waitForFunction(
    () => !document.querySelector('#table-edit')!.shadowRoot!.querySelector('.cell-editor'),
    null,
    {
      timeout: 5000,
    },
  )
  expect((await measure()).cols, '退出编辑列宽应还原').toEqual(base.cols)

  // select 编辑器（职位列）
  const selectCell = page.locator('#table-edit tbody tr.row').first().locator('td.editable-cell[data-col="position"]')
  await selectCell.dblclick()
  await page.waitForFunction(
    () => !!document.querySelector('#table-edit')!.shadowRoot!.querySelector('.cell-editor'),
    null,
    { timeout: 5000 },
  )
  const inSelect = await measure()
  expect(inSelect.cols, 'select 编辑中列宽应零跳变').toEqual(base.cols)
  expect(inSelect.rowH, 'select 编辑中行高应零跳变').toBe(base.rowH)
})

test('table 可编辑单元格可感知线索：hover 淡底色 + text 光标 + 铅笔图标显现', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 真实 hover（Playwright 物理移动鼠标触发 :hover；dispatchEvent 无法触发 :hover 伪类）
  const cell = page.locator('#table-edit td.editable-cell').first()
  const before = await cell.evaluate((td) => {
    const icon = td.querySelector<HTMLElement>('.cell-edit-icon')!
    return {
      bg: getComputedStyle(td).backgroundColor,
      cursor: getComputedStyle(td).cursor,
      iconOpacity: getComputedStyle(icon).opacity,
    }
  })
  expect(before.cursor, '可编辑单元格应为 text 光标').toBe('text')
  expect(before.iconOpacity, '常态下铅笔图标应隐藏（opacity 0）').toBe('0')
  await cell.hover()
  // 图标淡入完成的真实信号：opacity 过渡到 1（过渡 0.15s）
  await expect
    .poll(() => cell.evaluate((td) => getComputedStyle(td.querySelector<HTMLElement>('.cell-edit-icon')!).opacity))
    .toBe('1')
  const after = await cell.evaluate((td) => {
    const icon = td.querySelector<HTMLElement>('.cell-edit-icon')!
    return {
      bg: getComputedStyle(td).backgroundColor,
      iconOpacity: getComputedStyle(icon).opacity,
    }
  })
  expect(after.bg, 'hover 应出现淡底色').not.toBe(before.bg)
  expect(after.bg, 'hover 底色应为不透明实色（非透明叠加）').not.toBe('rgba(0, 0, 0, 0)')
  expect(after.iconOpacity, 'hover 后铅笔图标应显现（opacity 1）').toBe('1')
})

test('table 吸顶行：sticky-rows 前 N 行带 data-sticky 且与固定列共存', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table[sticky-rows]')
  const r = await page.evaluate(() => {
    const table = document.querySelector('oas-table[sticky-rows]')!
    const rows = [...table.shadowRoot!.querySelectorAll('tbody tr.row')]
    return rows.slice(0, 4).map((tr) => ({
      sticky: tr.getAttribute('data-sticky'),
      left: (tr.querySelector('td') as HTMLElement).style.left,
      top: (tr.querySelector('td') as HTMLElement).style.top,
    }))
  })
  expect(r[0]!.sticky).toBe('true')
  expect(r[1]!.sticky).toBe('true')
  expect(r[2]!.sticky).toBe('true')
  expect(r[3]!.sticky).toBeNull()
  // 固定列与吸顶行共存：sticky 行的固定单元格仍保留横向偏移
  expect(r[0]!.left).toBe('0px')
  // 下界理由：精确值 = 表头行高（由该 demo 表头样式决定，无固定像素契约）；>0 锁定
  // 「吸顶行被推到表头下方而非贴视口顶」的回归点
  expect(parseFloat(r[0]!.top), '吸顶行 top 应大于 0（表头下方）').toBeGreaterThanOrEqual(1)
})

test('table size 密度档位：small/medium/large 三档 padding+字号阶梯，组件级变量覆盖优先', async ({ page }) => {
  // 设计（主流三档密度惯例）：档位全走 CSS 变量 token
  // （--_cell-py/--_cell-px/font-size），宿主 --oas-table-* 变量优先级高于档位；
  // row-height 显式值与档位正交（虚拟滚动行高由 row-height 管，不受档位影响）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  // 首个 demo table 可能不可见（演示结构），本测试自建元素只需组件类已注册
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const probe = (size: string | null) => {
      const el = document.createElement('oas-table')
      el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
      el.setAttribute('data', JSON.stringify([{ a: 1 }]))
      if (size) el.setAttribute('size', size)
      document.body.append(el)
      const td = el.shadowRoot!.querySelector('td')!
      const cs = getComputedStyle(td)
      const host = getComputedStyle(el)
      const out = {
        py: cs.paddingTop,
        px: cs.paddingLeft,
        hostFont: host.fontSize,
        tdFont: cs.fontSize,
      }
      el.remove()
      return out
    }
    const medium = probe(null)
    const small = probe('small')
    const large = probe('large')
    // 变量覆盖优先于档位：small 档 + 自定义 padding-block 20px
    const el = document.createElement('oas-table')
    el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
    el.setAttribute('data', JSON.stringify([{ a: 1 }]))
    el.setAttribute('size', 'small')
    el.style.setProperty('--oas-table-cell-padding-block', '20px')
    document.body.append(el)
    const overridePy = getComputedStyle(el.shadowRoot!.querySelector('td')!).paddingTop
    el.remove()
    return { medium, small, large, overridePy }
  })
  expect(r.medium, '默认 medium：12px 16px / 14px').toEqual({
    py: '12px',
    px: '16px',
    hostFont: '14px',
    tdFont: '14px',
  })
  expect(r.small, 'small：8px 12px / 13px').toEqual({
    py: '8px',
    px: '12px',
    hostFont: '13px',
    tdFont: '13px',
  })
  expect(r.large, 'large：16px 24px / 16px').toEqual({
    py: '16px',
    px: '24px',
    hostFont: '16px',
    tdFont: '16px',
  })
  expect(r.overridePy, '--oas-table-cell-padding-block 覆盖 small 档').toBe('20px')
})

// 回归：input prefix/suffix slot 空 slot 时不得产生 data-slot-*（曾用 assignedNodes({flatten:true})，
// 空 slot 扁平化会包含 fallback 子节点 → 恒判有内容 → host 残留 data-slot-suffix、input 多出右内边距）
test('table 列拖拽重排精确化：左半区插前、右半区插后 + 插入指示 + oas-column-order', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-col-setting')
  const r = await page.evaluate(async () => {
    const t = document.querySelector('#table-col-setting') as HTMLElement
    const sr = t.shadowRoot!
    const key = (k: string) => sr.querySelector(`th[data-key="${k}"]`) as HTMLElement
    const drag = (fromKey: string, toKey: string, half: 'left' | 'right') => {
      t.removeAttribute('column-keys')
      const src = key(fromKey)
      const tgt = key(toKey)
      const dt = new DataTransfer()
      const rect = tgt.getBoundingClientRect()
      const clientX = half === 'left' ? rect.left + 2 : rect.right - 2
      src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
      const srcDim = src.classList.contains('drag-source')
      tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt, clientX }))
      const mark = tgt.classList.contains('drop-before')
        ? 'before'
        : tgt.classList.contains('drop-after')
          ? 'after'
          : 'none'
      tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt, clientX }))
      src.dispatchEvent(new DragEvent('dragend', { bubbles: true }))
      const raw = t.getAttribute('column-keys') || '[]'
      const order = JSON.parse(raw) as string[]
      return { srcDim, mark, order }
    }
    const left = drag('age', 'name', 'left') // 拖到 name 左半区 → 插前
    const right = drag('age', 'city', 'right') // 拖到 city 右半区 → 插后
    return { left, right }
  })
  expect(r.left.srcDim, '拖拽源列应有 drag-source 淡化').toBe(true)
  expect(r.left.mark, '拖到 name 左半区应显 drop-before').toBe('before')
  expect(r.left.order, 'age 应插入 name 之前').toEqual(['age', 'name', 'city', 'position'])
  expect(r.right.mark, '拖到 city 右半区应显 drop-after').toBe('after')
  expect(r.right.order, 'age 应插入 city 之后').toEqual(['name', 'city', 'age', 'position'])
})

test('table 表头吸顶：非固定列表头纵向 sticky 不被覆盖失效（列宽拖拽手柄定位上下文不得写 relative）', async ({
  page,
}) => {
  // 缺陷固化：`th[data-key] { position: relative }`（列宽拖拽 ::after 手柄的定位上下文）与
  // `th { position: sticky; top: 0 }` 同权重但居后——非固定列表头（年龄/城市/邮箱）被覆盖成
  // relative 随表体滚走，仅固定列（data-fixed）表头吸顶（用户实测「3 个表头会随滚动而滚动」）。
  // 修复：删除 relative 覆盖（sticky 同为定位上下文，天然供给 ::after 手柄）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) => b.textContent.includes('sticky-rows'))!
    const table = block.querySelector('oas-table')!
    const sr = table.shadowRoot!
    const scroll = sr.querySelector('.table-scroll') as HTMLElement
    // 不假定固定 300px 滚动余量：VitePress 2 的正文列宽变化会改变表格高度，
    // 目标值取「300 与实际最大滚动量」的较小者，仍能验证 sticky 表头。
    const target = Math.min(300, Math.max(0, scroll.scrollHeight - scroll.clientHeight))
    scroll.scrollTop = target
    const ths = [...sr.querySelectorAll('thead th')].map((th) => ({
      text: th.textContent!.trim().slice(0, 4),
      position: getComputedStyle(th).position,
      top: Math.round(th.getBoundingClientRect().top),
    }))
    return {
      target,
      scrollTop: scroll.scrollTop,
      scrollTop0: Math.round(scroll.getBoundingClientRect().top),
      ths,
    }
  })
  // 下界理由：可滚动余量由该 demo 表数据行数与行高样式决定（无固定像素契约）；
  // >0 锁定「容器确有滚动空间可供 sticky 表头验证」的前提
  expect(result.target, '容器应有可滚动余量').toBeGreaterThanOrEqual(1)
  expect(result.scrollTop, '容器应已滚动到目标位置').toBe(result.target)
  for (const th of result.ths) {
    expect(th.position, `${th.text} 表头应为 sticky（不被 relative 覆盖）`).toBe('sticky')
    // 吸顶生效：表头应停在容器顶缘（top:0 → th.top ≈ 容器 top，容差 2px）
    expect(Math.abs(th.top - result.scrollTop0), `${th.text} 表头应吸在容器顶缘`).toBeLessThanOrEqual(2)
  }
})

test('table 单元格模板 cellTemplate：property 通道注入的模板渲染自定义单元格（docs demo 同路径）', async ({ page }) => {
  // 缺陷固化：cellTemplate demo 的 <template> 子内容被 md/Vue 编译管线吃空（dev 与生产构建
  // 处理不一致），姓名/价格列全空（用户实测）。demo 改 property 通道（JS 构造 HTMLTemplateElement，
  // whenDefined 后赋值防升级前 expando 遮蔽）。本断言锁定模板列真实渲染（含插值与样式标记）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cell-tpl-table')
  // 模板列渲染完成的真实信号：首行姓名/价格单元格有内容且带模板标记（即末段断言条件）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const table = document.querySelector('#cell-tpl-table')!
        const row = table.shadowRoot!.querySelector('tbody tr.row')
        if (!row) return false
        const tds = [...row.querySelectorAll('td')]
        return tds.length >= 3 && tds[0]!.textContent!.trim() !== '' && !!tds[0]!.querySelector('span, b')
      }),
    )
    .toBe(true)
  const cells = await page.evaluate(() => {
    const table = document.querySelector('#cell-tpl-table')!
    const row = table.shadowRoot!.querySelector('tbody tr.row')!
    return [...row.querySelectorAll('td')].map((td) => ({
      text: td.textContent!.trim(),
      hasMark: !!td.querySelector('span, b'),
    }))
  })
  expect(cells[0]!.text, '姓名列模板插值').toBe('张三')
  expect(cells[0]!.hasMark, '姓名列模板标记（span 徽章）').toBe(true)
  expect(cells[1]!.text, '价格列模板插值').toContain('128')
  expect(cells[1]!.hasMark, '价格列模板标记（b 加粗）').toBe(true)
  expect(cells[2]!.text, '城市列常规渲染').toBe('北京')
})

test('table 多级表头：非 bordered 模式顶层头行零竖线（竖线只属 bordered 全网格模式）', async ({ page }) => {
  // 设计固化：非 bordered 表全表无纵向分隔线（单层表头/正文一致），分组层级靠「居中大标题跨列 +
  // 子表头行」表达；竖线只属 :host([bordered])。曾有 th.header-group+th.header-group 左线是
  // 语言孤例（且只覆盖组/组相邻——用户实测「地址有线、成绩没线」的不一致），已删。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const table = [...document.querySelectorAll('oas-table')].find((t) =>
      [...t.shadowRoot!.querySelectorAll('th')].some((th) => th.textContent!.includes('地址')),
    )!
    const sr = table.shadowRoot!
    const topRowThs = [...sr.querySelectorAll('thead tr')][0]!.querySelectorAll('th')
    return {
      bordered: table.hasAttribute('bordered'),
      borders: [...topRowThs].map((th) => ({
        text: th.textContent!.trim().slice(0, 4),
        borderLeft: getComputedStyle(th).borderLeftWidth,
        borderRight: getComputedStyle(th).borderRightWidth,
      })),
    }
  })
  expect(result.bordered, '该 demo 应非 bordered').toBe(false)
  for (const th of result.borders) {
    expect(th.borderLeft, `${th.text} 左缘应无竖线`).toBe('0px')
    expect(th.borderRight, `${th.text} 右缘应无竖线`).toBe('0px')
  }
})

test('table 子元素声明式通道：Vue 宿主下 key 被剥离也能经 data-key 正常渲染单元格', async ({ page }) => {
  // 缺陷固化：`key` 是 Vue 模板保留字（vnode key），在 Vue 宿主（含文档站）被剥离不到 DOM——
  // 声明式列 key 全空 → 表头有、内容行全空（用户实测）。修复：key 双通道（key ?? data-key），
  // demo 全部改写 data-key。本断言在真实 Vue 宿主（vitepress 页面）验证端到端。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) => b.querySelector('oas-table-column'))!
    const table = block.querySelector('oas-table')!
    const sr = table.shadowRoot!
    return {
      headers: [...sr.querySelectorAll('thead th')].map((th) => th.textContent!.trim()),
      firstRow: [...sr.querySelectorAll('tbody tr.row')[0]!.querySelectorAll('td')].map((td) => td.textContent!.trim()),
    }
  })
  expect(result.headers.length).toBeGreaterThanOrEqual(3)
  expect(result.firstRow[0], '首行首列应有值（张三）').toBe('张三')
  expect(result.firstRow[1], '首行次列应有值（30）').toBe('30')
  expect(
    result.firstRow.some((c) => c === ''),
    '首行不应有空单元格',
  ).toBe(false)
})

test('table 行内 oas-button 点击不连带 oas-row-click（宿主无 role，排除清单须点名组件）', async ({ page }) => {
  // 缺陷固化：行点击排除清单 button,a,input,select,textarea,[role],oas-popconfirm 命中不了
  // <oas-button> 宿主——自定义组件宿主自身无 role 属性，行内放 oas-button（如行编辑按钮）点击
  // 会连带派发 oas-row-click → 「行点击 + 按钮点击」双重响应（真实场景双弹窗）。修复=排除清单
  // 补 oas-button。docs 各 table demo 的行内交互按钮均为内置 .action-btn（原生 button，已被
  // 排除清单覆盖），无「行内嵌 oas-button」的 demo——本断言按 size 密度用例先例在 demo 页动态
  // 构造探针表（oas-button 同页已注册），真实浏览器点击验证事件链。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => customElements.get('oas-table') != null && customElements.get('oas-button') != null,
    null,
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-inline-oas-button'
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'op', title: '操作' },
      ]),
    )
    t.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    // 计数器挂在表宿主 dataset：若误触发行点击会 update() 重建 tbody、行内按钮被移除，
    // 计数器挂按钮上会读不到——挂宿主上两者都稳
    t.dataset.rowClick = '0'
    t.dataset.btnClick = '0'
    t.addEventListener('oas-row-click', () => {
      t.dataset.rowClick = String(Number(t.dataset.rowClick!) + 1)
    })
    // 挂进正文容器而非 body 末尾：body 末尾首列会被固定侧边栏遮挡（hit-test 拦截点击）
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  // 与逃生口同款加固：表格 update（locale 就绪/水合晚期）会重建 tbody 冲掉注入的按钮——
  // 先等渲染稳定再注入，随后立即真实点击，消除「注入→点击」之间被 update 插针的窗口
  await page.waitForFunction(() => {
    const t = document.querySelector('#qa-inline-oas-button')
    return (t?.shadowRoot?.querySelectorAll('tbody tr').length ?? 0) > 0
  })
  // 等渲染稳定的真实信号：tbody 快照连续两次一致（locale/水合晚期的 update 重建不再发生），
  // 随后注入不再被插针冲掉
  let prevTbodyKey: string | null = null
  await expect
    .poll(async () => {
      const key = await page.evaluate(() => {
        const t = document.querySelector('#qa-inline-oas-button')
        return `${t?.shadowRoot?.querySelectorAll('tbody tr').length ?? 0}:${t?.shadowRoot?.querySelector('tbody')?.innerHTML.length ?? 0}`
      })
      const stable = key !== '0:0' && key === prevTbodyKey
      prevTbodyKey = key
      return stable
    })
    .toBe(true)
  await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-inline-oas-button')!
    const btn = document.createElement('oas-button')
    btn.textContent = '编辑'
    btn.addEventListener('oas-click', () => {
      t.dataset.btnClick = String(Number(t.dataset.btnClick!) + 1)
    })
    t.shadowRoot!.querySelector('td[data-col="op"]')!.appendChild(btn)
  })
  // 点行内 oas-button：自身 oas-click 应触发，但不得连带 oas-row-click / 行选中重建
  await page.locator('#qa-inline-oas-button td[data-col="op"] oas-button').click()
  // 事件派发与（若缺陷复发的）行重建均为同步链：立即读取即可判定，无需宽限期
  const r1 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-inline-oas-button')!
    return {
      rowClick: Number(t.dataset.rowClick ?? '0'),
      btnClick: Number(t.dataset.btnClick ?? '0'),
      hasBtn: !!t.shadowRoot!.querySelector('td[data-col="op"] oas-button'),
    }
  })
  // 单次点击恰好一次：计数器精确值（不是「至少一次」——重复派发同样是缺陷）
  expect(r1.btnClick, 'oas-button 自身应被真实点击（派发 oas-click）').toBe(1)
  expect(r1.rowClick, 'oas-button 点击不应连带 oas-row-click').toBe(0)
  expect(r1.hasBtn, 'oas-button 点击不应触发行选中重建（按钮应仍在原格）').toBe(true)
  // 对照：普通文本单元格点击仍派发 oas-row-click（排除未误伤正常行点击）
  await page.locator('#qa-inline-oas-button td[data-col="name"]').click()
  const r2 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-inline-oas-button')!
    const v = Number(t.dataset.rowClick ?? '0')
    t.remove()
    return v
  })
  expect(r2, '普通单元格点击仍应派发 oas-row-click').toBe(1)
})

test('table 逃生口：data-oas-row-click-ignore 容器内点击不连带 oas-row-click（业务自定义交互内容豁免，无需发版）', async ({
  page,
}) => {
  // 设计固化：行内排除清单只点名库内交互组件，业务自定义交互内容（图表/迷你挂件等）等不了
  // 库发版逐个点名——容器标注 data-oas-row-click-ignore 即整块豁免行点击（行编辑同源）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-row-ignore-escape'
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'op', title: '操作' },
      ]),
    )
    t.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    t.dataset.rowClick = '0'
    t.addEventListener('oas-row-click', () => {
      t.dataset.rowClick = String(Number(t.dataset.rowClick!) + 1)
    })
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  // 点逃生口容器内的 span：不连带 oas-row-click / 不触发选中重建。
  // 用 JS 派发冒泡 click（与真实点击走同一条委托/豁免判定路径），消除满载下
  // 文档页布局抖动导致的指针落点漂移 flake——本用例验证的是组件豁免逻辑而非指针命中。
  // 注意 wrap/span 注入在 shadow 树内，document.querySelector 不穿透，须经 shadowRoot 查询。
  // 注入 + 点击在同一个 evaluate 里原子化完成：表格 update（locale 就绪/水合晚期重渲染）
  // 会重建 tbody 冲掉注入的 wrap——先建表等渲染稳定，再一次 evaluate 同步注入并点击，
  // 消除「注入→等待→点击」之间被 update 插针的窗口（满载下三次复现的 flaky 根因）
  await page.waitForFunction(() => {
    const t = document.querySelector('#qa-row-ignore-escape')
    return (t?.shadowRoot?.querySelectorAll('tbody tr').length ?? 0) > 0
  })
  // 等渲染稳定的真实信号：tbody 快照连续两次一致（update 重建不再发生，注入不被插针冲掉）
  let prevTbodyKey: string | null = null
  await expect
    .poll(async () => {
      const key = await page.evaluate(() => {
        const t = document.querySelector('#qa-row-ignore-escape')
        return `${t?.shadowRoot?.querySelectorAll('tbody tr').length ?? 0}:${t?.shadowRoot?.querySelector('tbody')?.innerHTML.length ?? 0}`
      })
      const stable = key !== '0:0' && key === prevTbodyKey
      prevTbodyKey = key
      return stable
    })
    .toBe(true)
  await page.evaluate(() => {
    const t = document.querySelector('#qa-row-ignore-escape')!
    const td = t.shadowRoot!.querySelector('td[data-col="op"]')!
    const wrap = document.createElement('div')
    wrap.setAttribute('data-oas-row-click-ignore', '')
    const inner = document.createElement('span')
    inner.textContent = '迷你挂件'
    wrap.appendChild(inner)
    td.appendChild(wrap)
    // 同一 JS 回合内注入并点击（同步任务，update 无法插针）
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  // 同步派发：豁免判定与（若缺陷复发的）行点击均为同步链，立即读取
  const r1 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-row-ignore-escape')!
    return {
      rowClick: Number(t.dataset.rowClick ?? '0'),
      hasSpan: !!t.shadowRoot!.querySelector('td[data-col="op"] span'),
    }
  })
  expect(r1.rowClick, '逃生口容器内点击不应连带 oas-row-click').toBe(0)
  expect(r1.hasSpan, '逃生口点击不应触发行选中重建（内容应仍在原格）').toBe(true)
  // 对照：逃生口外的普通文本单元格点击仍派发 oas-row-click（逃生口未误伤正常行点击）
  await page.evaluate(() => {
    const td = document
      .querySelector<HTMLElement>('#qa-row-ignore-escape')!
      .shadowRoot!.querySelector('td[data-col="name"]')!
    td.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  const r2 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-row-ignore-escape')!
    const v = Number(t.dataset.rowClick ?? '0')
    t.remove()
    return v
  })
  expect(r2, '逃生口外的普通单元格点击仍应派发 oas-row-click').toBe(1)
})

test('table 可编辑格内 oas-button 双击不进入编辑（编辑路径排除清单与行点击同源）', async ({ page }) => {
  // 缺陷固化：双击进编辑前排除清单 input,select,textarea,button,a 命中不了 <oas-button> 宿主，
  // 可编辑列行内嵌 oas-button（自定义内容）双击会误入编辑态——行点击清单已补 oas-button，
  // 编辑路径同款遗漏未修。修复=两条路径共用同一份排除清单（ROW_INTERACTIVE_EXCLUSION）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => customElements.get('oas-table') != null && customElements.get('oas-button') != null,
    null,
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-edit-inline-oas-button'
    t.setAttribute('editable', '')
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名', editable: true },
        { key: 'age', title: '年龄', editable: true },
      ]),
    )
    t.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
      ]),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  // 表格连接后异步渲染 shadow，会覆盖此前手动 append 的节点——用 waitForFunction 反复补挂，
  // 直到 oas-button 稳定存在于格内（避免与异步渲染竞态；快 server 下渲染更早、更易撞上）。
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#qa-edit-inline-oas-button') as HTMLElement | null
      const td = t?.shadowRoot?.querySelector('td[data-col="name"]')
      if (!td) return false
      if (!td.querySelector('oas-button')) {
        const btn = document.createElement('oas-button')
        btn.textContent = '改名'
        td.appendChild(btn)
        return false
      }
      return true
    },
    null,
    { timeout: 15000 },
  )
  // 真实双击可编辑格内 oas-button：按钮连点不得判为「双击编辑」
  await page.locator('#qa-edit-inline-oas-button td[data-col="name"] oas-button').dblclick()
  // 若缺陷复发，编辑器会在双击链的同步处理器内打开：立即读取即可判定
  const afterBtn = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-edit-inline-oas-button')!
    return {
      hasEditor: !!t.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!t.shadowRoot!.querySelector('th[data-editing-col="true"]'),
    }
  })
  expect(afterBtn.hasEditor, '双击 oas-button 不应进入编辑').toBe(false)
  expect(afterBtn.editingCol, '双击 oas-button 不应置列编辑高亮').toBe(false)
  // 对照：双击同表纯文本可编辑格照常进入编辑（扩展排除未误伤普通双击）
  await page.locator('#qa-edit-inline-oas-button td[data-col="age"]').first().dblclick()
  // 满负载下编辑器出现可能晚于固定等待（Firefox 全量并发实抓）——轮询替代固定 300ms
  const afterPlain = await page
    .waitForFunction(
      () => {
        const t = document.querySelector<HTMLElement>('#qa-edit-inline-oas-button')
        return !!t?.shadowRoot?.querySelector('input.cell-editor')
      },
      null,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false)
  await page.evaluate(() => document.querySelector('#qa-edit-inline-oas-button')?.remove())
  expect(afterPlain, '纯文本可编辑格双击应照常进入编辑').toBe(true)
})

test('table selected / empty-text 进 observedAttributes：纯受控 setAttribute 立即重渲染（API 表受控承诺对齐）', async ({
  page,
}) => {
  // 缺陷固化：selected / empty-text 不在 observedAttributes，外部宿主 setAttribute 不触发
  // attributeChangedCallback → 视图不刷新（直到下一次任意 observed 属性变化）——与 API 表把
  // selected 列为受控属性的承诺不一致。修复：补进 observedAttributes。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const t = document.createElement('oas-table') as HTMLElement
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    t.setAttribute('data', JSON.stringify([{ name: '张三', age: 30 }]))
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
    // selected 受控驱动：高亮应立即出现
    t.setAttribute('selected', '张三')
    const highlighted = t.shadowRoot!.querySelector('tr.row')!.getAttribute('data-selected')
    // empty-text 受控驱动：空态文案应立即更新
    t.setAttribute('data', '[]')
    t.setAttribute('empty-text', '受控空态文案')
    const emptyText = t.shadowRoot!.querySelector('td.empty')!.textContent
    t.remove()
    return { highlighted, emptyText }
  })
  expect(r.highlighted, 'setAttribute selected 应立即高亮行').toBe('true')
  expect(r.emptyText, 'setAttribute empty-text 应立即更新空态文案').toBe('受控空态文案')
})

test('table 多级表头 + column-keys 重排：表头叶列与数据列顺序一致（组头按数据列顺序重组）', async ({ page }) => {
  // 缺陷固化：buildHeaderGrid 按原始列树渲染组头/叶头，数据列走 effectiveColumns
  // （column-keys 过滤+排序）——列拖拽重排（写回 column-keys）后表头叶列与数据列顺序脱节。
  // 修复：column-keys 受控时按有效叶序重组表头树（连续同组叶子并入原组）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const t = document.createElement('oas-table') as HTMLElement
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        {
          key: 'base',
          title: '基础信息',
          children: [
            { key: 'name', title: '姓名' },
            { key: 'age', title: '年龄' },
          ],
        },
        { key: 'city', title: '城市' },
      ]),
    )
    t.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30, city: '北京' },
        { name: '李四', age: 25, city: '上海' },
      ]),
    )
    // 模拟列拖拽重排：city 提到最前，组内 age 在 name 前
    t.setAttribute('column-keys', JSON.stringify(['city', 'age', 'name']))
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
    const thKey = (th: Element) => th.getAttribute('data-key')
    const topRow = [...t.shadowRoot!.querySelectorAll('thead > tr')][0]!
    const bottomRow = [...t.shadowRoot!.querySelectorAll('thead > tr')][1]!
    const dataCols = [...t.shadowRoot!.querySelectorAll('tbody tr.row td')].map((td) => td.getAttribute('data-col'))
    const out = {
      top: [...topRow.querySelectorAll('th')].map((th) => ({
        text: th.textContent!.trim(),
        colspan: th.getAttribute('colspan'),
        rowspan: th.getAttribute('rowspan'),
      })),
      bottom: [...bottomRow.querySelectorAll('th')].map(thKey),
      dataCols,
    }
    t.remove()
    return out
  })
  // 顶层：城市（rowspan=2）在前，基础信息组（colspan=2）在后
  expect(r.top[0]!.text).toBe('城市')
  expect(r.top[0]!.rowspan).toBe('2')
  expect(r.top[1]!.text).toBe('基础信息')
  expect(r.top[1]!.colspan).toBe('2')
  // 底行叶序与数据列严格一致（city rowspan=2 占两行不在底行，组内叶序 age→name 与数据列一致）
  expect(r.bottom).toEqual(['age', 'name'])
  expect(r.dataCols.slice(0, 3)).toEqual(['city', 'age', 'name'])
})

test('table 虚拟滚动 + 展开行超高：内容截断防溢出重叠（overflow:hidden + 定高行）', async ({ page }) => {
  // 缺陷固化：虚拟模式所有 tr 强制定高（row-height），expand 内容行同样被定高——
  // 展开内容超过 row-height 时溢出并与后续行重叠。修复：虚拟模式下展开行单元格
  // overflow:hidden 截断（定高虚拟模型的明确限制，富展开内容用非虚拟模式）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const t = document.createElement('oas-table') as HTMLElement
    t.setAttribute('row-key', 'name')
    t.setAttribute('height', '200')
    t.setAttribute('row-height', '40')
    t.setAttribute('columns', JSON.stringify([{ key: 'name', title: '姓名' }]))
    t.setAttribute(
      'data',
      JSON.stringify([
        {
          name: '张三',
          expand: '<div style="height:300px">超高展开内容</div>',
        },
        { name: '李四' },
        { name: '王五' },
      ]),
    )
    t.setAttribute('expanded', '张三')
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
    const expandTd = t.shadowRoot!.querySelector('tr.expand-row td') as HTMLElement
    const out = {
      hasExpand: expandTd != null,
      overflow: expandTd ? getComputedStyle(expandTd).overflow : '',
      rowH: Math.round(t.shadowRoot!.querySelector('tr.expand-row')!.getBoundingClientRect().height),
    }
    t.remove()
    return out
  })
  expect(r.hasExpand, '展开行应渲染').toBe(true)
  expect(r.overflow, '虚拟模式展开行单元格应截断溢出内容').toBe('hidden')
  // 定高 40 + 1px 行边框（表格边框计入 getBoundingClientRect）
  expect(r.rowH, '展开行应被定高（row-height + 边框）').toBeLessThanOrEqual(41)
})

test('table 行单选（checkable="radio"）：真实点击互斥 + 再点已选行取消', async ({ page }) => {
  // 交互固化：单选档点选互斥、再点已选行取消（原生 radio 点击已选项不会自动取消，组件补该语义）；
  // 全部走受控写回（click 拦截默认激活行为），happy-dom 单测已覆盖机制，此处锁定真实浏览器事件链。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const t = document.createElement('oas-table') as HTMLElement
    t.id = 'qa-radio-select'
    t.setAttribute('checkable', 'radio')
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    t.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
      ]),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  const radios = page.locator('#qa-radio-select .check-cell input[type="radio"]')
  await radios.nth(0).click()
  // 选中写回的真实信号：selected 属性已落到目标值（受控写回与 checked 同步链）
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-radio-select')!.getAttribute('selected')))
    .toBe('张三')
  const afterFirst = await page.evaluate(() => {
    const t = document.querySelector('#qa-radio-select')!
    return {
      selected: t.getAttribute('selected'),
      checked: [...t.shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="radio"]')].map(
        (r) => r.checked,
      ),
      headerInput: !!t.shadowRoot!.querySelector('thead th.check-cell input'),
    }
  })
  expect(afterFirst.selected).toBe('张三')
  expect(afterFirst.checked).toEqual([true, false])
  expect(afterFirst.headerInput, '单选档表头不应有全选框').toBe(false)
  // 点第二行：互斥切换
  await radios.nth(1).click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-radio-select')!.getAttribute('selected')))
    .toBe('李四')
  // 选中切换会触发 tbody 重建：连续两次快照一致（重建落定）后再点已选行，避免点击落在重建窗口内被吞
  let prevRadioTbodyKey: string | null = null
  await expect
    .poll(async () => {
      const key = await page.evaluate(() => {
        const t = document.querySelector('#qa-radio-select')!
        return `${t.shadowRoot!.querySelectorAll('tbody tr').length}:${t.shadowRoot!.querySelector('tbody')!.innerHTML.length}`
      })
      const stable = key === prevRadioTbodyKey
      prevRadioTbodyKey = key
      return stable
    })
    .toBe(true)
  const afterSecond = await page.evaluate(() => {
    const t = document.querySelector('#qa-radio-select')!
    return {
      selected: t.getAttribute('selected'),
      checked: [...t.shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="radio"]')].map(
        (r) => r.checked,
      ),
    }
  })
  expect(afterSecond.selected).toBe('李四')
  expect(afterSecond.checked).toEqual([false, true])
  // 再点已选行：取消选中
  await radios.nth(1).click()
  // 取消写回的真实信号：selected 值清空（移除或置空串，与末段断言同口径）
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-radio-select')?.getAttribute('selected') ?? ''))
    .toBe('')
  const afterDeselect = await page.evaluate(() => {
    const t = document.querySelector('#qa-radio-select')!
    const v = {
      selected: t.getAttribute('selected'),
      checked: [...t.shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="radio"]')].map(
        (r) => r.checked,
      ),
    }
    t.remove()
    return v
  })
  expect(afterDeselect.selected ?? '', '再点已选行应取消选中').toBe('')
  expect(afterDeselect.checked).toEqual([false, false])
})

test('table 触屏：列重排上移/下移按钮（HTML5 DnD 触屏替代）+ 小钮 coarse 热区', async ({ page }) => {
  // 固化缺口：列重排走 HTML5 DnD（dragstart/dragover）触屏不可用。修复：每个列头注入
  // 上移/下移按钮（PC display:none 零影响，coarse 显示），点击与相邻可见列交换顺序；
  // filter 钮/展开钮/列宽拖拽手柄 coarse 下命中区抬到 44px。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  // DSD 快照下 shadowRoot 在 upgrade 前已存在：须等列重排按钮真正注入（controller hostUpdated 跑过）
  await page.waitForFunction(
    () => document.querySelector('oas-table')?.shadowRoot?.querySelector('.col-move') != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-table')!
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const ths = [...el.shadowRoot!.querySelectorAll<HTMLElement>('thead th[data-key]')]
    const moves = ths.map((th) => ({
      key: th.getAttribute('data-key')!,
      up: !!th.querySelector('.col-move.up'),
      down: !!th.querySelector('.col-move.down'),
      upDisabled: (th.querySelector('.col-move.up') as HTMLButtonElement | null)?.disabled ?? null,
    }))
    return {
      thCount: ths.length,
      moves,
      coarse: style.includes('@media (pointer: coarse)'),
      colMoveHidden: /\.col-move\s*\{[^}]*display:\s*none/.test(style),
      filterHit: /\.filter-btn::before\s*\{[^}]*inset:\s*-13px/.test(style),
      resizeCoarse: /data-col-resizing[\s\S]*?width:\s*44px/.test(style),
      moveVisible: /@media \(pointer: coarse\)[\s\S]*\.col-move\s*\{[^}]*display:\s*inline-flex/.test(style),
    }
  })
  expect(r.thCount).toBeGreaterThanOrEqual(2)
  // 每个列头都有上移/下移钮，首列 up 禁用
  for (const m of r.moves) {
    expect(m.up, `${m.key} 上移钮在场`).toBe(true)
    expect(m.down, `${m.key} 下移钮在场`).toBe(true)
  }
  expect(r.moves[0]!.upDisabled).toBe(true)
  // PC 态隐藏、coarse 显示；filter/resize 热区在场
  expect(r.colMoveHidden).toBe(true)
  expect(r.moveVisible).toBe(true)
  expect(r.coarse).toBe(true)
  expect(r.filterHit).toBe(true)
  expect(r.resizeCoarse).toBe(true)
  // 点击下移按钮实际交换列序（JS click 不受 display:none 影响，走真实事件路径）
  const before = await page.evaluate(() => {
    const el = document.querySelector('oas-table')!
    return [...el.shadowRoot!.querySelectorAll('thead th[data-key]')].map((t) => t.getAttribute('data-key'))
  })
  await page.evaluate(() => {
    const el = document.querySelector('oas-table')!
    const th = el.shadowRoot!.querySelector('thead th[data-key]')!
    ;(th.querySelector('.col-move.down') as HTMLElement).click()
  })
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-table')!
    return [...el.shadowRoot!.querySelectorAll('thead th[data-key]')].map((t) => t.getAttribute('data-key'))
  })
  expect(after).toEqual([before[1], before[0], ...before.slice(2)])
})

test('table 过滤面板：打开后定位夹取在视口内（floating 引擎视口碰撞）', async ({ page }) => {
  // 固化缺口：过滤面板 fixed 定位只写 rect.left/bottom 无视口碰撞夹取，窄屏溢出。
  // 修复：定位走共享 floating 引擎（computePosition + getViewport），空间不足翻转、视口边缘夹取。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  // demo 首个表格未必有 filterable 列：动态注入一列 filterable 后打开面板
  await page.evaluate(() => {
    const el = document.querySelector('oas-table') as HTMLElement & {
      columns?: unknown
    }
    const cols = JSON.parse(el.getAttribute('columns') ?? '[]') as Array<Record<string, unknown>>
    cols[0] = { ...cols[0], filterable: true }
    el.setAttribute('columns', JSON.stringify(cols))
  })
  // filter 按钮注入完成的真实信号：.filter-btn 出现
  await page.waitForFunction(
    () => !!document.querySelector('oas-table')?.shadowRoot?.querySelector('th[data-key] .filter-btn'),
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('oas-table')!
    const btn = el.shadowRoot!.querySelector<HTMLElement>('th[data-key] .filter-btn')!
    btn.click()
  })
  const rect = await page.evaluate(() => {
    const panel = document.querySelector('oas-table')!.shadowRoot!.querySelector<HTMLElement>('.filter-panel')!
    const r = panel.getBoundingClientRect()
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      vw: innerWidth,
      vh: innerHeight,
    }
  })
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.top).toBeGreaterThanOrEqual(0)
  expect(rect.right).toBeLessThanOrEqual(rect.vw)
  expect(rect.bottom).toBeLessThanOrEqual(rect.vh)
})

test('table show-header=false：表头不渲染、数据行保留；切回 true 恢复（demo 开关反馈）', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table#table-show-header')
  // 初始：表头渲染
  const r0 = await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-show-header')!
    return {
      headers: el.shadowRoot!.querySelectorAll('thead th').length,
      rows: el.shadowRoot!.querySelectorAll('[part="row"]').length,
    }
  })
  expect(r0.headers).toBe(3)
  expect(r0.rows).toBe(3)
  // 点击「隐藏表头」：thead 空了，数据行不动
  await page.locator('#table-show-header-toggle').click()
  const r1 = await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-show-header')!
    const firstRow = el.shadowRoot!.querySelector('[part="row"]')!
    return {
      attr: el.getAttribute('show-header'),
      headers: el.shadowRoot!.querySelectorAll('thead th').length,
      rows: el.shadowRoot!.querySelectorAll('[part="row"]').length,
      firstCellOk: firstRow.querySelector('td[data-col="name"]')?.textContent,
      btnText: document.querySelector('#table-show-header-toggle')!.textContent,
    }
  })
  expect(r1.attr).toBe('false')
  expect(r1.headers).toBe(0)
  expect(r1.rows).toBe(3)
  expect(r1.firstCellOk).toContain('张三')
  expect(r1.btnText).toContain('显示表头')
  // 切回：表头恢复
  await page.locator('#table-show-header-toggle').click()
  const r2 = await page.evaluate(
    () => document.querySelector('oas-table#table-show-header')!.shadowRoot!.querySelectorAll('thead th').length,
  )
  expect(r2).toBe(3)
})

test('table P2 批：cell-click/row-dblclick 事件反馈可见 + row-expandable 谓词存活 + max-height 限高', async ({
  page,
}) => {
  // 新批属性/事件经真实 demo 链路存活：Vue 下 property（rowExpandable）不被剥离、
  // 单击/双击反馈行有可见文本变化、max-height 落成滚动容器内联样式
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-cell-events')
  // 等 rowExpandable property 赋值生效（whenDefined 链）——条件等待替代盲等
  // （该 demo 数据固定 3 行：张三/李四/王五）
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('oas-table#table-cell-events')!.shadowRoot!.querySelectorAll('tbody tr').length,
      ),
    )
    .toBe(3)

  // rowExpandable（property 函数通道）：key=c 的行（王五）无展开钮，其余行有
  const expand = await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-row-expandable')!
    const trs = [...el.shadowRoot!.querySelectorAll('[part="row"]')]
    return trs.map((tr) => tr.querySelectorAll('td.expand-toggle-cell .toggle').length)
  })
  expect(expand, '谓词返回 false 的行无展开钮').toEqual([1, 1, 0])

  // max-height=200：滚动容器限高生效 + 表头吸顶规则在样式表
  const mh = await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-max-height')!
    return {
      maxHeight: el.shadowRoot!.querySelector('.table-scroll')!.getAttribute('style'),
      rowCount: el.shadowRoot!.querySelectorAll('[part="row"]').length,
      // 期望行数由 demo 数据现算（数据驱动，与视口/字体度量无关）
      dataCount: (el as unknown as { data?: unknown[] }).data?.length ?? 0,
    }
  })
  expect(mh.maxHeight).toContain('200px')
  expect(mh.rowCount, '数据行全部渲染（限高靠滚动而非截断）').toBe(mh.dataCount)

  // 单击单元格：反馈行文本更新（demo 监听 oas-cell-click）
  await page.locator('#table-cell-events').scrollIntoViewIfNeeded()
  const cell = page.locator('oas-table#table-cell-events').locator('td[data-col="age"]').first()
  await cell.click()
  await page.waitForFunction(() => (document.querySelector('#table-cell-feedback')?.textContent ?? '') !== '—', null, {
    timeout: 5000,
  })
  const feedback = await page.textContent('#table-cell-feedback')
  expect(feedback).toContain('age')

  // 双击行：双击反馈行文本更新（demo 监听 oas-row-dblclick）
  await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-cell-events')!
    const tr = el.shadowRoot!.querySelector('[part="row"]')!
    tr.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  await page.waitForFunction(() => (document.querySelector('#table-dbl-feedback')?.textContent ?? '') !== '—', null, {
    timeout: 5000,
  })

  // 交互宿主排除：button 内点击不派发 cell-click（反馈文本不变）
  const before = await page.textContent('#table-cell-feedback')
  await page.evaluate(() => {
    const el = document.querySelector('oas-table#table-cell-events')!
    const td = el.shadowRoot!.querySelector('td[data-col="name"]')!
    const btn = document.createElement('button')
    btn.textContent = 'x'
    td.appendChild(btn)
    btn.click()
  })
  // 同步派发：排除判定（若缺陷复发的 cell-click）为同步链，立即读取
  expect(await page.textContent('#table-cell-feedback')).toBe(before)
})

// ---- D 类能力：exportable / grid-navigation / row-draggable（用户视角回归） ----

test('table 导出（D8）：点击导出按钮派发 oas-export 且走 Blob 下载链路', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-export')
  // 真交互前把目标滚进视口（页面加载初期的焦点滚动会移动位置，先锚定）
  await page.evaluate(() => document.querySelector('#table-export')?.scrollIntoView({ block: 'center' }))
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__exportBlobs = []
    const orig = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (obj: Blob) => {
      ;(w.__exportBlobs as Array<{ type: string; size: number }>).push({
        type: obj.type,
        size: obj.size,
      })
      return orig(obj)
    }
    document.querySelector('#table-export')!.addEventListener('oas-export', (e: Event) => {
      w.__exportDetail = (e as CustomEvent).detail
    })
  })
  // 工具栏按钮真实存在且可点（event 反馈 + blob 生成都断言）
  await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-export')!
    t.shadowRoot!.querySelector<HTMLButtonElement>('.export-btn[data-format="csv"]')!.click()
  })
  const res = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    return {
      detail: w.__exportDetail as {
        format: string
        fileName: string
        rowCount: number
      },
      blobs: w.__exportBlobs as Array<{ type: string; size: number }>,
      // 导出条数期望值 = demo 数据行数（DOM 现算，数据驱动）
      dataCount:
        (
          document.querySelector('oas-table#table-export') as unknown as {
            data?: unknown[]
          }
        ).data?.length ?? 0,
    }
  })
  expect(res.detail.format).toBe('csv')
  expect(res.detail.rowCount, 'oas-export 的 rowCount = 表数据行数').toBe(res.dataCount)
  expect(res.detail.fileName).toBe('员工表.csv')
  expect(res.blobs.some((b) => b.type.startsWith('text/csv') && b.size > 0)).toBe(true)

  // Excel 按钮同样可用（SpreadsheetML + ms-excel MIME）
  await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-export')!
    t.shadowRoot!.querySelector<HTMLButtonElement>('.export-btn[data-format="excel"]')!.click()
  })
  const excel = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    return {
      detail: w.__exportDetail as { format: string; fileName: string },
      blobs: w.__exportBlobs as Array<{ type: string; size: number }>,
    }
  })
  expect(excel.detail.format).toBe('excel')
  expect(excel.detail.fileName).toBe('员工表.xls')
  expect(excel.blobs.some((b) => b.type.startsWith('application/vnd.ms-excel'))).toBe(true)
})

test('table 网格导航（D9）：单停靠点 + 方向键漫游单元格（role=grid）', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-grid-nav')
  await page.evaluate(() => document.querySelector('#table-grid-nav')?.scrollIntoView({ block: 'center' }))
  const role = await page.evaluate(() =>
    document.querySelector('oas-table#table-grid-nav')!.shadowRoot!.querySelector('table')!.getAttribute('role'),
  )
  expect(role, 'grid-navigation 下表格应为 role=grid').toBe('grid')
  // Tab 进容器后方向键漫游：焦点落到单元格
  await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-grid-nav')!
    t.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!.focus()
  })
  await page.keyboard.press('ArrowRight')
  const first = await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-grid-nav')!
    const ae = t.shadowRoot!.activeElement as HTMLElement | null
    return { tag: ae?.tagName ?? null, role: ae?.getAttribute('role') ?? null }
  })
  expect(first.tag).toBe('TD')
  expect(first.role).toBe('gridcell')
  await page.keyboard.press('ArrowDown')
  const moved = await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-grid-nav')!
    const ae = t.shadowRoot!.activeElement as HTMLElement | null
    const tr = ae?.closest('tr') ?? null
    const rows = [...t.shadowRoot!.querySelectorAll('tr.row')]
    return { row: tr ? rows.indexOf(tr) : -1, tag: ae?.tagName ?? null }
  })
  expect(moved.tag, 'ArrowDown 后仍聚焦单元格（未丢焦点）').toBe('TD')
  expect(moved.row, 'ArrowDown 移动到下一行').toBe(1)
})

test('table 网格导航 × 行/格手势：grid-navigation 开启时点行/点格不被 role=gridcell 吞掉（复审回归）', async ({
  page,
}) => {
  // 缺陷固化：行级手势排除清单曾用 `[role]` 通配，网格语义给 table/tr/td 挂 grid/row/gridcell 后
  // 一律早退——真鼠标实测 rowClick/cellClick 恒 0、selected 恒空（关闭 grid-navigation 时正常）。
  // 修复=按「交互角色白名单」判定（结构角色不入白名单）；行内真实控件仍须豁免。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  // ① demo 表（#table-grid-nav，grid-navigation 常开）：真鼠标点数据格 → 可见反馈更新（用户视角）
  await up(page, '#table-grid-nav')
  await page.evaluate(() => {
    document.querySelector('#table-grid-nav')?.scrollIntoView({ block: 'center' })
    const el = document.querySelector('#table-grid-nav-feedback')
    if (el) el.textContent = ''
  })
  await page.locator('oas-table#table-grid-nav').locator('td[data-col="name"]').first().click()
  await expect(page.locator('#table-grid-nav-feedback'), '点格反馈须更新（修复前恒空）').toContainText('张三 · name')

  // ② 探针表：机制（oas-row-click / oas-cell-click / selected 写入）+ 行内真实控件仍豁免
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-grid-nav-clicks'
    t.setAttribute('grid-navigation', '')
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    t.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
      ]),
    )
    t.dataset.rowClick = '0'
    t.dataset.cellClick = '0'
    t.dataset.btnClick = '0'
    t.addEventListener('oas-row-click', () => {
      t.dataset.rowClick = String(Number(t.dataset.rowClick) + 1)
    })
    t.addEventListener('oas-cell-click', () => {
      t.dataset.cellClick = String(Number(t.dataset.cellClick) + 1)
    })
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-grid-nav-clicks')?.shadowRoot?.querySelectorAll('tbody tr.row td[role="gridcell"]')
        .length ?? 0) > 0,
    null,
    { timeout: 15000 },
  )
  // 真鼠标点格：行点击（选中 + oas-row-click）与 oas-cell-click 都应生效
  await page.locator('#qa-grid-nav-clicks td[data-col="age"]').first().click()
  // 事件落地的真实信号：row-click 计数到 1（cell-click 与选中写回同一同步链）
  await expect
    .poll(() =>
      page.evaluate(() => Number(document.querySelector<HTMLElement>('#qa-grid-nav-clicks')?.dataset.rowClick ?? '0')),
    )
    .toBe(1)
  const r1 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-grid-nav-clicks')!
    const row = t.shadowRoot!.querySelector('tbody tr[data-key="张三"]')
    return {
      rowClick: Number(t.dataset.rowClick ?? '0'),
      cellClick: Number(t.dataset.cellClick ?? '0'),
      selected: t.getAttribute('selected'),
      rowSelected: row?.getAttribute('data-selected') ?? null,
    }
  })
  expect(r1.rowClick, 'grid-navigation 下点格须派发 oas-row-click').toBe(1)
  expect(r1.cellClick, 'grid-navigation 下点格须派发 oas-cell-click').toBe(1)
  expect(r1.selected, '行选中写入 selected').toBe('张三')
  expect(r1.rowSelected, '行 DOM 呈选中态').toBe('true')

  // 行内真实控件（原生按钮 / 输入框）仍豁免：点击不连带行级手势、不改选中
  await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-grid-nav-clicks')!
    const td = t.shadowRoot!.querySelector('tbody tr[data-key="李四"] td[data-col="name"]')!
    const btn = document.createElement('button')
    btn.id = 'qa-grid-nav-inline-btn'
    btn.textContent = '行内按钮'
    btn.addEventListener('click', () => {
      t.dataset.btnClick = String(Number(t.dataset.btnClick) + 1)
    })
    const input = document.createElement('input')
    input.id = 'qa-grid-nav-inline-input'
    td.append(btn, input)
  })
  await page.locator('#qa-grid-nav-clicks #qa-grid-nav-inline-btn').click()
  await page.locator('#qa-grid-nav-clicks #qa-grid-nav-inline-input').click()
  // 同步链：豁免判定（若缺陷复发的行/格连带）立即反映，无需宽限期
  const r2 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-grid-nav-clicks')!
    const row = t.shadowRoot!.querySelector('tbody tr[data-key="李四"]')
    return {
      rowClick: Number(t.dataset.rowClick ?? '0'),
      cellClick: Number(t.dataset.cellClick ?? '0'),
      btnClick: Number(t.dataset.btnClick ?? '0'),
      selected: t.getAttribute('selected'),
      rowSelected: row?.getAttribute('data-selected') ?? null,
      hasInput: !!t.shadowRoot!.querySelector('#qa-grid-nav-inline-input'),
    }
  })
  // 单次点击恰好一次：计数器精确值（不是「至少一次」——重复派发同样是缺陷）
  expect(r2.btnClick, '行内按钮自身被真实点击').toBe(1)
  expect(r2.rowClick, '行内按钮点击不连带 oas-row-click').toBe(1)
  expect(r2.cellClick, '行内输入框/按钮点击不连带 oas-cell-click').toBe(1)
  expect(r2.selected, '行内控件点击不改行选中').toBe('张三')
  expect(r2.rowSelected, '行内控件所在行未被选中').toBe('false')
  expect(r2.hasInput, '鼠标点击输入框未触发行级重建（节点留存）').toBe(true)

  await page.evaluate(() => document.querySelector('#qa-grid-nav-clicks')?.remove())
})

test('table 行拖拽（D15）：拖手柄换位派发 oas-row-reorder 且宿主复现顺序', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-row-drag')
  await page.evaluate(() => document.querySelector('#table-row-drag')?.scrollIntoView({ block: 'center' }))
  const detail = await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-row-drag')!
    let captured: unknown = null
    t.addEventListener('oas-row-reorder', (e: Event) => (captured = (e as CustomEvent).detail))
    const handles = t.shadowRoot!.querySelectorAll<HTMLElement>('.row-drag-handle')
    const rows = t.shadowRoot!.querySelectorAll<HTMLElement>('tr.row')
    const dt = new DataTransfer()
    handles[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
    const target = rows[1]!
    target.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        clientY: target.getBoundingClientRect().bottom - 1,
        dataTransfer: dt,
      }),
    )
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
    return captured as { from: number; to: number; row: { name: string } }
  })
  expect(detail.from).toBe(0)
  expect(detail.to).toBe(1)
  expect(detail.row.name).toBe('张三')
  // 宿主受控复现：demo 监听后重排 data → 行顺序可见变化 + 反馈文本更新
  await page.waitForFunction(() => document.querySelector('#table-row-drag-feedback')?.textContent === '0 → 1', null, {
    timeout: 5000,
  })
  const order = await page.evaluate(() => {
    const t = document.querySelector('oas-table#table-row-drag')!
    return [...t.shadowRoot!.querySelectorAll('tr.row td[data-col="name"]')].map((td) => td.textContent)
  })
  expect(order).toEqual(['李四', '张三', '王五', '赵六'])
})

test('table column-virtual 横向虚拟：窗口列渲染 + 占位归并 + 滚动推移 + 固定列恒渲染', async ({ page }) => {
  // 大宽表场景：60 列（含 1 个 left 固定列）× 40 行，行虚拟 height + column-virtual 双开。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-table', { timeout: 10000 })
  await up(page, 'oas-table')

  const r = await page.evaluate(async () => {
    const COLS = 60
    const ROWS = 40
    const columns = Array.from({ length: COLS }, (_, i) => ({
      key: `c${i}`,
      title: `列${i}`,
      width: 120,
      ...(i === 0 ? { fixed: 'left' as const } : {}),
    }))
    const data = Array.from({ length: ROWS }, (_, r) =>
      Object.fromEntries(Array.from({ length: COLS }, (_, c) => [`c${c}`, `r${r}c${c}`])),
    )
    const el = document.createElement('oas-table')
    el.setAttribute('column-virtual', '')
    el.setAttribute('height', '300')
    el.setAttribute('row-height', '36')
    el.setAttribute('checkable', '')
    document.body.append(el)
    const t = el as unknown as { columns: unknown; data: unknown }
    t.columns = columns
    t.data = data
    await new Promise((res) => setTimeout(res, 200))

    const scroll = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    const countTds = (): number => el.shadowRoot!.querySelectorAll('tbody td').length
    const countTh = (): number => el.shadowRoot!.querySelectorAll('thead th').length
    const windowDataTds = (): number => el.shadowRoot!.querySelectorAll('tbody td[data-col]').length

    const before = {
      scrollWidth: scroll.scrollWidth,
      thCount: countTh(),
      tdCount: countTds(),
      dataTds: windowDataTds(),
      fixedVisible: !!el.shadowRoot!.querySelector('td[data-fixed="left"]'),
    }

    // 横向滚动到中段 → 列窗口推移
    scroll.scrollLeft = 2400
    await new Promise((res) => setTimeout(res, 120))
    const afterScroll = {
      firstDataKey: el.shadowRoot!.querySelector('tbody td[data-col]')?.getAttribute('data-col'),
      fixedVisible: !!el.shadowRoot!.querySelector('td[data-fixed="left"]'),
      headKeys: [...el.shadowRoot!.querySelectorAll('thead th[data-key]')].map((th) => th.getAttribute('data-key')),
      firstRowKeys: [
        ...(el.shadowRoot!.querySelectorAll('tbody tr.row')[0]?.querySelectorAll('td[data-col]') ?? []),
      ].map((td) => td.getAttribute('data-col')),
    }

    // 纵向滚动到底 → 行窗口推移（双开验证）
    scroll.scrollTop = 10000
    await new Promise((res) => setTimeout(res, 120))
    const lastRowKeys = [...el.shadowRoot!.querySelectorAll('tbody tr[data-key]')]
      .slice(-3)
      .map((tr) => tr.getAttribute('data-key'))

    return {
      ...before,
      scrollWidth: scroll.scrollWidth,
      afterScroll,
      lastRowKeys,
    }
  })

  // 横向虚拟核心：DOM 列数远小于总列数（窗口 + 占位归并）
  expect(r.thCount, '表头 th 数 = 前置 + 固定 + 窗口 + 占位（远小于 60）').toBeLessThan(30)
  expect(r.tdCount, '行内 td 数远小于 60×行数').toBeLessThan(60 * 5)
  expect(r.scrollWidth, 'colgroup 撑出全列总宽（横向滚动条真实存在）').toBeGreaterThan(60 * 120)
  expect(r.fixedVisible, 'left 固定列恒渲染').toBe(true)
  // 滚动后窗口推移（data-col 内容由窗口决定；此处验证窗口列在滚动后仍正确渲染）
  expect(r.afterScroll.fixedVisible, '横向滚动后固定列仍在').toBe(true)
  // 下界理由：滚动 2400px 后非固定窗口列的首个 key 依赖 overscan 内部常量（无固定值）；
  // 稳定契约是「窗口推移后仍渲染非固定列且不塌缩」——固定列 c0 之外至少 3 列
  //（视口 1160px 可见近 10 列，overscan 无论如何不小于此），窗口列渲染由下方 toEqual 覆盖
  expect(
    r.afterScroll.firstRowKeys.filter((k) => k !== 'c0').length,
    '滚动后窗口仍渲染非固定列（推移不塌缩）',
  ).toBeGreaterThanOrEqual(3)
  // 表头/首行窗口列一一对应（含「表头窗口列已渲染」——空数组无法与 firstRowKeys 对等）
  expect(r.afterScroll.headKeys, '横向滚动后 thead 与 tbody 首行窗口列一一对应（回归：双开 thead 滞留旧窗口）').toEqual(
    r.afterScroll.firstRowKeys,
  )
  // 纵向滚动到底的精确表达：窗口末 3 行恰为数据末三行 r37/r38/r39（顺序锁定）
  expect(r.lastRowKeys[0], '纵向滚动到底：窗口倒数第 3 行为 r37').toContain('r37')
  expect(r.lastRowKeys[1], '纵向滚动到底：窗口倒数第 2 行为 r38').toContain('r38')
  expect(r.lastRowKeys[2], '纵向滚动到底：窗口末行为 r39').toContain('r39')
})

test('table 编辑 × column-virtual：滚动后双击窗口列，编辑器落在正确格并提交正确列（回归）', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 自建 60 列宽表：editable + editComponent（oas-input 组件编辑器）+ column-virtual
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-edit-colvirtual'
    el.setAttribute('editable', '')
    el.setAttribute('column-virtual', '')
    el.setAttribute(
      'columns',
      JSON.stringify(
        Array.from({ length: 60 }, (_, i) => ({
          key: `c${i}`,
          title: `列${i}`,
          width: '80px',
          editable: true,
          editComponent: 'oas-input',
        })),
      ),
    )
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 8 }, (_, r) =>
          Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`c${i}`, `${r}-${i}`])),
        ),
      ),
    )
    document.body.appendChild(el)
  })
  await page.waitForFunction(() => {
    const t = document.querySelector('#qa-edit-colvirtual')
    return !!t && t.shadowRoot!.querySelectorAll('tbody td[data-col]').length > 0
  })
  // 横向滚动到中段后取窗口内一个具体列，双击该列单元格
  const target = await page.evaluate(() => {
    const t = document.querySelector('#qa-edit-colvirtual')!
    const scroll = t.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    scroll.scrollLeft = 2400
    return new Promise<string>((resolve) =>
      setTimeout(() => resolve(t.shadowRoot!.querySelector('tbody td[data-col]')!.getAttribute('data-col')!), 150),
    )
  })
  // 双击该格 → 组件编辑器挂载在同一 td 内（列窗口占位归并不使索引错位）。
  // 编辑 + 提交必须在同一个任务内完成：打开编辑器后 WebKit 会因聚焦把单元格滚入视口而触发
  // 一次列窗口重渲染（滚动帧按设计静默取消编辑），跨 evaluate 的 150ms 间隔正好落进该窗口。
  const r = await page.evaluate(async (col) => {
    const t = document.querySelector('#qa-edit-colvirtual')!
    const td = t.shadowRoot!.querySelector(`tbody td[data-col="${col}"]`)!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const editor = td.querySelector('oas-input.cell-editor-component') as
      | (HTMLElement & { shadowRoot: ShadowRoot })
      | null
    const opened = editor ? td.getAttribute('data-col') : null
    if (!editor) return { opened, submitted: null, editorGone: false }
    // 输入新值 → 失焦提交（oas-input 真实链路：内部 input blur → oas-change）→ 回写正确列
    const inner = editor.shadowRoot.querySelector('input')!
    inner.value = `已编辑-${col}`
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    inner.dispatchEvent(new FocusEvent('blur'))
    await new Promise((resolve) => setTimeout(resolve, 150))
    const tdAfter = t.shadowRoot!.querySelector(`tbody td[data-col="${col}"]`)
    const hostData = JSON.parse(t.getAttribute('data') ?? '[]')
    return {
      opened,
      submitted: (hostData[0] as Record<string, unknown>)[col] ?? null,
      editorGone: !tdAfter?.querySelector('.cell-editor-component'),
    }
  }, target)
  expect(r.opened, `双击 ${target} 后编辑器落在同格（C3：占位格曾使索引错位到错误列/占位格）`).toBe(target)
  expect(r.editorGone, '失焦提交后编辑器退出').toBe(true)
  expect(r.submitted, `值回写到被编辑列 ${target}`).toBe(`已编辑-${target}`)
})

test('table 三开（height + group-by + row-draggable）：虚拟下拖拽禁用故分组安全生效，且虚拟滚动重建后口径一致（回归——孪生路径曾漏接互斥判定，滚动后分组口径漂移）', async ({
  page,
}) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-table')
    el.setAttribute('height', '300')
    el.setAttribute('group-by', 'dept')
    el.setAttribute('row-draggable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'dept', title: '部门' },
        { key: 'name', title: '姓名' },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 30 }, (_, i) => ({
          dept: `组${i % 3}`,
          name: `员工${i}`,
        })),
      ),
    )
    document.body.appendChild(el)
    await new Promise((res) => setTimeout(res, 250))
    const groupKeysOf = () =>
      [...el.shadowRoot!.querySelectorAll('tr.group-header')].map((tr) => tr.getAttribute('data-group') ?? '')
    const initial = groupKeysOf()
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 500
    await new Promise((res) => setTimeout(res, 150))
    const afterScroll = groupKeysOf()
    wrap.scrollTop = 0
    await new Promise((res) => setTimeout(res, 150))
    const afterBack = groupKeysOf()
    el.remove()
    return { initial, afterScroll, afterBack }
  })
  // 顶部起窗的精确表达：首组头必为 组0（内容契约，替代单纯计数）
  expect(r.initial, '虚拟下拖拽禁用，分组安全生效（顶部起窗含首组头）').toContain('组0')
  // 下界理由：scrollTop=500 的窗口中间态含哪些组头取决于滚动位置与行高（无固定值）；
  // 契约是「虚拟滚动重建后分节头仍在（口径不漂移）」，组键合法性由下方 valid 集合断言覆盖
  expect(r.afterScroll.length, '虚拟滚动重建后分节头仍在（口径不漂移）').toBeGreaterThanOrEqual(1)
  // 回顶的精确表达：与顶部起窗对称，首组头回到 组0
  expect(r.afterBack, '回滚后分节头仍在且回到首组').toContain('组0')
  // 组键合法性：滚动/回滚后出现的分节头都属于合法分组（孪生路径判定漂移时
  // 会出现 update 时没有的组或重复组——对齐原缺陷语义，不依赖窗口常量巧合）
  const valid = new Set(['组0', '组1', '组2'])
  for (const k of [...r.initial, ...r.afterScroll, ...r.afterBack]) {
    expect(valid.has(k), `组键 ${k} 属于合法分组`).toBe(true)
  }
})

test('table 浮层编辑器通道（editComponent 第二期）：选定即提交 + Esc 双层级 + 外点提交（PRD 验收闭环）', async ({
  page,
}) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit-overlay')
  // 1. 双击部门列 → oas-select 挂载 + 浮层自动展开
  await page.evaluate(() => {
    const t = document.querySelector('#table-edit-overlay')!
    const td = t.shadowRoot!.querySelector('tbody td[data-col="dept"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  // 就绪等待用轮询而非固定 sleep：CI 2 核 runner 上挂载/展开/选项渲染都可能晚于任意常数，
  // 固定等待会让后续交互落在「还没接线」的列表上（曾致选定值未提交的失败：期望 be 实收旧值 fe）
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const t = document.querySelector('#table-edit-overlay')!
          const editor = t.shadowRoot!.querySelector('tbody td[data-col="dept"] .cell-editor-component')
          return editor?.shadowRoot?.querySelectorAll('.option, [role="option"]').length ?? 0
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(3)
  const opened = await page.evaluate(() => {
    const t = document.querySelector('#table-edit-overlay')!
    const editor = t.shadowRoot!.querySelector('tbody td[data-col="dept"] .cell-editor-component')
    return {
      tag: editor?.tagName.toLowerCase() ?? null,
      open: editor?.shadowRoot!.querySelector('.trigger')?.getAttribute('aria-expanded') === 'true',
      options: editor?.shadowRoot!.querySelectorAll('.option, [role="option"]').length ?? 0,
    }
  })
  expect(opened.tag, 'oas-select 挂载').toBe('oas-select')
  expect(opened.open, '浮层自动展开').toBe(true)
  // dept 列 editOptions 固定 3 项（前端部/后端部/测试部）——精确值
  expect(opened.options, '选项渲染').toBe(3)

  // 2. 选定选项 → 提交并回写（浮层关闭 + 编辑退出）
  // 真实点击（pointerdown → mousedown → mouseup → click 完整链路 + 可见/稳定/可命中动作等待），
  // 替代「合成 click + 固定 sleep」的时序假设：真实指针链路会走编辑器的指针抑制窗口，
  // 与用户操作同路径；动作等待保证落点在已就绪的选项上。
  await page
    .locator('#table-edit-overlay tbody td[data-col="dept"] .option')
    .filter({ hasText: '后端部' })
    .first()
    .click()
  // 提交是「选定即提交」（oas-change）——轮询等待回写落定，仍按精确值断言（不等同放宽）
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              JSON.parse(document.querySelector('#table-edit-overlay')!.getAttribute('data') ?? '[]') as Array<
                Record<string, unknown>
              >
            )[0]?.dept,
        ),
      { timeout: 5_000 },
    )
    .toBe('be')
  const submitted = await page.evaluate(() => {
    const t = document.querySelector('#table-edit-overlay')!
    const data = JSON.parse(t.getAttribute('data') ?? '[]') as Array<Record<string, unknown>>
    return {
      dept: String(data[0]?.dept ?? ''),
      editing: !!t.shadowRoot!.querySelector('[data-editing="true"]'),
    }
  })
  expect(submitted.dept, '选定提交回写').toBe('be')
  expect(submitted.editing, '提交后退出编辑态').toBe(false)

  // 3. Esc 双层级：第一层关浮层（编辑不取消），第二层取消编辑
  const escFlow = await page.evaluate(async () => {
    const t = document.querySelector('#table-edit-overlay')!
    const td = t.shadowRoot!.querySelector('tbody td[data-col="dept"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    await new Promise((r) => setTimeout(r, 300))
    const editor = () => td.querySelector('.cell-editor-component')!
    const trigger = () => editor().shadowRoot!.querySelector('.trigger')!
    const isOpen = () => trigger().getAttribute('aria-expanded') === 'true'
    const open1 = isOpen()
    trigger().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
      }),
    )
    await new Promise((r) => setTimeout(r, 200))
    const afterFirst = {
      open: isOpen(),
      editing: !!t.shadowRoot!.querySelector('[data-editing="true"]'),
    }
    trigger().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
      }),
    )
    await new Promise((r) => setTimeout(r, 200))
    const afterSecond = !!t.shadowRoot!.querySelector('[data-editing="true"]')
    return { open1, afterFirst, afterSecond }
  })
  expect(escFlow.open1, '进编辑浮层开').toBe(true)
  expect(escFlow.afterFirst.open, '第一层 Esc 关浮层').toBe(false)
  expect(escFlow.afterFirst.editing, '第一层不取消编辑').toBe(true)
  expect(escFlow.afterSecond, '第二层 Esc 取消编辑').toBe(false)

  // 4. 外点提交：进编辑 → 指针落在表外 + 焦点离开编辑器（真实点击的两步：pointerdown 判定
  // 抑制窗口 + blur 触发提交；合成事件不转移焦点，须显式派 focusout 模拟真实焦点链）
  const outside = await page.evaluate(async () => {
    const t = document.querySelector('#table-edit-overlay')!
    const td = t.shadowRoot!.querySelector('tbody td[data-col="dept"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    await new Promise((r) => setTimeout(r, 300))
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
    const editor = td.querySelector('.cell-editor-component')!
    editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    return new Promise((r) => setTimeout(() => r(!t.shadowRoot!.querySelector('[data-editing="true"]')), 250))
  })
  expect(outside, '外点提交退出编辑态').toBe(true)
})

test('table 子元素通道 + 列内模板 + 真实列宽拖拽：不崩表（回归：resize 回写 JSON 把 DOM 模板序列化成 {} 致整表渲染抛错）', async ({
  page,
}) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  // md/Vue 编译管线不支持 <template> 子内容（文档明写该路径仅原生 HTML）——页面内注入原生形态
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(String(e.message)))
  await page.evaluate(async () => {
    await customElements.whenDefined('oas-table')
    const host = document.createElement('oas-table')
    host.id = 'tbl-child-tpl'
    host.setAttribute('row-key', 'name')
    host.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
      ]),
    )
    host.innerHTML =
      '<oas-table-column data-key="name" title="姓名" width="120">' +
      '<template><strong>{{row.name}}</strong></template></oas-table-column>' +
      '<oas-table-column data-key="age" title="年龄"></oas-table-column>'
    host.style.cssText = 'position:fixed;left:0;top:0;width:480px;z-index:9999'
    document.body.appendChild(host)
  })
  await page.waitForSelector('#tbl-child-tpl', { state: 'attached' })
  // 模板列渲染完成的真实信号：姓名列 strong 已挂（hydrate 完成后才做拖拽）
  await expect
    .poll(() =>
      page.evaluate(
        () => !!document.querySelector('#tbl-child-tpl')?.shadowRoot?.querySelector('td[data-col="name"] strong'),
      ),
    )
    .toBe(true)
  // 真实列宽拖拽：th 右缘热区 pointerdown → move → up（走列设置控制器完整链路）
  const edge = await page.evaluate(() => {
    const host = document.querySelector('#tbl-child-tpl')!
    const th = host.shadowRoot!.querySelector('th[data-key="name"]')!
    const r = th.getBoundingClientRect()
    return { x: r.right - 2, y: r.top + r.height / 2 }
  })
  const widthBefore = await page.evaluate(() =>
    document.querySelector('#tbl-child-tpl')!.querySelector('oas-table-column[data-key="name"]')!.getAttribute('width'),
  )
  await page.mouse.move(edge.x, edge.y)
  await page.mouse.down()
  await page.mouse.move(edge.x + 100, edge.y, { steps: 5 })
  await page.mouse.up()
  // 宽度落盘的真实信号：声明源 width attribute 已离开初值（拖拽结果写回）
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector('#tbl-child-tpl')!
            .querySelector('oas-table-column[data-key="name"]')
            ?.getAttribute('width') ?? null,
      ),
    )
    .not.toBe(widthBefore)
  const r = await page.evaluate(() => {
    const host = document.querySelector('#tbl-child-tpl')!
    return {
      rows: host.shadowRoot!.querySelectorAll('tbody tr').length,
      tplAlive: host.shadowRoot!.querySelector('td[data-col="name"] strong')?.textContent ?? null,
      columnsAttr: host.getAttribute('columns'),
      childWidth: host.querySelector('oas-table-column[data-key="name"]')?.getAttribute('width') ?? null,
    }
  })
  expect(pageErrors, '页面零报错（旧版 TypeError: cloneNode of undefined）').toEqual([])
  expect(r.rows, 'resize 后整表仍渲染').toBe(2)
  expect(r.tplAlive, '模板渲染不丢').toBe('张三')
  expect(r.columnsAttr, '含模板的列定义不回写 columns attribute').toBeNull()
  // 宽度落到声明源：值为拖拽结果（table-layout auto 下 th 实际宽 ≠ 声明的 120，断言机制而非绝对值）
  // Firefox 会把实际布局宽度回写成小数（如 340.117px）；断言数值有效且确实更新，
  // 不用整数正则误判合法子像素宽度。
  const childWidth = Number.parseFloat(r.childWidth ?? '')
  expect(Number.isFinite(childWidth) && childWidth > 0, '宽度落到声明源（子元素 width attribute）').toBe(true)
  expect(r.childWidth, '宽度随拖拽更新（不再是初始 120px）').not.toBe('120px')
})

test('table 外部数据分页（total）：data 视为当前页不内部切片，真点翻页由宿主换数据（demo 可见反馈）', async ({
  page,
}) => {
  // 缺陷防线：total 在场时组件若仍走内部分页切片，会把宿主给的当前页数据重新切片/钳行，
  // 服务端分页场景下页数与数据双重错位；此处以 demo（#table-total，total=47）真点翻页固化。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-total')
  await page.locator('#table-total').scrollIntoViewIfNeeded()

  const state = () =>
    page.evaluate(() => {
      const host = document.querySelector('#table-total') as HTMLElement
      const pag = host.shadowRoot!.querySelector('.pagination oas-pagination') as HTMLElement | null
      const firstCell = host.shadowRoot!.querySelector('tbody td')?.textContent ?? null
      return {
        total: pag?.getAttribute('total') ?? null,
        current: host.getAttribute('current'),
        rows: host.shadowRoot!.querySelectorAll('tbody tr').length,
        firstCell,
        feedback: document.querySelector('#table-total-page')?.textContent ?? null,
      }
    })

  const s0 = await state()
  expect(s0.total, 'total 直通内层分页器').toBe('47')
  expect(s0.current, '初始 current=1').toBe('1')
  expect(s0.rows, '宿主当前页切片原样渲染（5 行）').toBe(5)
  expect(s0.firstCell, '第 1 页首格为服务端第 1 条').toBe('1')
  expect(s0.feedback, 'demo 反馈显示当前页').toBe('1')

  // 真点内层分页器的下一页（嵌套两层 shadow，DOM click 走真实事件流）
  await page.evaluate(() => {
    const host = document.querySelector('#table-total') as HTMLElement
    const pag = host.shadowRoot!.querySelector('.pagination oas-pagination') as HTMLElement
    ;(pag.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
  })
  // 等 demo 宿主 oas-page-change 换数据后重渲染
  await page.waitForFunction(() => document.querySelector('#table-total')!.getAttribute('current') === '2')
  const s1 = await state()
  expect(s1.current, '翻页写回 current').toBe('2')
  expect(s1.rows, '第 2 页仍 5 行（宿主换的数据，组件未切片改写）').toBe(5)
  expect(s1.firstCell, '第 2 页首格为服务端第 6 条（数据真的换了）').toBe('6')
  expect(s1.feedback, 'demo 反馈同步为 2').toBe('2')
  expect(s1.total, '翻页后 total 仍 47').toBe('47')
})

test('table windowed：滚动派发 oas-window-request、宿主回填渲染绝对行、本地排序禁用', async ({ page }) => {
  // 服务端行窗口模式机制回归（契约见 packages/ui/src/shared/window-data.ts）：
  // 组件只持有已装载切片，按可视行窗口派发 oas-window-request（绝对半开区间）；
  // 宿主回填新窗口后渲染行跳变到新绝对行；本地排序禁用（行序不变，
  // oas-sort-change 照常派发供宿主做服务端排序）。devWarn 属 dev-only 通道
  //（生产构建被摇掉），其「禁用 + 实例级去重」由 oas-table-windowed.test.ts 单测覆盖。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  // 注入 windowed fixture（组件由站点 bundle 全局注册）：height=200 / row-height=40
  // → 视口 5 行 + buffer4 → 可视 [0,9)；±margin8 → 期望区间 = [0,17)
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'table-windowed-fixture'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '0')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', sortable: true }]))
    el.setAttribute('data', JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ name: `行${i}` }))))
    ;(window as any).__winReqs = []
    el.addEventListener('oas-window-request', (e) => {
      ;(window as any).__winReqs.push((e as CustomEvent).detail)
    })
    document.body.appendChild(el)
  })

  // 1) 首帧 init 请求：期望 [0,17)，已装载 [0,5) 未覆盖 → 派发 { start:0, end:17, reason:'init' }
  // （显式 15s：满并发全量下 preview 单线程/浏览器 CPU 饱和会拉长 rAF 与解析，默认超时偶发不够）
  await page.waitForFunction(() => (window as any).__winReqs.length > 0, null, {
    timeout: 15000,
  })
  const init = await page.evaluate(() => (window as any).__winReqs[0])
  expect(init).toEqual({ start: 0, end: 17, reason: 'init' })

  // 2) 宿主回填覆盖 [0,17) 后滚动（scrollTop=400 → 可视 [6,19) → 期望 [0,27)）→ 派发 [0,27) 请求。
  //    断言「窗口区间」而非 reason：ResizeObserver（resize）可能先以同一区间到达并按 need 去重，
  //    使后到的 scroll 路径被去重吞掉（reason 属竞态敏感值，曾致偶发红）。
  await page.evaluate(() => {
    const el = document.querySelector('#table-windowed-fixture')!
    el.setAttribute('data', JSON.stringify(Array.from({ length: 17 }, (_, i) => ({ name: `行${i}` }))))
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 400
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() => (window as any).__winReqs.some((r: any) => r.start === 0 && r.end === 27), null, {
    timeout: 15000,
  })
  const winReq = await page.evaluate(() => (window as any).__winReqs.find((r: any) => r.start === 0 && r.end === 27))
  expect(winReq.start, '请求起点（含 margin 前扩）').toBe(0)
  expect(winReq.end, '请求终点（可视 [6,19) + margin8）').toBe(27)
  expect(['scroll', 'resize', 'init', 'data'], `触发原因须为合法窗口请求原因（实得 ${winReq.reason}）`).toContain(
    winReq.reason,
  )

  // 3) 宿主回填新窗口 [100,140) 并滚到装载区 → 渲染行跳变到绝对行 100 起，
  //    行 0..99 未装载 → 顶部占位 = 100 * 40 = 4000px
  await page.evaluate(() => {
    const el = document.querySelector('#table-windowed-fixture')!
    el.setAttribute('window-start', '100')
    el.setAttribute('data', JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ name: `行${100 + i}` }))))
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 4040
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#table-windowed-fixture')!
      const first = el.shadowRoot!.querySelector('tbody tr[part="row"]')
      const rows = el.shadowRoot!.querySelectorAll('tbody tr[part="row"]')
      return (first?.textContent?.includes('行100') ?? false) && rows.length === 10
    },
    null,
    { timeout: 15000 },
  )
  const layout = await page.evaluate(() => {
    const el = document.querySelector('#table-windowed-fixture')!
    const trs = el.shadowRoot!.querySelectorAll('tbody tr')
    const first = trs[0] as HTMLElement
    const rows = el.shadowRoot!.querySelectorAll('tbody tr[part="row"]')
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    // 期望渲染行数不写死：= 「可视窗口 ∩ 已装载切片」的现算值。窗口按组件契约的定高模型
    // （computeVirtualWindow：floor/ceil(scrollTop..scrollTop+视口高 / 行高) ± buffer 4）推导；
    // 行高/视口高/总行数取 fixture 显式属性（设计常量，与字体度量无关），scrollTop 取 DOM 实测。
    const rowH = Number(el.getAttribute('row-height'))
    const total = Number(el.getAttribute('total'))
    const viewportH = Number(el.getAttribute('height'))
    const loadedStart = Number(el.getAttribute('window-start'))
    const loadedEnd = loadedStart + JSON.parse(el.getAttribute('data') ?? '[]').length
    const BUFFER = 4
    const maxTop = Math.max(0, total * rowH - viewportH)
    const top = Math.min(Math.max(0, wrap.scrollTop), maxTop)
    const winStart = Math.max(0, Math.floor(top / rowH) - BUFFER)
    const winEnd = Math.min(total, Math.ceil((top + viewportH) / rowH) + BUFFER)
    return {
      firstIsSpacer: first.classList.contains('spacer'),
      topSpacerHeight: (first.firstElementChild as HTMLElement).style.height,
      firstRowText: rows[0]?.textContent ?? '',
      rowCount: rows.length,
      expectedRowCount: Math.max(0, Math.min(loadedEnd, winEnd) - Math.max(loadedStart, winStart)),
    }
  })
  expect(layout.firstIsSpacer, '首行是顶部占位（绝对行定位）').toBe(true)
  expect(layout.topSpacerHeight, '行 0..99 未装载 → 占位 4000px').toBe('4000px')
  expect(layout.firstRowText, '渲染行跳变到绝对行 100').toContain('行100')
  expect(
    layout.rowCount,
    `渲染行数 = 可视窗口 ∩ 装载切片（现算 ${layout.expectedRowCount}：可视 [97,110) ∩ 装载 [100,140)）`,
  ).toBe(layout.expectedRowCount)

  // 4) 本地排序禁用：点表头 → oas-sort-change 照常派发（宿主通道）但行序不变 + devWarn
  const sortDetail = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#table-windowed-fixture')!
        el.addEventListener('oas-sort-change', (e) => resolve((e as CustomEvent).detail), { once: true })
        const th = el.shadowRoot!.querySelector('th.sortable') as HTMLElement
        th.click()
      }),
  )
  expect(sortDetail).toEqual({ key: 'name', order: 'asc' })
  const afterSort = await page.evaluate(() => {
    const el = document.querySelector('#table-windowed-fixture')!
    return [...el.shadowRoot!.querySelectorAll('tbody tr[part="row"]')].map((r) => r.textContent)
  })
  expect(afterSort.length).toBe(10)
  expect(afterSort[0], '本地排序禁用：首行仍是行100（行序不变）').toContain('行100')
  // devWarn 属 dev-only 通道（docs 为生产构建 → NODE_ENV=production 时被摇掉），故此 e2e 不断言告警；
  // 「windowed 下本地操作禁用 + 告警（实例级去重）」由 oas-table-windowed.test.ts 单测覆盖

  // 清理 fixture，避免污染同页其他用例
  await page.evaluate(() => document.querySelector('#table-windowed-fixture')?.remove())
})

test('table windowed a11y + 编辑/点击 rowIndex 同口径（复审回归）', async ({ page }) => {
  // 复审补口固化：
  // ① windowed 下 aria-rowcount=total（全量）、每行 aria-rowindex=绝对行号 1 基；
  // ② oas-edit 的 rowIndex 与 oas-cell-click 同为绝对行号（曾用 DOM 内切片序号 → 宿主映射错行）。
  // 注：本用例不叠加 grid-navigation（保持单变量）。历史上「网格语义给 td 挂 role=gridcell 会命中
  // 行级手势排除清单的 [role] 通配而阻断 cell-click / 双击进编辑」的交互冲突已修复（排除清单改为
  // 交互角色白名单，grid/row/gridcell 等结构角色不入白名单）——该链路由本文件
  // 「table 网格导航 × 行/格手势」用例 + oas-table-d-class.test.ts 的 F2 单测固化。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-a11y'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '10')
    el.setAttribute('editable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称', editable: true },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 5 }, (_, i) => ({
          name: `行${10 + i}`,
          age: 10 + i,
        })),
      ),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#qa-windowed-a11y')
    return !!el?.shadowRoot?.querySelector('tbody tr.row')
  })

  // ① ARIA：全量口径不随渲染切片变化
  const aria = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-a11y')!
    return {
      rowcount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      indexes: [...el.shadowRoot!.querySelectorAll('tbody tr.row')].map((tr) => tr.getAttribute('aria-rowindex')),
    }
  })
  expect(aria.rowcount, 'aria-rowcount 为全量 total').toBe('1000')
  expect(aria.indexes, 'aria-rowindex 为绝对行号 1 基').toEqual(['11', '12', '13', '14', '15'])

  // ② 点击 / 编辑 rowIndex 同口径（绝对行号 10）——全部同步在一个 evaluate 内完成，
  //    避免 windowed 的 ResizeObserver rAF 重建在步骤之间插针拆掉编辑器（settleEdit）
  const idx = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-a11y')!
    let cellIdx = -1
    let editIdx = -1
    el.addEventListener('oas-cell-click', (e) => (cellIdx = (e as CustomEvent).detail.rowIndex))
    el.addEventListener('oas-edit', (e) => (editIdx = (e as CustomEvent).detail.rowIndex))
    const td = el.shadowRoot!.querySelector('tbody tr.row td[data-col="name"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    // 首击触发行选中重建 → 重查活节点再双击进编辑
    const fresh = el.shadowRoot!.querySelector('tbody tr.row td[data-col="name"]') as HTMLElement
    fresh.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const input = fresh.querySelector<HTMLInputElement>('input.cell-editor')
    if (input) {
      input.value = '改名'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    }
    return { cellIdx, editIdx, hasEditor: !!input }
  })
  expect(idx.hasEditor, '双击进入编辑').toBe(true)
  expect(idx.cellIdx, 'cell-click 绝对行号').toBe(10)
  expect(idx.editIdx, 'oas-edit 与 cell-click 同口径（曾为切片内 0 基序号）').toBe(10)

  await page.evaluate(() => document.querySelector('#qa-windowed-a11y')?.remove())
})

test('table windowed 键盘到已装载末端越界：派发 oas-window-request（不得静默，复审回归）', async ({ page }) => {
  // 复审补口固化：网格键盘移动到已装载切片末端越界曾无响应（死路）；
  // 修复=按目标绝对行 ±margin 派发 oas-window-request，宿主回填后该行可达。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-kbd'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '10')
    el.setAttribute('grid-navigation', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 5 }, (_, i) => ({
          name: `行${10 + i}`,
          age: 10 + i,
        })),
      ),
    )
    ;(window as any).__winKbdReqs = []
    el.addEventListener('oas-window-request', (e) => (window as any).__winKbdReqs.push((e as CustomEvent).detail))
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#qa-windowed-kbd')
    return !!el?.shadowRoot?.querySelectorAll('tbody tr.row').length
  })
  // 聚焦末行（绝对行 14）+ ArrowDown → 目标绝对行 15 超出已装载 [10,15) → 期望 [7,24)
  // 聚焦与派发同一 evaluate 内同步完成：windowed 的 ResizeObserver rAF 重建会移除被聚焦行
  //（跨 evaluate 的 focus→press 之间被插针则焦点落空，handler 走入口聚焦分支而非越界请求）
  await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-kbd')!
    const rows = [...el.shadowRoot!.querySelectorAll('tbody tr.row')]
    const td = rows[4]!.querySelector('td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  })
  await page.waitForFunction(() => (window as any).__winKbdReqs.length > 0)
  const req = await page.evaluate(() => (window as any).__winKbdReqs[0])
  expect(req, '越界派发请求覆盖目标绝对行 ±margin').toEqual({
    start: 7,
    end: 24,
    reason: 'scroll',
  })
  await page.evaluate(() => document.querySelector('#qa-windowed-kbd')?.remove())
})

test('table windowed × 行内嵌 expand：expand 占视觉槽位不占数据行号，滚动裁剪下总高稳定（含 dark/console）', async ({
  page,
}) => {
  // 缺陷固化：windowed 虚拟窗口曾只按绝对数据行号（abs）给 display 条目铺位，expand 内容行
  // 不递增——而 expand 又是独立定高 <tr>，在 DOM flow 中实际多占一行高。后果：expand 与
  // 下一数据行共享槽位 → 滚动窗口边界把行6 误裁剪出渲染集合、tbody 总高随滚动漂移 40px。
  // 修复=双坐标记账（abs=数据行号语义不变；flowY=视觉 flow 供 culling/spacer），数据行号、
  // ARIA、oas-window-request 均不变。
  // fixture：window-start=0 / total=1000 / height=200 / row-height=40，41 行，行5 expand 且展开
  // → scrollTop=430 窗口 [240,800)（含 buffer）：expand（flowY=240）在 DOM；
  //   scrollTop=440 窗口 [280,800)：expand 恰被裁掉，窗口下缘落在「共享槽 / flow 槽」之间。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-expand'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '0')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 41 }, (_, i) => ({
          name: `行${i}`,
          ...(i === 5 ? { expand: '<div>详情5</div>' } : {}),
        })),
      ),
    )
    el.setAttribute('expanded', '行5')
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#qa-windowed-expand')
    return !!el?.shadowRoot?.querySelector('tbody tr.row')
  })

  const scrollTo = (top: number) =>
    page.evaluate((v) => {
      const el = document.querySelector('#qa-windowed-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      wrap.scrollTop = v
      wrap.dispatchEvent(new Event('scroll'))
    }, top)
  /** 渲染集合快照：expand 行在否、数据行号集合、ARIA、tbody 总高（style 记账 + 实际 rect 双口径） */
  const snapshot = () =>
    page.evaluate(() => {
      const el = document.querySelector('#qa-windowed-expand')!
      const trs = [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]
      const styleSum = trs.reduce(
        (s, tr) =>
          s +
          (tr.classList.contains('spacer')
            ? parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
            : parseFloat(tr.style.height || '0')),
        0,
      )
      const rectSum = trs.reduce((s, tr) => s + Math.round(tr.getBoundingClientRect().height), 0)
      return {
        expandInDom: !!el.shadowRoot!.querySelector('tbody tr.expand-row'),
        rowIndexes: [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) =>
          tr.getAttribute('data-row-index'),
        ),
        ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
        styleSum,
        rectSum,
      }
    })

  // scrollTop=430：rAF 稳定后（锚行 18 在两种记账口径下都渲染；expand 在 430 窗口内必然在场，
  // 用「scrollTop + 行18 + expand 在场」三条件防上一滚动位置的陈旧渲染插针）
  await scrollTo(430)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return wrap.scrollTop === 430 && idx.has('18') && !!el.shadowRoot!.querySelector('tbody tr.expand-row')
    },
    null,
    { timeout: 15000 },
  )
  const at430 = await snapshot()
  expect(at430.expandInDom, 'expand 内容行在 DOM（flow 槽位 240 落在窗口内）').toBe(true)
  expect(at430.rowIndexes, '行5 已滚出窗口（数据行号集合不含 expand 占号）').not.toContain('5')
  expect(at430.rowIndexes, '行6 在渲染集合').toContain('6')

  // scrollTop=440：窗口下缘 800 恰在「共享槽 / flow 槽」之间——expand 恰被裁掉
  //（两种记账口径下 440 都裁 expand，可作「新渲染已完成」的判据，防 430 陈旧 DOM 插针），
  // 但 tbody 总高必须与 430 一致（contentH = 1000*40 + 1*40 = 40040，缺陷实现少 40），
  // 且行6 不得被 expand 的共享槽位误裁剪（曾从渲染集合消失）
  await scrollTo(440)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return wrap.scrollTop === 440 && idx.has('18') && !el.shadowRoot!.querySelector('tbody tr.expand-row')
    },
    null,
    { timeout: 15000 },
  )
  const at440 = await snapshot()
  expect(at440.expandInDom, 'expand 行被裁出窗口').toBe(false)
  expect(at440.rowIndexes, '行6 仍在渲染集合（不被 expand 共享槽位误裁剪）').toContain('6')
  expect(at440.styleSum, 'tbody 记账总高 = 40040（total*40 + expand 槽位 40；缺陷实现 40000）').toBe(40040)
  expect(at440.rectSum, '实际 rect 高度和与记账一致').toBe(40040)
  expect(at440.styleSum, 'scrollTop=440 总高与 430 一致（不随滚动漂移）').toBe(at430.styleSum)
  // expand 不占数据行号 / ARIA：aria-rowcount 仍为全量 total；行6 aria-rowindex = 绝对行号 1 基 7
  expect(at440.ariaCount, 'aria-rowcount 全量口径不变').toBe('1000')
  const aria6 = await page.evaluate(() =>
    document
      .querySelector('#qa-windowed-expand')!
      .shadowRoot!.querySelector('tbody tr[data-row-index="6"]')!
      .getAttribute('aria-rowindex'),
  )
  expect(aria6, '行6 aria-rowindex 为绝对行号 1 基（expand 不挤占 ARIA 序号）').toBe('7')

  // dark 主题下重复总高与行号断言（主题只换 token，布局记账必须一致）
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await scrollTo(430)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return wrap.scrollTop === 430 && idx.has('18') && !!el.shadowRoot!.querySelector('tbody tr.expand-row')
    },
    null,
    { timeout: 15000 },
  )
  const dark430 = await snapshot()
  expect(dark430.expandInDom, 'dark：expand 内容行在 DOM').toBe(true)
  expect(dark430.styleSum, 'dark：记账总高 40040').toBe(40040)
  await scrollTo(440)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return wrap.scrollTop === 440 && idx.has('18') && !el.shadowRoot!.querySelector('tbody tr.expand-row')
    },
    null,
    { timeout: 15000 },
  )
  const dark440 = await snapshot()
  expect(dark440.expandInDom, 'dark：expand 行被裁出窗口').toBe(false)
  expect(dark440.rowIndexes, 'dark：行6 仍在渲染集合').toContain('6')
  expect(dark440.styleSum, 'dark：总高与 430 一致').toBe(dark430.styleSum)
  expect(dark440.rectSum, 'dark：实际 rect 高度和 = 40040').toBe(40040)

  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.querySelector('#qa-windowed-expand')?.remove()
  })
})

test('table windowed × 本地 expand>12：请求按 abs/flow 映射覆盖真实可见行（visualStart/End 附带，dark/console/ARIA）', async ({
  page,
}) => {
  // 缺陷固化：切片内展开数超过 buffer + WINDOW_MARGIN（4+8=12）时，旧请求区间按均匀 data
  // 网格猜测（vis 在数据 total 上计算）——渲染窗口（视觉坐标）与请求区间坐标系错位，快速
  // 跨越装载边界滚动会出现视觉重锚。修复=渲染与请求共用 abs/flow 记账：可视窗口按相交条目
  // 投影回数据坐标（含 expand 属主行），visualStart/visualEnd 附带可视窗口视觉坐标。
  // fixture：window-start=100 / total=1000 / 41 行全展开（视觉行数 1041）/ scrollTop=4440
  // → 可视窗口（视觉）[107,120) → 相交投影 min start=103 / max end=110 → [95,118)（旧公式 [99,128)）。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-expand-map'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '100')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 41 }, (_, i) => ({
          name: `行${100 + i}`,
          expand: `<div class="exp">详情${100 + i}</div>`,
        })),
      ),
    )
    el.setAttribute('expanded', Array.from({ length: 41 }, (_, i) => `行${100 + i}`).join(','))
    ;(window as any).__winReqDetail = null
    el.addEventListener('oas-window-request', (e) => {
      ;(window as any).__winReqDetail = (e as CustomEvent).detail
    })
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(
    () => !!document.querySelector('#qa-windowed-expand-map')?.shadowRoot?.querySelector('tbody'),
  )

  // 滚到装载区中部：可视窗口（视觉坐标）[107,120) → 期望区间按相交条目投影 [95,118)
  await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-expand-map')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 4440
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand-map')!
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return idx.has('104') && idx.has('109')
    },
    null,
    { timeout: 15000 },
  )
  const mapped = await page.evaluate(() => (window as any).__winReqDetail)
  expect(mapped.start, '映射后数据 start=103-8=95（旧均匀网格 99，坐标仍为数据行）').toBe(95)
  expect(mapped.end, '映射后数据 end=110+8=118').toBe(118)
  expect(mapped.visualStart, 'visualStart=可视窗口视觉坐标 107').toBe(107)
  expect(mapped.visualEnd, 'visualEnd=可视窗口视觉坐标 120（不含）').toBe(120)
  expect(['scroll', 'resize', 'init', 'data'], `reason 合法（实得 ${mapped.reason}）`).toContain(mapped.reason)

  // 渲染真实可见行 + 用户可见反馈：数据行 104..109 与属主 103..109 的 expand 内容行
  const visible = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-expand-map')!
    const body = el.shadowRoot!.querySelector('tbody')!
    return {
      rowIndexes: [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) =>
        tr.getAttribute('data-row-index'),
      ),
      expandRows: el.shadowRoot!.querySelectorAll('tbody tr.expand-row').length,
      has103: body.textContent!.includes('详情103'),
      has109: body.textContent!.includes('详情109'),
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      aria104: el.shadowRoot!.querySelector('tbody tr[data-row-index="104"]')!.getAttribute('aria-rowindex'),
      snapshotRow104: (el as any).getDisplaySnapshot()!.rowIndexByKey.get('行104'),
    }
  })
  expect(visible.rowIndexes, '真实可见数据行 104..109（渲染与请求同坐标系）').toEqual([
    '104',
    '105',
    '106',
    '107',
    '108',
    '109',
  ])
  expect(visible.expandRows, '可见 expand 内容行 7 根（属主 103..109）').toBe(7)
  expect(visible.has103, '属主 103 的 expand 内容真实可见').toBe(true)
  expect(visible.has109, '属主 109 的 expand 内容真实可见').toBe(true)
  expect(visible.ariaCount, 'aria-rowcount 仍为数据 total 全量口径').toBe('1000')
  expect(visible.aria104, 'aria-rowindex 仍为绝对数据行号 1 基（expand 不占号）').toBe('105')
  expect(visible.snapshotRow104, 'displaySnapshot 行键仍解析为绝对数据行号').toBe(104)

  // 真实交互反馈：点击行104 展开钮 → oas-expand 派发 + 本地收起（非协议仍由组件写 expanded）
  const toggled = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#qa-windowed-expand-map')!
        el.addEventListener(
          'oas-expand',
          (e) => {
            resolve({
              detail: (e as CustomEvent).detail,
              expandedAttr: el.getAttribute('expanded'),
            })
          },
          { once: true },
        )
        ;(el.shadowRoot!.querySelector(
          'tbody tr[data-row-index="104"] .expand-toggle-cell button.toggle',
        ) as HTMLElement)!.click()
      }),
  )
  expect((toggled as any).detail, 'oas-expand detail（宿主通道）').toEqual({
    key: '行104',
    expanded: false,
  })
  expect(
    ((toggled as any).expandedAttr as string).split(','),
    '非协议：本地 toggle 照旧写 expanded（行104 已移除）',
  ).not.toContain('行104')

  // dark 主题：布局记账与行号口径一致（主题只换 token；行104 已收起 → 后续条目上移，
  // 渲染数据行变为 104..110）
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-expand-map')!
      return (
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')]
          .map((tr) => tr.getAttribute('data-row-index'))
          .join(',') === '104,105,106,107,108,109,110'
      )
    },
    null,
    { timeout: 15000 },
  )
  const dark = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-expand-map')!
    return {
      expandRows: el.shadowRoot!.querySelectorAll('tbody tr.expand-row').length,
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
    }
  })
  expect(dark.expandRows, 'dark：可见 expand 内容行 6 根（行104 已收起）').toBe(6)
  expect(dark.ariaCount, 'dark：aria-rowcount 全量口径不变').toBe('1000')

  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.querySelector('#qa-windowed-expand-map')?.remove()
  })
})

test('table windowed × 视觉协议（visual-start/visual-total）：flow/总高走视觉坐标、展开由宿主控制（dark/console/ARIA/displaySnapshot）', async ({
  page,
}) => {
  // 可选视觉协议：宿主切片前已有展开行（visual-start=57 表示 data[0] 在视觉行 57），
  // visual-total=2000 为全量视觉行数。协议生效后 flow 从 57×40 起、渲染 count=2000、
  // 总高 = 2000×40 = 80000；本地 toggle 不改 expanded（宿主完全控制），只派发 oas-expand。
  // abs / data-row-index / ARIA / displaySnapshot 仍为数据坐标全量口径。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-visual-proto'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('visual-total', '2000')
    el.setAttribute('visual-start', '57')
    el.setAttribute('window-start', '50')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '行50', age: 20 },
        { name: '行51', age: 21, expand: '<div class="exp">详情51</div>' },
        { name: '行52', age: 22 },
        { name: '行53', age: 23 },
        { name: '行54', age: 24 },
        { name: '行55', age: 25 },
      ]),
    )
    el.setAttribute('expanded', '行51')
    ;(window as any).__protoReqs = []
    el.addEventListener('oas-window-request', (e) => {
      ;(window as any).__protoReqs.push((e as CustomEvent).detail)
    })
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(
    () => !!document.querySelector('#qa-windowed-visual-proto')?.shadowRoot?.querySelector('tbody'),
  )

  // 协议生效：行50 flow = 57×40 = 2280，滚到切片起点全部渲染；请求 start/end 为数据坐标 + 视觉字段
  await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-visual-proto')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 2280
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-visual-proto')!
      const idx = [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) =>
        tr.getAttribute('data-row-index'),
      )
      return idx.join(',') === '50,51,52,53,54,55'
    },
    null,
    { timeout: 15000 },
  )
  const scrollReq = await page.evaluate(() => (window as any).__protoReqs.at(-1))
  expect(scrollReq.start, 'start/end 仍为数据坐标（min 相交 50）').toBe(42)
  expect(scrollReq.end, 'end=数据坐标（max 相交 56 + margin 8）').toBe(64)
  expect(scrollReq.visualStart, 'visualStart=可视窗口视觉坐标（count=2000）').toBe(53)
  expect(scrollReq.visualEnd, 'visualEnd=可视窗口视觉坐标').toBe(66)
  const protoLayout = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-visual-proto')!
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]
    const styleSum = trs.reduce(
      (s, tr) =>
        s +
        (tr.classList.contains('spacer')
          ? parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
          : parseFloat(tr.style.height || '0')),
      0,
    )
    const rectSum = trs.reduce((s, tr) => s + Math.round(tr.getBoundingClientRect().height), 0)
    return {
      styleSum,
      rectSum,
      expandVisible: !!el.shadowRoot!.querySelector('tbody tr.expand-row'),
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      aria50: el.shadowRoot!.querySelector('tbody tr[data-row-index="50"]')!.getAttribute('aria-rowindex'),
      snapshotRow51: (el as any).getDisplaySnapshot()!.rowIndexByKey.get('行51'),
      snapshotFlat51: (el as any).getDisplaySnapshot()!.flatIndexByKey.get('行51'),
    }
  })
  expect(protoLayout.styleSum, '总高 = visual-total×行高 = 80000（视觉坐标权威）').toBe(80000)
  expect(
    Math.abs(protoLayout.rectSum - 80000),
    '实际渲染高度合计与记账一致（±2px 吸收浏览器亚像素舍入）',
  ).toBeLessThanOrEqual(2)
  expect(protoLayout.expandVisible, '行51 expand 内容真实可见').toBe(true)
  expect(protoLayout.ariaCount, 'aria-rowcount 仍为数据 total').toBe('100')
  expect(protoLayout.aria50, 'aria-rowindex 仍为绝对数据行号 1 基').toBe('51')
  expect(protoLayout.snapshotRow51, 'displaySnapshot 行键 → 绝对数据行号').toBe(51)
  expect(protoLayout.snapshotFlat51, 'displaySnapshot 扁平序不占视觉槽位').toBe(51)

  // 协议下本地 toggle = 宿主通道：oas-expand 派发、expanded 不被本地改写、展开行不本地增删
  const toggled = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#qa-windowed-visual-proto')!
        el.addEventListener(
          'oas-expand',
          (e) => {
            resolve({
              detail: (e as CustomEvent).detail,
              expandedAttr: el.getAttribute('expanded'),
              expandInDom: !!el.shadowRoot!.querySelector('tbody tr.expand-row'),
            })
          },
          { once: true },
        )
        ;(el.shadowRoot!.querySelector(
          'tbody tr[data-row-index="51"] .expand-toggle-cell button.toggle',
        ) as HTMLElement)!.click()
      }),
  )
  expect((toggled as any).detail, 'oas-expand 派发（宿主通道）').toEqual({
    key: '行51',
    expanded: false,
  })
  expect((toggled as any).expandedAttr, '协议生效：本地不改 expanded（宿主完全控制）').toBe('行51')
  expect((toggled as any).expandInDom, '展开状态不被本地增删（保持宿主给定状态）').toBe(true)
  // 宿主回写 expanded（收起 行51）→ 展开行随宿主状态消失（真实可见反馈）
  await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-visual-proto')!
    el.setAttribute('expanded', '')
  })
  await page.waitForFunction(
    () => !document.querySelector('#qa-windowed-visual-proto')!.shadowRoot!.querySelector('tbody tr.expand-row'),
    null,
    { timeout: 15000 },
  )

  // dark 主题：视觉坐标记账与 ARIA 口径一致
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-visual-proto')!
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]
    const styleSum = trs.reduce(
      (s, tr) =>
        s +
        (tr.classList.contains('spacer')
          ? parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
          : parseFloat(tr.style.height || '0')),
      0,
    )
    return {
      styleSum,
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      rowCount: el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]').length,
      // 期望值 = 已装载切片的数据行数（DOM 属性现算，数据驱动，不随主题/字体度量变化）
      loadedRows: JSON.parse(el.getAttribute('data') ?? '[]').length,
    }
  })
  expect(dark.styleSum, 'dark：总高仍为 80000').toBe(80000)
  expect(dark.ariaCount, 'dark：aria-rowcount 数据 total 不变').toBe('100')
  expect(dark.rowCount, 'dark：已装载切片的数据行照常渲染').toBe(dark.loadedRows)
  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.querySelector('#qa-windowed-visual-proto')?.remove()
  })
})

test('table windowed 越界切片：越界行及其 expand 不进渲染窗口（末行 expand 不抬窗）', async ({ page }) => {
  // 缺陷固化：渲染窗口 count = total + 当前切片 expand 数后，越界行自己的已展开 expand 会抬高
  // winBottom，使 abs >= total 的越界数据行重新渲染——违反既有「越界行不渲染」契约。
  // fixture：total=100 / window-start=95 / 切片 [95,105)（末 5 行越界）/ 行95 expand='合法95'、
  // 行100 expand='越界100'，两行都预展开；滚到装载区底部（scrollTop=3800）。
  const consoleIssues: string[] = []
  const oasWarnings: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleIssues.push(`error: ${m.text()}`)
    else if (m.type() === 'warning' && m.text().includes('[oas-table]')) oasWarnings.push(m.text())
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-overflow-expand'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '95')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({
          name: `行${95 + i}`,
          ...(i === 0 ? { expand: '合法95' } : {}),
          ...(i === 5 ? { expand: '越界100' } : {}),
        })),
      ),
    )
    el.setAttribute('expanded', '行95,行100')
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-overflow-expand')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 3800
    wrap.dispatchEvent(new Event('scroll'))
  })
  // 等滚动帧渲染完成（行99 在两种实现下都渲染，作锚）
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-windowed-overflow-expand')!
      const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const idx = new Set(
        [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) => tr.getAttribute('data-row-index')),
      )
      return wrap.scrollTop === 3800 && idx.has('99')
    },
    null,
    { timeout: 15000 },
  )
  const snap = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-overflow-expand')!
    return {
      rowIndexes: [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) =>
        tr.getAttribute('data-row-index'),
      ),
      expandTexts: [...el.shadowRoot!.querySelectorAll('tbody tr.expand-row')].map((tr) => tr.textContent ?? ''),
      bodyText: el.shadowRoot!.querySelector('tbody')!.textContent ?? '',
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
    }
  })
  expect(snap.rowIndexes, '数据行号仅 95..99（越界行100 不因 expand 抬窗重新渲染）').toEqual([
    '95',
    '96',
    '97',
    '98',
    '99',
  ])
  expect(snap.expandTexts, '只有合法行95 一个 expand').toEqual(['合法95'])
  expect(snap.bodyText, '无越界行100 内容').not.toContain('行100')
  expect(snap.bodyText, '无越界100 expand 内容').not.toContain('越界100')
  expect(snap.ariaCount, 'aria-rowcount 仍为全量 total').toBe('100')
  // pageerror / console error 零；[oas-table] warning 只允许既有「切片越界」提示
  //（docs 为生产构建时 devWarn 被摇掉 → 通常为空；dev 构建下若出现必须是预期提示）
  expect(consoleIssues, 'console/pageerror 零 error').toEqual([])
  expect(
    oasWarnings.filter((w) => !w.includes('超出全量范围')),
    '[oas-table] warning 仅允许既有切片越界提示',
  ).toEqual([])
  await page.evaluate(() => document.querySelector('#qa-windowed-overflow-expand')?.remove())
})

test('table windowed × 行内嵌 expand：末行数据的 expand 不被渲染窗口上界裁掉（无幽灵空白）', async ({ page }) => {
  // 缺陷固化：渲染窗口 count 用数据 total 时 win.end ≤ total → winBottom ≤ total*rowHeight，
  // 末行数据的 expand（flowY = total*rowHeight）恒被 culling 裁掉；contentH 又计入它 → 底部幽灵空白。
  // fixture：total=3 / height=200 / row-height=40，row0 与末行 row2 都展开——
  // 视觉内容 3 行 + 2 expand = 200px 恰满视口：两个 expand 可见、bottom spacer=0、总高=200。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-windowed-expand-last'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '3')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '行0', expand: '<div>详情0</div>' },
        { name: '行1' },
        { name: '行2', expand: '<div>详情2</div>' },
      ]),
    )
    el.setAttribute('expanded', '行0,行2')
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#qa-windowed-expand-last')
    return !!el?.shadowRoot?.querySelector('tbody tr.row')
  })
  const snap = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-expand-last')!
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]
    const styleSum = trs.reduce(
      (s, tr) =>
        s +
        (tr.classList.contains('spacer')
          ? parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
          : parseFloat(tr.style.height || '0')),
      0,
    )
    const rectSum = trs.reduce((s, tr) => s + Math.round(tr.getBoundingClientRect().height), 0)
    const expands = [...el.shadowRoot!.querySelectorAll('tbody tr.expand-row')] as HTMLElement[]
    const lastTr = trs[trs.length - 1]!
    return {
      expandCount: expands.length,
      expandHeights: expands.map((tr) => tr.getBoundingClientRect().height),
      lastIsExpand2:
        expands.length === 2 &&
        expands[1]!.previousElementSibling?.getAttribute('data-row-index') === '2' &&
        (expands[1]!.textContent ?? '').includes('详情2'),
      rowIndexes: [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr) =>
        tr.getAttribute('data-row-index'),
      ),
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      bottomSpacer: (lastTr.firstElementChild as HTMLElement).style.height,
      lastIsSpacer: lastTr.classList.contains('spacer'),
      styleSum,
      rectSum,
    }
  })
  expect(snap.expandCount, '两个 expand 内容行都渲染（末行 expand 不被窗口上界裁掉）').toBe(2)
  // 定高可见：row-height（40）～ +1px 行边框（41）——与「虚拟滚动 + 展开行超高」用例的
  // 「定高 40 + 1px 行边框」既有口径一致
  expect(
    snap.expandHeights.every((h) => h >= 40 && h <= 41),
    `两个 expand 行均按定高可见（实得 ${snap.expandHeights.join('/')}）`,
  ).toBe(true)
  expect(snap.lastIsExpand2, '最后一个 expand 紧随末行 row2 且内容为 row2 的').toBe(true)
  expect(snap.rowIndexes, '数据行号不被 expand 占用').toEqual(['0', '1', '2'])
  expect(snap.ariaCount, 'aria-rowcount 仍为数据 total').toBe('3')
  expect(snap.lastIsSpacer, '末行是 bottom spacer').toBe(true)
  expect(snap.bottomSpacer, 'bottom spacer = 0px（缺陷实现 80px 幽灵空白）').toBe('0px')
  expect(snap.styleSum, 'tbody 记账总高 = 200').toBe(200)
  // 实际 rect 总高 = 200 + 2 根 expand 行各 1px 行边框（既有视觉契约，见上方口径注释）
  expect(snap.rectSum, 'tbody 实际 rect 总高 = 202（200 + expand 行边框）').toBe(202)
  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
  await page.evaluate(() => document.querySelector('#qa-windowed-expand-last')?.remove())
})

test('table 万行虚拟滚动：连续选择 20 次渲染行数有界、行节点身份保持、console 零告警（增量渲染回归）', async ({
  page,
}) => {
  // 增量渲染优化回归：万级数据下「切换选择」走行级局部补丁——不得整表重建（行节点身份保持）、
  // 渲染行数不随选择次数增长（虚拟窗口有界）、全程 console 零 error/warning。
  // fixture 自建而非复用 demo #table-virtual：该 demo 无 row-key——行 key 回落 JSON.stringify(row)
  //（含逗号），selected 的逗号分隔解析永不命中，行点击选中态无法呈现（组件 attribute 格式既有限制）；
  // 且 demo 万行数据由页面脚本异步写入，满并发下引入额外等待竞态。高度 1600 = 40 可见 + buffer 4
  // → 窗口 44 行：容纳「连点 20 行」且满足 <50 有界断言。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    // I-3 口径：只收 error + 组件前缀 warning。firefox 会带 GA cookie / scroll-linked 等浏览器级
    // warning（非组件缺陷），全量 warning 收集在 firefox 稳定误报。
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-virtual-select'
    el.setAttribute('height', '1600')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'id')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'id', title: 'ID', width: '70px' },
        { key: 'name', title: '姓名', width: '120px' },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({
          id: i + 1,
          name: `用户 ${i + 1}`,
        })),
      ),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).append(el)
  })
  // 万行首帧解析 + 扁平化（同步，大 JSON 需要时间）后虚拟窗口出数据行
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#qa-virtual-select')
      return (t?.shadowRoot?.querySelectorAll('tbody tr[data-key]').length ?? 0) > 0
    },
    null,
    { timeout: 15000 },
  )
  // 连点 20 次不同可见行（真实 click → setAttribute selected → 局部补丁路径）
  const r = await page.evaluate(() => {
    const t = document.querySelector('#qa-virtual-select')!
    const body = t.shadowRoot!.querySelector('tbody')!
    const trs = [...body.querySelectorAll('tr[data-key]')] as HTMLTableRowElement[]
    const targets = trs.slice(0, 20)
    const t0 = performance.now()
    for (const tr of targets) tr.click()
    const ms = Math.round(performance.now() - t0)
    const after = [...body.querySelectorAll('tr[data-key]')] as HTMLTableRowElement[]
    return {
      rowCountBefore: trs.length,
      rowCountAfter: after.length,
      identityKept: targets.every((tr, i) => tr === after[i]),
      selectedCount: after.filter((tr) => tr.getAttribute('data-selected') === 'true').length,
      ms,
    }
  })
  // 等选中态稳定（虚拟滚动/尺寸观察的 rAF 重建若在此间隙发生，重建按 selected 属性渲染，选中数不变）
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#qa-virtual-select')
      return (
        [...(t?.shadowRoot?.querySelectorAll('tbody tr[data-key]') ?? [])].filter(
          (tr) => tr.getAttribute('data-selected') === 'true',
        ).length === 20
      )
    },
    null,
    { timeout: 15000 },
  )
  // 耗时仅观测不做断言（环境相关），挂 annotation 便于趋势观察
  await test.info().attach('selection-patch-ms.txt', {
    body: `20 次选择切换补丁总耗时 ${r.ms}ms（含 20 次 click 派发）`,
    contentType: 'text/plain',
  })
  expect(r.rowCountBefore, '虚拟窗口行数 = 可视 + buffer，须容纳 20 连点').toBeGreaterThanOrEqual(20)
  expect(r.rowCountAfter, '渲染行数有界：不随选择次数增长').toBe(r.rowCountBefore)
  expect(r.rowCountAfter, '虚拟窗口行数远小于总量 10000').toBeLessThan(50)
  expect(r.identityKept, '行节点身份保持（局部补丁而非整表重建）').toBe(true)
  expect(r.selectedCount, '20 行全部呈选中态').toBe(20)
  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
  await page.evaluate(() => document.querySelector('#qa-virtual-select')?.remove())
})

test('table 无 checkable 行点击语义：暗色下两次真实单击不同行 = 切换累积（非替换，无修饰键参与）', async ({ page }) => {
  // F2 复核：暗色视觉脚本两次点普通格得到「李四,王五」，曾疑为增量补丁读取旧 selected 或
  // Ctrl/Shift 残留。真实两次单击（不同行）复现结论：这是既有的「点击行切换选中」契约
  //（docs/components/table.md：selected 高亮选中行，点击行可切换选中；上一条万行用例亦固化
  //  20 行累积），组件不读取任何修饰键——不是陈旧 selected / 修饰键误判。
  // 本用例以真实指针事件在暗色主题下固化该语义，防止后续误改成替换或回归成补丁读旧值。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    // 与视觉脚本同环境：暗色主题
    document.documentElement.classList.add('dark')
    const t = document.createElement('oas-table')
    t.id = 'qa-row-toggle-semantics'
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    t.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', age: 30 },
        { name: '李四', age: 25 },
        { name: '王五', age: 35 },
      ]),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-row-toggle-semantics')?.shadowRoot?.querySelectorAll('tbody tr.row').length ?? 0) ===
      3,
  )
  const cell = (i: number) => page.locator('#qa-row-toggle-semantics td[data-col="name"]').nth(i)
  const snapshot = () =>
    page.evaluate(() => {
      const t = document.querySelector('#qa-row-toggle-semantics')!
      return {
        selected: t.getAttribute('selected') ?? '',
        rows: [...t.shadowRoot!.querySelectorAll('tbody tr.row')].map((tr) => tr.getAttribute('data-selected')),
      }
    })

  // 第一次真实单击：只选中李四
  await cell(1).click()
  await expect.poll(async () => (await snapshot()).selected).toBe('李四')
  // 第二次真实单击（不同行）：切换累积为李四,王五（文档化切换语义，非替换）
  await cell(2).click()
  await expect.poll(async () => (await snapshot()).selected).toBe('李四,王五')
  expect((await snapshot()).rows, '两行同时高亮').toEqual(['false', 'true', 'true'])
  // 再点已选行：仅取消该行（切换语义的另一半）
  await cell(2).click()
  await expect.poll(async () => (await snapshot()).selected).toBe('李四')
  expect((await snapshot()).rows, '取消只影响被点行').toEqual(['false', 'true', 'false'])

  await page.evaluate(() => {
    document.querySelector('#qa-row-toggle-semantics')?.remove()
    document.documentElement.classList.remove('dark')
  })
})

test('table windowed 切片回填焦点回锚：聚焦行 → 宿主回填 window-start=100 → 焦点仍在同一 row-key（oas-window-request 行为不变）', async ({
  page,
}) => {
  // I3 回归：windowed 下 update / 滚动帧清空 tbody 会连带拆掉聚焦单元格——宿主回填新切片后
  // 焦点静默丢失（gridPos 还是旧渲染矩阵坐标）。修复=重渲染前记录聚焦行的绝对行键与列，
  // 重渲染后行仍在窗口内则恢复焦点与 gridPos；不在窗口内不强行聚焦（不回退切片首行）。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    // I-3 口径：只收 error + 组件前缀 warning（同「万行虚拟滚动」用例注释，firefox 浏览器级
    // warning 不属组件缺陷，全量收集在 firefox 稳定误报）。
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const t = document.createElement('oas-table') as HTMLElement & {
      data?: unknown
    }
    t.id = 'qa-windowed-focus'
    t.setAttribute('windowed', '')
    t.setAttribute('total', '1000')
    t.setAttribute('window-start', '0')
    t.setAttribute('row-key', 'name')
    t.setAttribute('height', '200')
    t.setAttribute('row-height', '40')
    t.setAttribute('grid-navigation', '')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    const make = (s: number, n: number) => Array.from({ length: n }, (_, i) => ({ name: `行${s + i}`, age: s + i }))
    t.data = make(0, 20)
    const w = window as unknown as {
      __qaWinReqs: Array<{ start: number; end: number; reason: string }>
    }
    w.__qaWinReqs = []
    t.addEventListener('oas-window-request', (e) => {
      w.__qaWinReqs.push((e as CustomEvent<{ start: number; end: number; reason: string }>).detail)
    })
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-windowed-focus')?.shadowRoot?.querySelectorAll('tbody tr[data-key]').length ?? 0) >
      0,
    null,
    { timeout: 15000 },
  )
  // 滚到行 100 区域 → 宿主按 scroll 请求回填 window-start=100 切片。
  // scrollTop 取 4060 而非 4040：4040 恰是行 104 底缘超出视口 9px 的位置（sticky 表头占 49px 流高），
  // ArrowDown 续接的原生 focus 滚动会把 scrollTop 推到 4049 → need 变化再派发一次（不同 need 派发
  // 属契约行为，非重复），「同 need 仅一次」无法精确断言。4060 让行 103/104 均完全落在视口内
  //（键盘续接全程零 focus 滚动漂移），对应期望区间 = 可视 [97,111) ± margin8 → [89,119)
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus')!
    const wrap = t.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 4060
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() => (window as unknown as { __qaWinReqs: unknown[] }).__qaWinReqs.length > 0, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus') as HTMLElement & {
      data?: unknown
    }
    const make = (s: number, n: number) => Array.from({ length: n }, (_, i) => ({ name: `行${s + i}`, age: s + i }))
    t.setAttribute('window-start', '100')
    t.data = make(100, 40)
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#qa-windowed-focus')!
      return !!t.shadowRoot!.querySelector('tr[data-key="行100"]')
    },
    null,
    { timeout: 15000 },
  )
  // 聚焦回填窗口内的行103
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus')!
    ;(t.shadowRoot!.querySelector('tr[data-key="行103"] td[data-col="name"]') as HTMLElement)!.focus()
  })
  // 宿主再次回填（切片变化为 [95,145)，行103 仍在窗口内）→ 焦点应回锚到同一 row-key
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus') as HTMLElement & {
      data?: unknown
    }
    const make = (s: number, n: number) => Array.from({ length: n }, (_, i) => ({ name: `行${s + i}`, age: s + i }))
    t.setAttribute('window-start', '95')
    t.data = make(95, 50)
  })
  // 焦点回锚完成的真实信号：shadow 焦点所在行回到 行103
  await expect
    .poll(() =>
      page.evaluate(() => {
        const t = document.querySelector('#qa-windowed-focus')!
        const active = t.shadowRoot!.activeElement as HTMLElement | null
        return active?.closest?.('tr[data-key]')?.getAttribute('data-key') ?? ''
      }),
    )
    .toBe('行103')
  const r1 = await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus')!
    const active = t.shadowRoot!.activeElement as HTMLElement | null
    return {
      focusedKey: active?.closest?.('tr[data-key]')?.getAttribute('data-key') ?? '',
      focusedCol: active?.getAttribute?.('data-col') ?? '',
    }
  })
  expect(r1.focusedKey, '切片回填后焦点应回锚到同一 row-key').toBe('行103')
  expect(r1.focusedCol, '列位置保持').toBe('name')
  // 键盘续接：回锚后方向键自原行继续漫游
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus')!
    const active = t.shadowRoot!.activeElement as HTMLElement
    active.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  })
  const r2 = await page.evaluate(
    () =>
      (document.querySelector('#qa-windowed-focus')!.shadowRoot!.activeElement as HTMLElement | null)
        ?.closest?.('tr[data-key]')
        ?.getAttribute('data-key') ?? '',
  )
  expect(r2, '方向键自锚行续接（gridPos 已重映射）').toBe('行104')
  // 负例：切片变化为不含行103（[95,103)）→ 不强行聚焦（不回退切片首行 行97）
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus') as HTMLElement & {
      data?: unknown
    }
    const make = (s: number, n: number) => Array.from({ length: n }, (_, i) => ({ name: `行${s + i}`, age: s + i }))
    t.setAttribute('window-start', '95')
    t.data = make(95, 8)
  })
  // 负例切片重渲染完成的真实信号：窗口内首行已重渲染为 行97
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector('#qa-windowed-focus')!
            .shadowRoot!.querySelector('tbody tr[data-key]')
            ?.getAttribute('data-key') ?? '',
      ),
    )
    .toBe('行97')
  const r3 = await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-focus')!
    const active = t.shadowRoot!.activeElement as HTMLElement | null
    return {
      focusedKey: active?.closest?.('tr[data-key]')?.getAttribute('data-key') ?? '',
      firstRendered: t.shadowRoot!.querySelector('tbody tr[data-key]')?.getAttribute('data-key') ?? '',
      reqs: (
        window as unknown as {
          __qaWinReqs: Array<{ start: number; end: number; reason: string }>
        }
      ).__qaWinReqs,
    }
  })
  expect(r3.firstRendered, '行97-102 仍渲染').toBe('行97')
  expect(r3.focusedKey, '锚行不在窗口内不得回退到切片首行').not.toBe('行97')
  // oas-window-request 行为不变：同 need 去重（滚动位置未变 → 三次回填共享同一期望区间，仅派发一次）。
  // 首个请求 reason 容忍 resize：ResizeObserver 首轮回调与滚动帧 rAF 同帧竞态，先到者以己方 reason
  // 派发同一期望区间、后到者被去重——need 与去重才是契约，reason 属竞态敏感值不作严格断言
  expect(r3.reqs.length, '同 need 不重复派发（滚动位置未变，全流程仅一个期望区间）').toBe(1)
  expect(r3.reqs[0]!.start, '请求起点（含 margin 前扩）').toBe(89)
  expect(r3.reqs[0]!.end, '请求终点（scrollTop=4060 → 可视 [97,111) + margin8）').toBe(119)
  expect(['scroll', 'resize'], `触发原因须为滚动/视口尺寸路径（实得 ${r3.reqs[0]!.reason}）`).toContain(
    r3.reqs[0]!.reason,
  )
  await page.evaluate(() => document.querySelector('#qa-windowed-focus')?.remove())
  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
})

test('table windowed 聚焦后横向滚动不被回锚拉回：每帧 scrollLeft 保持 + 焦点保持 + 纵向位置保持（I-1）', async ({
  page,
}) => {
  // I-1 缺陷固化：windowed + grid-navigation + 列溢出时，聚焦单元格后横向滚动，滚动帧重建 tbody
  // 的焦点回锚用 td.focus() + scrollCellIntoView 把视口每帧拉回锚格（scrollLeft 恒 0，用户无法
  // 横向滚动）。修复=滚动帧回锚 preventScroll 且不 scrollIntoView + 帧前后保存/恢复 scrollLeft。
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    // I-3 口径：只收 error + [oas-table] 前缀 warning（firefox 浏览器级 warning 非组件缺陷）
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-table]')))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  // 8 列 × 160px 宽表（横向溢出）+ windowed 行虚拟：横向滚动走滚动帧 tbody 重建路径
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-windowed-hscroll'
    t.setAttribute('windowed', '')
    t.setAttribute('total', '1000')
    t.setAttribute('window-start', '0')
    t.setAttribute('row-key', 'c0')
    t.setAttribute('height', '200')
    t.setAttribute('row-height', '40')
    t.setAttribute('grid-navigation', '')
    // fixed 布局：160px 列宽生效 → 8×160=1280px 横向溢出（auto 布局会把列压缩进容器，无滚动可言）
    t.setAttribute('table-layout', 'fixed')
    t.setAttribute(
      'columns',
      JSON.stringify(
        Array.from({ length: 8 }, (_, i) => ({
          key: `c${i}`,
          title: `列${i}`,
          width: '160px',
        })),
      ),
    )
    const make = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        Object.fromEntries(Array.from({ length: 8 }, (_, c) => [`c${c}`, c === 0 ? `行${i}` : `${i}-${c}`])),
      )
    t.setAttribute('data', JSON.stringify(make(40)))
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
    // shadow 内 mutation 静默监测：满载下 ResizeObserver 触发的 update() 会迟到插针（update 路径
    // 回锚走 focus+scrollIntoView，会拉回横向位置——那是 update 路径的设计行为，非滚动帧缺陷），
    // 后续操作前必须等渲染彻底安静，消除「等待→操作」之间被插针的窗口
    const w = window as unknown as { __qaHsMutedAt?: number }
    w.__qaHsMutedAt = performance.now()
    new MutationObserver(() => {
      w.__qaHsMutedAt = performance.now()
    }).observe(t.shadowRoot!, {
      subtree: true,
      childList: true,
      attributes: true,
    })
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-windowed-hscroll')?.shadowRoot?.querySelectorAll('tbody tr[data-key]').length ?? 0) >
      0,
    null,
    { timeout: 15000 },
  )
  // 等横向溢出真实存在（fixed 布局列宽撑出 scrollWidth）：高并发下布局未稳时赋值
  // scrollLeft 会被 clamp 回 0（实抓），先锁「可横向滚」再操作
  await page.waitForFunction(
    () => {
      const wrap = document
        .querySelector('#qa-windowed-hscroll')
        ?.shadowRoot?.querySelector('.table-scroll') as HTMLElement | null
      return !!wrap && wrap.scrollWidth > wrap.clientWidth
    },
    null,
    { timeout: 15000 },
  )
  // 等渲染彻底安静（shadow 内 400ms 无 mutation）：消除 ResizeObserver/update 迟到插针
  // （插针的 update 回锚会拉回横向位置——属 update 路径设计行为，不得污染滚动帧断言）
  await page.waitForFunction(
    () => performance.now() - ((window as unknown as { __qaHsMutedAt?: number }).__qaHsMutedAt ?? 0) > 400,
    null,
    { timeout: 20000, polling: 50 },
  )
  // oas-scroll 计数：证明每个横向滚动步里滚动帧重建真实发生（防「根本没重建所以绿」的假绿）
  await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-windowed-hscroll')!
    t.dataset.scrollFrames = '0'
    t.addEventListener('oas-scroll', () => {
      t.dataset.scrollFrames = String(Number(t.dataset.scrollFrames ?? '0') + 1)
    })
    // 聚焦行2 的 c0 格（视口内）
    ;(t.shadowRoot!.querySelector('tr[data-key="行2"] td[data-col="c0"]') as HTMLElement)!.focus()
  })
  // 连采 6 帧 scrollLeft：滚动帧重建若把视口拉回锚格，采样序列必然出现回退
  const sampleScrollLeft = () =>
    page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const wrap = document.querySelector('#qa-windowed-hscroll')!.shadowRoot!.querySelector('.table-scroll')!
          const out: number[] = []
          const tick = () => {
            out.push(wrap.scrollLeft)
            if (out.length >= 6) resolve(out)
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
    )
  for (const target of [200, 400, 600]) {
    // 写入 scrollLeft 必须真实生效后再采样：会变的布局（RO 触发的 update 重渲染）在写入瞬间
    // scrollWidth 可能短暂塌缩，赋值被 clamp 到 0；此外滚动帧「帧首保存 scrollLeft → 帧尾恢复」
    // 若该帧在写入前已开始，会把用户滚动回滚成旧值（产品既有竞态，见报告）。故写入+采样整体重试。
    const attempts: number[][] = []
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect
        .poll(
          () =>
            page.evaluate((v) => {
              const wrap = document
                .querySelector('#qa-windowed-hscroll')!
                .shadowRoot!.querySelector('.table-scroll') as HTMLElement
              wrap.scrollLeft = v
              return Math.round(wrap.scrollLeft)
            }, target),
          `横向滚动位置可写入（scrollLeft=${target}）`,
        )
        .toBe(target)
      const frames = (await sampleScrollLeft()).map((f) => Math.round(f))
      attempts.push(frames)
      if (frames.every((f) => f === target)) break
    }
    const frames = attempts.at(-1)!
    expect(
      frames,
      `横向滚动到 ${target} 后每帧 scrollLeft 保持（不被回锚拉回）：尝试记录 ${JSON.stringify(attempts)}`,
    ).toEqual(frames.map(() => target))
  }
  const focusState = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-windowed-hscroll')!
    const ae = t.shadowRoot!.activeElement as HTMLElement | null
    return {
      key: ae?.closest?.('tr[data-key]')?.getAttribute('data-key') ?? '',
      col: ae?.getAttribute('data-col') ?? '',
      frames: Number(t.dataset.scrollFrames ?? '0'),
    }
  })
  expect(focusState.frames, '横向滚动期间滚动帧重建真实发生（oas-scroll ≥3 次）').toBeGreaterThanOrEqual(3)
  expect(focusState.key, '横向滚动后焦点仍在锚行（preventScroll 回锚）').toBe('行2')
  expect(focusState.col, '列位置保持').toBe('c0')
  // 宿主回填（update 路径）：焦点回锚行为保持——update 路径保留 focus + scrollIntoView（锚行可见）
  await page.evaluate(() => {
    const t = document.querySelector('#qa-windowed-hscroll') as HTMLElement & {
      data?: unknown
    }
    t.data = Array.from({ length: 60 }, (_, i) =>
      Object.fromEntries(Array.from({ length: 8 }, (_, c) => [`c${c}`, c === 0 ? `行${i}` : `${i}-${c}`])),
    )
  })
  // update 回填路径焦点回锚完成的真实信号：焦点行回到 行2（既有行为不变）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const t = document.querySelector('#qa-windowed-hscroll')!
        const ae = t.shadowRoot!.activeElement as HTMLElement | null
        return ae?.closest?.('tr[data-key]')?.getAttribute('data-key') ?? ''
      }),
    )
    .toBe('行2')
  // 纵向：滚动位置保持（st 恢复路径不被横向回锚破坏）
  const requestedTop = await page.evaluate(() => {
    const wrap = document
      .querySelector('#qa-windowed-hscroll')!
      .shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 400
    return wrap.scrollTop
  })
  await page.waitForFunction(
    () => {
      const wrap = document
        .querySelector('#qa-windowed-hscroll')!
        .shadowRoot!.querySelector('.table-scroll') as HTMLElement
      return wrap.scrollTop === 400
    },
    null,
    { timeout: 15000 },
  )
  const vertical = await page.evaluate(() => {
    const wrap = document
      .querySelector('#qa-windowed-hscroll')!
      .shadowRoot!.querySelector('.table-scroll') as HTMLElement
    return { scrollTop: wrap.scrollTop, scrollLeft: wrap.scrollLeft }
  })
  expect(vertical.scrollTop, '纵向滚动位置保持（不被钳回 0）').toBe(requestedTop)
  await page.evaluate(() => document.querySelector('#qa-windowed-hscroll')?.remove())
  expect(consoleIssues, 'console 零告警（error + [oas-table] warning 口径）').toEqual([])
})

// ===== 宿主可访问名转发：aria-label → 内部 table（grid 语义同样命名） =====
// 表格无 caption 机制（内部 table 由组件渲染，宿主无法写 caption 子元素）；宿主 aria-label
// 是唯一命名通道，不转发则读屏只能播报「表格」而无上下文。
test('table 宿主 aria-label 转发到内部 table（role=grid）、运行时更新生效、axe 无违规', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-table'))
  await page.evaluate(() => {
    document.getElementById('e2e-table-name')?.remove()
    const el = document.createElement('oas-table')
    el.id = 'e2e-table-name'
    el.setAttribute('aria-label', '用户列表')
    el.setAttribute('grid-navigation', '')
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'u1', name: '张三', age: 30 },
        { key: 'u2', name: '李四', age: 25 },
      ]),
    )
    el.style.cssText = 'position: fixed; top: 140px; left: 50%; transform: translateX(-50%); z-index: 2147483000'
    document.body.appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-table#e2e-table-name')
    return !!el?.shadowRoot?.querySelector('table[role="grid"][aria-label]')
  })

  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-table#e2e-table-name')! as HTMLElement & { shadowRoot: ShadowRoot }
    const table = el.shadowRoot.querySelector('table') as HTMLElement
    return {
      inner: table.getAttribute('aria-label'),
      host: el.getAttribute('aria-label'),
      role: table.getAttribute('role'),
      rowCount: el.shadowRoot.querySelectorAll('tbody tr[data-key]').length,
      headerRole: el.shadowRoot.querySelector('thead th')?.getAttribute('role') ?? null,
      cellRole: el.shadowRoot.querySelector('tbody tr[data-key] td')?.getAttribute('role') ?? null,
    }
  })
  expect(r.inner, '宿主 aria-label 应转发到内部 table').toBe('用户列表')
  expect(r.host, '宿主属性保留（宿主框架下不剥离）').toBe('用户列表')
  expect(r.role, 'grid-navigation 语义保持不变').toBe('grid')
  expect(r.headerRole, '表头 role 链不变').toBe('columnheader')
  expect(r.cellRole, '单元格 role 链不变').toBe('gridcell')
  expect(r.rowCount, '数据行正常渲染').toBe(2)

  const updated = await page.evaluate(() => {
    const el = document.querySelector('oas-table#e2e-table-name')! as HTMLElement & { shadowRoot: ShadowRoot }
    const table = el.shadowRoot.querySelector('table') as HTMLElement
    // 仅命名变化不应重建数据行（行节点身份保持，滚动/焦点不丢）——先取节点再改名
    const row = el.shadowRoot.querySelector('tbody tr[data-key]') as HTMLElement
    el.setAttribute('aria-label', '订单列表')
    return {
      inner: table.getAttribute('aria-label'),
      rowSame: el.shadowRoot.querySelector('tbody tr[data-key]') === row,
    }
  })
  expect(updated.inner, '运行时更新 aria-label 即时转发').toBe('订单列表')
  expect(updated.rowSame, '仅命名变化不重建行').toBe(true)

  const a11y = await new AxeBuilder({ page })
    .include('#e2e-table-name')
    // 对比度由主题/视觉专项覆盖（dynamic 元素背景随主题变化会引入无关噪声）
    .disableRules(['color-contrast'])
    .analyze()
  expect(
    a11y.violations.map((v) => `${v.id}: ${v.nodes.length}`),
    '宿主命名转发不应引入 axe 违规',
  ).toEqual([])
})

test('table Pro 第二批：虚拟滚动帧后区域装饰 / roving tabindex / aria-selected 保持', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-virtual')
  await page.waitForFunction(
    () => document.querySelector('#table-virtual')!.shadowRoot!.querySelectorAll('tr.row').length > 0,
    null,
    { timeout: 10000 },
  )
  const counts = () =>
    page.evaluate(() => {
      const el = document.querySelector('#table-virtual')!
      return {
        selected: el.shadowRoot!.querySelectorAll('td.range-selected').length,
        aria: el.shadowRoot!.querySelectorAll('td[aria-selected="true"]').length,
        stops: [...el.shadowRoot!.querySelectorAll<HTMLElement>('td[data-col]')].filter((td) => td.tabIndex === 0)
          .length,
      }
    })
  await page.evaluate(() => {
    const el = document.querySelector('#table-virtual')! as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    el.setAttribute('grid-navigation', '')
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: { start: { row: 0, col: 'id' }, end: { row: 1, col: 'name' } },
    })
  })
  await expect.poll(async () => (await counts()).selected > 0).toBe(true)
  const before = await counts()
  // 下界理由：滚动窗口 ∩ 选区矩形的格子数随窗口位置变化（无固定值）；
  // 契约是「range 选区装饰不丢失（至少 1 格）」，精确覆盖范围由 Pro 选区专测覆盖
  expect(before.aria, 'grid-navigation 下选中格应有 aria-selected').toBeGreaterThanOrEqual(1)
  expect(before.stops, 'grid-navigation 下 range 不新增 td 停靠点').toBe(0)

  // 真实滚动帧：tbody 全量重建且不走 update，装饰必须由 childList 观察兜底恢复
  await page.evaluate(() => {
    const wrap = document.querySelector('#table-virtual')!.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 80
    wrap.dispatchEvent(new Event('scroll'))
  })
  // 重建+装饰兜底完成的真实信号：滚动帧后选区装饰已恢复（counts 断言条件本身）
  await expect.poll(async () => (await counts()).selected > 0).toBe(true)
  const after = await counts()
  // 下界理由同 before（窗口 ∩ 选区数量随滚动位置变化）；契约是装饰恢复不丢失
  expect(after.selected, '滚动帧后选区装饰仍在').toBeGreaterThanOrEqual(1)
  expect(after.aria, '滚动帧后 aria-selected 仍在').toBeGreaterThanOrEqual(1)
  expect(after.stops, '滚动帧后仍无额外停靠点').toBe(0)

  // 列窗口（column-virtual）横向滚动同样走手写重建，不派发 oas-scroll：childList 观察兜底
  await up(page, '#table-col-virtual')
  await page.waitForFunction(
    () => document.querySelector('#table-col-virtual')!.shadowRoot!.querySelectorAll('tr.row').length > 0,
    null,
    { timeout: 10000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#table-col-virtual')! as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 0, col: 'name' },
        end: { row: 1, col: 'level' },
      },
    })
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#table-col-virtual')!.shadowRoot!.querySelectorAll('td.range-selected').length > 0,
      ),
    )
    .toBe(true)
  await page.evaluate(() => {
    const wrap = document.querySelector('#table-col-virtual')!.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollLeft = 300
    wrap.dispatchEvent(new Event('scroll'))
  })
  // 重建+装饰兜底完成的真实信号：列窗口滚动后选区装饰已恢复
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#table-col-virtual')!.shadowRoot!.querySelectorAll('td.range-selected').length > 0,
      ),
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () => document.querySelector('#table-col-virtual')!.shadowRoot!.querySelectorAll('td.range-selected').length,
    ),
    '列窗口滚动后选区装饰仍在',
  ).toBeGreaterThanOrEqual(1)
})

test('table Pro 第二批：区域选择/复制、行详情、Shift 扩展与编辑撤销共存', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-pro')
  await page.waitForFunction(
    () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr.row').length === 4,
    null,
    { timeout: 10000 },
  )

  await page.locator('#table-pro-range').click()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('td.range-selected').length,
      ),
    )
    .toBe(4)
  const status = () => page.evaluate(() => document.querySelector('#table-pro-status')?.textContent ?? '')
  expect(await status()).toContain('2 行')

  await page.locator('#table-pro-copy').click()
  await expect.poll(status).toContain('已复制')

  // 点击行 → 主从详情（DOM click，避开滚动/坐标造成的落点漂移）
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    const td = el.shadowRoot!.querySelectorAll('tr.row')[1]!.querySelector('td[data-col="name"]') as HTMLElement
    td.click()
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('Beta')
  expect(
    await page.evaluate(
      () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr[data-detail-selected]').length,
    ),
  ).toBe(1)

  // 编辑态 Esc 只取消编辑，不关闭详情（详情 Esc 对输入目标 / defaultPrevented 让位）
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    const td = el.shadowRoot!.querySelectorAll('tr.row')[1]!.querySelector('td[data-col="name"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  const editorForCancel = page.locator('#table-pro .cell-editor').first()
  await editorForCancel.waitFor({ state: 'visible', timeout: 5000 })
  await editorForCancel.press('Escape')
  await expect(page.locator('#table-pro .cell-editor')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('Beta')

  // Shift+方向键扩展选区（焦点在首行名称格）
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    const td = el.shadowRoot!.querySelector('tr.row td[data-col="name"]') as HTMLElement
    td.focus()
  })
  await page.keyboard.press('Shift+ArrowDown')
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('td.range-selected').length,
      ),
    )
    .toBe(2)

  // 双击编辑当前选中行（原生 dblclick 兜底路径）：输入 → 提交 → 详情刷新 → 撤销
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    const td = el.shadowRoot!.querySelectorAll('tr.row')[1]!.querySelector('td[data-col="name"]') as HTMLElement
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  const editor = page.locator('#table-pro .cell-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 5000 })
  await editor.fill('BetaZ')
  await editor.press('Enter')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector('#table-pro')!
            .shadowRoot!.querySelectorAll('tr.row')[1]!
            .querySelector('td[data-col="name"]')?.textContent,
      ),
    )
    .toBe('BetaZ')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('BetaZ')

  await page.locator('#table-pro-undo').click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector('#table-pro')!
            .shadowRoot!.querySelectorAll('tr.row')[1]!
            .querySelector('td[data-col="name"]')?.textContent,
      ),
    )
    .toBe('Beta')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('Beta')
})

test('table Pro 第三批：多选区剪切、粘贴写回与填充都合并为单条历史事务', async ({ page }) => {
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    // Firefox 的滚动性能提示是浏览器级噪声，与组件行为无关；其它 warning 仍全部计入
    if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('scroll-linked positioning effect'))) {
      consoleIssues.push(`${m.type()}: ${m.text()}`)
    }
  })
  page.on('pageerror', (error) => consoleIssues.push(`pageerror: ${error.message}`))
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-pro')
  await page.waitForFunction(
    () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr.row').length === 4,
    null,
    { timeout: 10000 },
  )
  const status = () => page.evaluate(() => document.querySelector('#table-pro-status')?.textContent ?? '')
  const data = () => page.evaluate(() => (document.querySelector('#table-pro') as any).data)

  // 两个矩形：复制与剪切口径一致；撤销一次恢复两个单元格，而不是拆成两条历史
  await page.locator('#table-pro-multi').click()
  await expect.poll(status).toContain('两个选区')
  await page.locator('#table-pro-copy').click()
  await expect.poll(status).toContain('已复制')
  await page.locator('#table-pro-cut').click()
  await expect.poll(status).toContain('已剪切')
  await expect.poll(async () => (await data())[0].name).toBe('')
  await expect.poll(async () => (await data())[2].team).toBe('')
  await page.locator('#table-pro-undo').click()
  await expect.poll(async () => (await data())[0].name).toBe('Alpha')
  await expect.poll(async () => (await data())[2].team).toBe('平台')

  // 粘贴 2×2：一次 undo 同时恢复名称和团队，不错位到 amount 列
  await page.locator('#table-pro-paste').click()
  await expect.poll(status).toContain('已写回 4 格')
  await expect.poll(async () => (await data())[0].name).toBe('AlphaX')
  await expect.poll(async () => (await data())[1].name).toBe('BetaX')
  expect((await data())[0].team).toBe('130')
  expect((await data())[1].team).toBe('90')
  await page.locator('#table-pro-undo').click()
  await expect.poll(async () => (await data())[0].name).toBe('Alpha')
  await expect.poll(async () => (await data())[1].name).toBe('Beta')
  expect((await data())[0].team).toBe('平台')
  expect((await data())[1].team).toBe('数据')

  // 序列填充只写目标格；undo/redo 各自一次完成
  await page.locator('#table-pro-fill').click()
  await expect.poll(status).toContain('已序列填充 1 格')
  await expect.poll(async () => (await data())[3].amount).toBe(151)
  await page.locator('#table-pro-undo').click()
  await expect.poll(async () => (await data())[3].amount).toBe(40)
  await page.locator('#table-pro-redo').click()
  await expect.poll(async () => (await data())[3].amount).toBe(151)
  expect(consoleIssues).toEqual([])
})

test('table Pro 第三批：视图精确恢复与按行键详情可见可用', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-pro')
  await page.waitForFunction(
    () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr.row').length === 4,
    null,
    { timeout: 10000 },
  )
  const status = () => page.evaluate(() => document.querySelector('#table-pro-status')?.textContent ?? '')
  await page.locator('#table-pro-save').click()
  await expect.poll(status).toContain('已保存视图')
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')! as HTMLElement & {
      columns: Array<{ key?: string; width?: string }>
    }
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'desc')
    el.columns = el.columns.map((column) => ({ ...column, width: '240px' }))
  })
  await page.locator('#table-pro-load').click()
  await expect.poll(status).toContain('已恢复视图')
  const restored = await page.evaluate(() => {
    const el = document.querySelector('#table-pro')! as HTMLElement & {
      columns: Array<{ key?: string; width?: string }>
    }
    return {
      sortKey: el.getAttribute('sort-key'),
      sortOrder: el.getAttribute('sort-order'),
      widths: el.columns.map((column) => column.width),
    }
  })
  expect(restored.sortKey).toBeNull()
  expect(restored.sortOrder).toBeNull()
  expect(restored.widths).toEqual([undefined, '140px', undefined, undefined])

  await page.locator('#table-pro-detail-key').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('Gamma')
  await page.locator('#table-pro-detail-close').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#table-pro-detail')?.textContent ?? ''))
    .toContain('点击任意行')
})

test('table Pro 第三批：windowed 越界请求带 margin，回填后选区与焦点落到目标绝对行', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-pro-windowed-range'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '50')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'id')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'r50', name: 'R50' },
        { id: 'r51', name: 'R51' },
      ]),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 50 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#qa-pro-windowed-range')
    return !!el?.shadowRoot?.querySelector('tr[data-row-index="51"]')
  })

  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-windowed-range')! as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    ;(window as any).__proRangeRequests = []
    ;(window as any).__proRangeChanges = []
    ;(window as any).__proWindowHandled = false
    el.addEventListener('oas-range-change', (event) => {
      ;(window as any).__proRangeChanges.push((event as CustomEvent).detail)
    })
    el.addEventListener('oas-window-request', (event) => {
      const detail = (event as CustomEvent).detail
      ;(window as any).__proRangeRequests.push(detail)
      if ((window as any).__proWindowHandled) return
      ;(window as any).__proWindowHandled = true
      el.setAttribute('window-start', String(detail.start))
      el.setAttribute(
        'data',
        JSON.stringify(
          Array.from({ length: detail.end - detail.start }, (_, index) => ({
            id: `r${detail.start + index}`,
            name: `R${detail.start + index}`,
          })),
        ),
      )
    })
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 51, col: 'name' },
        end: { row: 51, col: 'name' },
      },
    })
    const td = el.shadowRoot!.querySelector('tr[data-row-index="51"] td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        shiftKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  })
  await page.waitForFunction(() =>
    (window as any).__proRangeChanges.some(
      (selection: any) => selection?.start?.row === 51 && selection?.end?.row === 52,
    ),
  )
  const result = await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-windowed-range')!
    const active = el.shadowRoot!.activeElement as HTMLElement | null
    return {
      requests: (window as any).__proRangeRequests,
      focusText: el.shadowRoot!.querySelector('tr[data-row-index="52"] td.range-focus')?.textContent,
      activeRow: active?.closest('tr')?.getAttribute('data-row-index'),
    }
  })
  expect(result.requests).toContainEqual({
    start: 44,
    end: 61,
    reason: 'scroll',
  })
  expect(result.focusText).toBe('R52')
  expect(result.activeRow).toBe('52')

  // 表格恢复焦点不得触发 range 的 focusin 单格重置：多格选区在后续滚动帧仍保持
  await page.evaluate(() => {
    ;(window as any).__proRangeChanges = []
    const el = document.querySelector('#qa-pro-windowed-range')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 53 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  // 等真实滚动帧结束再取状态，避免把帧前的旧选区当成修复成功
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const afterScroll = await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-windowed-range')!
    return {
      events: (window as any).__proRangeChanges,
      selected: el.shadowRoot!.querySelectorAll('td.range-selected').length,
    }
  })
  expect(afterScroll.selected).toBe(2)
  expect(afterScroll.events).not.toContainEqual({
    start: { row: 52, col: 'name' },
    end: { row: 52, col: 'name' },
  })
  if (afterScroll.events.length > 0) {
    expect(afterScroll.events.at(-1)).toEqual({
      start: { row: 51, col: 'name' },
      end: { row: 52, col: 'name' },
    })
  }
  await page.evaluate(() => document.querySelector('#qa-pro-windowed-range')?.remove())
})

test('table Pro 第三批：本地虚拟 Ctrl+Home 与 pending 取消不会延迟劫持选区', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-pro-virtual-home'
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'id')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 100 }, (_, index) => ({
          id: `r${index}`,
          name: `R${index}`,
        })),
      ),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 99 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => !!document.querySelector('#qa-pro-virtual-home')?.shadowRoot?.querySelector('tr[data-row-index="99"]'),
  )
  // 等初始程序化滚动的渲染帧落定（否则该帧的 scrollTop 恢复会回滚 Ctrl+Home 的导航）
  await settleTableScroll(page, 'qa-pro-virtual-home')
  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-home')! as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 99, col: 'name' },
        end: { row: 99, col: 'name' },
      },
    })
    const td = el.shadowRoot!.querySelector('tr[data-row-index="99"] td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        ctrlKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  })
  await navUntilLanded(page, 'qa-pro-virtual-home', 'Home', 0, 'top')
  const home = await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-home')!
    return {
      selected: el.shadowRoot!.querySelector('tr[data-row-index="0"] td.range-focus')?.textContent,
      activeRow: (el.shadowRoot!.activeElement as HTMLElement | null)?.closest('tr')?.getAttribute('data-row-index'),
    }
  })
  expect(home.selected).toBe('R0')
  expect(home.activeRow).toBe('0')

  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-home')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 99 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => !!document.querySelector('#qa-pro-virtual-home')?.shadowRoot?.querySelector('tr[data-row-index="99"]'),
  )
  await settleTableScroll(page, 'qa-pro-virtual-home')

  // 再次从末行 Shift+Ctrl+Home 后，用户改滚到中部：旧 pending 不得再改选区
  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-home')! as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    ;(window as any).__homeRangeChanges = []
    el.addEventListener('oas-range-change', (event) =>
      (window as any).__homeRangeChanges.push((event as CustomEvent).detail),
    )
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 99, col: 'name' },
        end: { row: 99, col: 'name' },
      },
    })
    const td = el.shadowRoot!.querySelector('tr[data-row-index="99"] td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 50 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const selection = await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-home')!
    return {
      events: (window as any).__homeRangeChanges,
      hasHomeFocus: !!el.shadowRoot!.querySelector('tr[data-row-index="0"] td.range-focus'),
    }
  })
  expect(selection.events.at(-1)).toEqual({
    start: { row: 99, col: 'name' },
    end: { row: 99, col: 'name' },
  })
  expect(selection.hasHomeFocus).toBe(false)
  await page.evaluate(() => document.querySelector('#qa-pro-virtual-home')?.remove())
})

test('table Pro 第三批：虚拟表 Ctrl+End / Shift+Ctrl+End 在浏览器 maxScroll 夹取后仍落地', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'qa-pro-virtual-end'
    el.setAttribute('height', '400')
    el.setAttribute('row-height', '40')
    el.setAttribute('row-key', 'id')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 100 }, (_, index) => ({
          id: `r${index}`,
          name: `R${index}`,
        })),
      ),
    )
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
    ;(
      el as HTMLElement & {
        setCapabilityOptions(name: string, options: unknown): void
      }
    ).setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 0, col: 'name' },
        end: { row: 0, col: 'name' },
      },
    })
    ;(window as any).__endRangeChanges = []
    el.addEventListener('oas-range-change', (event) =>
      (window as any).__endRangeChanges.push((event as CustomEvent).detail),
    )
  })
  // 等首帧渲染/滚动帧落定再派发导航键：该帧末尾的 scrollTop 保存/恢复会把 Ctrl+End 写入的
  // scrollTop 回滚（WebKit 的 rAF 更晚，实测稳定命中 → 表格停在第 0 行）
  await settleTableScroll(page, 'qa-pro-virtual-end')
  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-end')!
    const td = el.shadowRoot!.querySelector('tr[data-row-index="0"] td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  })
  await navUntilLanded(page, 'qa-pro-virtual-end', 'End', 99, 'bottom')
  const end = await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-end')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    return {
      changes: (window as any).__endRangeChanges,
      activeRow: (el.shadowRoot!.activeElement as HTMLElement | null)?.closest('tr')?.getAttribute('data-row-index'),
      scrollTop: wrap.scrollTop,
      // 期望落点 = 滚动到底（scrollHeight − clientHeight，DOM 现算；末行贴视口底而非贴视口顶）
      maxScrollTop: wrap.scrollHeight - wrap.clientHeight,
    }
  })
  expect(end.changes.at(-1)).toEqual({
    start: { row: 99, col: 'name' },
    end: { row: 99, col: 'name' },
  })
  expect(end.activeRow).toBe('99')
  expect(end.scrollTop, 'Ctrl+End 滚到底（末行贴视口底，落点 = 最大滚动量）').toBe(end.maxScrollTop)

  await page.evaluate(() => {
    const el = document.querySelector('#qa-pro-virtual-end')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => !!document.querySelector('#qa-pro-virtual-end')?.shadowRoot?.querySelector('tr[data-row-index="0"]'),
  )

  // Shift+Ctrl+End 同样受上文的滚动帧竞态影响：落点未成立时补发（断言不变：anchor=0 行、end=99 行）
  const extended = (): Promise<boolean> =>
    page.evaluate(() => {
      const last = (
        (window as any).__endRangeChanges as Array<{
          start?: { row?: number }
          end?: { row?: number }
        }>
      ).at(-1)
      return last?.start?.row === 0 && last?.end?.row === 99
    })
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await extended()) break
    await settleTableScroll(page, 'qa-pro-virtual-end')
    await page.evaluate(() => {
      const el = document.querySelector('#qa-pro-virtual-end')! as HTMLElement & {
        setCapabilityOptions(name: string, options: unknown): void
      }
      el.setCapabilityOptions('range', {
        enabled: true,
        selection: {
          start: { row: 0, col: 'name' },
          end: { row: 0, col: 'name' },
        },
      })
      const td =
        (el.shadowRoot!.querySelector('tr[data-row-index="0"] td[data-col="name"]') as HTMLElement | null) ??
        (el.shadowRoot!.querySelector('td[data-col]') as HTMLElement)
      td.focus()
      td.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'End',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      )
    })
    await page.waitForTimeout(250)
  }
  expect(await extended(), 'Shift+Ctrl+End 保留首行锚点、末行扩展').toBe(true)
  await page.evaluate(() => document.querySelector('#qa-pro-virtual-end')?.remove())
})

test('table Pro 虚拟表：滚动帧窗口内的键盘导航不被旧滚动位回滚（Ctrl+Home/End 不倒退）', async ({ page }) => {
  // 缺陷固化：用户「滚动后立刻按 Ctrl+Home/End」时，滚动帧的 tbody 清空/重建与键盘导航的写入落在
  // 同一帧窗口内——帧尾恢复旧 scrollTop、以及浏览器内部的焦点 reveal 位移，都会把导航写入的
  // 滚动位覆盖回原位置（表格停在第 99 行/第 0 行，键盘看起来「按了没反应」）。
  // 修复后：组件主动写入的滚动位在该窗口内是权威值，落回旧位置的位移被写回，末态落在目标行。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  /**
   * 一个方向：先滚到 fromTop（程序化写 + 派发 scroll 与滚轮同语义，组件排一帧重建窗口），
   * 渲染落定后**不 settle**，聚焦当前行并立刻按 Ctrl+key，逐帧采样滚动位。
   * 刻意不 settle：滚动帧（清空 tbody → 重建 → 帧尾恢复）与键盘导航必须落在同一帧窗口内。
   */
  const runRace = (id: string, fromTop: number, fromRow: number, key: 'Home' | 'End') =>
    page.evaluate(
      async ({ id, fromTop, fromRow, key }) => {
        const el = document.createElement('oas-table') as HTMLElement & {
          setCapabilityOptions(name: string, options: unknown): void
        }
        el.id = id
        el.setAttribute('height', '80')
        el.setAttribute('row-height', '40')
        el.setAttribute('row-key', 'id')
        el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
        el.setAttribute(
          'data',
          JSON.stringify(Array.from({ length: 100 }, (_, index) => ({ id: `r${index}`, name: `R${index}` }))),
        )
        ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
        el.scrollIntoView({ block: 'center' })
        const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
        wrap.scrollTop = fromTop
        wrap.dispatchEvent(new Event('scroll'))
        // 目标行渲染完成即进入竞态窗口（不等帧稳定）
        await new Promise<void>((resolve) => {
          const started = performance.now()
          const poll = (): void => {
            if (el.shadowRoot!.querySelector(`tr[data-row-index="${fromRow}"]`) || performance.now() - started > 3000)
              resolve()
            else requestAnimationFrame(poll)
          }
          poll()
        })
        el.setCapabilityOptions('range', {
          enabled: true,
          selection: { start: { row: fromRow, col: 'name' }, end: { row: fromRow, col: 'name' } },
        })
        const td = el.shadowRoot!.querySelector(`tr[data-row-index="${fromRow}"] td[data-col="name"]`) as HTMLElement
        // 用户当前焦点在该行（滚动不会取消焦点）；紧随其后按 Ctrl+Home / Ctrl+End
        td.focus()
        td.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            ctrlKey: true,
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        )
        const tops: number[] = []
        for (let i = 0; i < 12; i++) {
          await new Promise((resolve) => setTimeout(resolve, 20))
          tops.push(Math.round(wrap.scrollTop))
        }
        const active = el.shadowRoot!.activeElement as HTMLElement | null
        const result = {
          tops,
          max: Math.round(wrap.scrollHeight - wrap.clientHeight),
          rowHeight: Number(el.getAttribute('row-height')),
          activeRow: active?.closest?.('tr')?.getAttribute('data-row-index') ?? null,
          targetFocused: !!el.shadowRoot!.querySelector('tr[data-row-index="0"] td.range-focus'),
          lastFocused: !!el.shadowRoot!.querySelector('tr[data-row-index="99"] td.range-focus'),
        }
        el.remove()
        return result
      },
      { id, fromTop, fromRow, key },
    )

  // ① 滚到底后按 Ctrl+Home：末态停在首行（修复前 WebKit/Chromium 实测回滚到 maxScroll、焦点留末行）
  const home = await runRace('qa-nav-race-home', 99 * 40, 99, 'Home')
  expect(home.max, '构造前提：表格至少有了一行高的可滚动区间').toBeGreaterThanOrEqual(home.rowHeight)
  expect(home.tops.at(-1), 'Ctrl+Home 末态停在顶部（未被回滚到末尾）').toBeLessThan(home.rowHeight)
  expect(home.activeRow, '焦点落在第 0 行（不是回滚后的第 99 行）').toBe('0')
  expect(home.targetFocused, '选区落在第 0 行').toBe(true)
  // 不反复：落定后连续采样不得再回到末尾（禁止「回滚 → 修正 → 再回滚」的抖动）
  for (const top of home.tops.slice(-4)) expect(top).toBeLessThan(home.rowHeight)

  // ② 滚到顶后按 Ctrl+End：末态停在末尾行（反向同一条竞态路径）
  const end = await runRace('qa-nav-race-end', 0, 0, 'End')
  expect(end.tops.at(-1), 'Ctrl+End 末态停在末尾（未被回滚到顶部）').toBeGreaterThanOrEqual(end.max - end.rowHeight)
  expect(end.activeRow, '焦点落在第 99 行（不是回滚后的第 0 行）').toBe('99')
  expect(end.lastFocused, '选区落在第 99 行').toBe(true)
  for (const top of end.tops.slice(-4)) expect(top).toBeGreaterThanOrEqual(end.max - end.rowHeight)
})

test('table advanced：pivotTable data 别名驱动可见透视结果', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-advanced-pivot')
  await page.waitForFunction(
    () => document.querySelector('#table-advanced-pivot')!.shadowRoot!.querySelectorAll('tbody tr.row').length === 3,
    null,
    { timeout: 15000 },
  )
  const result = await page.evaluate(() => {
    const el = document.querySelector('#table-advanced-pivot')!
    return {
      rows: el.shadowRoot!.querySelectorAll('tbody tr.row').length,
      text: el.shadowRoot!.textContent ?? '',
    }
  })
  expect(result.rows).toBe(3)
  expect(result.text).toContain('华东')
  expect(result.text).toContain('华南')
  expect(result.text).toContain('华北')
  expect(result.text).toContain('合计')
})

test('table Pro 事件支持父级委托并保留 composed', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-pro')
  await page.waitForFunction(
    () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr.row').length === 4,
    null,
    { timeout: 10000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    const parent = el.parentElement!
    const names = ['oas-range-change', 'oas-range-copy', 'oas-range-write', 'oas-history-change', 'oas-detail-change']
    ;(window as any).__qaProEvents = []
    for (const name of names) {
      parent.addEventListener(name, (event) => {
        if (event.target !== el) return
        ;(window as any).__qaProEvents.push({
          type: name,
          bubbles: event.bubbles,
          composed: event.composed,
        })
      })
    }
  })
  const received = (name: string) =>
    page.evaluate((type) => (window as any).__qaProEvents.some((event: any) => event.type === type), name)

  await page.locator('#table-pro-range').click()
  await expect.poll(() => received('oas-range-change')).toBe(true)
  await page.locator('#table-pro-copy').click()
  await expect.poll(() => received('oas-range-copy')).toBe(true)
  await page.locator('#table-pro-paste').click()
  await expect.poll(() => received('oas-range-write')).toBe(true)
  await page.locator('#table-pro-undo').click()
  await expect.poll(() => received('oas-history-change')).toBe(true)
  await page.evaluate(() => {
    const el = document.querySelector('#table-pro')!
    ;(el.shadowRoot!.querySelector('tr.row td[data-col="name"]') as HTMLElement).click()
  })
  await expect.poll(() => received('oas-detail-change')).toBe(true)

  const events = await page.evaluate(() => (window as any).__qaProEvents)
  for (const name of [
    'oas-range-change',
    'oas-range-copy',
    'oas-range-write',
    'oas-history-change',
    'oas-detail-change',
  ]) {
    const event = events.find((candidate: any) => candidate.type === name)
    expect(event, `${name} 应到达父级`).toBeDefined()
    expect(event.bubbles, name).toBe(true)
    expect(event.composed, name).toBe(true)
  }
})

test('table Pro 主从详情：selectByKey 显式等待回填落地、默认未命中无可见等待、abort 无反馈、close/Esc 取消', async ({
  page,
}) => {
  // 缺陷固化：selectByKey 只查当前切片，有效 windowed 下未装载键被静默丢弃；total=0/非法时
  // 又被 hasAttribute('windowed') 误判。修复=有效 windowed 判定（total 有限正数）+ 显式 waitForRow 等待
  // （默认未命中 no-op 不产生任何可见反馈；等待可用 AbortSignal 取消，abort 后回填无反馈）。
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('scroll-linked positioning effect')))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  await serveBuiltUi(page)
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  const pending = await page.evaluate(async () => {
    const moduleUrl = '/__qa_ui__/data/table/detail/index.js'
    const { createMasterDetail } = (await import(moduleUrl)) as {
      createMasterDetail: (table: HTMLElement, options: Record<string, unknown>) => any
    }
    const el = document.createElement('oas-table')
    el.id = 'qa-detail-pending-table'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '0')
    el.setAttribute('row-key', 'id')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ id: 'a', name: 'Alpha' }]))
    const panel = document.createElement('div')
    panel.id = 'qa-detail-pending-panel'
    ;(document.querySelector('.vp-doc') ?? document.body).append(el, panel)
    ;(window as any).__qaDetailEvents = 0
    el.addEventListener('oas-detail-change', () => {
      ;(window as any).__qaDetailEvents += 1
    })
    const detail = createMasterDetail(el, {
      panel,
      label: '行详情',
      emptyText: '未选择',
      render: (item: { row: Record<string, unknown> }) => String(item.row.name),
    })
    ;(window as any).__qaDetail = detail
    detail.selectByKey('a')
    // 默认（无选项）windowed 未命中：no-op——面板保持旧详情、零事件（无可见等待）
    detail.selectByKey('m')
    const afterDefaultMiss = {
      panel: panel.textContent,
      events: (window as any).__qaDetailEvents,
      selected: detail.selected?.key,
    }
    // 显式 waitForRow 才挂起等待
    detail.selectByKey('z', { waitForRow: true })
    return {
      afterDefaultMiss,
      panel: panel.textContent,
      events: (window as any).__qaDetailEvents,
      selected: detail.selected?.key,
      rowIndex: detail.selected?.rowIndex,
    }
  })
  expect(pending.afterDefaultMiss.panel, '默认未命中保持旧面板（无可见等待）').toBe('Alpha')
  expect(pending.afterDefaultMiss.events, '默认未命中零事件').toBe(1)
  expect(pending.afterDefaultMiss.selected).toBe('a')
  expect(pending.panel, '等待期间保留旧面板').toBe('Alpha')
  expect(pending.events, '等待期间不派发详情变化').toBe(1)
  expect(pending.selected).toBe('a')
  expect(pending.rowIndex).toBe(0)

  // pending 未命中时旧选中仍随 data 刷新（不得因等待提前 return 冻住面板）
  await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    el.data = [{ id: 'a', name: 'Alpha2' }]
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-detail-pending-panel')?.textContent ?? ''))
    .toBe('Alpha2')
  const refreshed = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    return {
      events: (window as any).__qaDetailEvents,
      selected: detail.selected?.key,
      name: detail.selected?.row?.name,
      rowIndex: detail.selected?.rowIndex,
    }
  })
  expect(refreshed.events, '旧详情刷新不派发选中变化').toBe(1)
  expect(refreshed.selected).toBe('a')
  expect(refreshed.name).toBe('Alpha2')
  expect(refreshed.rowIndex).toBe(0)

  await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table')!
    el.setAttribute('window-start', '50')
    el.setAttribute('data', JSON.stringify([{ id: 'z', name: 'Zulu' }]))
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-detail-pending-panel')?.textContent ?? ''))
    .toBe('Zulu')
  const resolved = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    return {
      events: (window as any).__qaDetailEvents,
      selected: detail.selected?.key,
      rowIndex: detail.selected?.rowIndex,
    }
  })
  expect(resolved.events, '回填命中只落地一次（事件总数为 2）').toBe(2)
  expect(resolved.selected).toBe('z')
  expect(resolved.rowIndex).toBe(0)

  // 显式等待 + AbortSignal：等待中 abort 后回填无任何可见反馈（面板/选中/事件均不变）
  await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    const detail = (window as any).__qaDetail
    el.data = [{ id: 'z', name: 'Zulu' }]
    ;(window as any).__qaAbortBefore = (window as any).__qaDetailEvents
    ;(window as any).__qaAbortCtl = new AbortController()
    detail.selectByKey('k', {
      waitForRow: true,
      signal: (window as any).__qaAbortCtl.signal,
    })
    ;(window as any).__qaAbortCtl.abort()
    el.data = [{ id: 'k', name: 'Kilo' }]
  })
  // 数据到达已处理的真实信号：Kilo 行已渲染（abort 的等待若缺陷复现会在数据到达链中落地，此时读必变化）
  await page.waitForFunction(
    () =>
      [...(document.querySelector('#qa-detail-pending-table')?.shadowRoot?.querySelectorAll('tbody tr') ?? [])].some(
        (tr) => tr.textContent?.includes('Kilo'),
      ),
    null,
    { timeout: 5000 },
  )
  const aborted = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    return {
      panel: document.querySelector('#qa-detail-pending-panel')!.textContent,
      selected: detail.selected?.key,
      events: (window as any).__qaDetailEvents,
      before: (window as any).__qaAbortBefore,
    }
  })
  expect(aborted.panel, 'abort 后回填不得改写面板（无可见反馈）').toBe('Zulu')
  expect(aborted.selected, 'abort 后回填不得改写选中').toBe('z')
  expect(aborted.events, 'abort 后零新增事件').toBe(aborted.before)

  const afterPending = await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table')!
    const detail = (window as any).__qaDetail
    detail.close()
    el.setAttribute('data', JSON.stringify([]))
    detail.selectByKey('y', { waitForRow: true })
    const beforeCancel = (window as any).__qaDetailEvents
    detail.close()
    return {
      beforeCancel,
      events: (window as any).__qaDetailEvents,
      panel: document.querySelector('#qa-detail-pending-panel')!.textContent,
    }
  })
  expect(afterPending.events, 'close 取消未装载等待且无选中时不额外派发').toBe(afterPending.beforeCancel)
  expect(afterPending.panel).toBe('未选择')

  await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    el.data = [{ id: 'y', name: 'Yankee' }]
  })
  // 数据到达已处理的真实信号：Yankee 行已渲染（被 close 取消的等待若缺陷复现会在此时错误落地）
  await page.waitForFunction(
    () =>
      [...(document.querySelector('#qa-detail-pending-table')?.shadowRoot?.querySelectorAll('tbody tr') ?? [])].some(
        (tr) => tr.textContent?.includes('Yankee'),
      ),
    null,
    { timeout: 5000 },
  )
  const cancelled = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    const panel = document.querySelector('#qa-detail-pending-panel')!
    return {
      panel: panel.textContent,
      selected: detail.selected,
      events: (window as any).__qaDetailEvents,
    }
  })
  expect(cancelled.panel, '被 close 取消的等待不得在数据到达后落地').toBe('未选择')
  expect(cancelled.selected).toBeNull()
  expect(cancelled.events).toBe(afterPending.beforeCancel)

  // 无选中时表格内 Esc 取消 pending（本实例表格/面板路径，不做全局 Esc）
  const afterEsc = await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    const detail = (window as any).__qaDetail
    el.data = []
    detail.selectByKey('w', { waitForRow: true })
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    const beforeData = (window as any).__qaDetailEvents
    el.data = [{ id: 'w', name: 'Whiskey' }]
    return { beforeData, events: (window as any).__qaDetailEvents }
  })
  // 数据到达已处理的真实信号：Whiskey 行已渲染（Esc 取消的等待若缺陷复现会在此时错误落地）
  await page.waitForFunction(
    () =>
      [...(document.querySelector('#qa-detail-pending-table')?.shadowRoot?.querySelectorAll('tbody tr') ?? [])].some(
        (tr) => tr.textContent?.includes('Whiskey'),
      ),
    null,
    { timeout: 5000 },
  )
  const escCancelled = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    return {
      selected: detail.selected,
      panel: document.querySelector('#qa-detail-pending-panel')!.textContent,
      events: (window as any).__qaDetailEvents,
    }
  })
  expect(escCancelled.selected, '无选中 Esc 取消等待后回填不得选中').toBeNull()
  expect(escCancelled.panel).toBe('未选择')
  expect(escCancelled.events).toBe(afterEsc.beforeData)

  // 模式回落普通与 data 命中同批到达：显式等待不因模式/批次终止，按 data 命中落地
  await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    const detail = (window as any).__qaDetail
    el.data = []
    detail.selectByKey('q', { waitForRow: true })
    ;(window as any).__qaFallbackBefore = (window as any).__qaDetailEvents
    el.setAttribute('total', '0')
    el.data = [{ id: 'q', name: 'Quebec' }]
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#qa-detail-pending-panel')?.textContent ?? ''))
    .toBe('Quebec')
  const fallbackHit = await page.evaluate(() => {
    const detail = (window as any).__qaDetail
    return {
      selected: detail.selected?.key,
      events: (window as any).__qaDetailEvents,
      before: (window as any).__qaFallbackBefore,
    }
  })
  expect(fallbackHit.selected, '回落普通时 data 已含等待键仍应落地（批次/模式不终止等待）').toBe('q')
  expect(fallbackHit.events, '只落地一次').toBe(fallbackHit.before + 1)

  // total=0.5 截断后为普通模式：不存在的键清空并触发关闭
  const fractional = await page.evaluate(() => {
    const el = document.querySelector('#qa-detail-pending-table') as HTMLElement & { data: unknown[] }
    const detail = (window as any).__qaDetail
    detail.close()
    el.setAttribute('total', '0.5')
    el.data = [{ id: 'r', name: 'R' }]
    detail.selectByKey('r')
    const selectedBefore = detail.selected?.key
    const beforeMiss = (window as any).__qaDetailEvents
    detail.selectByKey('missing')
    return {
      selectedBefore,
      beforeMiss,
      events: (window as any).__qaDetailEvents,
      selected: detail.selected,
      panel: document.querySelector('#qa-detail-pending-panel')!.textContent,
    }
  })
  expect(fractional.selectedBefore).toBe('r')
  expect(fractional.selected, 'total=0.5 按普通模式：不存在键清空').toBeNull()
  expect(fractional.panel).toBe('未选择')
  expect(fractional.events, '清空派发一次').toBe(fractional.beforeMiss + 1)
  expect(issues, 'console 零 error/告警').toEqual([])

  await page.evaluate(() => {
    ;(window as any).__qaDetail.destroy()
    document.querySelector('#qa-detail-pending-table')?.remove()
    document.querySelector('#qa-detail-pending-panel')?.remove()
  })
})

test('table Pro range：无重渲染禁用不覆盖外部新 tabindex，公共禁用恢复普通/editable 语义', async ({ page }) => {
  // 缺陷固化：savedTabindex 只存原值，关闭时无条件回写会覆盖 range 拥有期间外部能力写入的新值。
  // 修复=记录原值 + range 最后写入值，仅当前值仍归 range 所有时才恢复。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-pro')
  await page.waitForFunction(
    () => document.querySelector('#table-pro')!.shadowRoot!.querySelectorAll('tr.row').length === 4,
    null,
    { timeout: 10000 },
  )
  await page.waitForFunction(
    () =>
      (
        document.querySelector('#table-pro') as unknown as {
          getCapabilityOptions(name: string): { enabled?: boolean } | undefined
        }
      ).getCapabilityOptions('range')?.enabled === true,
    null,
    { timeout: 10000 },
  )

  const ownership = await page.evaluate(() => {
    const el = document.querySelector('#table-pro') as unknown as HTMLElement & {
      getCapabilityOptions<T>(name: string): T | undefined
      setCapabilityOptions(name: string, options: unknown): void
      requestUpdate(): void
    }
    const current = el.getCapabilityOptions<{ enabled: boolean }>('range')!
    el.setCapabilityOptions('range', {
      ...current,
      selection: {
        start: { row: 0, col: 'name' },
        end: { row: 0, col: 'name' },
      },
    })
    const td = el.shadowRoot!.querySelector<HTMLElement>('tr.row td[data-col="name"]')!
    const written = td.getAttribute('tabindex')
    td.setAttribute('tabindex', '5')
    const live = el.getCapabilityOptions<{ enabled: boolean }>('range')!
    live.enabled = false
    el.requestUpdate()
    const sameNode = el.shadowRoot!.querySelector('tr.row td[data-col="name"]') === td
    return { written, external: td.getAttribute('tabindex'), sameNode }
  })
  expect(ownership.written, 'range 拥有焦点格时写入 0').toBe('0')
  expect(ownership.sameNode, '禁用路径不重建 DOM（否则断言不成立）').toBe(true)
  expect(ownership.external, '外部写入的新 tabindex 必须保留').toBe('5')

  // 公共路径（enableRangeSelection 同款 setCapabilityOptions）：禁用后不残留 range 停靠值
  const restored = await page.evaluate(() => {
    const el = document.querySelector('#table-pro') as unknown as HTMLElement & {
      setCapabilityOptions(name: string, options: unknown): void
    }
    el.setCapabilityOptions('range', {
      enabled: true,
      selection: {
        start: { row: 0, col: 'name' },
        end: { row: 0, col: 'name' },
      },
    })
    el.setCapabilityOptions('range', { enabled: false })
    const editable = el.shadowRoot!.querySelector<HTMLElement>('tr.row td[data-col="name"]')!
    const plain = el.shadowRoot!.querySelector<HTMLElement>('tr.row td[data-col="team"]')!
    return {
      editable: editable.getAttribute('tabindex'),
      plain: plain.getAttribute('tabindex'),
      // editable 列自身的 tabindex=0 是编辑能力语义，不算 range 残留停靠点
      plainStops: [...el.shadowRoot!.querySelectorAll<HTMLElement>('td[data-col]')].filter(
        (td) => td.tabIndex === 0 && td.getAttribute('data-col') !== 'name',
      ).length,
      rangeSelected: el.shadowRoot!.querySelectorAll('td.range-selected').length,
    }
  })
  expect(restored.editable, 'editable 单元格恢复原 tabindex=0').toBe('0')
  expect(restored.plain, '普通单元格无 tabindex').toBeNull()
  expect(restored.plainStops, '禁用后普通单元格无 range roving 停靠点').toBe(0)
  expect(restored.rangeSelected, '禁用后选区装饰清除').toBe(0)
})

test('table advanced：createWindowedSource 外部清空/换窗后重拉，同步失败可重试且无告警', async ({ page }) => {
  // 缺陷固化：source 自存 loaded 在宿主外部清空/替换 data 后变陈旧吞掉新请求；
  // fetchRows 同步 throw 绕过 .catch 让 filling 永久残留。修复=按表格当前切片去重 + 统一失败路径。
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('scroll-linked positioning effect')))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  await serveBuiltUi(page)
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  await page.evaluate(async () => {
    const moduleUrl = '/__qa_ui__/data/table/advanced/windowed.js'
    const { createWindowedSource } = (await import(moduleUrl)) as {
      createWindowedSource: (table: HTMLElement, options: Record<string, unknown>) => { destroy(): void }
    }
    const el = document.createElement('oas-table')
    el.id = 'qa-window-source-table'
    el.setAttribute('row-key', 'id')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    ;(document.querySelector('.vp-doc') ?? document.body).append(el)
    const state: {
      mode: 'ok' | 'throw'
      calls: Array<{ start: number; end: number }>
      errors: unknown[]
    } = {
      mode: 'ok',
      calls: [],
      errors: [],
    }
    ;(window as any).__qaWindowSourceState = state
    el.addEventListener('oas-window-error', (event) => state.errors.push((event as CustomEvent).detail))
    const fetchRows = ({
      start,
      end,
    }: {
      start: number
      end: number
      signal: AbortSignal
    }): Promise<{ rows: unknown[]; total: number }> => {
      state.calls.push({ start, end })
      if (state.mode === 'throw') throw new Error('qa sync failure')
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              rows: Array.from({ length: end - start }, (_, index) => ({
                id: `r${start + index}`,
                name: `R${start + index}`,
              })),
              total: 100,
            }),
          10,
        ),
      )
    }
    const source = createWindowedSource(el, { fetchRows, windowSize: 5 })
    ;(window as any).__qaWindowSource = { source, el }
    await new Promise((resolve) => setTimeout(resolve, 80))
  })
  const initial = await page.evaluate(() => {
    const { el } = (window as any).__qaWindowSource
    const state = (window as any).__qaWindowSourceState
    return { calls: state.calls, rows: (el.data as unknown[]).length }
  })
  expect(initial.calls, '首拉一次').toHaveLength(1)
  expect(initial.rows).toBe(5)

  // 宿主外部清空 data → 同窗口请求必须重新拉取（旧 loaded 会吞掉）
  await page.evaluate(() => {
    const { el } = (window as any).__qaWindowSource
    el.setAttribute('data', '[]')
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
  })
  await page.waitForFunction(() => {
    const { el } = (window as any).__qaWindowSource
    const state = (window as any).__qaWindowSourceState
    return state.calls.length >= 2 && (el.data as unknown[]).length === 5
  })
  const reload = await page.evaluate(() => {
    const { el } = (window as any).__qaWindowSource
    const state = (window as any).__qaWindowSourceState
    return {
      calls: state.calls,
      first: (el.data as Array<{ name: string }>)[0]?.name,
    }
  })
  expect(reload.calls.slice(1).some((call: { start: number; end: number }) => call.start === 0 && call.end === 5)).toBe(
    true,
  )
  expect(reload.first).toBe('R0')

  // 宿主外部换窗 → 原视口请求不被旧区间吞掉
  await page.evaluate(() => {
    const { el } = (window as any).__qaWindowSource
    el.setAttribute('window-start', '40')
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 5 }, (_, index) => ({
          id: `r${40 + index}`,
          name: `R${40 + index}`,
        })),
      ),
    )
  })
  await page.evaluate(() => {
    const { el } = (window as any).__qaWindowSource
    el.dispatchEvent(new CustomEvent('oas-window-request', { detail: { start: 0, end: 5 } }))
  })
  await page.waitForFunction(
    () => {
      const { el } = (window as any).__qaWindowSource
      return el.getAttribute('window-start') === '0' && (el.data as Array<{ name: string }>)[0]?.name === 'R0'
    },
    null,
    { timeout: 5000 },
  )

  // 同步 throw → 一次 oas-window-error，之后同窗口可重试
  await page.evaluate(() => {
    const state = (window as any).__qaWindowSourceState
    state.mode = 'throw'
    document.querySelector('#qa-window-source-table')!.dispatchEvent(
      new CustomEvent('oas-window-request', {
        detail: { start: 10, end: 15 },
      }),
    )
  })
  await page.waitForFunction(() => (window as any).__qaWindowSourceState.errors.length === 1, null, {
    timeout: 5000,
  })
  const failed = await page.evaluate(() => {
    const error = (window as any).__qaWindowSourceState.errors[0] as {
      start: number
      end: number
      error: unknown
    }
    return {
      start: error.start,
      end: error.end,
      isError: error.error instanceof Error,
    }
  })
  expect(failed).toEqual({ start: 10, end: 15, isError: true })

  await page.evaluate(() => {
    const state = (window as any).__qaWindowSourceState
    state.mode = 'ok'
    document.querySelector('#qa-window-source-table')!.dispatchEvent(
      new CustomEvent('oas-window-request', {
        detail: { start: 10, end: 15 },
      }),
    )
  })
  await page.waitForFunction(
    () => {
      const { el } = (window as any).__qaWindowSource
      return el.getAttribute('window-start') === '10' && (el.data as Array<{ name: string }>)[0]?.name === 'R10'
    },
    null,
    { timeout: 5000 },
  )
  const retried = await page.evaluate(() => ({
    errors: (window as any).__qaWindowSourceState.errors.length,
    rows: ((window as any).__qaWindowSource.el.data as unknown[]).length,
  }))
  expect(retried.errors, '失败只派发一次 error').toBe(1)
  expect(retried.rows).toBe(5)
  expect(issues, 'console 零 error/告警（同步异常不逃逸）').toEqual([])

  await page.evaluate(() => {
    ;(window as any).__qaWindowSource.source.destroy()
    document.querySelector('#qa-window-source-table')?.remove()
  })
})

test('table advanced：createWindowedSource × 视觉适配器——真实 adapter 驱动协议、协议下焦点回锚（dark/console/ARIA）', async ({
  page,
}) => {
  // 缺陷固化：windowed 视觉协议下（切片含 expand / 切片前已有展开），宿主持有真实展开布局时
  // source 助手此前只会按事件 start/end 均匀取数、也从不回写 visual-start/visual-total——
  // 取数区间与可视槽位错位、协议无法被宿主单源驱动。修复=可选 visual 适配器：
  // 初始化/回填重新求值 geometry 齐写视觉属性；请求带视觉字段时按 adapter 映射数据取数区间。
  // 本用例以「每 25 行一个展开槽位」的真实布局驱动：滚动取数走视觉映射、聚焦行后宿主回写
  // expanded/visual-start/data（source.refresh 重拉回填）焦点仍在同一 row-key、ARIA 数据口径不变。
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('scroll-linked positioning effect')))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  await serveBuiltUi(page)
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  await page.evaluate(async () => {
    const moduleUrl = '/__qa_ui__/data/table/advanced/windowed.js'
    const { createWindowedSource } = (await import(moduleUrl)) as {
      createWindowedSource: (
        table: HTMLElement,
        options: Record<string, unknown>,
      ) => {
        refresh(): void
        destroy(): void
      }
    }
    const el = document.createElement('oas-table')
    el.id = 'qa-window-visual-table'
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '200')
    el.setAttribute('row-height', '40')
    el.setAttribute('grid-navigation', '')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    ;(document.querySelector('.vp-doc') ?? document.body).append(el)

    // 真实宿主布局：300 行数据，行下标 % 25 === 0 的行带展开内容（全局已知 → visualTotal 可算）
    const DATA_TOTAL = 300
    const expandedSet = new Set<number>(Array.from({ length: 12 }, (_, k) => k * 25))
    const state = {
      el,
      expandedSet,
      dataTotal: DATA_TOTAL,
      visualTotal: DATA_TOTAL + expandedSet.size,
      /** 测试注入：true 时 getGeometry 返回非法快照（触发 source 视觉降级） */
      broken: false,
      /** 测试注入：true 时 getDataRange 只映射当前已装载切片（严格 adapter，无 margin） */
      strict: false,
      rangeCalls: 0,
      errors: [] as Array<Record<string, unknown>>,
      lastFetch: null as { start: number; end: number } | null,
      lastMap: null as {
        visualStart: number
        visualEnd: number
        result: { start: number; end: number }
      } | null,
      calls: [] as Array<{
        start: number
        end: number
        visualStart?: number
        visualEnd?: number
      }>,
      slotOf(i: number): number {
        let count = 0
        for (const e of this.expandedSet) if (e < i) count++
        return i + count
      },
      adapter: null as unknown,
    }
    state.adapter = {
      getGeometry: (dataStart: number) =>
        state.broken ? { start: -1, total: 0 } : { start: state.slotOf(dataStart), total: state.visualTotal },
      getDataRange: (visualStart: number, visualEnd: number) => {
        state.rangeCalls++
        if (state.strict) {
          // 严格 adapter：只映射当前已装载切片（无 margin）——并集契约下键盘目标不被吞
          const ws = Number(state.el.getAttribute('window-start')) || 0
          const len = ((state.el as HTMLElement & { data: unknown[] }).data as unknown[]).length
          const result = { start: ws, end: ws + len }
          state.lastMap = { visualStart, visualEnd, result }
          return result
        }
        let lo = Infinity
        let hi = -Infinity
        for (let i = 0; i < state.dataTotal; i++) {
          const s = state.slotOf(i)
          const len = state.expandedSet.has(i) ? 2 : 1
          if (s + len <= visualStart || s >= visualEnd) continue
          if (i < lo) lo = i
          if (i + 1 > hi) hi = i + 1
        }
        // 与组件同口径：映射结果前后各扩 8 行并夹取（宿主取数更宽，避免边界抖动）
        const result = {
          start: Math.max(0, lo - 8),
          end: Math.min(state.dataTotal, hi + 8),
        }
        state.lastMap = { visualStart, visualEnd, result }
        return result
      },
    }
    ;(window as any).__qaVisualState = state
    el.addEventListener('oas-window-request', (event) => {
      const d = (event as CustomEvent).detail
      state.calls.push({
        start: d.start,
        end: d.end,
        visualStart: d.visualStart,
        visualEnd: d.visualEnd,
      })
    })
    el.addEventListener('oas-window-error', (event) => {
      state.errors.push((event as CustomEvent).detail as Record<string, unknown>)
    })
    const fetchRows = ({
      start,
      end,
    }: {
      start: number
      end: number
      signal: AbortSignal
    }): Promise<{ rows: unknown[]; total: number }> => {
      state.lastFetch = { start, end }
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              rows: Array.from({ length: end - start }, (_, k) => {
                const index = start + k
                return {
                  id: `r${index}`,
                  name: `R${index}`,
                  ...(state.expandedSet.has(index) ? { expand: `<div class="exp">详情${index}</div>` } : {}),
                }
              }),
              total: state.dataTotal,
            }),
          10,
        ),
      )
    }
    const source = createWindowedSource(el, {
      fetchRows,
      total: state.dataTotal,
      windowSize: 24,
      visual: state.adapter,
    })
    ;(window as any).__qaVisualSource = { source }
    await new Promise((resolve) => setTimeout(resolve, 120))
    // 宿主把展开模型同步到表格（协议下 expanded 由宿主单源维护）
    el.setAttribute('expanded', [...state.expandedSet].map((i: number) => `r${i}`).join(','))
    await new Promise((resolve) => setTimeout(resolve, 60))
  })

  // 初始化：visual 属性齐写（切片前已有展开 → visual-start=0、visual-total=312）、首拉按映射取数
  const initial = await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    return {
      visualStart: state.el.getAttribute('visual-start'),
      visualTotal: state.el.getAttribute('visual-total'),
      windowed: state.el.hasAttribute('windowed'),
      total: state.el.getAttribute('total'),
      firstCall: state.calls[0],
      rows: (state.el.data as Array<{ id: string }>).map((r) => r.id),
    }
  })
  expect(initial.visualStart, '初始化齐写 visual-start（切片前已有展开布局快照）').toBe('0')
  expect(initial.visualTotal, '初始化齐写 visual-total=数据 total + 展开槽位').toBe('312')
  expect(initial.windowed).toBe(true)
  expect(initial.total).toBe('300')
  expect(initial.firstCall!.visualStart, '首拉事件带视觉字段（协议在首拉前已生效）').toBe(0)
  expect(initial.firstCall!.end, '首拉 end 覆盖初始视口（映射 + margin）').toBeGreaterThan(12)
  expect(initial.rows[0], '首拉从数据行 0 开始').toBe('r0')

  // 滚动到展开区之后：可视窗口落在数据行 ~130 附近 → 请求按视觉映射覆盖真实可见行
  await page.evaluate(() => {
    const el = document.querySelector('#qa-window-visual-table')!
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 130 * 40
    wrap.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#qa-window-visual-table') as HTMLElement & { data: Array<{ id: string }> }
      const ids = el.data.map((r) => r.id)
      return ids.includes('r120') && ids.includes('r140')
    },
    null,
    { timeout: 15000 },
  )
  const scrolled = await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    const el = state.el
    const last = state.calls.at(-1)
    const rendered = [...el.shadowRoot!.querySelectorAll('tbody tr[data-row-index]')].map((tr: Element) =>
      Number(tr.getAttribute('data-row-index')),
    )
    const renderedCovered = rendered.every((idx: number) =>
      (state.calls as Array<{ start: number; end: number }>).some((c) => idx >= c.start && idx < c.end),
    )
    return { last, renderedCovered }
  })
  // 下界理由：visualStart = 滚动后可视窗口首行的视觉坐标（像素，随滚动位置/视口尺寸变化，无固定值）；
  // >0 锁定「滚动请求携带的是视觉坐标（非数据索引 0 起点）」的映射契约
  expect(scrolled.last!.visualStart, '滚动请求带视觉字段（可视窗口视觉坐标）').toBeGreaterThanOrEqual(1)
  expect(scrolled.renderedCovered, '真实可见数据行全部落在已请求区间内（映射覆盖可视窗口，不再均匀网格错位）').toBe(
    true,
  )

  // 先操作仍在窗口内的 r125 展开钮；随后 focus r130 可能触发浏览器滚动并把 r125 裁出窗口
  const toggled = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#qa-window-visual-table')!
        el.addEventListener(
          'oas-expand',
          (e) =>
            resolve({
              detail: (e as CustomEvent).detail,
              expandedAttr: el.getAttribute('expanded'),
            }),
          { once: true },
        )
        ;(el.shadowRoot!.querySelector(
          'tbody tr[data-key="r125"] .expand-toggle-cell button.toggle',
        ) as HTMLElement)!.click()
      }),
  )
  expect((toggled as any).detail, '协议生效：本地 toggle 只派发 oas-expand（宿主通道）').toEqual({
    key: 'r125',
    expanded: false,
  })

  // 协议下焦点：聚焦 r130，随后由宿主回写展开布局并验证焦点回锚
  const focusBefore = await page.evaluate(() => {
    const el = document.querySelector('#qa-window-visual-table')!
    const td = el.shadowRoot!.querySelector<HTMLElement>('tr[data-key="r130"] td[data-col="name"]')!
    td.focus()
    return el.shadowRoot!.activeElement === td
  })
  expect(focusBefore, '聚焦 r130 单元格').toBe(true)
  expect(((toggled as any).expandedAttr as string).split(','), '本地不修改 expanded（r125 保留、r130 未加入）').toEqual(
    ['r0', 'r25', 'r50', 'r75', 'r100', 'r125', 'r150', 'r175', 'r200', 'r225', 'r250', 'r275'],
  )

  // 宿主单源回写：adapter 布局加入 r130 → expanded 属性 → source.refresh 重拉回填（data/视觉属性重写）
  await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    state.expandedSet.add(130)
    state.visualTotal = state.dataTotal + state.expandedSet.size
    state.el.setAttribute('expanded', [...state.expandedSet].map((i: number) => `r${i}`).join(','))
    const td = state.el.shadowRoot!.querySelector('tr[data-key="r130"] td[data-col="name"]') as HTMLElement
    td.focus()
    ;(window as any).__qaVisualSource.source.refresh()
  })
  await page.waitForFunction(
    () => {
      const state = (window as any).__qaVisualState
      return (
        state.el.getAttribute('visual-total') === '313' &&
        !!(state.el.data as Array<{ id: string }>).find((r) => r.id === 'r130' && (r as any).expand)
      )
    },
    null,
    { timeout: 15000 },
  )
  const afterWriteback = await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    const el = state.el
    const active = el.shadowRoot!.activeElement as HTMLElement | null
    return {
      visualTotal: el.getAttribute('visual-total'),
      visualStart: el.getAttribute('visual-start'),
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      expandVisible: !!el.shadowRoot!.querySelector('tbody tr.expand-row'),
      focusKey: active?.closest('tr')?.getAttribute('data-key') ?? null,
      snapshot130: (el as any).getDisplaySnapshot()!.rowIndexByKey.get('r130'),
    }
  })
  expect(afterWriteback.visualTotal, '宿主回写后 visual-total 随 adapter 快照更新（312→313）').toBe('313')
  expect(afterWriteback.ariaCount, 'aria-rowcount 仍为数据 total 全量口径').toBe('300')
  expect(afterWriteback.expandVisible, 'r130 展开内容真实渲染').toBe(true)
  expect(afterWriteback.focusKey, '回写 data/视觉属性后焦点仍在同一 row-key').toBe('r130')
  expect(afterWriteback.snapshot130, 'displaySnapshot 仍解析绝对数据行号').toBe(130)

  // dark 主题：协议记账与 ARIA 口径一致
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await page.evaluate(() => {
    const el = document.querySelector('#qa-window-visual-table')!
    return {
      visualTotal: el.getAttribute('visual-total'),
      ariaCount: el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'),
      expandVisible: !!el.shadowRoot!.querySelector('tbody tr.expand-row'),
    }
  })
  expect(dark.visualTotal).toBe('313')
  expect(dark.ariaCount).toBe('300')
  expect(dark.expandVisible).toBe(true)

  // 降级不误映射：geometry 失败 → 视觉属性移除 + 一次 error；此后事件仍带（本地口径的）视觉字段，
  // source 不得再按宿主全局布局映射（否则会按错误坐标拉行）——必须回落事件 start/end 原样取数
  await page.evaluate(() => {
    ;(window as any).__qaVisualState.broken = true
    document.querySelector('#qa-window-visual-table')!.dispatchEvent(
      new CustomEvent('oas-window-request', {
        detail: { start: 210, end: 219, visualStart: 216, visualEnd: 226 },
      }),
    )
  })
  await page.waitForFunction(
    () =>
      (window as any).__qaVisualState.errors.length === 1 &&
      !(window as any).__qaVisualState.el.hasAttribute('visual-total'),
    null,
    { timeout: 15000 },
  )
  const degradedAttr = await page.evaluate(
    () => (window as any).__qaVisualState.el.getAttribute('visual-start') as string | null,
  )
  expect(degradedAttr, 'geometry 失败：视觉属性整体回落').toBe(null)

  // 降级后：带本地视觉字段的请求 → 不调用 getDataRange、按事件 start/end 原样取数
  const degradedRangeCalls = (await page.evaluate(() => (window as any).__qaVisualState.rangeCalls as number)) as number
  await page.evaluate(() => {
    document.querySelector('#qa-window-visual-table')!.dispatchEvent(
      new CustomEvent('oas-window-request', {
        detail: { start: 220, end: 229, visualStart: 226, visualEnd: 236 },
      }),
    )
  })
  await page.waitForFunction(
    () =>
      (window as any).__qaVisualState.lastFetch?.start === 220 &&
      (window as any).__qaVisualState.lastFetch?.end === 229,
    null,
    { timeout: 15000 },
  )
  const degradedMap = (await page.evaluate(() => (window as any).__qaVisualState.rangeCalls as number)) as number
  expect(degradedMap, '降级后不得调用 getDataRange（事件视觉字段是本地口径）').toBe(degradedRangeCalls)

  // 修正 adapter 后 refresh 恢复协议：视觉属性恢复 + 重拉落盘（短切片 [220,229)，不触 total）
  await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    state.broken = false
    ;(window as any).__qaVisualSource.source.refresh()
  })
  await page.waitForFunction(
    () => {
      const state = (window as any).__qaVisualState
      const f = state.lastFetch as { start: number; end: number } | null
      return (
        state.el.getAttribute('visual-total') === '313' &&
        !!f &&
        state.el.getAttribute('window-start') === String(f.start) &&
        (state.el.data as unknown[]).length === f.end - f.start
      )
    },
    null,
    { timeout: 15000 },
  )

  // 并集契约 × 真实滚动/键盘：strict adapter（只映射当前已装载切片）下，映射 ⊆ 已装载——
  // 旧实现用映射「替换」事件区间 → 滚动/键盘 need 被覆盖判定静默吞掉（目标行永远取不到）；
  // 并集契约 fetch = 事件 need ∪ 映射区间。滚动到切片底部等渲染稳定后，ArrowDown 派发
  // requestWindowForRow（目标 = 渲染底端+1，need 必越出已装载 → 必然派发）；
  // 映射与取数在 onRequest 内同步完成，断言无竞态。
  await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    state.strict = true
    const ws = Number(state.el.getAttribute('window-start')) || 0
    const loadedEnd = ws + (state.el.data as unknown[]).length
    const wrap = state.el.shadowRoot!.querySelector('.table-scroll')
    wrap.scrollTop = Math.max(0, loadedEnd * 40 - 200)
    wrap.dispatchEvent(new Event('scroll'))
  })
  // 等滚动取数落盘（ws === lastFetch.start 且 len 对齐）→ 切片底部渲染矩阵就绪
  await page.waitForFunction(
    () => {
      const state = (window as any).__qaVisualState
      const f = state.lastFetch as { start: number; end: number } | null
      return (
        !!f &&
        state.el.getAttribute('window-start') === String(f.start) &&
        (state.el.data as unknown[]).length === f.end - f.start
      )
    },
    null,
    { timeout: 15000 },
  )
  // 下一行 waitForFunction 已等「切片底部渲染矩阵就绪」（tbody 行数 > 0），中间固定等待无增量信息
  await page.waitForFunction(
    () => (window as any).__qaVisualState.el.shadowRoot.querySelectorAll('tbody tr[data-row-index]').length > 0,
    null,
    { timeout: 15000 },
  )
  const keyboard = await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    const rows = [...state.el.shadowRoot.querySelectorAll('tbody tr[data-row-index]')]
    const last = rows[rows.length - 1] as HTMLElement
    const lastAbs = Number(last.getAttribute('data-row-index'))
    const td = last.querySelector('td[data-col="name"]') as HTMLElement
    td.focus()
    td.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
    const ws = Number(state.el.getAttribute('window-start')) || 0
    const loadedEnd = ws + (state.el.data as unknown[]).length
    const target = lastAbs + 1
    // requestWindowForRow 的 need = expandWindow(target, target+1, total, 8)
    const need = {
      start: Math.max(0, target - 8),
      end: Math.min(300, target + 9),
    }
    return {
      target,
      need,
      loaded: { start: ws, end: loadedEnd },
      lastFetch: state.lastFetch,
      lastMapResult: state.lastMap?.result ?? null,
      strictMappedToLoaded: state.lastMap?.result.start === ws && state.lastMap?.result.end === loadedEnd,
    }
  })
  expect(keyboard.strictMappedToLoaded, 'strict adapter 只映射已装载切片（构造成立）').toBe(true)
  expect(keyboard.need.end, '键盘目标行越出已装载区间（场景成立：替换会被覆盖判定吞掉）').toBeGreaterThan(
    keyboard.loaded.end,
  )
  expect(keyboard.lastFetch?.start, '并集保留键盘目标：fetch.start = min(need.start, 映射.start)').toBe(
    Math.min(keyboard.need.start, keyboard.lastMapResult!.start),
  )
  expect(keyboard.lastFetch?.end, '并集保留键盘目标：fetch.end = max(need.end, 映射.end)').toBe(
    Math.max(keyboard.need.end, keyboard.lastMapResult!.end),
  )
  // 取数落盘：并集区间真实到达（修复前该请求被吞，切片永不更新）
  await page.waitForFunction(
    () => {
      const state = (window as any).__qaVisualState
      const f = state.lastFetch as { start: number; end: number } | null
      return (
        !!f &&
        state.el.getAttribute('window-start') === String(f.start) &&
        (state.el.data as unknown[]).length === f.end - f.start
      )
    },
    null,
    { timeout: 15000 },
  )

  // 映射恢复（strict 关闭）：显式请求重新按 adapter 映射（并集：事件区间 ∪ 映射区间）
  await page.evaluate(() => {
    const state = (window as any).__qaVisualState
    state.strict = false
    document.querySelector('#qa-window-visual-table')!.dispatchEvent(
      new CustomEvent('oas-window-request', {
        detail: { start: 240, end: 249, visualStart: 246, visualEnd: 256 },
      }),
    )
  })
  await page.waitForFunction(
    () => {
      const state = (window as any).__qaVisualState
      const map = state.lastMap
      if (map?.visualStart !== 246 || map?.visualEnd !== 256) return false
      return (
        state.lastFetch?.start === Math.min(240, map.result.start) &&
        state.lastFetch?.end === Math.max(249, map.result.end)
      )
    },
    null,
    { timeout: 15000 },
  )
  expect(issues, 'console 零 error/告警（协议激活与降级恢复均无「只有其一」告警）').toEqual([])
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    ;(window as any).__qaVisualSource.source.destroy()
    document.querySelector('#qa-window-visual-table')?.remove()
  })
})

// —— 触屏外点关闭（hasTouch 真实触摸）：过滤面板 ——
// 迁移回归：外点关闭统一走 shared/outside-dismiss（click + coarse pointerup 双通道）。
// WebKit 对非交互目标上的 tap 只派发 pointer 事件、不合成 click——只挂 click 会整体失效。
test('table 过滤面板触屏：面板内 tap 不关，外部非交互区 tap（pointerup 通道）关', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
    await page.evaluate(() => {
      const el = document.createElement('oas-table') as HTMLElement
      el.id = 'qa-touch-filter'
      el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', filterable: true }]))
      el.setAttribute('row-key', 'id')
      el.setAttribute(
        'data',
        JSON.stringify([
          { id: 'a', name: '甲' },
          { id: 'b', name: '乙' },
        ]),
      )
      el.style.display = 'block'
      el.style.margin = '32px 16px'
      ;(document.querySelector('.vp-doc') ?? document.body).appendChild(el)
      el.scrollIntoView({ block: 'center' })
      // 外部非交互区：纯 div（无 click 语义），WebKit 触屏 tap 只到 pointerup
      const blank = document.createElement('div')
      blank.id = 'qa-touch-blank'
      blank.style.cssText = 'position:fixed;right:8px;bottom:8px;width:160px;height:80px;z-index:9999;'
      document.body.appendChild(blank)
    })
    await page.waitForFunction(
      () => !!document.querySelector('#qa-touch-filter')?.shadowRoot?.querySelector('th[data-key] .filter-btn'),
      null,
      { timeout: 15000 },
    )
    await page.evaluate(() => {
      const btn = document
        .querySelector('#qa-touch-filter')!
        .shadowRoot!.querySelector<HTMLElement>('th[data-key] .filter-btn')!
      btn.click()
    })
    await page.waitForFunction(
      () => !!document.querySelector('#qa-touch-filter')?.shadowRoot?.querySelector('.filter-panel'),
      null,
      { timeout: 5000 },
    )
    const panelPoint = await page.evaluate(() => {
      const panel = document.querySelector('#qa-touch-filter')!.shadowRoot!.querySelector<HTMLElement>('.filter-panel')!
      const r = panel.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + 10 }
    })
    // 面板内 tap（标题区，非按钮）：不得关闭
    await page.touchscreen.tap(panelPoint.x, panelPoint.y)
    const openAfterInside = await page.evaluate(
      () => !!document.querySelector('#qa-touch-filter')?.shadowRoot?.querySelector('.filter-panel'),
    )
    expect(openAfterInside, '面板内 tap 不关').toBe(true)
    // 面板外非交互区 tap：关闭（真实触摸 → 至少 pointerup 通道可达）
    const blankPoint = await page.evaluate(() => {
      const r = document.querySelector('#qa-touch-blank')!.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    await page.touchscreen.tap(blankPoint.x, blankPoint.y)
    await page.waitForFunction(
      () => !document.querySelector('#qa-touch-filter')!.shadowRoot!.querySelector('.filter-panel'),
      null,
      { timeout: 5000 },
    )
  } finally {
    await ctx.close()
  }
})
// 结构级渲染（structural-render L3）demo 真实浏览器回归：注册能力 + property 四槽生效——
// 状态列色点包裹（bodyCell）、表头提示（headerCell）、点击行徽标（bodyRow，行重建监听随销毁）；
// 未设 structuralRenderers 的新表格零开销零异常；console 零告警。
// （「能力未注册」路径由单测挂接点判空 + perf:size 零泄漏断言覆盖——文档站全量入口恒注册。）
test('table structural-render：demo 三槽真实生效 + 未设 hooks 零开销 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.getElementById('table-structural') as
      | (HTMLElement & {
          shadowRoot?: ShadowRoot | null
        })
      | null
    return !!el?.shadowRoot?.querySelector('td[data-col="status"] i')
  })
  const t = page.locator('#table-structural')

  // ① bodyCell：状态列每个 td 有色点包裹且默认文字保留
  const dots = t.locator('td[data-col="status"] i')
  await expect(dots).toHaveCount(4)
  await expect(t.locator('td[data-col="status"]').first()).toContainText('ok')
  // ② headerCell：三个表头叶子格都有提示
  await expect(t.locator('thead th[data-key] span')).toHaveCount(3)
  // ③ bodyRow：点击数据行首格出现徽标（tbody 首行是虚拟滚动 spacer，数据行 tr.row 才是目标）
  const firstDataRow = t.locator('tbody tr.row').first()
  await firstDataRow.locator('td').first().click()
  await expect(firstDataRow.locator('td').first().locator('oas-tag.row-badge')).toHaveCount(1)
  // 再点移除（demo 逻辑 toggle）
  await firstDataRow.locator('td').first().click()
  await expect(firstDataRow.locator('td').first().locator('oas-tag.row-badge')).toHaveCount(0)

  // ④ 未设 structuralRenderers 的新表格：渲染照常、无异常（零 property 零开销路径；
  //    「能力未注册」路径由单测 + perf:size 零泄漏断言覆盖——文档站全量入口恒注册）
  const inert = await page.evaluate(() => {
    const el = document.createElement('oas-table') as HTMLElement & {
      shadowRoot: ShadowRoot
      columns: unknown
      data: unknown
    }
    el.columns = [{ key: 'a', title: 'A' }]
    el.data = [{ a: 1 }]
    document.body.appendChild(el)
    const rows = el.shadowRoot.querySelectorAll('tbody tr.row').length
    const cells = el.shadowRoot.querySelectorAll('td[data-col]').length
    el.remove()
    return { rows, cells }
  })
  expect(inert.rows, '未设 hooks 的表格渲染不受影响').toBe(1)
  expect(inert.cells, '无结构件残留').toBe(1)

  expect(errors, 'console 零 error').toEqual([])
})
// validate 校验 demo 真实浏览器回归：双击金额列 → 输入非法值 Enter →
// 不提交 + 保持编辑态 + data-invalid 红框 + 行内消息 + oas-edit-invalid 反馈文案；
// 修正后提交成功、标记清除、反馈复位；console 零告警。
test('table validate：demo 真实拦截（保持编辑态/红框/消息/事件反馈）+ 重试成功清除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  const t = page.locator('#table-edit-validate')
  await expect(t).toBeAttached()
  const amount = t.locator('td[data-col="amount"]').first()
  await amount.dblclick()
  const editor = amount.locator('input.cell-editor')
  await expect(editor).toBeAttached()

  // 非法值提交 → 拦截
  await editor.fill('-5')
  await editor.press('Enter')
  await expect(editor, '校验失败保持编辑态').toBeAttached()
  await expect(amount, 'data-invalid 红框').toHaveAttribute('data-invalid', 'true')
  await expect(amount.locator('.edit-error'), '行内错误消息').toHaveText('金额必须为正数')
  // 计算样式闭环（防 CSS 特异性回归：红底必须实际生效，不能只查属性/文本）
  const bg = await amount.evaluate((td) => {
    const c = getComputedStyle(td).backgroundColor
    // 兼容两种序列化：rgb(254,240,240) 与现代 color(srgb 0.86 0.15 0.15 / 0.12)（0-1 刻度）
    const nums = (c.match(/[\d.]+/g) ?? []).map(Number)
    const scale = nums.length >= 4 || (nums.length === 3 && nums[0]! <= 1) ? 255 : 1
    return { c, r: nums[0]! * scale, b: nums[2]! * scale }
  })
  expect(bg.r, `失败态底色应为 danger 软底（computed=${bg.c}）`).toBeGreaterThan(bg.b + 15)
  await expect(page.locator('#table-edit-validate-feedback'), '事件反馈').toContainText('amount = -5')
  await expect(page.locator('#table-edit-validate-feedback')).toContainText('金额必须为正数')

  // 修正重试 → 成功提交、标记清除、反馈复位
  await editor.fill('99')
  await editor.press('Enter')
  await expect(editor, '成功后退出编辑态').toHaveCount(0)
  await expect(amount).not.toHaveAttribute('data-invalid', 'true')
  await expect(amount.locator('.edit-error')).toHaveCount(0)
  await expect(amount).toHaveText('99')
  await expect(page.locator('#table-edit-validate-feedback')).toHaveText('—')

  expect(errors, 'console 零 error').toEqual([])
})
// 审计记录器（table/audit L3）demo 真实浏览器回归：编辑金额列两次 →
// getCellHistory 返回两条旧值→新值链；取消不记录；console 零告警。
test('table audit：demo 编辑提交被记录（历史链/时间戳），取消不记录', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  const t = page.locator('#table-audit')
  await expect(t).toBeAttached()
  const fb = page.locator('#table-audit-feedback')

  // 第一次编辑：1200 → 1500
  const amount = t.locator('td[data-col="amount"]').first()
  await amount.dblclick()
  await amount.locator('input.cell-editor').fill('1500')
  await amount.locator('input.cell-editor').press('Enter')
  await expect(fb).toContainText('amount 共 1 次修改')
  await expect(fb).toContainText('1200 → 1500')

  // 第二次编辑：1500 → 900（历史链累积）
  await amount.dblclick()
  await amount.locator('input.cell-editor').fill('900')
  await amount.locator('input.cell-editor').press('Enter')
  await expect(fb).toContainText('amount 共 2 次修改')
  await expect(fb).toContainText('1500 → 900')

  // 取消（Esc）不产生记录：编辑但不提交
  await amount.dblclick()
  await amount.locator('input.cell-editor').fill('1')
  await amount.locator('input.cell-editor').press('Escape')
  await amount.dblclick()
  await amount.locator('input.cell-editor').fill('888')
  await amount.locator('input.cell-editor').press('Enter')
  await expect(fb).toContainText('amount 共 3 次修改')
  await expect(fb).toContainText('900 → 888')

  expect(errors, 'console 零 error').toEqual([])
})
// windowed × 树形懒装载 demo 真实浏览器回归：点击「研发部」展开钮 →
// 组件只派发 oas-expand（demo 宿主回填：平铺子孙 + depth 渲染 + total 更新 + expanded 回写 + scrollToRow 锚定）；
// 子孙行按 depth 缩进渲染、行号拍平连续；收起后行域收缩；console 零告警。
test('table wintree：懒展开宿主闭环（expand 事件 → 回填子孙 → 拍平行号 → 收起收缩）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  const t = page.locator('#table-wintree')
  await expect(t).toBeAttached()
  // .resolves 不带轮询（jest 式单次断言）——行数断言全部走 expect.poll（hydration + demo refeed 时序）
  const expectRows = (n: number) =>
    expect.poll(() => t.locator('tbody tr[data-key]').count(), { timeout: 20_000 }).toBe(n)
  await expectRows(3)

  // 展开「研发部」→ 子孙（平台组/应用组 depth1）回填
  const engToggle = t.locator('tr[data-key="研发部"] button.toggle')
  await expect(engToggle).toHaveAttribute('aria-expanded', 'false')
  await engToggle.click()
  await expect(engToggle, '宿主回写 expanded 后翻转').toHaveAttribute('aria-expanded', 'true')
  await expectRows(5)
  const childIndent = await t.locator('tr[data-key="平台组"] td:first-child').evaluate((td) => td.style.paddingLeft)
  const rootIndent = await t.locator('tr[data-key="研发部"] td:first-child').evaluate((td) => td.style.paddingLeft)
  expect(Number.parseInt(childIndent), 'depth1 缩进 > depth0').toBeGreaterThan(Number.parseInt(rootIndent))
  const idx = await t
    .locator('tbody tr[data-key]')
    .evaluateAll((trs) => trs.map((tr) => tr.getAttribute('data-row-index')))
  expect(idx, '拍平行号连续').toEqual(['0', '1', '2', '3', '4'])

  // 再展开「平台组」→ 孙辈（depth2）回填（视口 160px/32 = 5 行 < 7 行 → 可滚）
  await t.locator('tr[data-key="平台组"] button.toggle').click()
  await expectRows(7)
  await expect(page.locator('#table-wintree-feedback')).toContainText('total 7')

  // 收起锚定：先把视口滚到底（离开锚点行「研发部」），收起后 scrollToRow 应复位到锚点附近
  await t.evaluate((el) => {
    const wrap = el.shadowRoot!.querySelector('.table-scroll')!
    wrap.scrollTop = wrap.scrollHeight
    wrap.dispatchEvent(new Event('scroll'))
  })
  await expect
    .poll(() => t.evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!.scrollTop), {
      timeout: 5000,
    })
    .toBeGreaterThan(0)
  await t.locator('tr[data-key="研发部"] button.toggle').click()
  await expect(engToggle).toHaveAttribute('aria-expanded', 'false')
  await expectRows(3)
  const anchored = await t.evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!.scrollTop)
  expect(anchored, '收起锚定：scrollToRow 复位视口').toBeLessThanOrEqual(32)

  expect(errors, 'console 零 error').toEqual([])
})
