// 复核回归：workbench 悬浮面板 oas-floating-panel。
// 固化点：真实拖拽/八向缩放/受控回写、两面板置前与 z 恒定（不随 open 次数增长）、
// 子浮层 Esc 优先级、受控开合与 before-close 拦截、键盘等价路径（含 RTL）、边界夹取、
// initial-focus、coarse 44px 热区、dark、reduced-motion、axe、console 零告警。
//
// 文档页所有 demo 默认打开；Esc 由「最前」面板消费，故每个用例先关掉与本次无关的面板，
// 避免别的前景面板抢走 Esc（这是正确语义，非缺陷）。

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fileURLToPath } from 'node:url'
import { up } from './helpers'

/** packages/ui/dist/cdn.js：自包含构建产物，独立 fixture 页可直接加载（不依赖文档站模块图） */
const builtCdn = fileURLToPath(new URL('../dist/cdn.js', import.meta.url))

type ConsolePage = import('@playwright/test').Page & { __oasConsole: string[] }
type PanelEl = HTMLElement & { show(): void; close(): boolean; bringToFront(): void }

test.beforeEach(async ({ page }) => {
  const p = page as ConsolePage
  p.__oasConsole = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    if (/_ga_RXS142HBXF|Google Analytics|gtag/.test(msg.text())) return
    p.__oasConsole.push(`${msg.type()}: ${msg.text()}`)
  })
})

/** 打开页面并只保留指定面板（其余 demo 面板关闭，避免抢 Esc / 焦点） */
async function gotoPage(page: import('@playwright/test').Page, keep: string | string[] = '#fp-basic') {
  const keepIds = Array.isArray(keep) ? keep : [keep]
  await page.goto('/components/floating-panel.html', { waitUntil: 'domcontentloaded' })
  await up(page, keepIds[0]!)
  await page.evaluate((ids) => {
    for (const el of document.querySelectorAll<PanelEl>('oas-floating-panel')) {
      if (el.id && ids.includes(`#${el.id}`)) continue
      if (el.hasAttribute('open')) el.close()
    }
  }, keepIds)
}

/** 独立真实页面：路由一条空 HTML（全新 document + custom element registry）再加载真实构建产物。
 *
 * 不能用「`/404.html` + `setContent`」：文档站 `app.js` 已注册全部组件（CDN import 被跳过的同时
 * 组件来自文档 bundle），而且 `document.open()` 不重置 registry——fixture 会静默用上文档 bundle，
 * 不是 dist 产物。真实导航到路由空页才有干净 registry。 */
async function openIsolatedPage(page: import('@playwright/test').Page, body: string): Promise<void> {
  await page.route('**/__qa_floating_cdn__/**', (route) =>
    route.fulfill({ path: builtCdn, contentType: 'text/javascript' }),
  )
  await page.route('**/__qa_floating_page__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="zh-CN"><body style="margin:0;padding:0">${body}<script type="module">import '/__qa_floating_cdn__/cdn.js'</script></body></html>`,
    }),
  )
  await page.goto('/__qa_floating_page__')
  await page.waitForFunction(() => customElements.get('oas-floating-panel') != null)
}

/** 读取面板框体几何（视口坐标） */
function frameBox(page: import('@playwright/test').Page, id: string) {
  return page.evaluate((panelId) => {
    const host = document.getElementById(panelId)!
    const frame = host.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const r = frame.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, id)
}

/** 在 shadow 内目标中心发起真实指针拖拽（先滚入视口中央） */
async function dragShadow(
  page: import('@playwright/test').Page,
  id: string,
  target: { part: 'titlebar' } | { part: 'handle'; edge: string },
  dx: number,
  dy: number,
): Promise<void> {
  const point = await page.evaluate(
    ({ panelId, target }) => {
      const host = document.getElementById(panelId)!
      const root = host.shadowRoot!
      const el =
        target.part === 'titlebar'
          ? root.querySelector<HTMLElement>('[part="titlebar"]')
          : root.querySelector<HTMLElement>(`[part="handle"][data-edge="${target.edge}"]`)
      el!.scrollIntoView({ block: 'center' })
      const r = el!.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    },
    { panelId: id, target },
  )
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 8 })
  await page.mouse.up()
}

const rectAttr = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((panelId) => document.getElementById(panelId)!.getAttribute('rect'), id)

const panelOpen = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((panelId) => document.getElementById(panelId)!.hasAttribute('open'), id)

