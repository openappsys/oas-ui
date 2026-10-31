// 个人回归：oas-diff-viewer 行级/词级差异、折叠、并排降级、虚拟滚动与键盘固化。

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { up } from './helpers'

async function open(page: Page): Promise<void> {
  await page.goto('/components/diff-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dv-basic')
}

test('diff-viewer 渲染行级/词级差异与统计', async ({ page }) => {
  await open(page)
  const state = await page.evaluate(() => {
    const el = document.querySelector('#dv-basic') as HTMLElement & { stats: Record<string, number> }
    const root = el.shadowRoot!
    return {
      stats: el.stats,
      ops: [...root.querySelectorAll('[part="row"]')].map((row) => row.getAttribute('data-op')),
      words: [...root.querySelectorAll('.seg.changed')].map((node) => node.textContent),
      added: root.querySelector('[part="added"]')?.textContent,
      removed: root.querySelector('[part="removed"]')?.textContent,
      tableRole: root.querySelector('[part="viewport"]')?.getAttribute('role'),
      activePointer: root.getElementById(
        root.querySelector('[part="viewport"]')?.getAttribute('aria-activedescendant') ?? '',
      ),
    }
  })
  expect(state.stats).toMatchObject({ added: 3, removed: 3 })
  expect(state.ops).toContain('delete')
  expect(state.ops).toContain('insert')
  expect(state.words.length).toBeGreaterThan(0)
  expect(state.words).toEqual(expect.arrayContaining(['false', 'true']))
  expect(state.added).toBe('+3')
  expect(state.removed).toBe('−3')
  expect(state.tableRole).toBe('grid')
  expect(state.activePointer).not.toBeNull()
})

test('diff-viewer 折叠块点击/键盘展开，批量按钮生效', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const el = document.querySelector('#dv-fold') as HTMLElement & { expandAll(): void; collapseAll(): void }
    ;(window as unknown as { __toggles: unknown[] }).__toggles = []
    el.addEventListener('oas-hunk-toggle', (event) => {
      ;(window as unknown as { __toggles: unknown[] }).__toggles.push((event as CustomEvent).detail)
    })
  })
  const before = await page.evaluate(
    () => document.querySelector('#dv-fold')!.shadowRoot!.querySelectorAll('[part="fold"]').length,
  )
  expect(before).toBeGreaterThan(0)

  await page.locator('#dv-fold [part="fold-toggle"]').first().click()
  await page.waitForFunction(() => (window as unknown as { __toggles?: unknown[] }).__toggles?.length === 1)
  const afterClick = await page.evaluate(() => {
    const el = document.querySelector('#dv-fold')!
    return {
      folds: el.shadowRoot!.querySelectorAll('[part="fold"]').length,
      detail: (window as unknown as { __toggles: unknown[] }).__toggles[0],
    }
  })
  expect(afterClick.folds).toBe(before)
  expect(afterClick.detail).toMatchObject({ expanded: true })

  await page.locator('#dv-expand').click()
  await page.waitForFunction(
    (count) => document.querySelector('#dv-fold')!.shadowRoot!.querySelectorAll('[part="fold"]').length === count,
    before,
  )
  await page.locator('#dv-collapse').click()
  await page.waitForFunction(
    () => document.querySelector('#dv-fold')!.shadowRoot!.querySelectorAll('[part="fold"]').length > 0,
  )

  // 键盘：Home 后 Enter 展开首个折叠块（展开后 fold 仍保留）
  const viewport = page.locator('#dv-fold [part="viewport"]')
  await viewport.focus()
  await page.keyboard.press('Home')
  const foldsBeforeKey = await page.evaluate(
    () => document.querySelector('#dv-fold')!.shadowRoot!.querySelectorAll('[part="fold"]').length,
  )
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    (count) => document.querySelector('#dv-fold')!.shadowRoot!.querySelectorAll('[part="fold"]').length === count,
    foldsBeforeKey,
  )
  // 展开后焦点交还视口，避免按钮被替换后掉回 body
  const focusPart = await page.evaluate(
    () => document.querySelector('#dv-fold')!.shadowRoot!.activeElement?.getAttribute('part') ?? null,
  )
  expect(focusPart).toBe('viewport')
})

test('diff-viewer 折叠按钮上按 Enter 只展开它自己', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const el = document.createElement('oas-diff-viewer')
    el.id = 'dv-fold-probe'
    el.setAttribute('height', '200')
    el.setAttribute('context', '2')
    el.style.width = '600px'
    const head = Array.from({ length: 8 }, (_, i) => `head-${i + 1}`)
    const tail = Array.from({ length: 8 }, (_, i) => `tail-${i + 1}`)
    el.setAttribute('old-text', [...head, 'old', ...tail].join('\n'))
    el.setAttribute('new-text', [...head, 'new', ...tail].join('\n'))
    document.body.append(el)
  })
  await page.waitForFunction(
    () => (document.querySelector('#dv-fold-probe')?.shadowRoot?.querySelectorAll('[part="fold"]').length ?? 0) === 2,
  )
  await page.locator('#dv-fold-probe [part="fold-toggle"]').nth(1).focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => (document.querySelector('#dv-fold-probe')?.shadowRoot?.querySelectorAll('[part="fold"]').length ?? 0) === 2,
  )
  const remaining = await page.evaluate(() =>
    document.querySelector('#dv-fold-probe')!.shadowRoot!.querySelector('[part="fold"]')?.getAttribute('data-fold'),
  )
  expect(remaining).toBe('0')
  await page.evaluate(() => document.querySelector('#dv-fold-probe')?.remove())
})

