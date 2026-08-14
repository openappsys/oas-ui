import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTag } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '标签'): OASTag {
  const el = new OASTag()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function root(el: OASTag): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.tag')!
}

describe('OASTag', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认渲染：type default、size medium、含 slot', async () => {
    const el = mount({}, '进行中')
    const r = root(el)
    await Promise.resolve()
    expect(r.classList.contains('default')).toBe(true)
    expect(r.classList.contains('medium')).toBe(true)
    expect(el.textContent).toContain('进行中')
    expect(r.querySelector('slot')).not.toBeNull()
  })

  it('type/size/round 属性映射到 class', () => {
    const el = mount({ type: 'success', size: 'small', round: '' })
    const r = root(el)
    expect(r.classList.contains('success')).toBe(true)
    expect(r.classList.contains('small')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })

  it('size 五档：xs/small/medium/large/xl 均反映到 class', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = mount({ size: s })
      expect(root(el).classList.contains(s)).toBe(true)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(root(el).classList.contains('medium')).toBe(true)
    expect(root(el).classList.contains('huge')).toBe(false)
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('默认关闭按钮 hidden（不可交互/不入 a11y 树）；closable 时显示', () => {
    const el = mount({})
    const btn = root(el).querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn!.hidden).toBe(true)
    el.setAttribute('closable', '')
    expect(root(el).querySelector('button')!.hidden).toBe(false)
    expect(root(el).querySelector('button')!.getAttribute('aria-label')).toBe('关闭')
  })

  it('点关闭派发 oas-close（bubbles + composed + cancelable），组件自动移除', () => {
    const el = mount({ closable: '' })
    let detail: unknown
    let fired = 0
    el.addEventListener('oas-close', (e: Event) => {
      fired++
      detail = e
    })
    root(el).querySelector('button')!.click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
    expect((detail as CustomEvent).cancelable).toBe(true)
    expect(el.isConnected).toBe(false)
  })

  it('宿主 preventDefault 后组件不移除', () => {
    const el = mount({ closable: '' })
    el.addEventListener('oas-close', (e: Event) => e.preventDefault())
    root(el).querySelector('button')!.click()
    expect(el.isConnected).toBe(true)
  })

  it('属性变化增量更新：切换 type 不重建内部节点引用', () => {
    const el = mount({ type: 'primary' })
    const r = root(el)
    el.setAttribute('type', 'danger')
    el.setAttribute('round', '')
    expect(root(el)).toBe(r)
    expect(r.classList.contains('danger')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })

  it('locale：关闭按钮 aria-label 随 setLocale 切换', () => {
    const el = mount({ closable: '' })
    const btn = root(el).querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('关闭')

    setLocale(en)
    expect(btn.getAttribute('aria-label')).toBe('Close')

    setLocale('zh-CN')
    expect(btn.getAttribute('aria-label')).toBe('关闭')
  })

  it('chip 布尔 → class 含 chip', () => {
    const el = mount({ chip: '' })
    expect(root(el).classList.contains('chip')).toBe(true)
  })

  it('clickable → 宿主 role=button + tabindex=0，可聚焦可点', () => {
    const el = mount({ clickable: '' })
    expect(root(el).classList.contains('clickable')).toBe(true)
    expect(el.getAttribute('role')).toBe('button')
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  it('点击整签派发 oas-click（bubbles + composed）', () => {
    const el = mount({ clickable: '' })
    let fired = 0
    let detail: unknown
    el.addEventListener('oas-click', (e: Event) => {
      fired++
      detail = e
    })
    el.click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
  })

  it('clickable + Enter/Space 键盘触发 oas-click', () => {
    const el = mount({ clickable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(1)
    fired = 0
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(fired).toBe(1)
  })

  it('clickable + closable：点关闭只触发 oas-close，不触发 oas-click', () => {
    const el = mount({ clickable: '', closable: '' })
    let closeFired = 0
    let clickFired = 0
    el.addEventListener('oas-close', () => closeFired++)
    el.addEventListener('oas-click', () => clickFired++)
    root(el).querySelector('button')!.click()
    expect(closeFired).toBe(1)
    expect(clickFired).toBe(0)
  })

  it('disabled：不派发 oas-click、aria-disabled、去 tabindex、视觉禁用 class', () => {
    const el = mount({ clickable: '', disabled: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    el.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(root(el).classList.contains('disabled')).toBe(true)
  })

  it('disabled：点关闭不派发 oas-close、组件不移除、按钮 disabled', () => {
    const el = mount({ closable: '', disabled: '' })
    const btn = root(el).querySelector('button')!
    expect(btn.disabled).toBe(true)
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    btn.click()
    expect(fired).toBe(0)
    expect(el.isConnected).toBe(true)
  })

  it('chip + disabled 边界：不可点不可关', () => {
    const el = mount({ chip: '', clickable: '', closable: '', disabled: '' })
    let clickFired = 0
    let closeFired = 0
    el.addEventListener('oas-click', () => clickFired++)
    el.addEventListener('oas-close', () => closeFired++)
    el.click()
    root(el).querySelector('button')!.click()
    expect(clickFired).toBe(0)
    expect(closeFired).toBe(0)
    expect(el.isConnected).toBe(true)
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASTag, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、事件已绑定（含 host 级 click/keydown）、指纹移除', () => {
      const el = new OASTag()
      el.setAttribute('clickable', '')
      el.setAttribute('closable', '')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const tagEl = el.shadowRoot!.querySelector('.tag')!
      const closeBtn = el.shadowRoot!.querySelector('button')!
      el.textContent = '标签'
      document.body.appendChild(el)

      // 真水合：.tag 与关闭按钮是同一对象（未重建）
      expect(el.shadowRoot!.querySelector('.tag')).toBe(tagEl)
      expect(el.shadowRoot!.querySelector('button')).toBe(closeBtn)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

      // host 级 click 已绑定：整签点击派发 oas-click
      let clickFired = 0
      el.addEventListener('oas-click', () => clickFired++)
      el.click()
      expect(clickFired).toBe(1)

      // 关闭按钮事件已绑定：派发 oas-close 并自动移除
      let closeFired = 0
      el.addEventListener('oas-close', () => closeFired++)
      closeBtn.click()
      expect(closeFired).toBe(1)
      expect(el.isConnected).toBe(false)
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASTag()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-button')
      const pre = el.shadowRoot!.querySelector('.tag')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.tag')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })

  describe('checkable / checked 可选中', () => {
    it('点击切换 checked 并派发 oas-change（detail { checked }），aria-pressed 同步', () => {
      const el = mount({ checkable: '' })
      let fired = 0
      let detail: unknown
      el.addEventListener('oas-change', (e: Event) => {
        fired++
        detail = (e as CustomEvent).detail
      })
      expect(el.getAttribute('role')).toBe('button')
      expect(el.getAttribute('tabindex')).toBe('0')
      expect(el.getAttribute('aria-pressed')).toBe('false')

      el.click()
      expect(fired).toBe(1)
      expect(detail).toEqual({ checked: true })
      expect(el.hasAttribute('checked')).toBe(true)
      expect(el.getAttribute('aria-pressed')).toBe('true')
      expect(root(el).classList.contains('checked')).toBe(true)

      el.click()
      expect(fired).toBe(2)
      expect(detail).toEqual({ checked: false })
      expect(el.hasAttribute('checked')).toBe(false)
      expect(el.getAttribute('aria-pressed')).toBe('false')
      expect(root(el).classList.contains('checked')).toBe(false)
    })

    it('Enter / Space 键盘切换 checked（同点击流程）', () => {
      const el = mount({ checkable: '' })
      let fired = 0
      let detail: unknown
      el.addEventListener('oas-change', (e: Event) => {
        fired++
        detail = (e as CustomEvent).detail
      })
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(fired).toBe(1)
      expect(detail).toEqual({ checked: true })
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      expect(fired).toBe(2)
      expect(detail).toEqual({ checked: false })
    })

    it('disabled：不可切换、不派发 oas-change、去 tabindex、aria-pressed 同步 false', () => {
      const el = mount({ checkable: '', disabled: '', checked: '' })
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      el.click()
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(fired).toBe(0)
      expect(el.hasAttribute('checked')).toBe(true)
      expect(el.hasAttribute('tabindex')).toBe(false)
      expect(el.getAttribute('aria-pressed')).toBe('true')
      expect(el.getAttribute('aria-disabled')).toBe('true')
    })

    it('非 checkable：不残留 role/tabindex/aria-pressed；移除 checkable 后清理', () => {
      const el = mount({ checkable: '', checked: '' })
      expect(el.getAttribute('aria-pressed')).toBe('true')
      el.removeAttribute('checkable')
      expect(el.hasAttribute('role')).toBe(false)
      expect(el.hasAttribute('tabindex')).toBe(false)
      expect(el.hasAttribute('aria-pressed')).toBe(false)
      expect(root(el).classList.contains('checked')).toBe(false)
    })

    it('checkable 与 closable 互斥：checkable 时关闭按钮隐藏、不派发 oas-close', () => {
      const el = mount({ checkable: '', closable: '' })
      const btn = root(el).querySelector('button')!
      expect(btn.hidden).toBe(true)
      let closeFired = 0
      el.addEventListener('oas-close', () => closeFired++)
      btn.click()
      expect(closeFired).toBe(0)
      expect(el.isConnected).toBe(true)
    })

    it('checkable 接管整签点击：同时不再派发 oas-click', () => {
      const el = mount({ checkable: '', clickable: '' })
      let clickFired = 0
      let changeFired = 0
      el.addEventListener('oas-click', () => clickFired++)
      el.addEventListener('oas-change', () => changeFired++)
      el.click()
      expect(clickFired).toBe(0)
      expect(changeFired).toBe(1)
    })
  })

  describe('variant 形态 / color 自定义色', () => {
    it('variant 三种形态 class：outlined / filled / solid（与 type class 并存）', () => {
      for (const v of ['outlined', 'filled', 'solid'] as const) {
        const el = mount({ variant: v, type: 'success' })
        const r = root(el)
        expect(r.classList.contains(v), `variant=${v} 应有 ${v} class`).toBe(true)
        expect(r.classList.contains('success')).toBe(true)
        el.remove()
      }
    })

    it('variant 非法值缺省兼容：不加形态 class、保持类型默认渲染', () => {
      const el = mount({ variant: 'bogus', type: 'success' })
      const r = root(el)
      expect(r.classList.contains('outlined')).toBe(false)
      expect(r.classList.contains('filled')).toBe(false)
      expect(r.classList.contains('solid')).toBe(false)
      expect(r.classList.contains('success')).toBe(true)
    })

    it('color 注入 --oas-tag-color（含 filled 深色文字变体），缺省 variant 按 filled 渲染', () => {
      const el = mount({ color: '#7c3aed', type: 'primary' })
      const r = root(el)
      expect(r.style.getPropertyValue('--oas-tag-color')).toBe('#7c3aed')
      expect(r.style.getPropertyValue('--oas-tag-color-deep')).toBe('color-mix(in srgb, #7c3aed 80%, black)')
      expect(r.classList.contains('filled')).toBe(true)
      expect(r.classList.contains('primary')).toBe(true)
    })

    it('显式 variant 优先于 color 的缺省 filled 推断', () => {
      const el = mount({ color: '#7c3aed', variant: 'solid' })
      const r = root(el)
      expect(r.style.getPropertyValue('--oas-tag-color')).toBe('#7c3aed')
      expect(r.classList.contains('solid')).toBe(true)
      expect(r.classList.contains('filled')).toBe(false)
    })

    it('移除 color 后清理内联变量', () => {
      const el = mount({ color: '#7c3aed' })
      const r = root(el)
      expect(r.style.getPropertyValue('--oas-tag-color')).toBe('#7c3aed')
      el.removeAttribute('color')
      expect(r.style.getPropertyValue('--oas-tag-color')).toBe('')
      expect(r.classList.contains('filled')).toBe(false)
    })
  })

  describe('icon / href / max-width', () => {
    /** 与「真水合」describe 同构的快照构建器（本 describe 内自用） */
    function snapshotWith(el: OASTag, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('icon 属性：默认插槽前渲染 <oas-icon name>，非法图标名隐藏', () => {
      const el = mount({ icon: 'star' }, '精选')
      const iconSpan = root(el).querySelector<HTMLElement>('.icon')
      expect(iconSpan).not.toBeNull()
      expect(iconSpan!.hidden).toBe(false)
      const oasIcon = iconSpan!.querySelector('oas-icon')
      expect(oasIcon).not.toBeNull()
      expect(oasIcon!.getAttribute('name')).toBe('star')
      el.remove()

      const bad = mount({ icon: 'no-such-icon' }, 'x')
      expect(root(bad).querySelector<HTMLElement>('.icon')!.hidden).toBe(true)
      expect(root(bad).querySelector('.icon')!.querySelector('oas-icon')).toBeNull()
      bad.remove()
    })

    it('icon 名称变化时更新 oas-icon name', () => {
      const el = mount({ icon: 'star' }, 'x')
      el.setAttribute('icon', 'check')
      const oasIcon = root(el).querySelector<HTMLElement>('.icon oas-icon')
      expect(oasIcon!.getAttribute('name')).toBe('check')
    })

    it('href：渲染 <a class="tag"> 替代 span，href/target 透传', () => {
      const el = mount({ href: '/guide', target: '_blank' }, '链接')
      const r = root(el)
      expect(r.tagName).toBe('A')
      expect(r.getAttribute('href')).toBe('/guide')
      expect(r.getAttribute('target')).toBe('_blank')
      expect(r.querySelector('slot')).not.toBeNull()
    })

    it('href 增删触发 shadow 重建：span ↔ a 切换，节点引用更新', () => {
      const el = mount({ href: '/guide' }, '链接')
      const a = root(el)
      expect(a.tagName).toBe('A')
      el.removeAttribute('href')
      const span = root(el)
      expect(span.tagName).toBe('SPAN')
      expect(span).not.toBe(a)
      el.setAttribute('href', '/x')
      expect(root(el).tagName).toBe('A')
    })

    it('href 形态真水合：a.tag 快照直接接管（不重建），target 透传', () => {
      const el = new OASTag()
      el.setAttribute('href', '/x')
      el.setAttribute('target', '_blank')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const a = el.shadowRoot!.querySelector('a.tag')!
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('a.tag')).toBe(a)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.shadowRoot!.querySelector('a.tag')!.getAttribute('href')).toBe('/x')
      expect(el.shadowRoot!.querySelector('a.tag')!.getAttribute('target')).toBe('_blank')
      el.remove()
    })

    it('href + disabled：a 上 aria-disabled、点击拦截原生跳转', () => {
      const el = mount({ href: '/guide', disabled: '' }, '链接')
      const r = root(el)
      expect(r.getAttribute('aria-disabled')).toBe('true')
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      r.dispatchEvent(ev)
      // 事件冒泡到宿主：disabled + 链接形态时 preventDefault 拦截原生跳转
      expect(ev.defaultPrevented).toBe(true)
    })

    it('max-width：应用到 .content（truncate class + inline max-width），缺省不启用省略', () => {
      const el = mount({ 'max-width': '120px' }, '超长文本')
      const content = root(el).querySelector<HTMLElement>('.content')
      expect(content).not.toBeNull()
      expect(content!.style.maxWidth).toBe('120px')
      expect(content!.classList.contains('truncate')).toBe(true)
      el.remove()

      const plain = mount({}, '普通')
      const c2 = root(plain).querySelector<HTMLElement>('.content')
      expect(c2!.style.maxWidth).toBe('')
      expect(c2!.classList.contains('truncate')).toBe(false)
    })
  })

  describe('键盘删除（a11y）', () => {
    it('closable 时 Backspace/Delete 触发 oas-close 并自动移除（与点 × 相同流程）', () => {
      for (const key of ['Backspace', 'Delete']) {
        const el = mount({ closable: '' })
        let fired = 0
        let cancelable = false
        el.addEventListener('oas-close', (e: Event) => {
          fired++
          cancelable = (e as CustomEvent).cancelable
        })
        el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
        expect(fired, `key=${key}`).toBe(1)
        expect(cancelable).toBe(true)
        expect(el.isConnected).toBe(false)
      }
    })

    it('Backspace preventDefault 可阻止移除（cancelable）', () => {
      const el = mount({ closable: '' })
      el.addEventListener('oas-close', (e: Event) => e.preventDefault())
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
      expect(el.isConnected).toBe(true)
    })

    it('非 closable 或 disabled 时 Backspace 不触发关闭', () => {
      const plain = mount({})
      let fired = 0
      plain.addEventListener('oas-close', () => fired++)
      plain.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
      expect(fired).toBe(0)
      plain.remove()

      const disabled = mount({ closable: '', disabled: '' })
      disabled.addEventListener('oas-close', () => fired++)
      disabled.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      expect(fired).toBe(0)
      expect(disabled.isConnected).toBe(true)
    })
  })
})
