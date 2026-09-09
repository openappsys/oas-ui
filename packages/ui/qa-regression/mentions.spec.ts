// 复核回归：mentions——whole 整段删除 + type 单行形态属性存活固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('mentions whole：光标紧跟提及段按 Backspace 一次删除整段（浏览器原生删字符）+ 派发 oas-whole-remove', async ({
  page,
}) => {
  await page.goto('/components/mentions.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-mentions#mention-whole')

  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-mentions#mention-whole')!
    const t = el.shadowRoot!.querySelector('textarea')!
    // 光标放在「@张三」之后的空格后（紧跟提及段），派发 input 让组件扫描后按顺序定位
    const value = t.value // "你好 @张三 完成提测"
    const at = value.indexOf('@')
    const afterMention = at + '@张三'.length
    t.focus()
    t.setSelectionRange(afterMention, afterMention)
    return { value, afterMention, wholeAttr: el.hasAttribute('whole') }
  })
  expect(r.wholeAttr).toBe(true)

  let detail: unknown = null
  await page.evaluate(() => {
    const el = document.querySelector('oas-mentions#mention-whole') as HTMLElement
    el.addEventListener('oas-whole-remove', (e) => {
      ;(window as unknown as { __wr: unknown }).__wr = (e as CustomEvent).detail
    })
  })

  // 聚焦 textarea 后按 Backspace（浏览器原生删除被组件拦截 + 整段删）
  await page.evaluate(() => {
    const el = document.querySelector('oas-mentions#mention-whole')!
    const t = el.shadowRoot!.querySelector('textarea')!
    t.focus()
    t.setSelectionRange(
      t.value.indexOf('@') + '@张三'.length,
      t.value.indexOf('@') + '@张三'.length,
    )
    t.dispatchEvent(new Event('input'))
  })
  await page.keyboard.press('Backspace')
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-mentions#mention-whole')!
    const t = el.shadowRoot!.querySelector('textarea')!
    return {
      value: t.value,
      wr: (window as unknown as { __wr: unknown }).__wr ?? null,
    }
  })
  // 「@张三」被整段删除，剩余"你好  完成提测"（提及段后保留一个空格）
  expect(after.value).toBe('你好  完成提测')
  expect(after.wr).toEqual({
    value: '你好  完成提测',
    option: { label: '张三', value: 'zhangsan' },
    prefix: '@',
  })
})

test('mentions type=input：单行形态（rows=1 且 data-type 镜像），属性在 Vue demo 中存活', async ({
  page,
}) => {
  await page.goto('/components/mentions.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-mentions#mention-single')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-mentions#mention-single')!
    const t = el.shadowRoot!.querySelector('textarea')!
    return {
      typeAttr: el.getAttribute('type'),
      dataType: el.getAttribute('data-type'),
      rows: t.getAttribute('rows'),
    }
  })
  expect(r.typeAttr).toBe('input')
  expect(r.dataType).toBe('input')
  expect(r.rows).toBe('1')
})

test('mentions trigger 数组属性在 Vue demo 中存活（覆盖 DOM 内建 prefix 冲突：@/# 多触发符）', async ({
  page,
}) => {
  await page.goto('/components/mentions.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-mentions[trigger]')
  const r = await page.evaluate(() => {
    // 找到 trigger 为数组的那个 demo（@/# 分流）
    const el = [...document.querySelectorAll('oas-mentions')].find(
      (x) => x.getAttribute('trigger')?.startsWith('['),
    )
    if (!el) return { found: false }
    return { found: true, triggerAttr: el.getAttribute('trigger') }
  })
  expect(r.found).toBe(true)
  expect(r.triggerAttr).toContain('@')
  expect(r.triggerAttr).toContain('#')
})

