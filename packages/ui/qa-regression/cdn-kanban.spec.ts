// CDN 打包版与 ESM 一致性：oas-kanban 在 dist/cdn.js 下真注册、真渲染、renderCard property 通道可用。
// 动机：demands 里 swatch 曾出现「CDN 渲染即报错、ESM 正常」的打包路径分叉——data 族新组件应专门覆盖。
import { test, expect } from '@playwright/test'
import { join } from 'node:path'

const KANBAN_HTML = `<!doctype html><html><body>
  <oas-kanban id="k"
    columns='[{"key":"todo","title":"待办"},{"key":"done","title":"已完成"}]'
    cards='[{"id":"c1","column":"todo","title":"任务A"},{"id":"c2","column":"done","title":"任务B"}]'>
  </oas-kanban>
</body></html>`

test('cdn 全量包：oas-kanban 注册/渲染/attribute 双通道', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.setContent(KANBAN_HTML)
  await page.addScriptTag({ path: join(process.cwd(), 'packages/ui/dist/cdn.js'), type: 'module' })
  await page.waitForFunction(() => customElements.get('oas-kanban') != null, null, { timeout: 15000 })
  await page.waitForTimeout(200)

  const diag = await page.evaluate(() => {
    const k = document.querySelector('#k') as HTMLElement & { cards?: unknown }
    const text = k.shadowRoot?.textContent ?? ''
    return {
      defined: !!customElements.get('oas-kanban'),
      hasShadow: !!k.shadowRoot,
      columnsRendered: text.includes('待办') && text.includes('已完成'),
      cardsRendered: text.includes('任务A') && text.includes('任务B'),
      cardsProp: Array.isArray(k.cards) && (k.cards as unknown[]).length === 2,
    }
  })
  expect(diag, JSON.stringify(diag)).toMatchObject({
    defined: true,
    hasShadow: true,
    columnsRendered: true,
    cardsRendered: true,
    cardsProp: true,
  })
  expect(errors, `cdn.js console/pageerror:\n${[...new Set(errors)].slice(0, 5).join('\n')}`).toEqual([])
})

test('cdn 全量包：oas-kanban renderCard property（函数通道，CDN 不丢）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setContent(KANBAN_HTML)
  await page.addScriptTag({ path: join(process.cwd(), 'packages/ui/dist/cdn.js'), type: 'module' })
  await page.waitForFunction(() => customElements.get('oas-kanban') != null, null, { timeout: 15000 })
  await page.waitForTimeout(150)

  await page.evaluate(() => {
    const k = document.querySelector('#k') as HTMLElement & { renderCard?: (card: { title: string }) => Node }
    k.renderCard = (card) => {
      const box = document.createElement('div')
      box.className = 'qa-rc'
      box.textContent = `RC:${card.title}`
      return box
    }
  })
  await page.waitForTimeout(200)
  const rc = await page.evaluate(() => {
    const k = document.querySelector('#k')!
    const nodes = [...(k.shadowRoot?.querySelectorAll('.qa-rc') ?? [])].map((n) => n.textContent)
    return nodes
  })
  expect(rc, 'renderCard property 应在 CDN 下生效').toEqual(expect.arrayContaining(['RC:任务A', 'RC:任务B']))
  expect(errors).toEqual([])
})
