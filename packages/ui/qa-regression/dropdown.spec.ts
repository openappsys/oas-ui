// 复核回归：dropdown——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

test('dropdown 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown')
  // 注入一个带两级子菜单的 dropdown 并平移到视口右缘
  await page.evaluate(() => {
    const dd = document.createElement('oas-dropdown')
    dd.setAttribute(
      'items',
      JSON.stringify([
        {
          label: '文件',
          value: 'file',
          children: [
            {
              label: '新建',
              value: 'new',
              children: [
                { label: '文件', value: 'new-file' },
                { label: '窗口', value: 'new-window' },
              ],
            },
            { label: '打开', value: 'open' },
          ],
        },
        { label: '编辑', value: 'edit' },
      ]),
    )
    dd.innerHTML = '<button>操作</button>'
    dd.style.cssText = 'position: fixed; right: 0; top: 240px; z-index: 9999'
    dd.dataset.e2eRightEdge = '1'
    document.body.appendChild(dd)
  })
  const dd = page.locator('oas-dropdown[data-e2e-right-edge]')
  // 注：dropdown shadow 内也有原生 button（拆分箭头按钮），必须限定 light DOM 直接子元素
  await dd.locator(':scope > button').click()
  await page.locator('oas-dropdown[data-e2e-right-edge] [part="item"][data-value="file"]').hover()
  await page.locator('oas-dropdown[data-e2e-right-edge] [part="item"][data-value="new"]').hover()
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2)
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-dropdown-flip.png' })
})

// —— 缺陷 9：rate 半选视觉 ——
// 曾现 bug：半星整颗按 50% 透明度淡化，看起来是整颗黄描边星。
// 修复：半星 = 左半激活色（warning）+ 右半未激活色（border），由 .half-fill 覆盖层 +
// clip-path 垂直分割（inset(0 50% 0 0)）实现。断言：覆盖层存在、clip 只留左半、
// 覆盖层为 warning 色、基础星为未激活 border 色。

test('dropdown split：Vue demo 属性存活、箭头按钮 aria 同步、主按钮 oas-action 有可见反馈', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown[split]')
  await page.waitForFunction(() => typeof (window as any).ddSplitAction === 'function', null, {
    timeout: 10000,
  })
  // 点拆分主按钮（host 中心落在主按钮上）→ oas-action → tag 回显（可见反馈）
  await page.locator('#dd-split').click()
  await page.waitForFunction(
    () => document.getElementById('dd-split-result')?.textContent === '主按钮已点击（oas-action）',
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const dd = document.querySelector('#dd-split')!
    const arrow = dd.shadowRoot!.querySelector<HTMLElement>('[part="split-arrow"]')!
    const cs = getComputedStyle(arrow)
    return {
      splitAttr: dd.getAttribute('split'),
      hasArrow: !!arrow,
      haspoup: arrow.getAttribute('aria-haspopup'),
      expanded: arrow.getAttribute('aria-expanded'),
      label: arrow.getAttribute('aria-label'),
      open: dd.hasAttribute('open'),
      display: cs.display,
      height: cs.height,
      topLeftRadius: cs.borderTopLeftRadius,
      topRightRadius: cs.borderTopRightRadius,
    }
  })
  expect(r.splitAttr, 'split 属性被 Vue 剥离').not.toBeNull()
  expect(r.hasArrow).toBe(true)
  expect(r.haspoup).toBe('menu')
  expect(r.expanded).toBe('false')
  expect(r.label).toBe('打开菜单') // locale 可访问名称
  expect(r.open).toBe(false)
  expect(r.display).not.toBe('none') // split 下箭头按钮可见
  expect(r.height).toBe('32px') // 与 --oas-control-height-md 主按钮等高（align-self stretch）
  expect(r.topLeftRadius).toBe('0px') // 左直右圆，与主按钮贴合
  expect(r.topRightRadius).toBe('6px')

  // 点箭头 → 展开菜单 + aria-expanded 同步
  await page.locator('#dd-split [part="split-arrow"]').click()
  await page.waitForFunction(
    () =>
      document.querySelector('#dd-split')?.hasAttribute('open') === true &&
      document
        .querySelector('#dd-split')!
        .shadowRoot!.querySelector<HTMLElement>('[part="split-arrow"]')!
        .getAttribute('aria-expanded') === 'true',
    null,
    { timeout: 5000 },
  )
})

