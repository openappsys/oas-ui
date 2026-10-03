import { test, expect } from '@playwright/test'

// property 通道回归（真浏览器）：prefix/suffix/blur/mentions.prefix 撞 DOM 只读访问器/方法后，
// 已用 Object.defineProperty 在原型遮蔽并映射到规范属性——宿主按 property 写入（React JSX / Vue 绑定的路径）
// 必须不崩且生效。单测（happy-dom）与 playground smoke 已覆盖，这里在组件页真 DOM 再锁一层。
test('property 通道：prefix / suffix / blur / mentions.prefix 映射到规范属性', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-input') != null, null, { timeout: 15000 })

  const result = await page.evaluate(async () => {
    const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    // oas-input：prefix / suffix property → prefix-text / suffix-text
    const input = document.createElement('oas-input') as HTMLElement & { prefix: string; suffix: string }
    document.body.appendChild(input)
    await customElements.whenDefined('oas-input')
    input.prefix = '¥'
    input.suffix = '.00'
    await tick()
    const inputPrefixText = input.shadowRoot?.querySelector("[part='prefix']")?.textContent?.trim() ?? ''

    // oas-mentions：prefix（trigger 遗留别名）property → trigger
    const mentions = document.createElement('oas-mentions') as HTMLElement & { prefix: string }
    document.body.appendChild(mentions)
    await customElements.whenDefined('oas-mentions')
    mentions.prefix = '#'
    await tick()

    // oas-backdrop：blur property → blur 属性
    const backdrop = document.createElement('oas-backdrop')
    document.body.appendChild(backdrop)
    await customElements.whenDefined('oas-backdrop')
    ;(backdrop as unknown as { blur: string }).blur = 'blur(8px)'
    await tick()

    return {
      inputPrefixAttr: input.getAttribute('prefix-text'),
      inputSuffixAttr: input.getAttribute('suffix-text'),
      inputPrefixText,
      mentionsTriggerAttr: mentions.getAttribute('trigger'),
      backdropBlurAttr: backdrop.getAttribute('blur'),
      // 原生只读/方法不应被写入后抛错；此处能走到说明未崩
      ok: true,
    }
  })

  expect(result.inputPrefixAttr, 'prefix → prefix-text').toBe('¥')
  expect(result.inputSuffixAttr, 'suffix → suffix-text').toBe('.00')
  expect(result.inputPrefixText, '前缀真渲染').toContain('¥')
  expect(result.mentionsTriggerAttr, 'mentions.prefix → trigger').toBe('#')
  expect(result.backdropBlurAttr, 'blur → blur 属性').toBe('blur(8px)')
  expect(errs, `console/pageerror:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})
