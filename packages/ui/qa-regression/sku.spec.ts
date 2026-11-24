// 复核回归：sku——缺货置灰、切换颜色后可选、价格联动、数量库存上限。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('sku：缺货选项置灰并标缺货，切换颜色后可选，价格与数量上限随 sku 联动', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-sku')

  const host = page.locator('#sku-basic')
  const option = (value: string) => host.locator(`[part="option"][data-value="${value}"]`)

  // 选中曜石黑：该颜色下 M 码无库存 → 置灰 + 缺货（可选路径提示）
  await option('曜石黑').click()
  await expect(option('M')).toHaveAttribute('data-available', 'false')
  await expect(option('M')).toContainText('缺货')
  await expect(option('S')).toHaveAttribute('data-available', 'true')

  // 切到雾霭白：M 码有库存 → 可选，价格随组合联动
  await option('雾霭白').click()
  await expect(option('M')).toHaveAttribute('data-available', 'true')
  await option('M').click()
  await expect(page.locator('#sku-basic-out')).toContainText('329')

  // 换尺码后切回曜石黑：价格随组合更新（S 码在黑/白均有库存）
  await option('S').click()
  await option('曜石黑').click()
  await expect(page.locator('#sku-basic-out')).toContainText('299')

  // 数量上限 = 库存 2：加到 2 后加号禁用
  const qty = page.locator('#sku-qty')
  await qty.locator('[part="plus"]').click()
  await expect(qty.locator('[part="quantity-input"]')).toHaveValue('2')
  await expect(qty.locator('[part="plus"]')).toBeDisabled()
  await expect(page.locator('#sku-qty-out')).toContainText('2')
})