test('dropdown loading 菜单项：spinner 视觉 + 禁点，异步恢复后还原可点', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-async')
  await page.waitForFunction(() => typeof (window as any).ddAsyncLog === 'function', null, {
    timeout: 10000,
  })
  // 打开异步 demo 菜单并选「保存」→ 该项转圈禁点（demo 1.5s 后恢复）
  await page.evaluate(() => document.querySelector('#dd-async')!.setAttribute('open', ''))
  await page.waitForSelector('#dd-async [role="menuitemradio"]', { timeout: 5000 })
  await page.locator('#dd-async [role="menuitemradio"]', { hasText: '保存' }).first().click()
  // 等 demo 把「保存」置 loading（items 数据驱动）；menu 浮层在两层 shadow 内，
  // 这里只查 items 属性，元素态用穿透 locator 断言
  await page.waitForFunction(
    () => {
      const dd = document.querySelector('#dd-async')!
      const save = JSON.parse(dd.getAttribute('items') ?? '[]').find(
        (i: { value: string }) => i.value === 'save',
      )
      return save?.loading === true
    },
    null,
    { timeout: 5000 },
  )
  const saveItem = page.locator('#dd-async [part="item"][data-value="save"]')
  await expect(saveItem).toHaveClass(/loading/)
  const during = await saveItem.evaluate((el) => {
    const spin = el.querySelector('.spin')
    return {
      busy: el.getAttribute('aria-busy'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      hasSpin: !!spin,
      cursor: getComputedStyle(el).cursor,
    }
  })
  expect(during.busy).toBe('true')
  expect(during.ariaDisabled).toBe('true')
  expect(during.hasSpin).toBe(true)
  expect(during.cursor).toBe('wait')

  // 等 1.5s 异步完成 → spinner 消失、禁点解除
  await page.waitForFunction(
    () => {
      const dd = document.querySelector('#dd-async')!
      const save = JSON.parse(dd.getAttribute('items') ?? '[]').find(
        (i: { value: string }) => i.value === 'save',
      )
      return save && !save.loading
    },
    null,
    { timeout: 5000 },
  )
  await expect(saveItem).not.toHaveClass(/loading/)
  const after = await saveItem.evaluate((el) => ({
    hasSpin: !!el.querySelector('.spin'),
    busy: el.getAttribute('aria-busy'),
  }))
  expect(after.hasSpin).toBe(false)
  expect(after.busy).toBeNull()
})

// —— tooltip P1 补缺：虚拟触发（virtual-trigger）——
// 曾现缺口：tooltip 只能绑定宿主元素 hover/focus，图表点位、拖拽中的浮层提示等
// 无触发元素的场景无法使用。本次补 virtual 模式：open 受控 + oas-open-change +
// virtual-anchor（锚点元素选择器）/ virtual-x、virtual-y（视口坐标）定位。

