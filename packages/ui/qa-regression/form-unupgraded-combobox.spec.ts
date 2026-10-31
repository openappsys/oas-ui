// 真实 CDN 族包升级顺序回归：bundle 加载完成后 innerHTML 创建表单——oas-form 按文档序
// 先升级，其 connectedCallback 同步 collectFields 时子级 combobox 尚未升级（el.value 为
// undefined）。历史缺陷：combobox 读取器 JSON.stringify(undefined) → normalizeValue 抛
// TypeError，整个表单挂载崩溃（模板 admin-pro/cdn forms.spec 实抓）。契约：零抛错、
// 未升级控件按空值处理、其他字段正常收集。
import { test, expect } from '@playwright/test'
import { join } from 'node:path'

test('cdn form.js：form 先于 combobox 升级时挂载不抛错且值按空处理', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>')
  await page.addScriptTag({ path: join(process.cwd(), 'packages/ui/dist/cdn/form.js'), type: 'module' })
  await page.waitForFunction(() => !!customElements.get('oas-form'))
  // 关键：元素在 bundle 加载后创建——文档序升级 form → connectedCallback 先于 combobox 升级
  await page.evaluate(() => {
    document.querySelector('#host')!.innerHTML =
      '<oas-form id="f"><oas-combobox name="category"></oas-combobox><oas-input name="company" value="ACME"></oas-input></oas-form>'
  })
  // 连接重建完成的真实信号：form.getValues 已可用（未升级时方法不在原型上）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = document.querySelector('#f') as unknown as { getValues?: unknown } | null
        return typeof f?.getValues === 'function'
      }),
    )
    .toBe(true)
  expect(errors, 'form 先于 combobox 升级不应崩溃').toEqual([])
  const values = await page.evaluate(() =>
    (document.querySelector('#f') as unknown as { getValues(): Record<string, unknown> }).getValues(),
  )
  expect(values).toEqual({ category: '', company: 'ACME' })
})