test('基础渲染与语义：标题/位置/关闭钮/dialog 语义', async ({ page }) => {
  await gotoPage(page)
  const state = await page.evaluate(() => {
    const host = document.getElementById('fp-basic')!
    const root = host.shadowRoot!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const title = root.querySelector<HTMLElement>('[part="title"]')!
    const labelledby = frame.getAttribute('aria-labelledby')
    return {
      role: frame.getAttribute('role'),
      ariaModal: frame.getAttribute('aria-modal'),
      labelledby,
      // labelledby 必须指向真实存在的标题元素（悬空 IDREF 等于没有名称）
      labelledbyResolves: labelledby != null && root.getElementById(labelledby) === title,
      titleId: title.id,
      title: title.textContent?.trim(),
      closeLabel: root.querySelector('[part="close"]')!.getAttribute('aria-label'),
      handles: root.querySelectorAll('[part="handle"]').length,
      display: getComputedStyle(host).display,
    }
  })
  expect(state.role).toBe('dialog')
  expect(state.ariaModal).toBe('false')
  expect(state.title).toBe('图层')
  expect(state.labelledby, 'aria-labelledby 指向标题元素').toBe(state.titleId)
  expect(state.labelledbyResolves, 'labelledby 指向真实 title id').toBe(true)
  expect(state.closeLabel, '关闭钮有可访问名称').toBe('关闭面板')
  expect(state.handles).toBe(8)
  expect(state.display).not.toBe('none')
  const box = await frameBox(page, 'fp-basic')
  expect(box.width).toBeCloseTo(380, 0)
  expect(box.height).toBeCloseTo(230, 0)

  // 关闭钮：真实点击 → 宿主 hidden（display:none 零几何）
  await page.evaluate(() =>
    (document.getElementById('fp-basic')!.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click(),
  )
  await expect.poll(() => panelOpen(page, 'fp-basic')).toBe(false)
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('fp-basic')!).display)).toBe('none')
})

/** 读取面板可访问名称相关状态（真实浏览器 aria 属性 + 标题文本） */
function nameState(page: import('@playwright/test').Page, id: string) {
  return page.evaluate((panelId) => {
    const root = document.getElementById(panelId)!.shadowRoot!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const title = root.querySelector<HTMLElement>('[part="title"]')!
    const labelledby = frame.getAttribute('aria-labelledby')
    return {
      label: frame.getAttribute('aria-label'),
      labelledby,
      labelledbyResolves: labelledby != null && root.getElementById(labelledby) === title,
      titleText: title.textContent?.trim() ?? '',
      closeLabel: root.querySelector('[part="close"]')!.getAttribute('aria-label'),
    }
  }, id)
}

test('无标题面板：aria-label 回落 i18n 名称、无悬空 labelledby', async ({ page }) => {
  await gotoPage(page, '#fp-plain')
  const state = await nameState(page, 'fp-plain')
  expect(state.labelledby, '无标题时不得写 labelledby').toBeNull()
  expect(state.label, '回落 i18n 名称').toBe('悬浮面板')
  expect(state.titleText, '标题区无内容').toBe('')
  expect(state.closeLabel).toBe('关闭面板')
})

test('title 插槽动态清空 / 填回：labelledby 与 aria-label 正确切换', async ({ page }) => {
  await gotoPage(page, '#fp-slot')
  expect((await nameState(page, 'fp-slot')).labelledbyResolves, '初始富标题走 labelledby').toBe(true)

  // 清空 title 插槽（宿主移除节点）：真实浏览器会派发 slotchange
  await page.evaluate(() => {
    document.getElementById('fp-slot')!.querySelector('[slot="title"]')!.remove()
  })
  await expect
    .poll(async () => (await nameState(page, 'fp-slot')).labelledby, { message: '清空后不保留 labelledby' })
    .toBeNull()
  expect((await nameState(page, 'fp-slot')).label, '清空后回落 i18n 名称').toBe('悬浮面板')

  // 重新填入：切回 labelledby
  await page.evaluate(() => {
    const host = document.getElementById('fp-slot')!
    const span = document.createElement('span')
    span.setAttribute('slot', 'title')
    span.textContent = '恢复标题'
    span.style.minHeight = '48px'
    host.appendChild(span)
  })
  await expect
    .poll(async () => (await nameState(page, 'fp-slot')).labelledbyResolves, { message: '填回后 labelledby 生效' })
    .toBe(true)
  expect((await nameState(page, 'fp-slot')).label).toBeNull()
})

test('真实拖拽标题移动：rect 提交 + oas-move 可见反馈', async ({ page }) => {
  await gotoPage(page)
  expect(await rectAttr(page, 'fp-basic')).toBe('0,0,380,230')
  await dragShadow(page, 'fp-basic', { part: 'titlebar' }, 60, 40)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('60,40,380,230')
  await expect(page.locator('#fp-basic-out')).toContainText('oas-move')
  await expect(page.locator('#fp-basic-out')).toContainText('60,40,380,230')
  const box = await frameBox(page, 'fp-basic')
  expect(box.width).toBeCloseTo(380, 0)
})

