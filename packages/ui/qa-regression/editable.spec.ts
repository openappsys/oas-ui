// 复核回归：editable——浏览器级固化断言。
// 覆盖：点击文本进入编辑态（display 隐藏、input 可见聚焦带值）→ Enter 提交派发 oas-change
// + demo 反馈文本（#edit-output）、Esc 取消恢复原文派发 oas-cancel、失焦提交（默认
// submit-on-blur）、disabled 不可进入编辑。

import { test, expect } from '@playwright/test'
import { up, defocus, realClick } from './helpers'

const PAGE = '/components/editable.html'

interface EditLog {
  type: string
  detail: unknown
}

function attachLog(page: import('@playwright/test').Page, selector: string): Promise<void> {
  return page.evaluate(
    ({ selector }) => {
      const el = document.querySelector(selector) as HTMLElement & { __log?: EditLog[] }
      el.__log = []
      for (const t of ['oas-change', 'oas-cancel', 'oas-editing']) {
        el.addEventListener(t, (e) => (el.__log as EditLog[]).push({ type: t, detail: (e as CustomEvent).detail }))
      }
    },
    { selector },
  )
}

function readLog(page: import('@playwright/test').Page, selector: string): Promise<EditLog[]> {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as (HTMLElement & { __log?: EditLog[] }) | null
    return el?.__log ?? []
  }, selector)
}

test('editable 点击进入编辑 → 修改 → Enter 提交：值回写 + oas-change + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#edit-event')
  await page.waitForTimeout(300) // 等 demo 宿主挂事件监听
  await attachLog(page, '#edit-event')
  // 清页面初始焦点（default-editing demo 的失焦提交链会拽走滚动/焦点）后真实点击进入编辑态
  await realClick(page, '#edit-event', '[part="display"]')
  const input = page.locator('#edit-event input')
  await expect(input, '编辑态应出现输入框').toBeVisible()
  expect(await input.inputValue(), '输入框应带原值').toBe('修改我')
  const editingState = await page.evaluate(() => document.querySelector('#edit-event')!.hasAttribute('editing'))
  expect(editingState, '编辑态应反射 editing 属性').toBe(true)

  // 修改并 Enter 提交
  await input.fill('修改后的值')
  await input.press('Enter')
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#edit-event')!
    const display = el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!
    return {
      value: el.getAttribute('value'),
      displayText: display.textContent,
      displayVisible: !display.hidden,
      editing: el.hasAttribute('editing'),
      out: document.querySelector('#edit-output')!.textContent,
    }
  })
  expect(after.value, '提交后 value 属性应回写新值').toBe('修改后的值')
  expect(after.displayText, '展示态应显示新值').toBe('修改后的值')
  expect(after.displayVisible, '提交后应回到展示态').toBe(true)
  expect(after.editing, '提交后 editing 属性应移除').toBe(false)
  expect(after.out, '#edit-output 应显示 oas-change 反馈').toBe('oas-change: 修改后的值')
  const log = await readLog(page, '#edit-event')
  expect(
    log.some((l) => l.type === 'oas-change' && (l.detail as { value: string }).value === '修改后的值'),
    '应派发 oas-change { value: 新值 }',
  ).toBe(true)
  expect(
    log.filter((l) => l.type === 'oas-editing').map((l) => (l.detail as { editing: boolean }).editing),
    '进入/退出编辑各派一次 oas-editing',
  ).toEqual([true, false])
})

test('editable Esc 取消：恢复原文 + 派发 oas-cancel + 不改 value', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-editable[value="点击我修改"]')
  await attachLog(page, 'oas-editable[value="点击我修改"]')
  // 真实点击进入编辑态（先清页面初始焦点，防失焦提交链拽走滚动/焦点）
  await realClick(page, 'oas-editable[value="点击我修改"]', '[part="display"]')
  const input = page.locator('oas-editable[value="点击我修改"] input')
  await expect(input).toBeVisible()
  await input.fill('临时改动')
  await input.press('Escape')
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-editable[value="点击我修改"]')!
    const display = el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!
    return {
      value: el.getAttribute('value'),
      displayText: display.textContent,
      displayVisible: !display.hidden,
      out: null as string | null,
    }
  })
  expect(after.value, 'Esc 取消不应改写 value').toBe('点击我修改')
  expect(after.displayText, '展示态应恢复原文').toBe('点击我修改')
  expect(after.displayVisible, '取消后应回到展示态').toBe(true)
  const log = await readLog(page, 'oas-editable[value="点击我修改"]')
  expect(
    log.some((l) => l.type === 'oas-cancel'),
    'Esc 应派发 oas-cancel',
  ).toBe(true)
  expect(
    log.some((l) => l.type === 'oas-change'),
    '取消不应派发 oas-change',
  ).toBe(false)
})

test('editable 失焦提交（默认 submit-on-blur）：点击页面其他区域即提交', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-editable[value="点击我修改"]')
  await attachLog(page, 'oas-editable[value="点击我修改"]')
  // 真实点击进入编辑态（先清页面初始焦点，防失焦提交链拽走滚动/焦点）
  await realClick(page, 'oas-editable[value="点击我修改"]', '[part="display"]')
  const input = page.locator('oas-editable[value="点击我修改"] input')
  await expect(input).toBeVisible()
  await input.fill('失焦提交的值')
  // 真实语义为「点击页面其他区域转移焦点」；此处用 blur 等价触发失焦提交——
  // 真实点击页面其他位置会先撞上 default-editing demo 的失焦提交链拽走滚动，徒增不稳定
  await page.evaluate(() => {
    // 打标防漂移：失焦提交会改写 value 属性，attribute 选择器会失配
    document.querySelector('oas-editable[value="点击我修改"]')!.setAttribute('data-qa-probe', 'blur-submit')
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-editable[data-qa-probe="blur-submit"]')!
    return {
      value: el.getAttribute('value'),
      displayText: el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!.textContent,
      displayVisible: !el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!.hidden,
    }
  })
  expect(after.value, '失焦应提交新值').toBe('失焦提交的值')
  expect(after.displayText).toBe('失焦提交的值')
  expect(after.displayVisible).toBe(true)
  const log = await readLog(page, 'oas-editable[data-qa-probe="blur-submit"]')
  expect(
    log.some((l) => l.type === 'oas-change' && (l.detail as { value: string }).value === '失焦提交的值'),
    '失焦提交应派发 oas-change',
  ).toBe(true)
})

test('editable disabled：点击文本不进入编辑态', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-editable[disabled]')
  await defocus(page)
  // display 带 aria-disabled=true，playwright actionability 会拒绝点击；
  // 真实用户仍可点击（浏览器照常派发 click），组件靠 disabled 守卫拦截进入编辑——用 force 走真实事件路径
  await page.locator('oas-editable[disabled] [part="display"]').click({ force: true })
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-editable[disabled]')!
    const display = el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!
    const edit = el.shadowRoot!.querySelector<HTMLElement>('.edit')
    return {
      displayVisible: !display.hidden,
      editHidden: edit ? edit.hidden : null,
      editing: el.hasAttribute('editing'),
    }
  })
  expect(r.displayVisible, 'disabled 下点击文本应保持展示态').toBe(true)
  expect(r.editHidden, '编辑容器应保持隐藏').toBe(true)
  expect(r.editing, '不应反射 editing 属性').toBe(false)
})