test('dropdown 箭头：#dd-arrow 打开后 .arrow 可见且位于面板顶部居中（placement=bottom 尖端朝上指向触发按钮）', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-arrow')
  const dd = page.locator('#dd-arrow')
  await dd.locator(':scope > oas-button').click()
  await page.waitForFunction(() => {
    const d = document.querySelector('#dd-arrow')
    const anchor = d?.shadowRoot?.querySelector<HTMLElement>('.menu-anchor')
    return anchor != null && !anchor.hidden && anchor.getAttribute('data-placement') === 'bottom'
  })
  const r = await page.evaluate(() => {
    const d = document.querySelector('#dd-arrow')!
    const anchor = d.shadowRoot!.querySelector<HTMLElement>('.menu-anchor')!
    const arrow = anchor.querySelector<HTMLElement>('[data-popper-arrow]')!
    const ab = anchor.getBoundingClientRect()
    const bb = arrow.getBoundingClientRect()
    return {
      arrowPart: arrow.getAttribute('part'),
      arrowHidden: arrow.hasAttribute('hidden'),
      arrowVisible: bb.width > 0 && bb.height > 0,
      arrowAtTop: bb.top <= ab.top + 2, // 箭头横跨面板顶边（top: -4px → 旋转后更靠上）
      arrowCentered: Math.abs(bb.left + bb.width / 2 - (ab.left + ab.width / 2)) <= 6,
      arrowProtrudes: bb.top < ab.top, // 尖端探出面板外沿指向触发按钮
    }
  })
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowHidden).toBe(false)
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtTop, 'bottom placement 箭头应在面板顶部').toBe(true)
  expect(r.arrowCentered, '触发按钮居中于面板下方 → 箭头指向触发元素中心').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿指向触发按钮').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-dropdown-arrow.png' })
})

test('dropdown 箭头 arrow="false"：#dd-arrow-none 打开后无箭头（hidden 属性）且菜单正常', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-arrow-none')
  const dd = page.locator('#dd-arrow-none')
  await dd.locator(':scope > oas-button').click()
  await page.waitForFunction(() => {
    const d = document.querySelector('#dd-arrow-none')
    return d?.shadowRoot?.querySelector<HTMLElement>('.menu-anchor')?.hidden === false
  })
  const r = await page.evaluate(() => {
    const d = document.querySelector('#dd-arrow-none')!
    const anchor = d.shadowRoot!.querySelector<HTMLElement>('.menu-anchor')!
    const arrow = anchor.querySelector<HTMLElement>('[data-popper-arrow]')!
    return {
      arrowExists: arrow != null,
      arrowHidden: arrow.hasAttribute('hidden'),
    }
  })
  expect(r.arrowExists, '骨架应保留').toBe(true)
  expect(r.arrowHidden, 'arrow="false" 应通过 hidden 隐藏箭头').toBe(true)
  // 菜单项照常渲染（穿透两层 shadow 断言，demo 数据为 1 项）
  expect(await page.locator('#dd-arrow-none [part="item"]').count()).toBe(1)
})

test('dropdown 关闭过程箭头与面板透明度逐帧同步（不慢一拍消失）', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown')
  await page.evaluate(() => {
    const h = document.querySelector('oas-dropdown')!
    h.scrollIntoView({ block: 'center' })
    ;(h.shadowRoot!.querySelector('button') as HTMLElement).click()
  })
  await page.waitForTimeout(400)
  // 触发关闭并多帧采样
  const samples = await page.evaluate(async () => {
    const h = document.querySelector('oas-dropdown')!
    const menu = h.shadowRoot!.querySelector('oas-menu')!
    const arrow = h.shadowRoot!.querySelector('.arrow')!
    const out: Array<{ menu: number; arrow: number }> = []
    document.body.click()
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 30))
      out.push({
        menu: parseFloat(getComputedStyle(menu).opacity),
        arrow: parseFloat(getComputedStyle(arrow).opacity),
      })
    }
    return out
  })
  // 关闭过程中至少有一帧处于淡出中（opacity 在 0~1 之间），且每帧箭头与面板同步
  const fading = samples.filter((s) => s.menu > 0 && s.menu < 1)
  expect(fading.length, '应采样到淡出过程帧').toBeGreaterThan(0)
  for (const s of fading) {
    expect(
      Math.abs(s.arrow - s.menu),
      '箭头与面板 opacity 应逐帧同步（差 ≤0.05）',
    ).toBeLessThanOrEqual(0.05)
  }
})

// —— 复核：tour 步骤推进流程（用户对「点下一步就消失」的反馈实测验证） ——