test('四边 / 四角缩放：se 放大、w 左扩、n 上扩', async ({ page }) => {
  await gotoPage(page)
  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'se' }, 40, 30)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('0,0,420,260')
  await expect(page.locator('#fp-basic-out')).toContainText('oas-resize')
  await expect(page.locator('#fp-basic-out')).toContainText('edge=se')

  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'w' }, -30, 0)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('-30,0,450,260')

  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'n' }, 0, -20)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('-30,-20,450,280')
})

test('富标题 48px：上侧/上角手柄带可命中，顶边拖拽可缩放', async ({ page }) => {
  await gotoPage(page, '#fp-slot')
  // 等 ResizeObserver 把实测标题栏高度写回 host token（关闭态/初测 0 不写）
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const host = document.getElementById('fp-slot')!
          const value = Number.parseFloat(
            getComputedStyle(host).getPropertyValue('--oas-floating-panel-titlebar-height'),
          )
          return Number.isFinite(value) ? value : 0
        }),
      { message: '富标题实测高度写回 token' },
    )
    .toBeGreaterThan(40)

  const probe = await page.evaluate(() => {
    const host = document.getElementById('fp-slot')!
    host.scrollIntoView({ block: 'center' })
    const root = host.shadowRoot!
    const bar = root.querySelector<HTMLElement>('[part="titlebar"]')!
    const br = bar.getBoundingClientRect()
    const centerOf = (edge: string) => {
      const el = root.querySelector<HTMLElement>(`[part="handle"][data-edge="${edge}"]`)!
      const r = el.getBoundingClientRect()
      const point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      const hit = root.elementFromPoint(point.x, point.y) as HTMLElement | null
      return {
        top: r.top,
        hitPart: hit?.closest('[part]')?.getAttribute('part') ?? null,
        hitEdge: hit?.closest<HTMLElement>('[part="handle"]')?.dataset.edge ?? null,
      }
    }
    return {
      barHeight: br.height,
      barBottom: br.bottom,
      n: centerOf('n'),
      ne: centerOf('ne'),
      nw: centerOf('nw'),
    }
  })
  expect(probe.barHeight, '富标题撑高标题栏').toBeGreaterThan(40)
  for (const edge of ['n', 'ne', 'nw'] as const) {
    expect(probe[edge].hitPart, `${edge} 手柄带命中手柄（实测 ${JSON.stringify(probe[edge])}）`).toBe('handle')
    expect(probe[edge].hitEdge).toBe(edge)
    expect(probe[edge].top, `${edge} 手柄从标题栏下沿起算`).toBeGreaterThanOrEqual(probe.barBottom - 1.5)
  }

  // 顶边拖拽：真实指针 resize（修复前手柄被标题栏盖住，这里完全不响应）
  await dragShadow(page, 'fp-slot', { part: 'handle', edge: 'n' }, 0, -20)
  await expect
    .poll(
      async () => {
        const rect = (await rectAttr(page, 'fp-slot'))!.split(',').map(Number)
        // Firefox 的指针坐标在分数像素边缘会差 1px：断言「向上扩了约 20px」而非精确值
        return Math.abs(rect[1]! + 20) <= 2 && Math.abs(rect[3]! - 190) <= 2 && rect[0] === 0 && rect[2] === 340
      },
      { message: '顶边拖拽提交 resize（y/height 变化约 20px）' },
    )
    .toBe(true)
  await expect(page.locator('#fp-slot-out')).toContainText('oas-resize')
})

test('受控回写：拖拽事件后宿主把 rect 吸附到 10px 网格', async ({ page }) => {
  await gotoPage(page, '#fp-drag')
  await dragShadow(page, 'fp-drag', { part: 'titlebar' }, 13, 17)
  await expect.poll(() => rectAttr(page, 'fp-drag')).toBe('10,20,320,190')
  await expect(page.locator('#fp-drag-out')).toContainText('宿主回写 rect="10,20,320,190"')
})

