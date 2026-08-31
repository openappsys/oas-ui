// 复核回归：back-top——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('back-top append-to 不触发 SSR 水合告警（组件 chunk 先于水合 chunk 到达的竞态时序）', async ({
  page,
}) => {
  // 缺陷回归：connectedCallback 即时把宿主 teleport 进 append-to 容器，组件 chunk
  // （customElements.define）先于页面 chunk（Vue mount 水合链）到达时，水合在 SSR
  // 原位置找不到节点 → console error「Hydration completed but contains mismatches.」。
  // 修复：teleport 推迟到文档 load 后（水合必然已完成）。此处反向延迟页面 chunk
  // （2500ms > 组件 chunk ~1MB 的本地传输耗时）强制「先升级后水合」的竞态时序。
  const errs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  await page.route(/components_back-top\.md\..*\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })
  await page.goto('/components/back-top.html', { waitUntil: 'load' })
  // 等竞态时序完整走完：页面 chunk 到达 → mount/水合 → onMounted 注册组件 → 升级 → teleport
  await page.waitForFunction(() => !!document.querySelector('#bt-app-root > oas-back-top'), null, {
    timeout: 15000,
  })

  const hydrationErrs = errs.filter((e) => /[Hh]ydration/.test(e))
  expect(hydrationErrs, '竞态时序下 console 不得出现水合 mismatch error').toEqual([])
})