test('diff-viewer 并排视图与窄容器降级', async ({ page }) => {
  await open(page)
  // 先保证容器足够宽（docs 内容列可能小于默认 640），再验证降级
  await page.evaluate(() => {
    const el = document.querySelector('#dv-split') as HTMLElement
    el.style.width = '900px'
  })
  await page.waitForFunction(() => (document.querySelector('#dv-split') as HTMLElement).dataset.mode === 'split')
  const split = await page.evaluate(() => {
    const el = document.querySelector('#dv-split') as HTMLElement & { clientWidth: number }
    const root = el.shadowRoot!
    return {
      mode: el.dataset.mode,
      attr: el.getAttribute('mode'),
      beforeCells: root.querySelectorAll('[part="before-code"]').length,
      afterCells: root.querySelectorAll('[part="after-code"]').length,
      head: root.querySelector('[part="split-head"]')?.hasAttribute('hidden'),
      label: root.querySelector('[part="before-label"]')?.textContent,
    }
  })
  expect(split).toMatchObject({ mode: 'split', attr: 'split', beforeCells: split.afterCells, head: false })
  expect(split.label).toBe('v2.6.3')

  // 窄容器：ResizeObserver 降级 unified，但 mode 属性不改写
  await page.evaluate(() => {
    const el = document.querySelector('#dv-split') as HTMLElement
    el.style.width = '360px'
  })
  await page.waitForFunction(() => (document.querySelector('#dv-split') as HTMLElement).dataset.mode === 'unified')
  const degraded = await page.evaluate(() => {
    const el = document.querySelector('#dv-split') as HTMLElement
    return {
      attr: el.getAttribute('mode'),
      beforeCells: el.shadowRoot!.querySelectorAll('[part="before-code"]').length,
    }
  })
  expect(degraded.attr).toBe('split')
  expect(degraded.beforeCells).toBe(0)
})

test('diff-viewer 3000 行虚拟窗口有界，滚动与键盘可用', async ({ page }) => {
  await open(page)
  await page.waitForFunction(
    () => (document.querySelector('#dv-large')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )
  const before = await page.evaluate(() => {
    const el = document.querySelector('#dv-large')!
    const root = el.shadowRoot!
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
    return {
      rows: root.querySelectorAll('[part="row"]').length,
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
      firstIndex: root.querySelector('[part="row"]')?.getAttribute('data-index'),
    }
  })
  expect(before.rows).toBeGreaterThan(0)
  expect(before.rows).toBeLessThan(80)
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight * 20)

  await page.evaluate(() => {
    const viewport = document.querySelector('#dv-large')!.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    viewport.scrollTop = viewport.scrollHeight / 2
    viewport.dispatchEvent(new Event('scroll'))
  })
  // 虚拟窗口重建按帧节流：双 rAF 等重建落定（aria-activedescendant/行集读取的前置条件）
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  )
  const after = await page.evaluate(() => {
    const el = document.querySelector('#dv-large')!
    const root = el.shadowRoot!
    const viewport = root.querySelector('[part="viewport"]')
    const activeId = viewport?.getAttribute('aria-activedescendant') ?? null
    return {
      rows: root.querySelectorAll('[part="row"]').length,
      firstIndex: root.querySelector('[part="row"]')?.getAttribute('data-index'),
      // 指针滚动不强行改写活动行：活动行越窗时允许移除 aria-activedescendant，但不得指向失联节点
      activePointerValid: activeId == null || root.getElementById(activeId) != null,
    }
  })
  expect(after.rows).toBeGreaterThan(0)
  expect(after.rows).toBeLessThan(80)
  expect(after.firstIndex).not.toBe(before.firstIndex)
  expect(after.activePointerValid).toBe(true)

  // 键盘 PageDown 移动活动行并保持可见
  const viewport = page.locator('#dv-large [part="viewport"]')
  await viewport.focus()
  const activeBefore = await page.evaluate(
    () => document.querySelector('#dv-large')!.shadowRoot!.querySelector('[part="row"].active')?.id,
  )
  await page.keyboard.press('PageDown')
  const activeAfter = await page.evaluate(
    () => document.querySelector('#dv-large')!.shadowRoot!.querySelector('[part="row"].active')?.id,
  )
  expect(activeAfter).not.toBe(activeBefore)
})