test('受控开合与 before-close 拦截：show/close/关闭钮/Esc', async ({ page }) => {
  await gotoPage(page, '#fp-ctrl')

  // close() 放行 → 关闭 + open-change 反馈
  await page.locator('#fp-close').click()
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(false)
  await expect(page.locator('#fp-ctrl-out')).toContainText('oas-open-change')
  await expect(page.locator('#fp-ctrl-out')).toContainText('open=false')

  // show() → 重新打开（open-change 可见反馈）
  await page.locator('#fp-open').click()
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(true)
  await expect(page.locator('#fp-ctrl-out')).toContainText('open=true')

  // 拦截关闭：关闭钮不发 open-change、保持打开
  await page.locator('#fp-veto').check()
  await page.evaluate(() =>
    (document.getElementById('fp-ctrl')!.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click(),
  )
  await expect(page.locator('#fp-ctrl-out')).toContainText('preventDefault')
  expect(await panelOpen(page, 'fp-ctrl'), 'before-close 否决后保持打开').toBe(true)

  // 取消拦截后 Esc 关闭
  await page.locator('#fp-veto').uncheck()
  await page.mouse.click(5, 5)
  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(false)
  await expect(page.locator('#fp-ctrl-out')).toContainText('reason=esc')
})

test('两面板置前 + z-index 不随 open 次数增长（恒定两档）', async ({ page }) => {
  await gotoPage(page, ['#fp-a', '#fp-b'])
  const zOf = (id: string) =>
    page.evaluate((panelId) => {
      const frame = document.getElementById(panelId)!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
      return Number(getComputedStyle(frame).zIndex)
    }, id)

  // 点击 A → A 置前 + 可见反馈
  await page.evaluate(() => document.getElementById('fp-a')!.scrollIntoView({ block: 'center' }))
  const a = await frameBox(page, 'fp-a')
  await page.mouse.click(a.x + 20, a.y + 12)
  await expect(page.locator('#fp-front-out')).toContainText('fp-a 置前')
  expect(await zOf('fp-a')).toBeGreaterThan(await zOf('fp-b'))

  // 点击 B 未被 A 遮挡的区域 → B 置前
  const b = await frameBox(page, 'fp-b')
  await page.mouse.click(b.x + b.width - 20, b.y + b.height - 12)
  await expect(page.locator('#fp-front-out')).toContainText('fp-b 置前')
  expect(await zOf('fp-b')).toBeGreaterThan(await zOf('fp-a'))

  // open/close 反复 10 轮：z 只出现两个值（不增长）
  const seen = await page.evaluate(() => {
    const el = document.getElementById('fp-a') as PanelEl
    const frame = el.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const values = new Set<string>()
    for (let i = 0; i < 10; i++) {
      el.show()
      values.add(getComputedStyle(frame).zIndex)
      el.close()
      values.add(getComputedStyle(frame).zIndex)
    }
    return [...values]
  })
  expect(seen).toHaveLength(2)
})

test('子浮层 Esc 优先级：先关 dropdown、再关面板', async ({ page }) => {
  await gotoPage(page, '#fp-nest')
  const dropdownOpen = () => page.evaluate(() => document.getElementById('fp-nest-dd')!.hasAttribute('open'))

  await page.locator('#fp-nest oas-dropdown oas-button').click()
  await expect.poll(dropdownOpen).toBe(true)
  await expect(page.locator('#fp-nest-out')).toContainText('dropdown open=true')

  await page.keyboard.press('Escape')
  await expect.poll(dropdownOpen).toBe(false)
  expect(await panelOpen(page, 'fp-nest'), '第一次 Esc 只关子浮层').toBe(true)
  await expect(page.locator('#fp-nest-out')).toContainText('dropdown open=false')

  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-nest')).toBe(false)
})

test('Esc 顺序跟随置前：A 开、B 开、点 A 置前后 Esc 关闭 A', async ({ page }) => {
  await gotoPage(page, ['#fp-a', '#fp-b'])
  await page.evaluate(() => document.getElementById('fp-a')!.scrollIntoView({ block: 'center' }))
  const a = await frameBox(page, 'fp-a')
  await page.mouse.click(a.x + 20, a.y + 12)
  await expect(page.locator('#fp-front-out')).toContainText('fp-a 置前')

  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-a'), 'Esc 关闭刚置前的 A').toBe(false)
  expect(await panelOpen(page, 'fp-b'), 'B 保持打开').toBe(true)

  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-b')).toBe(false)
})

test('首帧即打开的单个面板落在最前档（+1）：页面只有该面板', async ({ page }) => {
  // 真实场景：HTML 里只有一块 open 面板，upgrade 时即为「首帧打开」，不调用 close() 清场
  await openIsolatedPage(
    page,
    `<div style="position:relative;min-height:240px">
      <oas-floating-panel id="fp-first" open panel-title="首帧面板" rect="20,20,300,160">
        <p style="margin:0">页面只有这一块面板。</p>
      </oas-floating-panel>
    </div>`,
  )
  await up(page, '#fp-first')
  const state = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('oas-floating-panel')]
    const frame = document.getElementById('fp-first')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const cs = getComputedStyle(frame)
    const num = (name: string, fallback: number) => {
      const value = Number.parseFloat(cs.getPropertyValue(name))
      return Number.isFinite(value) ? value : fallback
    }
    return {
      panels: panels.length,
      openPanels: panels.filter((el) => el.hasAttribute('open')).length,
      actual: Number(cs.zIndex),
      expected: num('--oas-z-index-base', 0) + num('--oas-z-overlay', 1040) + 1,
    }
  })
  expect(state.panels, '页面只有首帧打开的那一块面板').toBe(1)
  expect(state.openPanels).toBe(1)
  expect(state.actual, `首帧打开的计算 z（实际 ${state.actual}，期望 ${state.expected}）`).toBe(state.expected)
})

