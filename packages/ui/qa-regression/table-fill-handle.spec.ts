// 复核回归：table 拖拽填充柄（fill-handle）——真指针拖拽 / 事务一次 / 开关 / 编辑抑制 / 暗色 token / RTL。
// 语义推导（序列/日期/循环）的纯函数与 happy-dom 机制链路由
// packages/ui/src/data/table/range/fill-series.test.ts 与 fill-handle.test.ts 固化；
// 本文件负责「用户视角」：真实鼠标拖拽可见反馈、暗色下菱形可见、开关按钮即时生效。

import { test, expect } from '@playwright/test'

const TABLE_PAGE = '/components/table.html'
const TABLE_ID = '#table-fill'

/** 读填充柄元素（穿透 open shadow root）；down 为按下点：柄盒中心向所在格中心内移 2px——
 * 柄越出格角 3px 悬挂（inset-inline-end/bottom: -3px），中心点恰压格边界/滚动裁剪线，
 * 真浏览器 hit-test 在边界点不稳定（最后一列选区实测按空）；内移后必落在柄盒内未被
 * 裁剪的格内侧象限，LTR/RTL 通用（方向由「指向格心」的向量天然给出）。定位基准取柄的
 * 父格（选区几何右下角），不依赖 td.range-focus——反向拖选时焦点角不是右下角 */
async function handleBox(page: import('@playwright/test').Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
    const handle = el.shadowRoot.querySelector<HTMLElement>('.range-fill-handle')
    if (!handle) return null
    const r = handle.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const corner = handle.closest<HTMLElement>('td[data-col]')
    let down = { x: cx, y: cy }
    if (corner) {
      const f = corner.getBoundingClientRect()
      const fx = f.left + f.width / 2
      const fy = f.top + f.height / 2
      const dx = fx - cx
      const dy = fy - cy
      const len = Math.hypot(dx, dy) || 1
      down = { x: cx + (dx / len) * 2, y: cy + (dy / len) * 2 }
    }
    return { x: cx, y: cy, down, label: handle.getAttribute('aria-label') }
  }, TABLE_ID)
}

/** 读数据行某字段（展示集行号） */
async function cellValue(page: import('@playwright/test').Page, row: number, col: string) {
  return page.evaluate(
    ({ sel, row, col }) => {
      const el = document.querySelector(sel) as unknown as { data: Array<Record<string, unknown>> }
      return el.data[row]?.[col]
    },
    { sel: TABLE_ID, row, col },
  )
}

async function cellBox(page: import('@playwright/test').Page, row: number, col: string) {
  return page.evaluate(
    ({ sel, row, col }) => {
      const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
      const tr = el.shadowRoot.querySelector<HTMLTableRowElement>(`tr[data-row-index="${row}"]`)!
      const td = [...tr.querySelectorAll<HTMLElement>('td[data-col]')].find((c) => c.getAttribute('data-col') === col)!
      const r = td.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    },
    { sel: TABLE_ID, row, col },
  )
}