test('diff-viewer scrollToChange 定位变更块', async ({ page }) => {
  await open(page)
  const result = await page.evaluate(() => {
    const el = document.querySelector('#dv-large') as HTMLElement & { scrollToChange(index: number): boolean }
    const ok = el.scrollToChange(1)
    const root = el.shadowRoot!
    const active = root.querySelector('[part="row"].active')
    return {
      ok,
      op: active?.getAttribute('data-op'),
      scrollTop: root.querySelector<HTMLElement>('[part="viewport"]')!.scrollTop,
      invalid: el.scrollToChange(99),
    }
  })
  expect(result.ok).toBe(true)
  expect(result.invalid).toBe(false)
  expect(result.op).not.toBeNull()
  expect(result.scrollTop).toBeGreaterThan(0)
})

test('diff-viewer wrap 模式 scrollToChange 与键盘落点可见', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const el = document.createElement('oas-diff-viewer')
    el.id = 'dv-wrap-probe'
    el.setAttribute('height', '200')
    el.setAttribute('wrap', '')
    el.setAttribute('context', '500')
    el.style.width = '520px'
    const long = (i: number) => `line-${i} ${'x'.repeat(160)}`
    const oldLines = Array.from({ length: 40 }, (_, i) => long(i))
    const newLines = [...oldLines]
    newLines[30] = `${long(30)} CHANGED`
    el.setAttribute('old-text', oldLines.join('\n'))
    el.setAttribute('new-text', newLines.join('\n'))
    document.body.append(el)
  })
  await page.waitForFunction(
    () => (document.querySelector('#dv-wrap-probe')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )
  const result = await page.evaluate(() => {
    const el = document.querySelector('#dv-wrap-probe') as HTMLElement & { scrollToChange(index: number): boolean }
    el.scrollToChange(0)
    const root = el.shadowRoot!
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
    const active = root.querySelector<HTMLElement>('[part="row"].active')!
    const vp = viewport.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    return {
      visible: box.top >= vp.top - 1 && box.bottom <= vp.bottom + 1,
      activeHeight: box.height,
      scrollTop: viewport.scrollTop,
    }
  })
  expect(result.visible).toBe(true)
  expect(result.activeHeight).toBeGreaterThan(22)
  expect(result.scrollTop).toBeGreaterThan(0)

  // 键盘 End 后活动行仍在视口内
  const end = await page.evaluate(() => {
    const el = document.querySelector('#dv-wrap-probe')!
    const root = el.shadowRoot!
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    const active = root.querySelector<HTMLElement>('[part="row"].active')!
    const vp = viewport.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    return box.top >= vp.top - 1 && box.bottom <= vp.bottom + 1
  })
  expect(end).toBe(true)
  await page.evaluate(() => document.querySelector('#dv-wrap-probe')?.remove())
})

test('diff-viewer RTL：并排旧文本保持在起始侧（右），行号镜像', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl'
    const el = document.querySelector('#dv-split') as HTMLElement
    el.style.width = '900px'
  })
  await page.waitForFunction(() => (document.querySelector('#dv-split') as HTMLElement).dataset.mode === 'split')
  const boxes = await page.evaluate(() => {
    const el = document.querySelector('#dv-split')!
    const row = el.shadowRoot!.querySelector('[part="row"]')!
    const before = row.querySelector('[part="before-code"]')!.getBoundingClientRect()
    const after = row.querySelector('[part="after-code"]')!.getBoundingClientRect()
    return { beforeX: before.x, afterX: after.x, beforeW: before.width, afterW: after.width }
  })
  expect(boxes.beforeX).toBeGreaterThan(boxes.afterX)
  expect(Math.abs(boxes.beforeW - boxes.afterW)).toBeLessThan(2)
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr'
  })
})

test('diff-viewer 暗色与 axe 零严重违规', async ({ page }) => {
  await open(page)
  const light = await new AxeBuilder({ page }).include('oas-diff-viewer').analyze()
  expect(light.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  const lightInsertBg = await page.evaluate(() => {
    const el = document.querySelector('#dv-basic')!
    const row = el.shadowRoot!.querySelector<HTMLElement>('[part="row"][data-op="insert"]')!
    return getComputedStyle(row).backgroundColor
  })

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  // dark token 翻转完成的真实信号：insert 行背景已偏离 light 值（即断言读取的前置条件）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('#dv-basic')!
        const row = el.shadowRoot!.querySelector<HTMLElement>('[part="row"][data-op="insert"]')!
        return getComputedStyle(row).backgroundColor
      }),
    )
    .not.toBe(lightInsertBg)
  const colors = await page.evaluate(() => {
    const el = document.querySelector('#dv-basic')!
    const row = el.shadowRoot!.querySelector<HTMLElement>('[part="row"][data-op="insert"]')!
    const code = row.querySelector<HTMLElement>('[part="code"]')!
    return {
      rowBg: getComputedStyle(row).backgroundColor,
      color: getComputedStyle(code).color,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    }
  })
  expect(colors.rowBg).not.toBe('rgba(0, 0, 0, 0)')
  expect(colors.color).not.toBe(colors.bodyBg)

  const dark = await new AxeBuilder({ page }).include('oas-diff-viewer').analyze()
  expect(dark.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
