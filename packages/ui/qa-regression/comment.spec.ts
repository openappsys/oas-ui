// 复核回归：comment——内置输入行与 resolve 态（PRD「未发布：P1/P2 组件能力批」③）。
// 真实路径：真实键盘输入 → Enter 提交 → 宿主回显追加；真实点击 resolve 钮 → 事件 detail + 宿主写回后的样式断言。
// 反证点：若输入行未渲染 / Enter 不派发 / resolve 只派发不写回样式，对应断言红。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('comment 内置输入行：真实键盘输入 → Enter 提交 → 宿主回显追加子评论（console 零告警）', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    // 只收组件自身告警（浏览器级 warning 非组件缺陷）
    if (msg.type() === 'error' || (msg.type() === 'warning' && /^\[oas-/.test(msg.text()))) errors.push(msg.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/components/comment.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-comment')

  // 注入容器实例（默认输入行 + resolvable），宿主监听 oas-submit 把文本追加进默认插槽（数据驱动写回范式）
  await page.evaluate(() => {
    const el = document.createElement('oas-comment')
    el.id = 'comment-composer-e2e'
    el.setAttribute('comment-id', 'topic-e2e')
    el.setAttribute('resolvable', '')
    el.innerHTML = '<p slot="content">提交回环容器</p>'
    document.body.appendChild(el)
    el.addEventListener('oas-submit', (e) => {
      const text = (e as CustomEvent).detail.text as string
      const child = document.createElement('oas-comment')
      child.setAttribute('comment-id', `reply-${text}`)
      child.setAttribute('resolvable', '')
      child.innerHTML = '<p slot="content"></p>'
      child.querySelector('p')!.textContent = text
      el.appendChild(child)
    })
  })
  await up(page, '#comment-composer-e2e')

  // 真实键盘输入：聚焦 shadow 内 textarea → type → 先 Shift+Enter（换行不提交）→ 再 Enter 提交
  await page.evaluate(() => {
    document.querySelector('#comment-composer-e2e')!.shadowRoot!.querySelector('textarea')!.focus()
  })
  await page.keyboard.type('e2e 回归评论')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('第二行')
  await page.keyboard.press('Enter')

  const r = await page.evaluate(() => {
    const box = document.querySelector('#comment-composer-e2e')!
    const input = box.shadowRoot!.querySelector('textarea')!
    const kids = [...box.querySelectorAll(':scope > oas-comment')]
    return {
      kidCount: kids.length,
      echoed: kids.some((k) => k.querySelector('p[slot="content"]')?.textContent === 'e2e 回归评论\n第二行'),
      cleared: input.value === '',
      composerVisible: !box.shadowRoot!.querySelector('[part="composer"]')!.hasAttribute('hidden'),
    }
  })
  expect(r.kidCount, '宿主写回：默认插槽追加了一条子评论').toBe(1)
  expect(r.echoed, '回显文本含 Shift+Enter 换行后的两行内容').toBe(true)
  expect(r.cleared, '提交后输入行清空').toBe(true)
  expect(r.composerVisible, '输入行默认可见').toBe(true)
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})

test('comment inputtable="false"：输入行隐藏（宿主框架动态切换属性生效）', async ({ page }) => {
  await page.goto('/components/comment.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-comment')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-comment')
    el.id = 'comment-off-e2e'
    el.setAttribute('inputtable', 'false')
    el.innerHTML = '<p slot="content">纯展示</p>'
    document.body.appendChild(el)
    const hidden = () => el.shadowRoot!.querySelector('[part="composer"]')!.hasAttribute('hidden')
    const before = hidden()
    el.setAttribute('inputtable', 'true')
    const after = hidden()
    return { before, after }
  })
  expect(r.before, 'inputtable="false" 时输入行隐藏').toBe(true)
  expect(r.after, '运行时切回 true 后输入行显示').toBe(false)
})