test.describe('table 拖拽填充柄', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TABLE_PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(TABLE_ID, { state: 'attached', timeout: 15000 })
    await page.waitForFunction((sel) => (document.querySelector(sel) as HTMLElement)?.shadowRoot != null, TABLE_ID, {
      timeout: 15000,
    })
    // 程序化选中前两行（日期+序号区）：demo 按钮（真实点击走 Vue 事件通道）
    await page.click('#table-fill-select')
    await page.waitForFunction(
      (sel) =>
        !!(document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
          '.range-fill-handle',
        ),
      TABLE_ID,
      { timeout: 5000 },
    )
  })

  test('选区激活后手柄渲染：aria-hidden 指针专属入口 + 本地化 aria-label（zh 页）', async ({ page }) => {
    const box = await handleBox(page)
    expect(box?.label, '选中数值区后手柄在选区右下角渲染，aria-label 来自 i18n table.fillHandle').toBe('填充柄')
    const a11y = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
      const handle = el.shadowRoot.querySelector('.range-fill-handle')!
      return {
        role: handle.getAttribute('role'),
        hidden: handle.getAttribute('aria-hidden'),
        tabindex: handle.getAttribute('tabindex'),
      }
    }, TABLE_ID)
    expect(a11y.role).toBe('button')
    expect(a11y.hidden, 'v1 无键盘等价路径：对辅助技术隐藏不可操作的入口').toBe('true')
    expect(a11y.tabindex, '不假装键盘可达').toBeNull()
  })

  test('真指针拖拽：松开后填充提交且状态条可见反馈（一条写回事务）', async ({ page }) => {
    const handle = (await handleBox(page))!
    const target = await cellBox(page, 2, 'day')
    await page.mouse.move(handle.x, handle.y)
    await page.mouse.move(handle.down.x, handle.down.y)
    await page.mouse.down()
    // 分步移动触发实时预览（rAF 合帧），最后落在目标格
    await page.mouse.move(target.x, (handle.y + target.y) / 2, { steps: 4 })
    await page.mouse.move(target.x, target.y, { steps: 4 })
    await page.mouse.up()
    // auto 语义：日期按日步进 / 数值首差 / 文本循环（源 [2026-01-01,2026-01-04] / [1,5] / [张三,李四]）
    expect(await cellValue(page, 2, 'day'), '日期步进：拖一格得 2026-01-07').toBe('2026-01-07')
    expect(await cellValue(page, 2, 'seq'), '数值首差序列：1,5 → 9').toBe(9)
    expect(await cellValue(page, 2, 'owner'), '文本循环平铺：张三,李四 → 张三').toBe('张三')
    const status = await page.textContent('#table-fill-status')
    expect(status, '用户可见反馈：状态条报告填充格数').toContain('已填充 3 格')
  })

  test('拖回原点（无位移释放）不写入', async ({ page }) => {
    const handle = (await handleBox(page))!
    await page.mouse.move(handle.x, handle.y)
    await page.mouse.move(handle.down.x, handle.down.y)
    await page.mouse.down()
    await page.mouse.up()
    expect(await cellValue(page, 2, 'day'), '无位移释放：空格保持为空').toBe('')
    const status = await page.textContent('#table-fill-status')
    expect(status, '状态条不出现填充反馈').not.toContain('已填充')
  })

  test('拖拽中 Esc 取消：后续 pointerup 不写入', async ({ page }) => {
    const handle = (await handleBox(page))!
    const target = await cellBox(page, 2, 'day')
    await page.mouse.move(handle.x, handle.y)
    await page.mouse.move(handle.down.x, handle.down.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 4 })
    // Esc 经表格 keydown 取消填充（真实用户路径：焦点在格内按键冒泡到 shadowRoot——
    // 处理器以 td 为门禁，直接派发到 shadowRoot 会被 closest 门禁早退，故派发到源锚点格）
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
      const anchor = el.shadowRoot.querySelector('td.range-anchor') ?? el.shadowRoot.querySelector('td[data-col]')
      anchor!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    }, TABLE_ID)
    await page.mouse.up()
    expect(await cellValue(page, 2, 'day'), '取消后松开不写入').toBe('')
  })

  test('fill-handle="false" 即时移除手柄；恢复后回归', async ({ page }) => {
    await page.click('#table-fill-off')
    await page.waitForFunction(
      (sel) =>
        !(document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
          '.range-fill-handle',
        ),
      TABLE_ID,
      { timeout: 5000 },
    )
    const status = await page.textContent('#table-fill-status')
    expect(status).toContain('填充柄已关闭')
    await page.click('#table-fill-on')
    await page.waitForFunction(
      (sel) =>
        !!(document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
          '.range-fill-handle',
        ),
      TABLE_ID,
      { timeout: 5000 },
    )
  })

  test('编辑中手柄抑制：任一格挂 .cell-editor 时手柄消失', async ({ page }) => {
    // 直接在焦点格挂编辑器标记（编辑能力的 DOM 契约），childList 观察应实时移除手柄
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
      const focusTd = el.shadowRoot.querySelector('td.range-focus')!
      const editor = document.createElement('input')
      editor.className = 'cell-editor'
      focusTd.appendChild(editor)
    }, TABLE_ID)
    await page.waitForFunction(
      (sel) =>
        !(document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
          '.range-fill-handle',
        ),
      TABLE_ID,
      { timeout: 5000 },
    )
  })

  test('暗色主题：菱形角标以 token 主色可见（非透明、非黑底吞没）', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    const paint = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement & { shadowRoot: ShadowRoot }
      const handle = el.shadowRoot.querySelector<HTMLElement>('.range-fill-handle')!
      const style = getComputedStyle(handle, '::after')
      return { background: style.backgroundColor, width: parseFloat(style.width) }
    }, TABLE_ID)
    expect(paint.width, '菱形视觉尺寸：6px 命中区内 ::after 由 inset:1px 派生 4px（基态）').toBe(4)
    expect(paint.width).toBeLessThanOrEqual(8)
    expect(paint.background, 'token 主色填充（dark 变体非透明）').not.toBe('rgba(0, 0, 0, 0)')
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
  })

  test('RTL：dir=rtl 下手柄仍在（inline-end 镜像）且向下拖拽照常填充', async ({ page }) => {
    await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement).setAttribute('dir', 'rtl'), TABLE_ID)
    const handle = (await handleBox(page))!
    expect(handle.label, 'RTL 下手柄不消失且本地化标签仍在').toBe('填充柄')
    const target = await cellBox(page, 2, 'seq')
    await page.mouse.move(handle.x, handle.y)
    await page.mouse.move(handle.down.x, handle.down.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 4 })
    await page.mouse.up()
    expect(await cellValue(page, 2, 'seq'), 'RTL 纵向拖拽填充不受镜像影响').toBe(9)
    // 横向镜像（视觉左 = DOM 下一列）留给人工截图复核，机制由 direction 推导与 DOM 列序保证
  })
})
