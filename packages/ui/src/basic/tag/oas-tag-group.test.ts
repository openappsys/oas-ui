import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTagGroup } from './index.js'
import { OASTag } from './oas-tag.js'

/** 构造 checkable 子签（组内子签约定带 value 属性） */
function makeTag(value?: string, checked = false): OASTag {
  const t = new OASTag()
  t.setAttribute('checkable', '')
  if (value != null) t.setAttribute('value', value)
  if (checked) t.setAttribute('checked', '')
  t.textContent = value || '标签'
  return t
}

function mountGroup(
  attrs: Record<string, string> = {},
  tags: Array<[string?, boolean?]> = [['a'], ['b'], ['c']],
): OASTagGroup {
  const el = new OASTagGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const [v, c] of tags) el.appendChild(makeTag(v, c))
  document.body.appendChild(el)
  return el
}

function groupRoot(el: OASTagGroup): HTMLElement {
  return el.shadowRoot!.querySelector('[part="group"]')!
}

function clickTag(el: OASTagGroup, value: string): void {
  const tag = el.querySelector<OASTag>(`oas-tag[value="${value}"]`)!
  tag.click()
}

describe('OASTagGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('容器 role="group" 且带默认 i18n aria-label（中文「标签组」）', () => {
    const el = mountGroup()
    const root = groupRoot(el)
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('aria-label')).toBe('标签组')
  })

  it('aria-label 属性可覆盖默认文案', () => {
    const el = mountGroup({ 'aria-label': '筛选标签' })
    expect(groupRoot(el).getAttribute('aria-label')).toBe('筛选标签')
  })

  it('单选：点签切换 value + 派发 oas-change { value } + 子签 checked 同步', () => {
    const el = mountGroup({ value: 'a' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => {
      detail = (e as CustomEvent).detail
    })
    clickTag(el, 'b')
    expect(detail).toEqual({ value: 'b' })
    expect(el.getAttribute('value')).toBe('b')
    expect(el.querySelector('oas-tag[value="b"]')!.hasAttribute('checked')).toBe(true)
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(false)
    expect(el.querySelector('oas-tag[value="c"]')!.hasAttribute('checked')).toBe(false)
  })

  it('单选：点击已选中项不重复派发，且子签保持选中（不可取消）', () => {
    const el = mountGroup({ value: 'a' })
    let count = 0
    el.addEventListener('oas-change', () => count++)
    clickTag(el, 'a')
    expect(count).toBe(0)
    expect(el.getAttribute('value')).toBe('a')
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(true)
  })

  it('多选：detail { value: [] }，点击切换选中，checked 同步', () => {
    const el = mountGroup({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => {
      detail = (e as CustomEvent).detail
    })
    clickTag(el, 'a')
    expect(detail).toEqual({ value: ['a'] })
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(true)

    clickTag(el, 'b')
    expect(detail).toEqual({ value: ['a', 'b'] })

    clickTag(el, 'a')
    expect(detail).toEqual({ value: ['b'] })
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(false)
    expect(el.querySelector('oas-tag[value="b"]')!.hasAttribute('checked')).toBe(true)
  })

  it('多选：初始 value 逗号分隔回显子签 checked', () => {
    const el = mountGroup({ multiple: '', value: 'a,b' })
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(true)
    expect(el.querySelector('oas-tag[value="b"]')!.hasAttribute('checked')).toBe(true)
    expect(el.querySelector('oas-tag[value="c"]')!.hasAttribute('checked')).toBe(false)
  })

  it('disabled 全组禁用：子签 disabled 透传，点签不派发 oas-change', () => {
    const el = mountGroup({ disabled: '', value: 'a' })
    for (const t of el.querySelectorAll('oas-tag')) {
      expect(t.hasAttribute('disabled')).toBe(true)
    }
    let count = 0
    el.addEventListener('oas-change', () => count++)
    clickTag(el, 'b')
    expect(count).toBe(0)
    expect(el.getAttribute('value')).toBe('a')
  })

  it('零子签空组不报错', () => {
    const el = mountGroup({}, [])
    expect(groupRoot(el)).not.toBeNull()
  })

  it('无 value 的子签不参与选值、不派发组 oas-change', () => {
    const el = mountGroup({}, [[undefined, true]])
    let count = 0
    el.addEventListener('oas-change', () => count++)
    el.querySelector<OASTag>('oas-tag')!.click()
    expect(count).toBe(0)
    expect(el.getAttribute('value')).toBeNull()
  })

  it('宿主 value 变化同步子签 checked（受控），清空后全部取消', () => {
    const el = mountGroup({ value: 'a' })
    el.setAttribute('value', 'b')
    expect(el.querySelector('oas-tag[value="b"]')!.hasAttribute('checked')).toBe(true)
    expect(el.querySelector('oas-tag[value="a"]')!.hasAttribute('checked')).toBe(false)
    el.removeAttribute('value')
    expect(el.querySelectorAll('oas-tag[checked]').length).toBe(0)
  })

  it('子签被组接管：子签自身 checked 与组 value 冲突时以组为准', () => {
    const el = mountGroup({ value: 'a' })
    const b = el.querySelector('oas-tag[value="b"]')!
    b.setAttribute('checked', '')
    b.removeAttribute('checked')
    // 组 value=a 只有 a 选中
    expect(el.querySelector('oas-tag[value="b"]')!.hasAttribute('checked')).toBe(false)
  })

  it('子签删除后组仍正常（slotchange 重刷 update）', () => {
    const el = mountGroup({ value: 'a' })
    const b = el.querySelector('oas-tag[value="b"]')!
    b.remove()
    clickTag(el, 'c')
    expect(el.getAttribute('value')).toBe('c')
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    it('指纹匹配 + 结构完整：跳过重建、组事件已绑定、子签同步', () => {
      const el = new OASTagGroup()
      el.setAttribute('value', 'a')
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-tag-group" data-oas-ssr-v="1"><style></style><div part="group" role="group"><slot></slot></div>'
      const groupEl = el.shadowRoot!.querySelector('[part="group"]')!
      el.appendChild(makeTag('a', true))
      el.appendChild(makeTag('b'))
      document.body.appendChild(el)

      // 真水合：组容器是同一对象（未重建），指纹移除
      expect(el.shadowRoot!.querySelector('[part="group"]')).toBe(groupEl)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

      // 组事件已绑定：点组内子签派发 oas-change
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      clickTag(el, 'b')
      expect(fired).toBe(1)
      expect(el.getAttribute('value')).toBe('b')
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASTagGroup()
      el.setAttribute('value', 'a')
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-tag" data-oas-ssr-v="1"><div part="group"><slot></slot></div>'
      const pre = el.shadowRoot!.querySelector('[part="group"]')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="group"]')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
