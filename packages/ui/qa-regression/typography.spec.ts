// 复核回归：typography——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('typography 补齐：修饰六布尔原生标签语义、line-clamp 两行截断、copy-text 覆盖、depth 弱化', async ({
  page,
}) => {
  // v2.1 typography 能力补齐回归：code/delete 换原生 <code>/<del>；line-clamp 两行截断（高度=2×行高）；
  // copy-text 覆盖复制内容；depth 三档弱化递进。
  await page.goto('/components/typography.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-text')
  const r = await page.evaluate(async () => {
    const mk = (attrs: Record<string, string>, slot = '文本') => {
      const el = document.createElement('oas-text')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = slot
      document.body.appendChild(el)
      return el
    }
    const code = mk({ code: '' })
    const del = mk({ delete: '' })
    const clamp = mk(
      { 'line-clamp': '2' },
      '很长很长很长的文本很长很长很长的文本很长很长很长的文本很长很长很长的文本',
    )
    clamp.style.maxWidth = '300px'
    clamp.style.display = 'block'
    await new Promise((res) => setTimeout(res, 100))
    const clampSpan = clamp.shadowRoot!.querySelector('.text')!
    const clampH = clampSpan.getBoundingClientRect().height
    const lineH = parseFloat(getComputedStyle(clampSpan).lineHeight)
    // copy-text 覆盖
    const copyEl = mk({ copyable: '', 'copy-text': 'CUSTOM-TEXT' }, '原文')
    let copied = ''
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (t: string) => {
          copied = t
          return Promise.resolve()
        },
      },
      configurable: true,
    })
    copyEl.shadowRoot!.querySelector('button')!.click()
    await new Promise((res) => setTimeout(res, 100))
    // depth 弱化递进
    const d1 = mk({ depth: '1' })
    const d2 = mk({ depth: '2' })
    const d3 = mk({ depth: '3' })
    await new Promise((res) => setTimeout(res, 50))
    const col = (el: HTMLElement) => getComputedStyle(el.shadowRoot!.querySelector('.text')!).color
    const out = {
      codeTag: code.shadowRoot!.querySelector('.text')!.tagName,
      delTag: del.shadowRoot!.querySelector('.text')!.tagName,
      clampRatio: clampH / lineH,
      copied,
      d1: col(d1),
      d2: col(d2),
      d3: col(d3),
    }
    for (const el of [code, del, clamp, copyEl, d1, d2, d3]) el.remove()
    return out
  })
  expect(r.codeTag).toBe('CODE')
  expect(r.delTag).toBe('DEL')
  // line-clamp 两行截断：高度 = 2×行高（±0.5 行容差）
  expect(Math.abs(r.clampRatio - 2)).toBeLessThanOrEqual(0.5)
  // copy-text 覆盖
  expect(r.copied).toBe('CUSTOM-TEXT')
  // depth 三档颜色不同（逐档弱化）
  expect(r.d1).not.toBe(r.d2)
  expect(r.d2).not.toBe(r.d3)
})

test('typography 省略约束链：ellipsis/ellipsis-suffix/line-clamp 均不溢出父容器（wrap 层 max-width 回归）', async ({
  page,
}) => {
  // 曾现 bug：actions 功能引入 .wrap(inline-flex) 层后，max-width 约束链断裂
  // （.text 的 max-width:100% 参照未定宽的 wrap → 整条链撑到内容全宽，suffix 卡片文字跑出卡片）。
  // 修复：:host 与 .wrap 均加 max-width:100%，约束锚定到有确定宽度的父容器。
  await page.goto('/components/typography.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-text')
  const r = await page.evaluate(async () => {
    const wrap300 = (el: HTMLElement) => {
      const box = document.createElement('div')
      box.style.maxWidth = '300px'
      box.appendChild(el)
      document.body.appendChild(box)
      return box
    }
    const mk = (attrs: Record<string, string>, text: string) => {
      const el = document.createElement('oas-text')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = text
      return el
    }
    const longText =
      'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer'
    const suffix = wrap300(mk({ ellipsis: '', 'ellipsis-suffix': '--结尾' }, longText))
    const plain = wrap300(mk({ ellipsis: '' }, longText))
    const clamp = wrap300(mk({ 'line-clamp': '2' }, longText))
    await new Promise((res) => setTimeout(res, 100))
    const measure = (el: HTMLElement) => {
      const host = el.getBoundingClientRect()
      const text = el.shadowRoot!.querySelector('.text')!.getBoundingClientRect()
      const wrap = el.shadowRoot!.querySelector('.wrap')!.getBoundingClientRect()
      return { host: host.width, text: text.width, wrap: wrap.width }
    }
    const suffixEl = suffix.querySelector('oas-text')! as HTMLElement
    const out = {
      suffix: measure(suffixEl),
      plain: measure(plain.querySelector('oas-text')! as HTMLElement),
      clamp: measure(clamp.querySelector('oas-text')! as HTMLElement),
      suffixVisible: !(suffixEl.shadowRoot!.querySelector('.suffix') as HTMLElement).hidden,
    }
    suffix.remove()
    plain.remove()
    clamp.remove()
    return out
  })
  for (const m of [r.suffix, r.plain, r.clamp]) {
    expect(m.host).toBeLessThanOrEqual(301)
    expect(m.wrap).toBeLessThanOrEqual(301)
    expect(m.text).toBeLessThanOrEqual(301)
  }
  expect(r.suffixVisible).toBe(true)
})
