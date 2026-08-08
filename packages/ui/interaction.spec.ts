import { test, expect } from '@playwright/test'

// 交互验真（最新构建下运行）：
// 1. modal：✕ / Esc / 遮罩关闭
// 2. drawer：✕ / Esc / 遮罩关闭
// 3. popconfirm：确定/取消关闭气泡（含键盘/脚本激活的合成 click 场景）
// 4. splitter：鼠标拖拽改变 percent
// 5. image：preview 点击派发 oas-preview
async function openReady(
  page: import('@playwright/test').Page,
  url: string,
  ready: string,
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // 等待自定义元素注册/水合完成（各页面首个可用组件不同）
  await page.locator(ready).first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForTimeout(1000)
}

test.describe('反馈/布局组件交互验真（最新构建）', () => {
  test('modal：基础 demo 点 ✕ / Esc / 遮罩均移除 visible', async ({ page }) => {
    await openReady(page, '/components/modal.html', 'oas-button')
    const modal = page.locator('oas-modal[id="modal-basic"]')
    const openBtn = page.locator('oas-button', { hasText: '打开对话框' }).first()

    // ✕
    await openBtn.click()
    await expect(modal).toHaveAttribute('visible', '')
    await modal.locator('[part="close"]').click()
    await expect(modal).not.toHaveAttribute('visible', '')

    // Esc
    await openBtn.click()
    await expect(modal).toHaveAttribute('visible', '')
    await page.keyboard.press('Escape')
    await expect(modal).not.toHaveAttribute('visible', '')

    // 遮罩
    await openBtn.click()
    await expect(modal).toHaveAttribute('visible', '')
    await modal.locator('.mask').click({ position: { x: 5, y: 5 } })
    await expect(modal).not.toHaveAttribute('visible', '')
  })

  test('drawer：基础 demo 点 ✕ / Esc / 遮罩均移除 visible', async ({ page }) => {
    await openReady(page, '/components/drawer.html', 'oas-button')
    const drawer = page.locator('oas-drawer[id="drawer-right"]')
    const openBtn = page.locator('oas-button', { hasText: '打开右侧抽屉' }).first()

    // ✕
    await openBtn.click()
    await expect(drawer).toHaveAttribute('visible', '')
    await drawer.locator('[part="close"]').click()
    await expect(drawer).not.toHaveAttribute('visible', '')

    // Esc
    await openBtn.click()
    await expect(drawer).toHaveAttribute('visible', '')
    await page.keyboard.press('Escape')
    await expect(drawer).not.toHaveAttribute('visible', '')

    // 遮罩
    await openBtn.click()
    await expect(drawer).toHaveAttribute('visible', '')
    await drawer.locator('.mask').click({ position: { x: 5, y: 5 } })
    await expect(drawer).not.toHaveAttribute('visible', '')
  })

  test('popconfirm：点确定/取消均关闭气泡，键盘 Enter 激活也不误翻转', async ({ page }) => {
    await openReady(page, '/components/popconfirm.html', 'oas-popconfirm')
    const pc = page.locator('oas-popconfirm').first()
    const trigger = pc.locator('oas-button').first()
    const pop = pc.locator('[part="popover"]')

    await trigger.click()
    await expect(pop).toHaveAttribute('aria-hidden', 'false')
    await pop.locator('[part="ok"]').click()
    await expect(pop).toHaveAttribute('aria-hidden', 'true')
    await expect(pc).not.toHaveAttribute('open', '')

    await trigger.click()
    await expect(pop).toHaveAttribute('aria-hidden', 'false')
    await pop.locator('[part="cancel"]').click()
    await expect(pop).toHaveAttribute('aria-hidden', 'true')
    await expect(pc).not.toHaveAttribute('open', '')

    // 键盘 Enter 激活 ok（派发合成 click，composed=false）不应误翻转
    await trigger.click()
    await expect(pop).toHaveAttribute('aria-hidden', 'false')
    await pop.locator('[part="ok"]').focus()
    await page.keyboard.press('Enter')
    await expect(pop).toHaveAttribute('aria-hidden', 'true')
    await expect(pc).not.toHaveAttribute('open', '')
  })

  test('splitter：鼠标拖拽分隔条改变 percent 并更新展示', async ({ page }) => {
    await openReady(page, '/components/splitter.html', 'oas-splitter')
    const splitter = page.locator('oas-splitter[id="splitter-demo"]')
    await expect(splitter).toHaveAttribute('percent', '50')

    const bar = splitter.locator('[part="splitter"]')
    await bar.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    const box = await bar.boundingBox()
    expect(box).not.toBeNull()
    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 60, cy, { steps: 5 })
    await page.mouse.up()

    const percent = Number(await splitter.getAttribute('percent'))
    expect(percent).toBeGreaterThan(50)
    await expect(page.locator('#splitter-info')).toContainText('左侧占比：')
  })

  test('image：点击 preview 图片派发 oas-preview 并给出提示', async ({ page }) => {
    await openReady(page, '/components/image.html', 'oas-image')
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') logs.push(msg.text())
    })
    const img = page.locator('oas-image[id="image-preview"]')
    await img.locator('.previewable').click()
    await expect.poll(() => logs.some((l) => l.includes('oas-preview'))).toBe(true)
  })
})
