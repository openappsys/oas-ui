// 复核回归：共享浮层栈（Esc LIFO + 统一 body 滚动锁）——跨组件缺陷固化断言。
//
// 历史缺陷：
// 1) modal 与 drawer 各自监听 document keydown 处理 Esc → 多层同开时一次 Esc 同时关闭多层；
// 2) 两套 body 滚动锁各自计数并记录「原值」→ 特定关闭顺序下互相覆盖，body 永久锁死；
// 3) tour 直接写 body.style.overflow='' 抹掉宿主已有的 inline 值。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 注入一个打开态的 modal + drawer（两者均由文档站全局注册） */
async function openBoth(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    for (const id of ['e2e-stack-modal', 'e2e-stack-drawer']) document.getElementById(id)?.remove()
    const modal = document.createElement('oas-modal')
    modal.id = 'e2e-stack-modal'
    modal.setAttribute('visible', '')
    modal.innerHTML = '<p>modal</p>'
    const drawer = document.createElement('oas-drawer')
    drawer.id = 'e2e-stack-drawer'
    drawer.setAttribute('visible', '')
    drawer.innerHTML = '<p>drawer</p>'
    document.body.append(modal, drawer)
  })
  await page.waitForFunction(
    () =>
      !!document.querySelector('oas-modal#e2e-stack-modal[visible]') &&
      !!document.querySelector('oas-drawer#e2e-stack-drawer[visible]'),
  )
}

test('浮层 Esc 层栈：modal + drawer 同开时一次 Esc 只关一层（不再连带全关）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await openBoth(page)

  const visibleCount = () =>
    page.evaluate(
      () =>
        document.querySelectorAll('oas-modal#e2e-stack-modal[visible], oas-drawer#e2e-stack-drawer[visible]').length,
    )

  expect(await visibleCount()).toBe(2)
  await page.keyboard.press('Escape')
  // Esc 关闭为同步处理器：立即读取
  expect(await visibleCount(), '一次 Esc 只能关闭一层').toBe(1)
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () =>
      !document.querySelector('oas-modal#e2e-stack-modal[visible]') &&
      !document.querySelector('oas-drawer#e2e-stack-drawer[visible]'),
  )
})

test('浮层滚动锁交叉：modal 关闭后 body 仍锁（drawer 持锁），全部关闭恢复宿主 inline 原值', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  // 宿主已有 inline overflow：关闭后必须恢复 'scroll'（tour 曾把它抹成 ''）
  await page.evaluate(() => {
    document.body.style.overflow = 'scroll'
  })
  await openBoth(page)
  await page.waitForFunction(() => document.body.style.overflow === 'hidden')

  // 关闭 modal（drawer 仍打开）：共享计数锁不得释放
  await page.evaluate(() => document.querySelector('oas-modal#e2e-stack-modal')?.removeAttribute('visible'))
  await page.waitForFunction(() => !document.querySelector('oas-modal#e2e-stack-modal[visible]'))
  expect(await page.evaluate(() => document.body.style.overflow), 'drawer 仍打开时必须保持锁定').toBe('hidden')

  // 关闭 drawer：最后一层释放，恢复宿主原值
  await page.evaluate(() => document.querySelector('oas-drawer#e2e-stack-drawer')?.removeAttribute('visible'))
  await page.waitForFunction(() => !document.querySelector('oas-drawer#e2e-stack-drawer[visible]'))
  await page.waitForFunction(() => document.body.style.overflow === 'scroll', undefined, { timeout: 5000 })
})

