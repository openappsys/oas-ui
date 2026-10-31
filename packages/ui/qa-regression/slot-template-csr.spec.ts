// 回归：框架 CSR 挂载的 slot 模板（子节点直插 template 元素、content 为空）曾因组件只克隆
// `tpl.content` 而整段空白——dev 演示站插槽内容全丢（生产 SSR 快照子节点在 content 里所以不暴露）。
// 这里在真实浏览器里主动造出 CSR 形态，锁死共享工具 `shared/slot-template.ts` 的接线与缓存键。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const INSTALL_HELPERS = () => {
  const w = window as unknown as {
    __addCsrSlot: (host: Element, slot: string, html: string) => HTMLTemplateElement
    __frame: () => Promise<void>
  }
  w.__addCsrSlot = (host, slot, html) => {
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', slot)
    const holder = document.createElement('span')
    holder.innerHTML = html
    // 关键：经 insertBefore 直插 template 元素 → 子节点落在 childNodes、content 为空
    while (holder.firstChild) tpl.insertBefore(holder.firstChild, null)
    host.appendChild(tpl)
    return tpl
  }
  w.__frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(INSTALL_HELPERS)
})

test('CSR 模板：cascader suffix-icon + option 插槽正常渲染', async ({ page }) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cascader')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-cascader')
    const el = document.createElement('oas-cascader')
    el.setAttribute(
      'options',
      JSON.stringify([{ label: '浙江', value: 'zj', children: [{ label: '杭州', value: 'hz' }] }]),
    )
    const suffixTpl = w.__addCsrSlot(el, 'suffix-icon', '<span class="csr-suffix">▤</span>')
    w.__addCsrSlot(el, 'option', '<span class="csr-opt">📍</span><span data-option-label></span>')
    document.body.appendChild(el)
    await w.__frame()
    const suffix = el.shadowRoot!.querySelector('.csr-suffix')?.textContent ?? null
    ;(el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement).click()
    await w.__frame()
    return {
      shape: { content: suffixTpl.content.childNodes.length, own: suffixTpl.childNodes.length },
      suffix,
      options: [...el.shadowRoot!.querySelectorAll('.csr-opt')].map((n: Element) => n.textContent),
      labels: [...el.shadowRoot!.querySelectorAll('[data-option-label]')].map((n: Element) => n.textContent),
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.suffix).toBe('▤')
  expect(r.options.length).toBeGreaterThan(0)
  expect(r.labels.join(',')).toContain('浙江')
})

test('CSR 模板：slider custom-thumb 渲染且内容变化触发刷新（缓存签名）', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-slider')
    const el = document.createElement('oas-slider')
    el.setAttribute('value', '60')
    const tpl = w.__addCsrSlot(el, 'custom-thumb', '🎯')
    document.body.appendChild(el)
    await w.__frame()
    const before = el.shadowRoot!.querySelector('.thumb-content')?.textContent ?? null
    const beforeKey = (el.shadowRoot!.querySelector('.thumb-content') as HTMLElement | null)?.dataset.srcKey ?? null
    tpl.textContent = '🔥'
    el.setAttribute('value', '61')
    await w.__frame()
    const after = el.shadowRoot!.querySelector('.thumb-content')?.textContent ?? null
    return { before, beforeKey, after }
  })
  expect(r.before).toBe('🎯')
  expect(r.beforeKey).toBe('t:🎯')
  expect(r.after).toBe('🔥')
})

test('CSR 模板：qrcode status 覆盖层渲染且状态往返不缓存空内容', async ({ page }) => {
  await page.goto('/components/qrcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-qrcode')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-qrcode')
    const el = document.createElement('oas-qrcode')
    el.setAttribute('value', 'https://example.com')
    el.setAttribute('status', 'expired')
    w.__addCsrSlot(el, 'status', '<span class="csr-status">已过期自定义</span>')
    document.body.appendChild(el)
    await w.__frame()
    const first = el.shadowRoot!.querySelector('.csr-status')?.textContent ?? null
    el.setAttribute('status', 'loading')
    await w.__frame()
    el.setAttribute('status', 'expired')
    await w.__frame()
    return { first, again: el.shadowRoot!.querySelector('.csr-status')?.textContent ?? null }
  })
  expect(r.first).toBe('已过期自定义')
  expect(r.again).toBe('已过期自定义')
})

