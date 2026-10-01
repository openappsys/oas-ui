// CDN swatch-group syncSelected 诊断：静态 HTML 带 value（demands 同款——首帧 update 时子项未升级）
import { test, expect } from '@playwright/test'
import { join } from 'node:path'

test('cdn swatch-group 静态 value 首帧（demands 复现）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setContent(`<!doctype html><html><body>
    <oas-swatch-group id="g" value="#1677ff">
      <oas-swatch color="#1677ff"></oas-swatch>
      <oas-swatch color="#ff4d4f"></oas-swatch>
    </oas-swatch-group>
  </body></html>`)
  await page.addScriptTag({ path: join(process.cwd(), 'packages/ui/dist/cdn.js'), type: 'module' })
  // 不等待——直接读首帧错误（upgrade microtask 队列中的窗口）
  await page.waitForTimeout(100)
  console.log('ERRORS ' + JSON.stringify(errors.slice(0, 4)))
  const diag = await page.evaluate(() => {
    const g = document.querySelector('#g')!
    const first = document.querySelector('oas-swatch')!
    return {
      groupShadow: !!g.shadowRoot,
      firstSwShadow: !!first.shadowRoot,
      firstSelected: first.hasAttribute('selected') || first.getAttribute('aria-checked'),
    }
  })
  console.log('DIAG ' + JSON.stringify(diag))
  expect(errors.filter((e) => e.includes('syncSelected')).length, '首帧不应抛 syncSelected 错误').toBe(0)
  // 修复目标本身也要锁：value 命中项首帧选中态（重试机制失效时白板首帧无选中环）
  expect(diag.firstSelected, 'value 命中项首帧选中态同步').toBeTruthy()
})
