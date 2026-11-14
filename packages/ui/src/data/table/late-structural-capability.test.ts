import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

// v2.6.x 双形态批：验证「先赋 structuralRenderers、后 import 能力」的晚注册自愈——
// 能力注册表是模块级的：组件先渲染、structural-render 后 import 时，晚加入通知必须
// 让已渲染表格幂等 attach 并立即重建一轮，宿主早已赋好的钩子随之生效。
// （既有注册表隔离测试只验「注册通知循环」本身，不覆盖本路径。）
describe('OASTable structural-render 能力晚注册', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('先挂载表格并赋 structuralRenderers、再 import 能力：晚加入 attach 后钩子生效', async () => {
    const el = new OASTable()
    el.setAttribute('row-key', 'name')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '姓名' }]))
    el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    document.body.appendChild(el)
    // 能力未注册：钩子已赋好但不被调用（赋值触发的渲染零调用）
    const marked: string[] = []
    el.structuralRenderers = {
      bodyRow: ({ el: tr }) => {
        tr.setAttribute('data-late-mark', '1')
        marked.push('row')
      },
    }
    expect(el.shadowRoot!.querySelector('tr[data-late-mark]'), '能力未注册时钩子不调用').toBeNull()

    await import('./structural-render/index.js')
    await Promise.resolve()

    // 晚加入通知 → attach + 立即重建一轮 → 早已赋好的钩子生效
    const markedTr = el.shadowRoot!.querySelector('tr[data-late-mark]')
    expect(markedTr?.getAttribute('data-late-mark'), '晚注册后钩子生效（已渲染表格重建一轮）').toBe('1')
    expect(markedTr?.getAttribute('data-key'), '标记落在数据行上').toBe('张三')
    expect(marked.length, 'bodyRow 钩子按行数调用').toBe(1)
  })
})