test('CSR 模板：editable display / ok-icon 渲染，迟到内容可补渲染', async ({ page }) => {
  await page.goto('/components/editable.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-editable')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-editable')
    const el = document.createElement('oas-editable')
    el.setAttribute('value', '张三')
    w.__addCsrSlot(el, 'display', '<span class="csr-disp">👤 <span data-display-value></span></span>')
    w.__addCsrSlot(el, 'ok-icon', '<span class="csr-ok">OK</span>')
    w.__addCsrSlot(el, 'cancel-icon', '<span class="csr-cancel">✗</span>')
    document.body.appendChild(el)
    await w.__frame()
    const display = el.shadowRoot!.querySelector('.display-custom')?.textContent?.trim() ?? null
    ;(el.shadowRoot!.querySelector('.display') as HTMLElement).click()
    await w.__frame()
    const ok = el.shadowRoot!.querySelector('.action.ok')?.textContent?.trim() ?? null
    const cancel = el.shadowRoot!.querySelector('.action.cancel')?.textContent?.trim() ?? null

    // 迟到内容：空模板先挂，组件回落纯文本；内容随后到达应经观察器补渲染
    const late = document.createElement('oas-editable')
    late.setAttribute('value', '李四')
    const lateTpl = w.__addCsrSlot(late, 'display', '')
    document.body.appendChild(late)
    await w.__frame()
    const beforeLate = late.shadowRoot!.querySelector('.display-custom')?.textContent ?? null
    const span = document.createElement('span')
    span.className = 'csr-late'
    span.textContent = '👤 迟到'
    lateTpl.insertBefore(span, null)
    await w.__frame()
    return {
      display,
      ok,
      cancel,
      beforeLate,
      afterLate: late.shadowRoot!.querySelector('.csr-late')?.textContent ?? null,
    }
  })
  expect(r.display).toBe('👤 张三')
  expect(r.ok).toBe('OK')
  expect(r.cancel).toBe('✗')
  expect(r.beforeLate).toBeNull()
  expect(r.afterLate).toBe('👤 迟到')
})

test('CSR 模板：upload trigger / tip 插槽渲染', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-upload')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-upload')
    const el = document.createElement('oas-upload')
    w.__addCsrSlot(el, 'trigger', '<span class="csr-trigger">选择文件</span>')
    w.__addCsrSlot(el, 'tip', '<span class="csr-tip">提示文案</span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      trigger: el.shadowRoot!.querySelector('.csr-trigger')?.textContent ?? null,
      tip: el.shadowRoot!.querySelector('.csr-tip')?.textContent ?? null,
      slotHidden: (el.shadowRoot!.querySelector('slot[name="trigger"]') as HTMLSlotElement | null)?.hidden ?? null,
    }
  })
  expect(r.trigger).toBe('选择文件')
  expect(r.tip).toBe('提示文案')
  expect(r.slotHidden).toBe(true)
})

test('CSR 模板：dynamic-tags tag / prefix / suffix 插槽渲染', async ({ page }) => {
  await page.goto('/components/dynamic-tags.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dynamic-tags')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-dynamic-tags')
    const el = document.createElement('oas-dynamic-tags')
    el.setAttribute('model-value', '["前端"]')
    w.__addCsrSlot(el, 'tag', '<span class="csr-tag">🔹 <span data-tag-label></span></span>')
    w.__addCsrSlot(el, 'prefix', '<span class="csr-prefix">前</span>')
    w.__addCsrSlot(el, 'suffix', '<span class="csr-suffix">后</span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      tag: el.shadowRoot!.querySelector('.csr-tag')?.textContent?.trim() ?? null,
      prefix: el.shadowRoot!.querySelector('.slot-prefix')?.textContent?.trim() ?? null,
      suffix: el.shadowRoot!.querySelector('.slot-suffix')?.textContent?.trim() ?? null,
    }
  })
  expect(r.tag).toBe('🔹 前端')
  expect(r.prefix).toBe('前')
  expect(r.suffix).toBe('后')
})

