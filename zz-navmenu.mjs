import { chromium } from '@playwright/test'
const b = await chromium.launch()
const errors = []
const p = await b.newPage({ viewport: { width: 1280, height: 950 } })
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
p.on('pageerror', (e) => errors.push(String(e)))
await p.goto('http://localhost:4199/components/navigation-menu.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)

const menus = await p.locator('oas-navigation-menu').all()
console.log('实例数:', menus.length)

for (let i = 0; i < menus.length; i++) {
  await menus[i].scrollIntoViewIfNeeded()
  await p.waitForTimeout(200)
  const info = await p.evaluate((idx) => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')][idx]
    const root = nav.shadowRoot
    const items = [...root.querySelectorAll('[part="top-item"]')]
    const trigger = items[0]
    if (!trigger) return null
    const r = trigger.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: trigger.textContent.trim().slice(0, 16) }
  }, i)
  if (!info) { console.log(`#${i}: 无 top-item`); continue }
  await p.mouse.move(info.x, info.y)
  await p.waitForTimeout(650)
  const panel = await p.evaluate((idx) => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')][idx]
    const vp = nav.shadowRoot.querySelector('[part=viewport]')
    if (!vp) return null
    const cs = getComputedStyle(vp)
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0
    const r = vp.getBoundingClientRect()
    return { visible, x: r.x + r.width / 2, y: r.y + Math.min(r.height * 0.3, 80), z: cs.zIndex, pe: cs.pointerEvents }
  }, i)
  if (!panel || !panel.visible) { console.log(`#${i} [${info.label}]: 面板未开`); await p.mouse.move(5, 5); await p.waitForTimeout(250); continue }
  await p.mouse.move((info.x + panel.x) / 2, (info.y + panel.y) / 2, { steps: 6 })
  await p.mouse.move(panel.x, panel.y, { steps: 6 })
  await p.waitForTimeout(800)
  const still = await p.evaluate((idx) => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')][idx]
    const vp = nav.shadowRoot.querySelector('[part=viewport]')
    const cs = getComputedStyle(vp)
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0
  }, i)
  console.log(`#${i} [${info.label}]: 开=${panel.visible} z=${panel.z} pe=${panel.pe} 移入后仍开=${still === true ? '✓' : '✗ 收回'}`)
  await p.mouse.move(5, 5)
  await p.waitForTimeout(350)
}
console.log('console 错误:', errors.length === 0 ? '无' : errors.slice(0, 3).join(' | '))
await b.close()
