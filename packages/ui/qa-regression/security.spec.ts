import { expect, test } from '@playwright/test'

const PAYLOAD = 'red" onload="window.__oas_xss=1'

test('安全：URL/SVG 属性注入不产生可执行属性', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-button') != null)
  const button = await page.evaluate(async () => {
    const el = document.createElement('oas-button')
    el.setAttribute('href', 'javascript:window.__oas_xss=1')
    el.textContent = 'unsafe'
    document.body.appendChild(el)
    await new Promise((resolve) => setTimeout(resolve, 0))
    return {
      anchor: !!el.shadowRoot?.querySelector('a'),
      xss: (window as unknown as { __oas_xss?: number }).__oas_xss ?? 0,
    }
  })
  expect(button.anchor).toBe(false)
  expect(button.xss).toBe(0)

  await page.goto('/components/qrcode.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-qrcode') != null)
  const qrcode = await page.evaluate(async (payload) => {
    const el = document.createElement('oas-qrcode')
    el.setAttribute('value', 'HELLO')
    el.setAttribute('color', payload)
    el.setAttribute('bg-color', payload)
    document.body.appendChild(el)
    await new Promise((resolve) => setTimeout(resolve, 0))
    return {
      injected: [...(el.shadowRoot?.querySelectorAll('*') ?? [])].some(
        (node) => node.hasAttribute('onload') || node.hasAttribute('onmouseover'),
      ),
      xss: (window as unknown as { __oas_xss?: number }).__oas_xss ?? 0,
    }
  }, PAYLOAD)
  expect(qrcode.injected).toBe(false)
  expect(qrcode.xss).toBe(0)

  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-tag') != null)
  const tag = await page.evaluate(async (payload) => {
    const el = document.createElement('oas-tag')
    el.setAttribute('href', payload)
    el.textContent = 'unsafe'
    document.body.appendChild(el)
    await new Promise((resolve) => setTimeout(resolve, 0))
    return {
      injected: [...(el.shadowRoot?.querySelectorAll('*') ?? [])].some(
        (node) => node.hasAttribute('onload') || node.hasAttribute('onmouseover'),
      ),
      xss: (window as unknown as { __oas_xss?: number }).__oas_xss ?? 0,
    }
  }, PAYLOAD)
  expect(tag.injected).toBe(false)
  expect(tag.xss).toBe(0)
  expect(errors).toEqual([])
})