test('CSR 模板：json-viewer toggle 图标插槽渲染', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-json-viewer')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-json-viewer')
    const el = document.createElement('oas-json-viewer')
    el.setAttribute('text', '{"a":1}')
    w.__addCsrSlot(el, 'toggle-collapsed', '<span class="csr-plus">+</span>')
    w.__addCsrSlot(el, 'toggle-expanded', '<span class="csr-minus">−</span>')
    document.body.appendChild(el)
    await w.__frame()
    const expanded = el.shadowRoot!.querySelector('.csr-minus')?.textContent ?? null
    // 点击根行收起 → 折叠态模板生效
    el.shadowRoot!.querySelector('.row')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await w.__frame()
    const collapsed = el.shadowRoot!.querySelector('.csr-plus')?.textContent ?? null
    return { expanded, collapsed }
  })
  expect(r.expanded).toBe('−')
  expect(r.collapsed).toBe('+')
})

test('CSR 模板：segmented option 插槽渲染并绑定选项文本', async ({ page }) => {
  await page.goto('/components/segmented.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-segmented')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-segmented')
    const el = document.createElement('oas-segmented')
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: '日', value: 'day' },
        { label: '周', value: 'week' },
      ]),
    )
    w.__addCsrSlot(el, 'option', '<b class="csr-seg" data-option-label></b>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      count: el.shadowRoot!.querySelectorAll('.csr-seg').length,
      labels: [...el.shadowRoot!.querySelectorAll('.csr-seg')].map((n: Element) => n.textContent),
    }
  })
  expect(r.count).toBe(2)
  expect(r.labels).toEqual(['日', '周'])
})

test('CSR 模板：auto-complete option 模板渲染并绑定选项文本（输入展开下拉）', async ({ page }) => {
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-auto-complete')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-auto-complete')
    const el = document.createElement('oas-auto-complete')
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: '浙江杭州', value: 'hz' },
        { label: '江苏南京', value: 'nj' },
      ]),
    )
    const tpl = w.__addCsrSlot(el, 'option', '<span class="csr-opt">👤</span><span data-option-label></span>')
    document.body.appendChild(el)
    await w.__frame()
    // 输入关键词 → 过滤 + 展开下拉（debounce 缺省 0，同步渲染）
    const input = el.shadowRoot!.querySelector('input[part="input"]') as HTMLInputElement
    input.focus()
    input.value = '浙'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      open: el.shadowRoot!.querySelector('.dropdown')?.classList.contains('open') ?? false,
      opts: [...el.shadowRoot!.querySelectorAll('.listbox .option')].map((n: Element) => ({
        custom: n.querySelector('.csr-opt')?.textContent ?? null,
        label: n.querySelector('[data-option-label]')?.textContent ?? null,
      })),
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 2 })
  expect(r.open, '输入后面板应展开').toBe(true)
  expect(r.opts).toEqual([{ custom: '👤', label: '浙江杭州' }])
})

test('CSR 模板：calendar cell 模板渲染且 [data-cell-date] 绑定日期数字', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-calendar')
    const el = document.createElement('oas-calendar')
    const tpl = w.__addCsrSlot(el, 'cell', '<span class="csr-cell">📅<span data-cell-date></span></span>')
    document.body.appendChild(el)
    await w.__frame()
    const days = [...el.shadowRoot!.querySelectorAll('.day')] as HTMLElement[]
    const first = days[0]
    const iso = first?.dataset.date ?? ''
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      total: days.length,
      bound: days.filter((d) => d.querySelector('.csr-cell')).length,
      binder: first?.querySelector('[data-cell-date]')?.textContent ?? null,
      // data-date 为本地 ISO yyyy-MM-dd，取末两位还原日数字（与组件 String(getDate()) 同口径）
      expectDay: iso ? String(Number(iso.slice(8, 10))) : null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.total).toBeGreaterThan(0)
  expect(r.bound, '每个日格都应渲染模板节点').toBe(r.total)
  expect(r.binder, '模板内 [data-cell-date] 应绑定该格日期数字').toBe(r.expectDay)
})

