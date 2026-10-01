// CDN 族包（form.js）swatch-group 静态 value 首帧诊断
import { test, expect } from '@playwright/test'
import { join } from 'node:path'

test('cdn 族包 form.js swatch-group 静态 value 首帧', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setContent(`<!doctype html><html><body>
    <oas-swatch-group id="g" value="#1677ff">
      <oas-swatch color="#1677ff"></oas-swatch>
      <oas-swatch color="#ff4d4f"></oas-swatch>
    </oas-swatch-group>
  </body></html>`)
  await page.addScriptTag({ path: join(process.cwd(), 'packages/ui/dist/cdn/form.js'), type: 'module' })
  await page.waitForTimeout(100)
  const diag = await page.evaluate(() => {
    const g = document.querySelector('#g')!
    const first = document.querySelector('oas-swatch')!
    return {
      groupShadow: !!g.shadowRoot,
      firstSwShadow: !!first.shadowRoot,
      registryHasSwatch: !!customElements.get('oas-swatch'),
      registryHasGroup: !!customElements.get('oas-swatch-group'),
    }
  })
  console.log('ERRORS ' + JSON.stringify(errors.slice(0, 4)))
  console.log('DIAG ' + JSON.stringify(diag))
  expect(errors.filter((e) => e.includes('syncSelected')).length, '族包首帧不应抛 syncSelected 错误').toBe(0)
})
