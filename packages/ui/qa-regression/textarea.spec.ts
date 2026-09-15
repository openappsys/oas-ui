// 复核回归：textarea——输入 oas-input / 失焦 oas-change（含 demo 输出反馈）、show-count 字数统计、
// disabled/readonly 不可输入、autosize 高度随内容增长且清空回落。
// demo 选择器：#ta-event / #ta-output / maxlength=20 计数 / [disabled] / [readonly] / autosize 演示项。

import { test, expect } from '@playwright/test'
import { up, defocus } from './helpers'

test('textarea 输入派发 oas-input、失焦派发 oas-change（demo 输出实时反馈）', async ({ page }) => {
  await page.goto('/components/textarea.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-textarea')
  await defocus(page) // 清页面初始焦点：防 target focus 后又被其他 demo 的失焦提交链抢走焦点
  await page.evaluate(() => {
    ;(window as any).__inputs = []
    ;(window as any).__changes = []
    const el = document.getElementById('ta-event')!
    el.addEventListener('oas-input', (e: Event) => {
      ;(window as any).__inputs.push((e as CustomEvent).detail.value)
    })
    el.addEventListener('oas-change', (e: Event) => {
      ;(window as any).__changes.push((e as CustomEvent).detail.value)
    })
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  await page.keyboard.type('你好')
  // oas-input 的 detail.value 是全量快照（'你' → '你好'），非增量——按最新一条断言
  await page.waitForFunction(() => ((window as any).__inputs as string[]).at(-1) === '你好', null, {
    timeout: 5000,
  })
  const midOutput = await page.evaluate(() => document.getElementById('ta-output')!.textContent)
  expect(midOutput, '输入过程 demo 输出区应实时回显（用户可见反馈）').toBe('oas-input: 你好')
  // 失焦：值已变 → oas-change（提交语义）
  await page.evaluate(() => {
    ;(document.getElementById('ta-event')!.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).blur()
  })
  await page.waitForFunction(() => ((window as any).__changes as string[]).length > 0, null, { timeout: 5000 })
  const r = await page.evaluate(() => {
    const ta = document.getElementById('ta-event')!.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    return { lastInput: (window as any).__inputs.at(-1), changes: (window as any).__changes, value: ta.value }
  })
  expect(r.lastInput).toBe('你好')
  expect(r.changes).toEqual(['你好'])
  expect(r.value).toBe('你好')
})

test('textarea show-count 字数统计：有 maxlength 显示 n/max，无则只显示 n', async ({ page }) => {
  await page.goto('/components/textarea.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-textarea')
  // 有 maxlength 的计数框：初始 0/20，输入后 3/20
  await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[maxlength="20"]')!
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  await page.keyboard.type('abc')
  await page.waitForFunction(
    () => {
      const count = document.querySelector('oas-textarea[maxlength="20"]')!.shadowRoot!.querySelector('[part="count"]')!
      return count.textContent === '3/20'
    },
    null,
    { timeout: 5000 },
  )
  // 无 maxlength 的计数框：只显示当前字数
  await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[show-count]:not([maxlength])')!
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  await page.keyboard.type('你好')
  await page.waitForFunction(
    () => {
      const count = document
        .querySelector('oas-textarea[show-count]:not([maxlength])')!
        .shadowRoot!.querySelector('[part="count"]')!
      return count.textContent === '2'
    },
    null,
    { timeout: 5000 },
  )
  const visible = await page.evaluate(() => {
    const c1 = document.querySelector('oas-textarea[maxlength="20"]')!.shadowRoot!.querySelector('[part="count"]')!
    const c2 = document
      .querySelector('oas-textarea[show-count]:not([maxlength])')!
      .shadowRoot!.querySelector('[part="count"]')!
    return { over: c1.getAttribute('data-over'), c2Hidden: c2.hasAttribute('hidden') }
  })
  expect(visible.over, '未超限时不得标红').toBeNull()
  expect(visible.c2Hidden).toBe(false)
})

test('textarea disabled/readonly 不可输入：值不变且无 oas-input', async ({ page }) => {
  await page.goto('/components/textarea.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-textarea')
  // disabled：原生禁用 + 聚焦无效 + 键入无事件
  await page.evaluate(() => {
    ;(window as any).__disabledInputs = 0
    const el = document.querySelector('oas-textarea[disabled]')!
    el.addEventListener('oas-input', () => (window as any).__disabledInputs++)
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  await page.keyboard.type('x')
  const disabled = await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[disabled]')!
    const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    return {
      nativeDisabled: ta.disabled,
      value: ta.value,
      inputEvents: (window as any).__disabledInputs,
    }
  })
  expect(disabled.nativeDisabled).toBe(true)
  expect(disabled.value, 'disabled 值不得被键入改变').toBe('禁用内容')
  expect(disabled.inputEvents).toBe(0)
  // readonly：可聚焦（光标进入）但键入不改值、不派发 oas-input
  await page.evaluate(() => {
    ;(window as any).__readonlyInputs = 0
    const el = document.querySelector('oas-textarea[readonly]')!
    el.addEventListener('oas-input', () => (window as any).__readonlyInputs++)
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  await page.keyboard.type('x')
  const readonly = await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[readonly]')!
    const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    return {
      nativeReadonly: ta.readOnly,
      value: ta.value,
      inputEvents: (window as any).__readonlyInputs,
    }
  })
  expect(readonly.nativeReadonly).toBe(true)
  expect(readonly.value, 'readonly 值不得被键入改变').toBe('只读内容，不可编辑')
  expect(readonly.inputEvents).toBe(0)
})

test('textarea autosize 高度自适应：多行内容增高、清空回落最小高度', async ({ page }) => {
  await page.goto('/components/textarea.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-textarea')
  await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[autosize][placeholder="输入内容高度自动增长"]')!
    ;(el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).focus()
  })
  const h0 = await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[autosize][placeholder="输入内容高度自动增长"]')!
    return (el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement).getBoundingClientRect().height
  })
  await page.keyboard.type('第一行')
  await page.keyboard.press('Enter')
  await page.keyboard.type('第二行')
  await page.keyboard.press('Enter')
  await page.keyboard.type('第三行')
  await page.waitForFunction(
    (min) => {
      const el = document.querySelector('oas-textarea[autosize][placeholder="输入内容高度自动增长"]')!
      const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
      return ta.getBoundingClientRect().height > min + 20
    },
    h0,
    { timeout: 5000 },
  )
  const grown = await page.evaluate(() => {
    const el = document.querySelector('oas-textarea[autosize][placeholder="输入内容高度自动增长"]')!
    const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    return { height: ta.getBoundingClientRect().height, inlineHeight: ta.style.height }
  })
  expect(grown.height, '三行内容后高度应明显高于初始').toBeGreaterThan(h0 + 20)
  expect(grown.inlineHeight, 'autosize 高度写在内联样式上').not.toBe('')
  // 全选删除：空态回落最小高度
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Backspace')
  await page.waitForFunction(
    (min) => {
      const el = document.querySelector('oas-textarea[autosize][placeholder="输入内容高度自动增长"]')!
      const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
      return Math.abs(ta.getBoundingClientRect().height - min) <= 2
    },
    h0,
    { timeout: 5000 },
  )
})
