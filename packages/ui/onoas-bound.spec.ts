import { test, expect } from '@playwright/test'

const PAGES = ['alert', 'anchor', 'back-top', 'breadcrumb', 'context-menu', 'drawer', 'dropdown', 'float-button', 'menu', 'page-header', 'popconfirm', 'tour', 'modal']

for (const page of PAGES) {
  test(`onoas-* 绑定：${page}`, async ({ page: p }) => {
    await p.goto(`/components/${page}.html`, { waitUntil: 'networkidle' })
    // 所有含 onoas-* 属性的元素都应被脚手架绑定
    const bound = await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) =>
        Array.from(el.attributes).some((a) => a.name.startsWith('onoas-')),
      )
      return { total: els.length, bound: els.filter((el) => el.dataset.onoasBound === 'true').length }
    })
    expect(bound.total, `${page} 应有 onoas-* 元素`).toBeGreaterThan(0)
    expect(bound.bound, `${page} 全部 onoas-* 已绑定`).toBe(bound.total)
  })
}