test('comment resolve：真实点击触发钮 → detail { id, resolved } → 宿主写回后划线/弱色生效（明暗两态，console 零告警）', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || (msg.type() === 'warning' && /^\[oas-/.test(msg.text()))) errors.push(msg.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/components/comment.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-comment')

  // 注入条目 + 宿主写回（demo 同款逻辑：oas-resolve → setAttribute/removeAttribute resolved）
  await page.evaluate(() => {
    const el = document.createElement('oas-comment')
    el.id = 'comment-resolve-e2e'
    el.setAttribute('comment-id', 'issue-e2e-1')
    el.setAttribute('resolvable', '')
    el.innerHTML = '<span slot="author">张三</span><span slot="time">刚刚</span><p slot="content">待解决条目</p>'
    document.body.appendChild(el)
    el.addEventListener('oas-resolve', (e) => {
      const { resolved } = (e as CustomEvent).detail as { resolved: boolean }
      const item = (e.target as HTMLElement).closest('oas-comment')!
      if (resolved) item.setAttribute('resolved', '')
      else item.removeAttribute('resolved')
    })
  })
  await up(page, '#comment-resolve-e2e')

  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('#comment-resolve-e2e')!
      const sr = el.shadowRoot!
      const btn = sr.querySelector('[part="resolve"]') as HTMLElement
      const flag = sr.querySelector('[part="resolved-flag"]') as HTMLElement
      const content = sr.querySelector('[part="content"]') as HTMLElement
      const probe = document.createElement('div')
      probe.style.color = 'var(--oas-color-text-disabled)'
      document.body.appendChild(probe)
      const weakToken = getComputedStyle(probe).color
      probe.remove()
      return {
        btnHidden: btn.hasAttribute('hidden'),
        btnText: btn.textContent,
        ariaPressed: btn.getAttribute('aria-pressed'),
        flagVisible: !flag.hasAttribute('hidden'),
        flagText: flag.textContent,
        lineThrough: getComputedStyle(content).textDecorationLine,
        contentColor: getComputedStyle(content).color,
        weakToken,
      }
    })

  // 未解决态：钮可见、flag 隐藏、无划线
  const open = await read()
  expect(open.btnHidden, 'resolvable 在场时触发钮可见').toBe(false)
  expect(open.btnText, '未解决态按钮文案（标记为已解决 / i18n）').toMatch(/标记为已解决|Mark as resolved/)
  expect(open.ariaPressed).toBe('false')
  expect(open.flagVisible, '未解决态无已解决标记').toBe(false)
  expect(open.lineThrough, '未解决态正文无划线').not.toBe('line-through')

  // 真实点击 resolve 钮 → 宿主写回 resolved → 样式生效
  await realClick(page, '#comment-resolve-e2e', '[part="resolve"]')
  await page.waitForFunction(
    () => document.querySelector('#comment-resolve-e2e')!.hasAttribute('resolved'),
    undefined,
    { timeout: 5000 },
  )
  const done = await read()
  expect(done.flagVisible, '已解决态标记可见').toBe(true)
  expect(done.flagText, '已解决标记文案').toMatch(/已解决|Resolved/)
  expect(done.ariaPressed, 'aria-pressed 同步 true').toBe('true')
  expect(done.btnText, '按钮切 unresolve 文案').toMatch(/取消解决|Unmark resolution/)
  expect(done.lineThrough, '正文划线生效').toBe('line-through')

  // 宿主写回后再次点击 → detail resolved:false → 回到未解决态
  await realClick(page, '#comment-resolve-e2e', '[part="resolve"]')
  await page.waitForFunction(
    () => !document.querySelector('#comment-resolve-e2e')!.hasAttribute('resolved'),
    undefined,
    { timeout: 5000 },
  )
  const reopened = await read()
  expect(reopened.lineThrough, '取消解决后划线移除').not.toBe('line-through')
  expect(reopened.flagVisible, '取消解决后标记隐藏').toBe(false)

  // 暗色：写回 resolved 后弱色 token 翻转（与明色不同、与 token probe 一致）
  await page.evaluate(() => {
    document.querySelector('#comment-resolve-e2e')!.setAttribute('resolved', '')
    document.documentElement.classList.add('dark')
  })
  await expect.poll(async () => (await read()).contentColor !== reopened.contentColor).toBe(true)
  const dark = await read()
  expect(dark.lineThrough, '暗色下划线保持').toBe('line-through')
  expect(dark.contentColor, '暗色弱色与明色不同（token 翻转）').not.toBe(done.contentColor)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))

  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})