test('tour lock-scroll：关闭后恢复宿主 inline overflow 原值（不抹成空）', async ({ page }) => {
  await page.goto('/components/tour.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tour')
  await page.evaluate(() => {
    document.body.style.overflow = 'scroll'
    document.getElementById('e2e-tour-lock')?.remove()
    const tour = document.createElement('oas-tour')
    tour.id = 'e2e-tour-lock'
    tour.setAttribute('lock-scroll', 'true')
    tour.setAttribute('open', '')
    tour.setAttribute('steps', JSON.stringify([{ title: '第一步', description: '说明' }]))
    document.body.appendChild(tour)
  })
  await page.waitForFunction(() => document.body.style.overflow === 'hidden')
  await page.evaluate(() => document.getElementById('e2e-tour-lock')?.removeAttribute('open'))
  await page.waitForFunction(() => document.body.style.overflow === 'scroll', undefined, { timeout: 5000 })
})

test('浮层断开/重连对称：打开态重连后重获滚动锁与 Esc 层，二次断开不遗留', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await page.evaluate(() => {
    document.getElementById('e2e-stack-reconnect')?.remove()
    const modal = document.createElement('oas-modal')
    modal.id = 'e2e-stack-reconnect'
    modal.setAttribute('visible', '')
    modal.innerHTML = '<p>modal</p>'
    document.body.appendChild(modal)
  })
  await page.waitForFunction(() => document.body.style.overflow === 'hidden')

  // 打开态断开再重连：必须重获滚动锁（修复前 isOpen 未重置，重连后无锁无 Esc 层）
  await page.evaluate(() => {
    const modal = document.getElementById('e2e-stack-reconnect')!
    modal.remove()
    document.body.appendChild(modal)
  })
  await page.waitForFunction(() => document.body.style.overflow === 'hidden', undefined, { timeout: 5000 })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('oas-modal#e2e-stack-reconnect[visible]'), undefined, {
    timeout: 5000,
  })

  // 再打开 → 二次断开：onCleanup 已消费过一次，仍需释放（修复前 body 永久锁死 + 幽灵 Esc 层）
  await page.evaluate(() => {
    const modal = document.getElementById('e2e-stack-reconnect')!
    modal.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.body.style.overflow === 'hidden')
  await page.evaluate(() => document.getElementById('e2e-stack-reconnect')?.remove())
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden', undefined, { timeout: 5000 })
})

test('dropdown/context-menu 打开态断开重连后 Esc 仍可关闭（wasOpen 边沿重置）', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown')
  await page.evaluate(() => {
    document.getElementById('e2e-reconnect-dd')?.remove()
    const d = document.createElement('oas-dropdown')
    d.id = 'e2e-reconnect-dd'
    d.setAttribute('items', JSON.stringify([{ label: '编辑', value: 'edit' }]))
    const b = document.createElement('button')
    b.textContent = '菜单'
    d.appendChild(b)
    document.body.appendChild(d)
  })
  await page.evaluate(() =>
    document.querySelector('#e2e-reconnect-dd > button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
  await page.waitForFunction(() => document.querySelector('#e2e-reconnect-dd')?.hasAttribute('open'))
  await page.evaluate(() => {
    const d = document.getElementById('e2e-reconnect-dd')!
    d.remove()
    document.body.appendChild(d)
  })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('#e2e-reconnect-dd')?.hasAttribute('open'), undefined, {
    timeout: 5000,
  })

  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-context-menu')
  await page.evaluate(() => {
    document.getElementById('e2e-reconnect-cm')?.remove()
    const cm = document.createElement('oas-context-menu') as HTMLElement & { show: (x: number, y: number) => void }
    cm.id = 'e2e-reconnect-cm'
    cm.setAttribute('items', JSON.stringify([{ label: '复制', value: 'copy' }]))
    const area = document.createElement('div')
    area.textContent = '右键'
    cm.appendChild(area)
    document.body.appendChild(cm)
    cm.show(100, 100)
  })
  await page.waitForFunction(() => document.querySelector('#e2e-reconnect-cm')?.hasAttribute('open'))
  await page.evaluate(() => {
    const cm = document.getElementById('e2e-reconnect-cm')!
    cm.remove()
    document.body.appendChild(cm)
  })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('#e2e-reconnect-cm')?.hasAttribute('open'), undefined, {
    timeout: 5000,
  })
})