test('CSR 模板：checkbox checked-icon 模板在选中态渲染', async ({ page }) => {
  await page.goto('/components/checkbox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-checkbox')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-checkbox')
    const el = document.createElement('oas-checkbox')
    el.setAttribute('checked', '')
    const tpl = w.__addCsrSlot(el, 'checked-icon', '<span class="csr-ck">✅</span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      checked: el.hasAttribute('checked'),
      custom: el.hasAttribute('data-custom-checked-icon'),
      holder: el.shadowRoot!.querySelector('.indicator-checked .indicator-tpl') != null,
      icon: el.shadowRoot!.querySelector('.indicator-checked .csr-ck')?.textContent ?? null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.checked).toBe(true)
  expect(r.custom, '模板在场应点亮自定义指示器通道').toBe(true)
  expect(r.holder).toBe(true)
  expect(r.icon).toBe('✅')
})

test('CSR 模板：radio checked-icon 模板在选中态渲染', async ({ page }) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-radio')
    const el = document.createElement('oas-radio')
    el.setAttribute('value', 'r1')
    el.setAttribute('checked', '')
    const tpl = w.__addCsrSlot(el, 'checked-icon', '<span class="csr-rd">◉</span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      checked: el.hasAttribute('checked'),
      custom: el.hasAttribute('data-custom-checked-icon'),
      icon: el.shadowRoot!.querySelector('.indicator-checked .csr-rd')?.textContent ?? null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.checked).toBe(true)
  expect(r.custom, '模板在场应点亮自定义指示器通道').toBe(true)
  expect(r.icon).toBe('◉')
})

test('CSR 模板：dynamic-input row 模板渲染每行内容', async ({ page }) => {
  await page.goto('/components/dynamic-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dynamic-input')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-dynamic-input')
    const el = document.createElement('oas-dynamic-input')
    el.setAttribute('min', '2')
    const tpl = w.__addCsrSlot(el, 'row', '<span class="csr-di">自定义行内容</span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      rows: el.shadowRoot!.querySelectorAll('.row').length,
      custom: el.shadowRoot!.querySelectorAll('.row .row-content .csr-di').length,
      text: el.shadowRoot!.querySelector('.row .row-content .csr-di')?.textContent ?? null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.rows).toBe(2)
  expect(r.custom, '每行都应渲染模板节点').toBe(2)
  expect(r.text).toBe('自定义行内容')
})

test('CSR 模板：form-list 默认行模板渲染并索引化字段 name', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form-list')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-form-list')
    const el = document.createElement('oas-form-list')
    el.setAttribute('min', '1')
    el.setAttribute('name', 'members')
    // form-list 行模板是「无 slot 属性的 <template>」：借 __addCsrSlot 造出 CSR 形态后摘掉 slot 属性
    const tpl = w.__addCsrSlot(el, 'row', '<input class="csr-fl" name="title" />')
    tpl.removeAttribute('slot')
    document.body.appendChild(el)
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      rows: el.querySelectorAll('[data-oas-form-list-item]').length,
      fieldName: el.querySelector('[data-oas-form-list-item] .csr-fl')?.getAttribute('name') ?? null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.rows, 'min=1 应克隆模板生成一行').toBe(1)
  expect(r.fieldName, '行内字段 name 应索引化为 members.0.title').toBe('members.0.title')
})

test('CSR 模板：mentions option 模板渲染并绑定选项文本（@ 触发下拉）', async ({ page }) => {
  await page.goto('/components/mentions.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-mentions')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-mentions')
    const el = document.createElement('oas-mentions')
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: '张三', value: 'zhangsan' },
        { label: '李四', value: 'lisi' },
      ]),
    )
    const tpl = w.__addCsrSlot(el, 'option', '<span class="csr-mn">👤</span><span data-option-label></span>')
    document.body.appendChild(el)
    await w.__frame()
    // 输入 @ 且光标在其后 → 打开面板渲染候选
    const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    ta.focus()
    ta.value = '@'
    ta.setSelectionRange(1, 1)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    await w.__frame()
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      open: el.shadowRoot!.querySelector('.panel')?.classList.contains('open') ?? false,
      opts: [...el.shadowRoot!.querySelectorAll('.listbox .option')].map((n: Element) => ({
        custom: n.querySelector('.csr-mn')?.textContent ?? null,
        label: n.querySelector('[data-option-label]')?.textContent ?? null,
      })),
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 2 })
  expect(r.open, '输入 @ 后面板应展开').toBe(true)
  expect(r.opts).toEqual([
    { custom: '👤', label: '张三' },
    { custom: '👤', label: '李四' },
  ])
})

