import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

// v2.6.4 默认入口不含编辑；验证「组件先渲染、edit 能力后注册」的晚加入自愈：
// attach 后必须立即重建一次，否则已渲染行不会补 editable-cell / 铅笔图标。
describe('OASTable 编辑能力晚注册', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('先挂载 editable 表格、再 import edit，已有行补齐可编辑装饰', async () => {
    const el = new OASTable()
    el.setAttribute('editable', '')
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '姓名', editable: true }]))
    el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('td.editable-cell')).toBeNull()

    await import('./edit/index.js')
    await Promise.resolve()

    expect(el.shadowRoot!.querySelectorAll('td.editable-cell').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('.cell-edit-icon').length).toBe(1)
  })
})
