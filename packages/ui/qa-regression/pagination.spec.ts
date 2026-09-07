// 复核回归：pagination——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('pagination 宿主声明式 hidden 不被 update 撕掉（动态 total 触发重渲后仍隐藏）', async ({
  page,
}) => {
  // 曾现 bug：update() 在非 hide-on-single 分支末尾无条件 removeAttribute('hidden')，
  // React/Vue 声明式宿主的 hidden 在 total/current 变化时被组件撕掉 → 元素意外可见。
  // 本用例用 demo 里真实驱动 total 变化的按钮（#pagination-boundary-inc → total 30→300）
  // 触发 update，断言宿主 hidden 保留。
  await page.goto('/components/pagination.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pagination-boundary')
  const result = await page.evaluate(() => {
    return new Promise<{ totalChanged: boolean; hiddenKept: boolean }>((resolve) => {
      const el = document.querySelector('#pagination-boundary')!
      const btn = document.querySelector('#pagination-boundary-inc')!
      let tries = 0
      const attempt = () => {
        el.setAttribute('hidden', '')
        // demo onMounted 把 click 监听绑到宿主上（同步 setAttribute total=300）
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
        const totalChanged = el.getAttribute('total') === '300'
        const hiddenKept = el.hasAttribute('hidden')
        if (totalChanged || tries > 20) resolve({ totalChanged, hiddenKept })
        else {
          tries++
          setTimeout(attempt, 100)
        }
      }
      attempt()
    })
  })
  expect(result.totalChanged, 'demo 按钮应已触发 total 变化（update 确实发生）').toBe(true)
  expect(result.hiddenKept, 'total 变化触发 update 后宿主 hidden 应保留').toBe(true)
  await page.evaluate(() => {
    document.querySelector('#pagination-boundary')!.removeAttribute('hidden')
  })
})

test('pagination 宿主 hidden + hide-on-single 叠加：多页恢复不误摘宿主 hidden', async ({
  page,
}) => {
  // 单属性 world 下组件只能摘除自己因 hide-on-single 写入的 hidden：宿主声明式隐藏时组件
  // 不取得所有权，恢复多页后宿主的 hidden 必须原样保留。
  await page.goto('/components/pagination.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-pagination')
  const kept = await page.evaluate(() => {
    const el = document.createElement('oas-pagination')
    el.setAttribute('hide-on-single', '')
    el.setAttribute('total', '8')
    el.setAttribute('page-size', '10')
    el.setAttribute('hidden', '') // 宿主声明式隐藏（先于组件自隐）
    document.body.appendChild(el)
    const hiddenAtSingle = el.hasAttribute('hidden')
    el.setAttribute('total', '50') // 多页 → hide-on-single 恢复
    const hiddenAfterGrow = el.hasAttribute('hidden')
    el.remove()
    return { hiddenAtSingle, hiddenAfterGrow }
  })
  expect(kept.hiddenAtSingle, '单页时宿主 hidden 应在').toBe(true)
  expect(kept.hiddenAfterGrow, 'hide-on-single 恢复不得误摘宿主 hidden').toBe(true)
})