test('CSR 模板：transfer item / empty 模板渲染', async ({ page }) => {
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-transfer')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-transfer')
    const el = document.createElement('oas-transfer')
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'k1', label: '项目一' },
        { key: 'k2', label: '项目二' },
      ]),
    )
    const itemTpl = w.__addCsrSlot(el, 'item', '<span class="csr-item">📦<span data-item-label></span></span>')
    document.body.appendChild(el)
    await w.__frame()
    const rows = [...el.shadowRoot!.querySelectorAll('.listbox.left .option')].map((n: Element) => ({
      custom: n.querySelector('.csr-item')?.textContent ?? null,
      label: n.querySelector('[data-item-label]')?.textContent ?? null,
    }))

    const empty = document.createElement('oas-transfer')
    empty.setAttribute('data', '[]')
    const emptyTpl = w.__addCsrSlot(empty, 'empty', '<span class="csr-empty">暂无自定义数据</span>')
    document.body.appendChild(empty)
    await w.__frame()
    const emptyEl = empty.shadowRoot!.querySelector('.listbox.left .empty') as HTMLElement | null
    return {
      itemShape: { content: itemTpl.content.childNodes.length, own: itemTpl.childNodes.length },
      rows,
      emptyShape: { content: emptyTpl.content.childNodes.length, own: emptyTpl.childNodes.length },
      emptyHidden: emptyEl?.hidden ?? null,
      emptyCustom: emptyEl?.querySelector('.csr-empty')?.textContent ?? null,
    }
  })
  expect(r.itemShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.rows).toEqual([
    { custom: '📦项目一', label: '项目一' },
    { custom: '📦项目二', label: '项目二' },
  ])
  expect(r.emptyShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.emptyHidden, '空数据应显示空态').toBe(false)
  expect(r.emptyCustom).toBe('暂无自定义数据')
})

test('CSR 模板：virtual-list item 模板渲染每个可见项', async ({ page }) => {
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-virtual-list')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-virtual-list')
    const el = document.createElement('oas-virtual-list')
    el.setAttribute('height', '160')
    el.setAttribute('item-height', '32')
    el.setAttribute('items', JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
    const tpl = w.__addCsrSlot(el, 'item', '<span class="csr-vl">⚡</span>')
    document.body.appendChild(el)
    await w.__frame()
    const items = [...el.shadowRoot!.querySelectorAll('.item')]
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      total: items.length,
      bound: items.filter((n: Element) => n.querySelector('.csr-vl')).length,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.total, '160px / 32px 视口应渲染出可见窗口').toBeGreaterThan(0)
  expect(r.bound, '每个可见项都应渲染模板节点').toBe(r.total)
})

test('CSR 模板：table 列头 + 单元格模板渲染（声明式列）', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-table')
    const el = document.createElement('oas-table')
    el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    const col = document.createElement('oas-table-column')
    col.setAttribute('data-key', 'name')
    col.setAttribute('title', '姓名')
    // 列头模板：<template data-role="header">；单元格模板：普通 <template>（{{row.x}} 插值）
    const headTpl = w.__addCsrSlot(col, 'h', '<span class="csr-th">👤 姓名</span>')
    headTpl.removeAttribute('slot')
    headTpl.setAttribute('data-role', 'header')
    const cellTpl = w.__addCsrSlot(col, 'c', '<b class="csr-td">{{row.name}}</b>')
    cellTpl.removeAttribute('slot')
    el.appendChild(col)
    document.body.appendChild(el)
    await w.__frame()
    return {
      headShape: { content: headTpl.content.childNodes.length, own: headTpl.childNodes.length },
      cellShape: { content: cellTpl.content.childNodes.length, own: cellTpl.childNodes.length },
      th: el.shadowRoot!.querySelector('th[data-key="name"] .csr-th')?.textContent ?? null,
      td: el.shadowRoot!.querySelector('td[data-col="name"] .csr-td')?.textContent ?? null,
    }
  })
  expect(r.headShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.cellShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.th, '自定义列头节点应渲染').toBe('👤 姓名')
  expect(r.td, '单元格模板应渲染且 {{row.name}} 插值为该行数据').toBe('张三')
})