test('断开期间改 open：不残留幽灵 Esc 层，Esc 仍关闭可见面板；重连补齐', async ({ page }) => {
  await gotoPage(page, '#fp-a')
  // B 断开后再打开：旧实现会把 Esc 层压进 document 栈，一次 Esc 被不可见面板吞掉
  await page.evaluate(() => {
    const b = document.getElementById('fp-b')!
    const parent = b.parentElement!
    b.remove()
    b.setAttribute('open', '')
    ;(window as unknown as { __fpB?: { b: HTMLElement; parent: Element } }).__fpB = { b, parent }
  })
  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-a'), 'Esc 关闭可见的 A，而非吞进断开面板').toBe(false)

  // 重连：onReconnect 补齐 Esc 层与最前层级，再按一次 Esc 关闭 B
  await page.evaluate(() => {
    const stored = (window as unknown as { __fpB?: { b: HTMLElement; parent: Element } }).__fpB!
    stored.parent.appendChild(stored.b)
  })
  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-b')).toBe(false)
})

test('键盘等价路径：方向键移动 / Shift+方向键缩放 / RTL 镜像', async ({ page }) => {
  await gotoPage(page, ['#fp-key', '#fp-rtl'])
  // 首帧即打开不抢焦点；关闭后 show 走 opened 边沿 → initial-focus 生效
  await page.evaluate(() => {
    const el = document.getElementById('fp-key') as PanelEl
    el.close()
    el.show()
  })
  await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toBe('fp-key-target')

  // 聚焦面板框体后方向键移动
  await page.evaluate(() =>
    (document.getElementById('fp-key')!.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus(),
  )
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => rectAttr(page, 'fp-key')).toBe('8,0,340,190')
  await expect(page.locator('#fp-key-out')).toContainText('oas-move（keyboard）')
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => rectAttr(page, 'fp-key')).toBe('8,0,340,198')

  // RTL：ArrowRight 朝书写前进方向（x 减小）
  await page.evaluate(() =>
    (document.getElementById('fp-rtl')!.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus(),
  )
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => rectAttr(page, 'fp-rtl')).toBe('-8,0,320,170')
})

