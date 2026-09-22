// 复核回归：editable——浏览器级固化断言。
// 覆盖：点击文本进入编辑态（display 隐藏、input 可见聚焦带值）→ Enter 提交派发 oas-change
// + demo 反馈文本（#edit-output）、Esc 取消恢复原文派发 oas-cancel、失焦提交（默认
// submit-on-blur）、disabled 不可进入编辑、多行 hidden 挂载的零尺寸守卫（变可见后不塌陷）。

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

test('editable 多行 hidden 挂载 → 可见：字段高与可见容器直接渲染一致且 >0（不塌陷裁切）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#edit-event')
  await defocus(page)

  // 浏览器级量测：容器 display:none 时 scrollHeight=0，若据此写死字段高，变可见后
  // 不触发 input/update 就不会复测 → 编辑框塌陷（CSS min-height 只兜 1 行，第二行被裁）。
  const measured = await page.evaluate(async () => {
    const nextFrames = async (n: number) => {
      for (let i = 0; i < n; i++) await new Promise((res) => requestAnimationFrame(() => res(null)))
    }
    const make = async (id: string, hidden: boolean) => {
      const box = document.createElement('div')
      box.id = `${id}-box`
      box.style.display = hidden ? 'none' : 'block'
      box.style.width = '400px'
      const el = document.createElement('oas-editable')
      el.id = id
      el.setAttribute('multiline', '')
      el.setAttribute('value', '第一行\n第二行')
      box.appendChild(el)
      document.body.appendChild(box)
      el.setAttribute('editing', '')
      await nextFrames(3)
      return el
    }
    // 对照组：可见容器中直接渲染编辑态
    const control = await make('qa-ml-control', false)
    const controlTa = control.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    const controlHeight = controlTa.getBoundingClientRect().height
    document.getElementById('qa-ml-control-box')!.remove()
    // 实验组：hidden 容器挂载编辑态 → 置为可见（全程无 input/update 触发）
    const probe = await make('qa-ml-probe', true)
    document.getElementById('qa-ml-probe-box')!.style.display = 'block'
    await nextFrames(4)
    const ta = probe.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    const rect = ta.getBoundingClientRect()
    return { controlHeight, probeStyleHeight: ta.style.height, probeHeight: rect.height, probeWidth: rect.width }
  })

  expect(measured.probeWidth, 'hidden→visible 后编辑框应可见').toBeGreaterThan(0)
  expect(measured.probeStyleHeight, '量到 0 不得写入 0px 内联高').not.toBe('0px')
  expect(measured.probeHeight, '编辑框不应塌陷（高度 >0）').toBeGreaterThan(0)
  expect(
    Math.abs(measured.probeHeight - measured.controlHeight),
    `hidden 挂载自愈后高度(${measured.probeHeight})应与可见容器直接渲染(${measured.controlHeight})一致`,
  ).toBeLessThanOrEqual(1)

  // 可见 + 可输入：录入第三行 → 高度随内容增长（自愈后编辑链路完好）
  const ta = page.locator('#qa-ml-probe textarea')
  await expect(ta).toBeVisible()
  await ta.fill('第一行\n第二行\n第三行')
  await page.waitForTimeout(100)
  const grown = await page.evaluate(() => {
    const field = document.querySelector('#qa-ml-probe')!.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    return { height: field.getBoundingClientRect().height, styleHeight: field.style.height, value: field.value }
  })
  expect(grown.value, '编辑框应接受输入').toBe('第一行\n第二行\n第三行')
  expect(grown.styleHeight, '输入后内联高应为实测像素（非 0px）').not.toBe('0px')
  expect(grown.height, '输入第三行后应随内容长高').toBeGreaterThan(measured.probeHeight)
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