test('CSR 模板：image placeholder 模板渲染（无 src 恒占位）', async ({ page }) => {
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-image')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-image')
    const el = document.createElement('oas-image')
    el.setAttribute('placeholder', '')
    const tpl = w.__addCsrSlot(el, 'placeholder', '<span class="csr-ph">自定义占位中…</span>')
    document.body.appendChild(el)
    await w.__frame()
    const ph = el.shadowRoot!.querySelector('[part="placeholder"]') as HTMLElement | null
    return {
      shape: { content: tpl.content.childNodes.length, own: tpl.childNodes.length },
      hidden: ph?.hidden ?? null,
      custom: ph?.querySelector('.csr-ph')?.textContent ?? null,
    }
  })
  expect(r.shape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.hidden, '无 src + placeholder 属性 → 占位常显').toBe(false)
  expect(r.custom).toBe('自定义占位中…')
})

test('CSR 模板：gantt empty / row / task 模板渲染', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-gantt')
  const r = await page.evaluate(async () => {
    const w = window as any
    await customElements.whenDefined('oas-gantt')
    // empty：空 tasks → 空态自定义节点
    const empty = document.createElement('oas-gantt')
    const emptyTpl = w.__addCsrSlot(empty, 'empty', '<span class="csr-gantt-empty">暂无自定义排期</span>')
    document.body.appendChild(empty)
    await w.__frame()
    const emptyEl = empty.shadowRoot!.querySelector('.empty') as HTMLElement | null

    // row + task：行名与条旁标签自定义节点（task 模板需 label-position 显式开启才渲染标签）
    const el = document.createElement('oas-gantt')
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', progress: 60 }]),
    )
    el.setAttribute('label-position', 'right')
    const rowTpl = w.__addCsrSlot(el, 'row', '<span class="csr-gantt-row">🛠<span data-task-name></span></span>')
    const taskTpl = w.__addCsrSlot(el, 'task', '<span class="csr-gantt-task">✔<span data-task-name></span></span>')
    document.body.appendChild(el)
    await w.__frame()
    return {
      emptyShape: { content: emptyTpl.content.childNodes.length, own: emptyTpl.childNodes.length },
      emptyHidden: emptyEl?.hidden ?? null,
      emptyCustom: emptyEl?.querySelector('.csr-gantt-empty')?.textContent ?? null,
      rowShape: { content: rowTpl.content.childNodes.length, own: rowTpl.childNodes.length },
      taskShape: { content: taskTpl.content.childNodes.length, own: taskTpl.childNodes.length },
      rowNames: [...el.shadowRoot!.querySelectorAll('.row-name .name')].map((n: Element) => ({
        custom: n.querySelector('.csr-gantt-row')?.textContent ?? null,
        bound: n.querySelector('[data-task-name]')?.textContent ?? null,
      })),
      barLabels: [...el.shadowRoot!.querySelectorAll('.bar .bar-label')].map((n: Element) => ({
        custom: n.querySelector('.csr-gantt-task')?.textContent ?? null,
        bound: n.querySelector('[data-task-name]')?.textContent ?? null,
      })),
    }
  })
  expect(r.emptyShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.emptyHidden, '空数据应显示空态').toBe(false)
  expect(r.emptyCustom).toBe('暂无自定义排期')
  expect(r.rowShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.taskShape, '测试须造出 CSR 形态').toEqual({ content: 0, own: 1 })
  expect(r.rowNames, '行名模板应渲染且 [data-task-name] 绑定任务名').toEqual([{ custom: '🛠开发', bound: '开发' }])
  expect(r.barLabels, '条旁标签模板应渲染且 [data-task-name] 绑定任务名').toEqual([{ custom: '✔开发', bound: '开发' }])
})
