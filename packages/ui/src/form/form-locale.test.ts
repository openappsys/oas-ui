import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import './select/index.js'
import './cascader/index.js'
import './tree-select/index.js'
import './auto-complete/index.js'
import './input/index.js'
import './input-number/index.js'
import './rate/index.js'
import './form/index.js'

const SELECT_OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

const TREE_OPTIONS = JSON.stringify([
  {
    label: '前端',
    value: 'fe',
    children: [
      { label: '框架', value: 'framework', children: [{ label: 'React', value: 'react' }, { label: 'Vue', value: 'vue' }] },
      { label: '样式', value: 'css' },
    ],
  },
  { label: '后端', value: 'be', children: [{ label: 'Node', value: 'node' }] },
])

/**
 * form 组组件文案国际化集成测试：验证 setLocale('en') 后 select/cascader/tree-select/
 * auto-complete/input/input-number/rate/form 内置文案即时切换，setLocale('zh-CN') 恢复。
 */
describe('form 组件文案 locale 切换（i18n 集成）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('select：placeholder / 搜索空态 / 移除 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-select')
    el.setAttribute('options', SELECT_OPTIONS)
    document.body.appendChild(el)
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!

    expect(trigger.textContent).toContain('请选择')
    setLocale(en)
    expect(trigger.textContent).toContain('Please select')
    setLocale('zh-CN')
    expect(trigger.textContent).toContain('请选择')

    // 搜索无匹配空态
    el.setAttribute('searchable', '')
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '不存在'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')
    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('No matching options')
    setLocale('zh-CN')
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')

    // 多选移除按钮 aria-label（syncTrigger 重渲染后需重新取节点）
    el.setAttribute('multiple', '')
    el.setAttribute('value', '["banana"]')
    const rm = el.shadowRoot!.querySelector<HTMLElement>('.chip button')!
    expect(rm.getAttribute('aria-label')).toBe('移除 香蕉')
    setLocale(en)
    const rmEn = el.shadowRoot!.querySelector<HTMLElement>('.chip button')!
    expect(rmEn.getAttribute('aria-label')).toBe('Remove 香蕉')
    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.chip button')!.getAttribute('aria-label')).toBe('移除 香蕉')
  })

  it('cascader：placeholder 随 locale 切换', () => {
    const el = document.createElement('oas-cascader')
    document.body.appendChild(el)
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!

    expect(trigger.textContent).toContain('请选择')
    setLocale(en)
    expect(trigger.textContent).toContain('Please select')
    setLocale('zh-CN')
    expect(trigger.textContent).toContain('请选择')
  })

  it('tree-select：placeholder / 多选拼接 / 空态随 locale 切换', () => {
    const el = document.createElement('oas-tree-select')
    el.setAttribute('options', TREE_OPTIONS)
    document.body.appendChild(el)
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!

    expect(trigger.textContent).toContain('请选择')
    setLocale(en)
    expect(trigger.textContent).toContain('Please select')

    // 多选超 3 项：join 分隔符 + andMore 兜底文案（当前 locale 为 en，先验 en 再回切 zh）
    el.setAttribute('multiple', '')
    el.setAttribute('value', '["react","vue","css","node"]')
    expect(trigger.textContent).toContain('and 4 more')
    setLocale('zh-CN')
    expect(trigger.textContent).toContain('等 4 项')
    setLocale(en)
    expect(trigger.textContent).toContain('and 4 more')

    // 空态
    setLocale('zh-CN')
    const emptyEl = document.createElement('oas-tree-select')
    emptyEl.setAttribute('options', '[]')
    document.body.appendChild(emptyEl)
    emptyEl.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(emptyEl.shadowRoot!.querySelector<HTMLElement>('.empty')!.textContent).toBe('暂无数据')
    setLocale(en)
    expect(emptyEl.shadowRoot!.querySelector<HTMLElement>('.empty')!.textContent).toBe('No data')
  })

  it('auto-complete：无匹配空态随 locale 切换', () => {
    const el = document.createElement('oas-auto-complete')
    el.setAttribute('options', SELECT_OPTIONS)
    document.body.appendChild(el)
    const i = el.shadowRoot!.querySelector<HTMLInputElement>('input')!
    i.value = '不存在'
    i.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelector<HTMLElement>('.empty')!.textContent).toBe('无匹配结果')

    setLocale(en)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.empty')!.textContent).toBe('No matching results')
    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.empty')!.textContent).toBe('无匹配结果')
  })

  it('input：默认 aria-label 与清除按钮随 locale 切换', () => {
    const el = document.createElement('oas-input')
    document.body.appendChild(el)
    const i = el.shadowRoot!.querySelector<HTMLInputElement>('input')!
    expect(i.getAttribute('aria-label')).toBe('输入框')
    setLocale(en)
    expect(i.getAttribute('aria-label')).toBe('Input')
    setLocale('zh-CN')
    expect(i.getAttribute('aria-label')).toBe('输入框')

    // 清除按钮
    el.setAttribute('clearable', '')
    el.setAttribute('value', 'abc')
    const clear = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    expect(clear.getAttribute('aria-label')).toBe('清除')
    setLocale(en)
    expect(clear.getAttribute('aria-label')).toBe('Clear')
    setLocale('zh-CN')
    expect(clear.getAttribute('aria-label')).toBe('清除')
  })

  it('input-number：步进按钮与默认 aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-input-number')
    document.body.appendChild(el)
    const up = el.shadowRoot!.querySelector<HTMLElement>('[part="up"]')!
    const down = el.shadowRoot!.querySelector<HTMLElement>('[part="down"]')!
    const i = el.shadowRoot!.querySelector<HTMLInputElement>('input')!

    expect(up.getAttribute('aria-label')).toBe('增加')
    expect(down.getAttribute('aria-label')).toBe('减少')
    expect(i.getAttribute('aria-label')).toBe('数字输入框')
    setLocale(en)
    expect(up.getAttribute('aria-label')).toBe('Increase')
    expect(down.getAttribute('aria-label')).toBe('Decrease')
    expect(i.getAttribute('aria-label')).toBe('Number input')
    setLocale('zh-CN')
    expect(up.getAttribute('aria-label')).toBe('增加')
    expect(down.getAttribute('aria-label')).toBe('减少')
  })

  it('rate：slider aria-label 随 locale 切换', () => {
    const el = document.createElement('oas-rate')
    document.body.appendChild(el)
    const slider = el.shadowRoot!.querySelector<HTMLElement>('[role="slider"]')!
    expect(slider.getAttribute('aria-label')).toBe('评分')
    setLocale(en)
    expect(slider.getAttribute('aria-label')).toBe('Rating')
    setLocale('zh-CN')
    expect(slider.getAttribute('aria-label')).toBe('评分')
  })

  it('form：缺省校验失败文案随 locale 切换', () => {
    const el = document.createElement('oas-form')
    el.setAttribute('rules', JSON.stringify({ name: [{ required: true }] }))
    el.innerHTML = '<oas-input name="name" value=""></oas-input>'
    document.body.appendChild(el)
    const form = el.shadowRoot!.querySelector<HTMLElement>('form')!
    const submit = (): Record<string, string> => {
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      return (el as unknown as { getErrors(): Record<string, string> }).getErrors()
    }

    expect(submit()).toEqual({ name: '校验未通过' })
    setLocale(en)
    expect(submit()).toEqual({ name: 'Validation failed' })
    setLocale('zh-CN')
    expect(submit()).toEqual({ name: '校验未通过' })
  })
})