// 回归（本轮新增能力）：layout="popup" 用 bottom-sheet 承载同一面板——真实上滑面板可见、
// 面板内可正常选择、Esc 走 bottom-sheet 协议关闭并回写 open。
test('sku popup：底部弹层承载同一面板，选择可用，Esc 关闭并回写 open', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sku-popup')

  const host = page.locator('#sku-popup')
  const openHost = page.locator('#sku-popup-open')
  const out = page.locator('#sku-popup-out')
  const sheetLoc = host.locator('oas-bottom-sheet')

  // 滑入/滑出过渡探针：transition 事件 composed: false（不冒出 shadow root），
  // 必须挂在承载件 shadow 内部的 .sheet 上；open/close 由宿主 open 属性现读区分
  await host.evaluate((el) => {
    const sheetHost = (el as HTMLElement).shadowRoot!.querySelector('oas-bottom-sheet')!
    const inner = sheetHost.shadowRoot!.querySelector('.sheet')!
    const w = window as any
    w.__skuRuns = { open: 0, close: 0 }
    inner.addEventListener('transitionrun', (e) => {
      if ((e as TransitionEvent).propertyName !== 'transform') return
      if ((el as HTMLElement).hasAttribute('open')) w.__skuRuns.open++
      else w.__skuRuns.close++
    })
  })

  // 未打开：承载件隐藏（关闭态可聚焦控件退出 Tab 序与读屏树——display:none 语义）、面板不在屏内
  const closed = await host.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const sheet = root.querySelector('oas-bottom-sheet') as HTMLElement
    const panel = root.querySelector('[part="panel"]') as HTMLElement
    return {
      panelInSheet: sheet.contains(panel),
      sheetOpen: sheet.hasAttribute('open'),
      sheetHidden: sheet.hasAttribute('hidden'),
    }
  })
  expect(closed.panelInSheet, 'popup 形态面板必须在 sheet 的 light DOM（内容复用不复制）').toBe(true)
  expect(closed.sheetOpen).toBe(false)
  expect(closed.sheetHidden, '关闭态承载件必须 hidden（Tab 不可达 + 读屏树移除）').toBe(true)
  expect(await host.evaluate((el) => (el as HTMLElement).shadowRoot!.querySelectorAll('[part="panel"]').length)).toBe(1)

  await openHost.click()
  await expect(host).toHaveAttribute('open', '')
  await expect(out).toContainText('弹层已打开')
  // hidden 移除与 open 同帧，滑入过渡必须照播（transitionrun 出现 = 未被 display 切换吞掉）
  await expect
    .poll(() => page.evaluate(() => (window as any).__skuRuns.open), { timeout: 3000 })
    .toBeGreaterThanOrEqual(1)

  // 面板真的升到视口底部（用户可见）：inner sheet 贴底、宽度铺满、有高度。
  // 滑入过渡 180ms 播放中 top 是中间值——poll 等过渡完成后采样（不稳定期读取会误报未升起）。
  await expect
    .poll(
      async () =>
        host.evaluate((el) => {
          const sheetHost = (el as HTMLElement).shadowRoot!.querySelector('oas-bottom-sheet')!
          return (sheetHost.shadowRoot!.querySelector('.sheet') as HTMLElement).getBoundingClientRect().top
        }),
      { timeout: 3000 },
    )
    .toBeLessThan((await page.viewportSize())!.height - 40)
  const geom = await host.evaluate((el) => {
    const sheetHost = (el as HTMLElement).shadowRoot!.querySelector('oas-bottom-sheet')!
    const sheet = sheetHost.shadowRoot!.querySelector('.sheet') as HTMLElement
    const frame = sheet.getBoundingClientRect()
    return {
      top: frame.top,
      left: frame.left,
      width: frame.width,
      height: frame.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  expect(geom.height, '弹层必须有可见高度').toBeGreaterThan(80)
  expect(geom.top + geom.height, '弹层贴视口底部').toBeGreaterThan(geom.vh - 4)
  expect(geom.width).toBeGreaterThan(geom.vw / 2)

  // 面板内交互照常：选颜色 + 尺码 → 价格联动
  await host.locator('[part="option"][data-value="雾霭白"]').click()
  await host.locator('[part="option"][data-value="M"]').click()
  await expect(out).toContainText('329')

  // Esc 走 bottom-sheet 协议：容器派发 oas-close，组件收起并回写 open
  await page.keyboard.press('Escape')
  await expect(host).not.toHaveAttribute('open')
  await expect(out).toContainText('esc')

  // 滑出过渡照播（不是瞬间消失）：transform 过渡在关闭侧必须 run
  await expect
    .poll(() => page.evaluate(() => (window as any).__skuRuns.close), { timeout: 3000 })
    .toBeGreaterThanOrEqual(1)

  // 关闭的终点是承载件 hidden（display:none = 从视口与可达性中移除）；
  // 滑出是过渡态（180ms）不采几何值（采样在播放窗口内会读到中间值）。
  await expect(sheetLoc, '滑出收尾后承载件必须 hidden（从视口与可达性中移除）').toHaveAttribute('hidden')
})

// 回归（I-1）：popup 关闭态 a11y——bottom-sheet 关闭态只有 translateY(100%) 移屏外，
// 承载件 hidden 由宿主在滑出收尾后补上：关闭后 Tab 不落屏外抽屉、命中测试穿透、
// 焦点回带打开前触发器（不滞留屏外）。
test('sku popup 关闭态 a11y：Tab 不可达、命中测试穿透、焦点回带触发器', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sku-popup')

  const host = page.locator('#sku-popup')
  const openHost = page.locator('#sku-popup-open')
  const sheetLoc = host.locator('oas-bottom-sheet')

  /** 深层 activeElement 落点判定（穿透 shadow；inSheet = 是否滞留在承载件内） */
  const activeInfo = () =>
    page.evaluate(() => {
      let a = document.activeElement as Element | null
      while (a && (a as HTMLElement).shadowRoot && (a as HTMLElement).shadowRoot!.activeElement) {
        a = (a as HTMLElement).shadowRoot!.activeElement
      }
      const host = document.querySelector('#sku-popup') as HTMLElement
      const sheetHost = host.shadowRoot!.querySelector('oas-bottom-sheet') as HTMLElement
      const openBtn = document.querySelector('#sku-popup-open') as HTMLElement
      const inSheet = sheetHost.contains(a as Node) || !!sheetHost.shadowRoot?.contains(a as Node)
      const inTrigger = openBtn.contains(a as Node) || !!openBtn.shadowRoot?.contains(a as Node)
      return { inSheet, inTrigger }
    })

  // 点击触发按钮打开（点击本身把焦点落在触发按钮上）→ 面板内选择 → Esc 关闭
  await openHost.click()
  await expect(host).toHaveAttribute('open', '')
  await host.locator('[part="option"][data-value="曜石黑"]').click()
  await page.keyboard.press('Escape')
  await expect(host).not.toHaveAttribute('open')
  // 滑出收尾后承载件 hidden 生效（退出 Tab 序与读屏树）
  await expect(sheetLoc, '滑出收尾后承载件必须 hidden').toHaveAttribute('hidden')

  // 焦点回带触发器：深层 activeElement 不在抽屉内、落在触发按钮上
  const back = await activeInfo()
  expect(back.inSheet, '关闭后焦点不得滞留抽屉内').toBe(false)
  expect(back.inTrigger, '焦点必须回带打开前触发器').toBe(true)

  // Tab 序不可达：从触发按钮向后 Tab，落点不得进入抽屉（display:none 退出 Tab 序）
  await page.keyboard.press('Tab')
  const afterTab = await activeInfo()
  expect(afterTab.inSheet, 'Tab 遍历不得落入隐藏抽屉').toBe(false)

  // 命中测试穿透：视口底部（打开时抽屉覆盖区域）不得命中隐藏抽屉内容
  const hit = await page.evaluate(() => {
    const host = document.querySelector('#sku-popup') as HTMLElement
    const sheetHost = host.shadowRoot!.querySelector('oas-bottom-sheet') as HTMLElement
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 60)
    return sheetHost.contains(el) || !!sheetHost.shadowRoot?.contains(el)
  })
  expect(hit, '视口底部命中测试不得穿透到隐藏抽屉').toBe(false)
})
