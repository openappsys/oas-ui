// CDN bundle（全量 + 族包）内置图标集注册回归锁：
// 全量 `import '@oas-ui/ui'` 与各 CDN 族包都应注册内置图标集（开箱即用）。
// 曾发生：@oas-ui/icons/register 的副作用导入被 treeshake 摇掉 → CDN 内置图名静默空白。
import { test, expect } from '@playwright/test'
import { join } from 'node:path'

const CHECK_PATH = 'M3.5 8.5' // check 图标特征子串（内置集特征）

async function assertBuiltInRenders(page: import('@playwright/test').Page, bundle: string) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <oas-icon id="i" name="check"></oas-icon>
    <oas-button id="b" icon="check">按钮</oas-button>
  </body></html>`)
  await page.addScriptTag({ path: join(process.cwd(), bundle), type: 'module' })
  await page.waitForTimeout(150)
  const r = await page.evaluate((needle) => {
    const icon = document.querySelector('#i') as HTMLElement & { shadowRoot: ShadowRoot }
    const btn = document.querySelector('#b') as HTMLElement & { shadowRoot: ShadowRoot }
    const iconSvg = icon.shadowRoot?.querySelector('svg')?.innerHTML ?? ''
    const btnSvg = btn.shadowRoot?.querySelector('svg')?.innerHTML ?? ''
    return { iconHas: iconSvg.includes(needle), btnHas: btnSvg.includes(needle) }
  }, CHECK_PATH)
  expect(errors, `${bundle} 不应有页面错误`).toEqual([])
  expect(r.iconHas, `${bundle}：<oas-icon name="check"> 应渲染内置图标`).toBe(true)
  expect(r.btnHas, `${bundle}：<oas-button icon="check"> 应渲染内置图标`).toBe(true)
}

test('CDN 全量包（cdn.js）注册内置图标集', async ({ page }) => {
  await assertBuiltInRenders(page, 'packages/ui/dist/cdn.js')
})

test('CDN 族包（cdn/basic.js）注册内置图标集', async ({ page }) => {
  await assertBuiltInRenders(page, 'packages/ui/dist/cdn/basic.js')
})