test('边界夹取：拖出虚线框仍停在边界内（boundary + padding）', async ({ page }) => {
  await gotoPage(page, '#fp-bound')
  const bounds = await page.evaluate(() => {
    const el = document.getElementById('fp-bounds')!
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  expect(bounds.width, '演示边界容器有真实宽度').toBeGreaterThan(300)
  await dragShadow(page, 'fp-bound', { part: 'titlebar' }, 500, 300)
  const rect = (await rectAttr(page, 'fp-bound'))!.split(',').map(Number)
  expect(rect[0], '确实发生了拖动（未被夹在起点）').toBeGreaterThan(16)
  expect(rect[1]).toBeGreaterThan(16)
  expect(rect[0]).toBeGreaterThanOrEqual(8)
  expect(rect[1]).toBeGreaterThanOrEqual(8)
  expect(rect[0], 'X 被夹在边界内（左边 + padding）').toBeLessThanOrEqual(bounds.width - 260 - 8)
  expect(rect[1], 'Y 被夹在边界内（上边 + padding）').toBeLessThanOrEqual(bounds.height - 180 - 8)
  await expect(page.locator('#fp-bound-out')).toContainText('oas-move')
})

test('dark 主题 + reduced-motion + console 零告警', async ({ page }) => {
  await gotoPage(page)
  const bgOf = () =>
    page.evaluate(() => {
      const frame = document.getElementById('fp-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
      return getComputedStyle(frame).backgroundColor
    })
  const lightBg = await bgOf()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect.poll(bgOf, { timeout: 2000 }).not.toBe(lightBg)
  const darkBg = await bgOf()
  expect(darkBg, '暗色下表面色随 token 变化').not.toBe(lightBg)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const transition = await page.evaluate(() => {
    const close = document.getElementById('fp-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    return getComputedStyle(close).transitionDuration
  })
  expect(parseFloat(transition), `reduced-motion 下过渡降级（实测 ${transition}）`).toBeLessThan(0.001)

  expect((page as ConsolePage).__oasConsole).toEqual([])
})

test('forced-colors：框体与关闭钮焦点环真实可见（outline 兜底）', async ({ page }) => {
  await gotoPage(page, '#fp-basic')
  await page.emulateMedia({ forcedColors: 'active' })
  await page.evaluate(() => {
    const host = document.getElementById('fp-basic')!
    host.scrollIntoView({ block: 'center' })
    ;(host.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus()
  })
  // 键盘 Tab 触发 :focus-visible（脚本聚焦不保证匹配），真实读计算样式
  await page.keyboard.press('Tab')
  const read = (part: 'close' | 'frame') =>
    page.evaluate((target) => {
      const root = document.getElementById('fp-basic')!.shadowRoot!
      const el = root.querySelector<HTMLElement>(`[part="${target}"]`)!
      const cs = getComputedStyle(el)
      return {
        focused: root.activeElement === el,
        focusVisible: el.matches(':focus-visible'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: Number.parseFloat(cs.outlineWidth),
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
      }
    }, part)

  const closeState = await read('close')
  expect(closeState.focused, 'Tab 进入关闭钮').toBe(true)
  expect(closeState.focusVisible).toBe(true)
  expect(closeState.outlineStyle, '强制色下关闭钮 outline 兜底').toBe('solid')
  expect(closeState.outlineWidth).toBeGreaterThanOrEqual(2)
  expect(closeState.outlineColor).not.toMatch(/transparent|rgba\(0, 0, 0, 0\)/)

  await page.keyboard.press('Shift+Tab')
  const frameState = await read('frame')
  expect(frameState.focused, 'Shift+Tab 回到框体').toBe(true)
  expect(frameState.focusVisible).toBe(true)
  expect(frameState.outlineStyle, '强制色下框体 outline 兜底').toBe('solid')
  expect(frameState.outlineWidth).toBeGreaterThanOrEqual(2)
  expect(frameState.boxShadow, 'box-shadow 被系统禁用，只剩 outline').toBe('none')
})

test('焦点在嵌套组件 shadow 内时关闭：焦点归还打开前元素（不丢到 body）', async ({ page }) => {
  await gotoPage(page, '#fp-nest')
  const result = await page.evaluate(async () => {
    const panel = document.getElementById('fp-nest') as PanelEl
    // 面板外的原生控件作为「打开前焦点」基线（自定义元素宿主不自带焦点语义）
    const outside = document.getElementById('fp-veto') as HTMLElement
    // 关闭后由宿主重新打开，确保建立「打开前焦点」基线（首帧即打开不建基线）
    panel.close()
    outside.focus()
    panel.show()

    // 面板内容里的真实嵌套组件：oas-button 的内层 <button> 在它自己的 shadow root 内
    const button = panel.querySelector('oas-button')!
    const inner = button.shadowRoot!.querySelector<HTMLElement>('button')!
    const deep = (): Element | null => {
      let active: Element | null = document.activeElement
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
      return active
    }
    inner.focus()
    const beforeClose = deep() === inner
    panel.close()
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    return {
      beforeClose,
      outsideStillInDoc: outside.isConnected,
      activeId: document.activeElement?.id ?? '',
      focusReturned: document.activeElement === outside,
    }
  })
  expect(result.beforeClose, '焦点确实进入嵌套组件 shadow').toBe(true)
  expect(result.outsideStillInDoc, '打开前焦点元素仍在文档内').toBe(true)
  expect(
    result.focusReturned,
    `关闭后焦点回到打开前按钮（实际 activeElement id=${JSON.stringify(result.activeId)}）`,
  ).toBe(true)
})

test('嵌套组件 shadow 内焦点：close() 后回到打开前元素（独立 CDN 页面 + 焦点已收敛）', async ({ page }) => {
  await openIsolatedPage(
    page,
    `<button id="fp-outside">outside</button>
    <div style="position:relative;min-height:220px">
      <oas-floating-panel id="fp-deep" rect="10,10,300,160"><oas-button>深一层</oas-button></oas-floating-panel>
    </div>`,
  )
  await up(page, '#fp-deep')
  await page.waitForFunction(() => document.querySelector('oas-button')?.shadowRoot?.querySelector('button') != null)
  const result = await page.evaluate(async () => {
    const panel = document.getElementById('fp-deep') as PanelEl
    const outside = document.getElementById('fp-outside') as HTMLElement
    const deep = (): Element | null => {
      let active: Element | null = document.activeElement
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
      return active
    }
    outside.focus()
    panel.show()
    // 真实嵌套组件：oas-button 的内层 <button> 在它自己的 shadow root 内（跨一层组合边界）
    const inner = panel.querySelector('oas-button')!.shadowRoot!.querySelector<HTMLElement>('button')!
    inner.focus()
    const entered = deep() === inner
    panel.close()
    // 等焦点修正（浏览器在下一帧把隐藏子树里的焦点修正掉）：修复前这里会落到 body
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    return {
      entered,
      returned: document.activeElement === outside,
      active: `${document.activeElement?.tagName}#${document.activeElement?.id ?? ''}`,
    }
  })
  expect(result.entered, '焦点确实进入嵌套组件 shadow').toBe(true)
  expect(result.returned, `关闭后焦点回到打开前按钮（实际 ${result.active}）`).toBe(true)
})

test('axe：面板无 critical/serious 违规（含无标题 / 内容溢出面板）', async ({ page }) => {
  await gotoPage(page, ['#fp-basic', '#fp-ctrl', '#fp-nest', '#fp-plain', '#fp-scroll'])
  const results = await new AxeBuilder({ page })
    .include('#fp-basic')
    .include('#fp-ctrl')
    .include('#fp-nest')
    .include('#fp-plain')
    .include('#fp-scroll')
    .analyze()
  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  // 内容溢出时滚动区必须键盘可达（溢出 demo 真溢出，不允许靠缩内容规避）
  expect(
    results.violations.filter((v) => v.id === 'scrollable-region-focusable').map((v) => v.id),
    'axe scrollable-region-focusable 零违规',
  ).toEqual([])
})

test('内容溢出：滚动区可 Tab 聚焦并键盘滚动；不溢出时无 Tab 停靠点', async ({ page }) => {
  await gotoPage(page, ['#fp-scroll', '#fp-ctrl'])

  const contentState = (id: string) =>
    page.evaluate((panelId) => {
      const content = document.getElementById(panelId)!.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!
      return {
        tabindex: content.getAttribute('tabindex'),
        scrollTop: content.scrollTop,
        scrollHeight: content.scrollHeight,
        clientHeight: content.clientHeight,
      }
    }, id)

  // 不溢出的面板不占 Tab 位（不留空停靠点）
  expect((await contentState('fp-ctrl')).tabindex, '不溢出无 tabindex').toBeNull()

  // 内容变化检测：不改 rect，追加高内容块后自动补 tabindex；移除后回退
  await page.evaluate(() => {
    const ctrl = document.getElementById('fp-ctrl')!
    const block = document.createElement('div')
    block.id = 'fp-ctrl-extra'
    block.style.height = '600px'
    block.textContent = '追加的高内容块'
    ctrl.appendChild(block)
  })
  await expect
    .poll(async () => (await contentState('fp-ctrl')).tabindex, { message: '内容变高后补 tabindex' })
    .toBe('0')
  await page.evaluate(() => document.getElementById('fp-ctrl-extra')!.remove())
  await expect
    .poll(async () => (await contentState('fp-ctrl')).tabindex, { message: '内容移除后撤 tabindex' })
    .toBeNull()

  const overflowing = await contentState('fp-scroll')
  expect(
    overflowing.scrollHeight,
    `溢出 demo 必须真实溢出（scrollHeight ${overflowing.scrollHeight} / clientHeight ${overflowing.clientHeight}）`,
  ).toBeGreaterThan(overflowing.clientHeight + 1)
  expect(overflowing.tabindex, '溢出时补 tabindex=0').toBe('0')

  // 真实键盘路径：框体聚焦后 Tab（关闭钮 → 内容区）
  await page.evaluate(() => {
    const host = document.getElementById('fp-scroll')!
    host.scrollIntoView({ block: 'center' })
    ;(host.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus()
  })
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => {
    let active: Element | null = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return { part: active?.getAttribute('part') ?? null, ring: active ? getComputedStyle(active).boxShadow : 'none' }
  })
  expect(focused.part, '键盘 Tab 落到内容滚动区').toBe('content')
  expect(focused.ring, '焦点环可见（复用 --oas-focus-ring，不新增颜色）').not.toBe('none')

  const before = (await contentState('fp-scroll')).scrollTop
  await page.keyboard.press('PageDown')
  await expect
    .poll(async () => (await contentState('fp-scroll')).scrollTop, { message: '键盘可直接滚动内容区' })
    .toBeGreaterThan(before)

  // 放大到内容不再溢出：tabindex 移除（不留下永久 Tab 停靠点）
  await page.evaluate(() => document.getElementById('fp-scroll')!.setAttribute('rect', '0,0,320,420'))
  await expect
    .poll(async () => (await contentState('fp-scroll')).tabindex, { message: '不再溢出时移除 tabindex' })
    .toBeNull()
  expect((await contentState('fp-scroll')).scrollHeight).toBeLessThanOrEqual(
    (await contentState('fp-scroll')).clientHeight + 1,
  )

  // 缩回溢出尺寸：tabindex 重新补上（判定随布局变化）
  await page.evaluate(() => document.getElementById('fp-scroll')!.setAttribute('rect', '0,0,320,200'))
  await expect
    .poll(async () => (await contentState('fp-scroll')).tabindex, { message: '再次溢出时补回 tabindex' })
    .toBe('0')

  // 关闭态：不可见滚动区不留 Tab 停靠点；重开按实测复判
  await page.evaluate(() => document.getElementById('fp-scroll')!.removeAttribute('open'))
  await expect
    .poll(async () => (await contentState('fp-scroll')).tabindex, { message: '关闭时移除 tabindex' })
    .toBeNull()
  await page.evaluate(() => document.getElementById('fp-scroll')!.setAttribute('open', ''))
  await expect.poll(async () => (await contentState('fp-scroll')).tabindex, { message: '重开复判（仍溢出）' }).toBe('0')
})

test.describe('coarse 指针热区', () => {
  test.use({ hasTouch: true, isMobile: true })
  test.skip(({ browserName }) => browserName !== 'chromium', 'pointer: coarse 仅在 Chromium 移动仿真下可验证')

  test('手柄与关闭钮 44px 触控热区', async ({ page }) => {
    await gotoPage(page)
    const sizes = await page.evaluate(() => {
      const root = document.getElementById('fp-basic')!.shadowRoot!
      const handle = root.querySelector<HTMLElement>('[part="handle"][data-edge="se"]')!
      const close = root.querySelector<HTMLElement>('[part="close"]')!
      const hr = handle.getBoundingClientRect()
      const cr = close.getBoundingClientRect()
      return { handle: { w: hr.width, h: hr.height }, close: { w: cr.width, h: cr.height } }
    })
    expect(sizes.handle.w).toBeGreaterThanOrEqual(44)
    expect(sizes.handle.h).toBeGreaterThanOrEqual(44)
    expect(sizes.close.w).toBeGreaterThanOrEqual(44)
    expect(sizes.close.h).toBeGreaterThanOrEqual(44)
  })

  test('标题栏/关闭钮不被 44px 手柄覆盖：真实触摸拖动可移动、点关闭可关闭', async ({ page }) => {
    await gotoPage(page)
    const probe = await page.evaluate(() => {
      const host = document.getElementById('fp-basic')!
      host.scrollIntoView({ block: 'center' })
      const root = host.shadowRoot!
      const bar = root.querySelector<HTMLElement>('[part="titlebar"]')!
      const close = root.querySelector<HTMLElement>('[part="close"]')!
      const br = bar.getBoundingClientRect()
      const cr = close.getBoundingClientRect()
      const barPoint = { x: br.left + br.width / 2, y: br.top + br.height / 2 }
      const closePoint = { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 }
      const hit = (point: { x: number; y: number }) => {
        const el = root.elementFromPoint(point.x, point.y) as HTMLElement | null
        return {
          tag: el?.tagName.toLowerCase() ?? null,
          part: el?.closest('[part]')?.getAttribute('part') ?? null,
          edge: el?.closest<HTMLElement>('[part="handle"]')?.dataset.edge ?? null,
        }
      }
      return { barPoint, closePoint, bar: hit(barPoint), close: hit(closePoint) }
    })
    expect(probe.bar.edge, `标题栏中心不得命中手柄（命中 ${JSON.stringify(probe.bar)}）`).toBeNull()
    expect(probe.bar.part).not.toBe('handle')
    expect(probe.close.edge, `关闭钮中心不得命中手柄（命中 ${JSON.stringify(probe.close)}）`).toBeNull()
    expect(probe.close.part, '关闭钮中心命中关闭钮自身').toBe('close')

    // 真实触摸拖标题栏（CDP 触屏事件走命中测试与真实 pointer 流）
    const cdp = await page.context().newCDPSession(page)
    const start = probe.barPoint
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    })
    for (let step = 1; step <= 4; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + step * 15, y: start.y + step * 10, id: 1 }],
      })
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => rectAttr(page, 'fp-basic'), '触摸拖动提交 oas-move').toBe('60,40,380,230')
    await expect(page.locator('#fp-basic-out')).toContainText('oas-move')

    // 点关闭钮（真实触摸 tap）：先等两帧让上一次触摸的 pointer capture / rAF 提交完全收敛，
    // 再发 touchStart（CDP 触屏事件经浏览器手势识别合成 click）
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    const closePoint = await page.evaluate(() => {
      const close = document.getElementById('fp-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
      const r = close.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: closePoint.x, y: closePoint.y, id: 2 }],
    })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => panelOpen(page, 'fp-basic'), '触摸点关闭钮可关闭').toBe(false)
  })
})
