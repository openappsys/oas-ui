import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASList, OASListItem } from './index.js'

function mount(): OASList {
  const el = new OASList()
  el.innerHTML = `
    <oas-list-item title="条目一"><span>描述</span></oas-list-item>
    <oas-list-item title="条目二"></oas-list-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASList', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染列表项', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="list"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-list-item').length).toBe(2)
  })

  it('bordered 时加边框', () => {
    const el = mount()
    el.setAttribute('bordered', '')
    expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-bordered')).toBe('true')
  })

  it('loading 时显示骨架占位、隐藏列表项', () => {
    const el = mount()
    el.setAttribute('loading', '')
    const skeleton = el.shadowRoot!.querySelector('[part="skeleton"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(skeleton.hasAttribute('hidden')).toBe(false)
    expect(skeleton.querySelectorAll('.sk-line').length).toBe(3)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('empty 属性强制显示空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    document.body.appendChild(el)
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('无子项时自动显示空态', () => {
    const el = new OASList()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('loading 优先于空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('loading', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="skeleton"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('empty-text 自定义空态文案', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('empty-text', '没有更多数据了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')
  })

  it('locale：默认空态文案随 setLocale 切换', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('暂无数据')

    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('No data')

    setLocale('zh-CN')
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('locale：empty-text 属性覆盖 locale 默认文案', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('empty-text', '没有更多数据了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')

    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')
  })

  describe('OASListItem title 吸收（消除宿主原生 tooltip）', () => {
    function mountItem(attrs: Record<string, string> = {}): OASListItem {
      const item = new OASListItem()
      for (const [k, v] of Object.entries(attrs)) item.setAttribute(k, v)
      document.body.appendChild(item)
      return item
    }

    function titleEl(el: OASListItem): HTMLElement {
      return el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    }

    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = mountItem({ title: '条目一' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleEl(el).textContent).toBe('条目一')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mountItem({ title: '条目一' })
      el.setAttribute('data-x', '1')
      expect(titleEl(el).textContent).toBe('条目一')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mountItem({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(titleEl(el).textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mountItem({ title: '条目一' })
      el.setAttribute('title', '')
      expect(titleEl(el).textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合从快照标题区恢复 title 缓存（宿主无 title，标题不丢）', () => {
      const el = new OASListItem()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-list-item" data-oas-ssr-v="1"><style></style>' +
        '<div class="main" part="main"><div class="title" part="title">快照标题</div>' +
        '<div class="desc" part="desc"><slot name="description"><slot></slot></slot></div></div>' +
        '<div class="extra"><slot name="extra"></slot></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      expect(titleEl(el).textContent).toBe('快照标题')
    })
  })

  describe('OASListItem title 双通道（slot="title" 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本（兜底隐藏、插槽渲染、属性仍被吸收）', () => {
      const el = new OASListItem()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">富标题</span><span>描述</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 属性仍被吸收缓存（兜底隐而不删），宿主无残留原生悬浮提示
      expect(fallback.textContent).toBe('属性标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染插槽内容', () => {
      const el = new OASListItem()
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区保持既有行为（兜底为空、不隐藏）', () => {
      const el = new OASListItem()
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.textContent).toBe('')
      expect(fallback.hidden).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASListItem()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })

    it('水合后 slot 内容显示正常（快照含 slot 结构，titleCache 恢复不影响显示）', () => {
      const el = new OASListItem()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-list-item" data-oas-ssr-v="1"><style></style>' +
        '<div class="main" part="main"><div class="title" part="title"><slot name="title"><span class="title-text">快照标题</span></slot></div>' +
        '<div class="desc" part="desc"><slot name="description"><slot></slot></slot></div></div>' +
        '<div class="extra"><slot name="extra"></slot></div>'
      const rich = document.createElement('b')
      rich.setAttribute('slot', 'title')
      rich.textContent = '富标题'
      el.appendChild(rich)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 水合恢复 titleCache（快照兜底文本），但 slot 有内容 → 以插槽为准
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      expect(fallback.textContent).toBe('快照标题')
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      expect(slot.assignedNodes()).toContain(rich)
      expect(el.hasAttribute('title')).toBe(false)
    })
  })

  describe('尺寸与外观', () => {
    it('size 属性下发到容器与声明式条目', () => {
      const el = mount()
      el.setAttribute('size', 'sm')
      expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-size')).toBe('sm')
      expect(el.querySelector('oas-list-item')!.getAttribute('data-size')).toBe('sm')
      el.setAttribute('size', 'lg')
      expect(el.querySelector('oas-list-item')!.getAttribute('data-size')).toBe('lg')
    })

    it('stripe：视觉偶数行（第 2、4… 条）打 data-stripe 标记', () => {
      const el = new OASList()
      el.setAttribute('stripe', '')
      el.innerHTML = `
        <oas-list-item title="一"></oas-list-item>
        <oas-list-item title="二"></oas-list-item>
        <oas-list-item title="三"></oas-list-item>
      `
      document.body.appendChild(el)
      const rows = Array.from(el.querySelectorAll('oas-list-item'))
      expect(rows[0]!.hasAttribute('data-stripe')).toBe(false)
      expect(rows[1]!.hasAttribute('data-stripe')).toBe(true)
      expect(rows[2]!.hasAttribute('data-stripe')).toBe(false)
    })
  })

  describe('header / footer / load-more / empty 插槽', () => {
    function slotHidden(el: OASList, name: string): boolean {
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
      return slot.assignedNodes().length === 0
    }

    it('header/footer 插槽有内容时对应区域显示', async () => {
      const el = new OASList()
      el.innerHTML = `
        <oas-list-item title="条目"></oas-list-item>
        <div slot="header">列表头</div>
        <div slot="footer">列表尾</div>
      `
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const header = el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!
      const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
      expect(slotHidden(el, 'header')).toBe(false)
      expect(slotHidden(el, 'footer')).toBe(false)
      expect(header.hidden).toBe(false)
      expect(footer.hidden).toBe(false)
    })

    it('无 header/footer 内容时区域隐藏', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!.hidden).toBe(true)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(true)
    })

    it('load-more 插槽：尾区显隐随内容', async () => {
      const el = new OASList()
      el.innerHTML = `
        <oas-list-item title="条目"></oas-list-item>
        <oas-button slot="load-more">加载更多</oas-button>
      `
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="load-more"]')!.hidden).toBe(false)
    })

    it('empty 插槽：有内容时覆盖内置空态（图标+文案隐藏）', async () => {
      const el = new OASList()
      el.setAttribute('empty', '')
      el.innerHTML = `<div slot="empty">自定义空态插画</div>`
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 0))
      const empty = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
      expect(empty.hidden).toBe(false)
      expect(slotHidden(el, 'empty')).toBe(false)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty-default"]')!.hidden).toBe(true)
      expect(el.shadowRoot!.textContent).not.toContain('暂无数据')
    })
  })

  describe('OASListItem Meta 结构化（avatar / description 属性）', () => {
    it('description 属性渲染描述区（无插槽时）', () => {
      const el = new OASListItem()
      el.setAttribute('title', '标题')
      el.setAttribute('description', '属性描述')
      document.body.appendChild(el)
      const desc = el.shadowRoot!.querySelector<HTMLElement>('.desc-text')!
      expect(desc.textContent).toBe('属性描述')
      expect(el.getAttribute('description')).toBe('属性描述')
    })

    it('description 插槽覆盖属性文本', () => {
      const el = new OASListItem()
      el.setAttribute('description', '属性描述')
      el.innerHTML = '<span slot="description">插槽描述</span>'
      document.body.appendChild(el)
      const desc = el.shadowRoot!.querySelector<HTMLElement>('.desc-text')!
      expect(desc.hidden).toBe(true)
      expect(desc.textContent).toBe('属性描述')
    })

    it('avatar 属性：渲染 URL 头像图', () => {
      const el = new OASListItem()
      el.setAttribute('avatar', 'https://example.com/a.png')
      document.body.appendChild(el)
      const avatar = el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!
      expect(avatar.hidden).toBe(false)
      const img = avatar.querySelector('img')!
      expect(img.getAttribute('src')).toBe('https://example.com/a.png')
    })

    it('avatar 插槽覆盖属性图（可放 oas-avatar 或任意内容）', () => {
      const el = new OASListItem()
      el.setAttribute('avatar', 'https://example.com/a.png')
      el.innerHTML = '<span slot="avatar">自定义头像</span>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="avatar"]')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
    })

    it('无 avatar 时头像区隐藏', () => {
      const el = new OASListItem()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(true)
    })

    it('hidden 显隐有 CSS 兜底（.avatar flex / .avatar-img block 不得压过 UA [hidden]）', () => {
      // 回归：曾现无头像时灰圈 + 破图残影（用户实测）——作者层 display 压过 UA [hidden]
      const el = new OASListItem()
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/)
      el.remove()
    })

    it('itemData 元数据兜底：属性缺席时 title/description/avatar 从 itemData 同名字段渲染', () => {
      // 用户实测：数据通道对象行不写模板曾整体渲染成 "[object Object]"
      const el = new OASListItem()
      ;(el as { itemData?: unknown }).itemData = {
        title: '审计事件 #1000',
        description: '操作人 system',
        avatar: 'https://example.com/a.png',
      }
      document.body.appendChild(el)
      const titleText = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      const descText = el.shadowRoot!.querySelector<HTMLElement>('.desc-text')!
      const img = el.shadowRoot!.querySelector<HTMLImageElement>('.avatar-img')!
      expect(titleText.textContent).toBe('审计事件 #1000')
      expect(descText.textContent).toBe('操作人 system')
      expect(img.getAttribute('src')).toBe('https://example.com/a.png')
      el.remove()
    })

    it('itemData 不覆盖显式 title/description 属性（属性优先）', () => {
      const el = new OASListItem()
      el.setAttribute('title', '显式标题')
      el.setAttribute('description', '显式描述')
      ;(el as { itemData?: unknown }).itemData = { title: '数据标题', description: '数据描述' }
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('.title-text')!.textContent).toBe('显式标题')
      expect(el.shadowRoot!.querySelector<HTMLElement>('.desc-text')!.textContent).toBe('显式描述')
      el.remove()
    })
  })

  describe('OASListItem 行交互（clickable / selected）', () => {
    it('clickable：可聚焦，不挂 role=button（避免与行内控件形成交互嵌套）', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.textContent = '设置项'
      document.body.appendChild(el)
      expect(el.getAttribute('tabindex')).toBe('0')
      expect(el.hasAttribute('role'), '缺省 role=button 会与行内控件嵌套（axe: nested-interactive）').toBe(false)
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.click()
      expect(fired).toBe(1)
    })

    it('宿主显式 role="button" 不被剥除（clickable 行保留宿主语义，与 card 口径一致）', () => {
      // 回归：曾无条件 removeAttribute('role')，宿主想恢复行级按钮语义也被剥掉
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.setAttribute('role', 'button')
      el.textContent = '设置项'
      document.body.appendChild(el)
      expect(el.getAttribute('role'), '宿主显式 role 必须保留（组件不覆盖）').toBe('button')
      expect(el.getAttribute('tabindex')).toBe('0')
      expect(el.hasAttribute('data-clickable')).toBe(true)
      // 行为不异常：行点击照常派发
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.click()
      expect(fired).toBe(1)
    })

    it('宿主显式 role + selected：role 保留、选中态钩子正常、不加 aria-pressed', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.setAttribute('selected', '')
      el.setAttribute('role', 'button')
      el.textContent = '设置项'
      document.body.appendChild(el)
      expect(el.getAttribute('role')).toBe('button')
      // 组件不设 aria-pressed（selected 只驱动 CSS 高亮），也不删宿主自设值
      expect(el.hasAttribute('aria-pressed')).toBe(false)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style, 'selected 视觉钩子保持').toMatch(/:host\(\[selected\]\)\s*\{[^}]*background/)
      el.setAttribute('aria-pressed', 'true')
      el.removeAttribute('selected')
      expect(el.getAttribute('aria-pressed'), '宿主自设 aria-pressed 不被删').toBe('true')
    })

    it('点击行内交互控件不派发行 oas-click（避免行与控件双触发）', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      const inner = document.createElement('button')
      inner.textContent = '行内按钮'
      el.appendChild(inner)
      document.body.appendChild(el)
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      inner.click()
      expect(fired, '行内控件点击不应触发行点击').toBe(0)
      // 行本体点击仍触发
      el.click()
      expect(fired).toBe(1)
    })

    it('行内 ARIA 控件角色（switch/checkbox/link/menuitem/contenteditable）点击同样不触发行点击', () => {
      const cases: Array<[string, string, string]> = [
        ['span', 'role', 'switch'],
        ['span', 'role', 'checkbox'],
        ['span', 'role', 'link'],
        ['span', 'role', 'menuitem'],
        ['div', 'contenteditable', 'true'],
      ]
      for (const [tag, attr, value] of cases) {
        const el = new OASListItem()
        el.setAttribute('clickable', '')
        const inner = document.createElement(tag)
        inner.setAttribute(attr, value)
        inner.textContent = '行内控件'
        el.appendChild(inner)
        document.body.appendChild(el)
        let fired = 0
        el.addEventListener('oas-click', () => fired++)
        inner.click()
        expect(fired, `行内 [${attr}="${value}"] 点击不应触发行点击`).toBe(0)
        el.remove()
      }
    })

    it('非 clickable 不派发 oas-click', () => {
      const el = new OASListItem()
      document.body.appendChild(el)
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.click()
      expect(fired).toBe(0)
    })

    it('键盘 Enter / Space 触发 oas-click', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      document.body.appendChild(el)
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      expect(fired).toBe(2)
    })

    it('selected：视觉态 CSS 钩子（不挂 aria-pressed，行无 role 时该属性非法）', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.setAttribute('selected', '')
      document.body.appendChild(el)
      expect(el.hasAttribute('aria-pressed')).toBe(false)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/:host\(\[selected\]\)\s*\{[^}]*background/)
      el.removeAttribute('selected')
      expect(el.hasAttribute('aria-pressed')).toBe(false)
    })

    it('hover 反馈 CSS 钩子：clickable 行 hover 背景', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      document.body.appendChild(el)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/:host\(\[data-clickable\]:hover\)\s*\{[^}]*background/)
    })

    it('选中行 hover 保持 primary 底（压盖 clickable hover 浅灰，防白字白底不可读回归）', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.setAttribute('selected', '')
      document.body.appendChild(el)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      // 选中态 hover 规则存在且带 primary 背景
      expect(style).toMatch(/:host\(\[selected\]:hover\)\s*\{[^}]*primary/)
      // 且该规则位于 clickable hover 规则之后（同优先级后者胜）
      const hoverIdx = style.indexOf(':host([data-clickable]:hover)')
      const selHoverIdx = style.indexOf(':host([selected]:hover)')
      expect(selHoverIdx).toBeGreaterThan(hoverIdx)
    })
  })

  describe('数据通道（data + template / oas-item-render 双通道）', () => {
    it('data property：渲染 oas-list-item 行（带 data-index），声明式子项被数据通道接管', () => {
      const el = new OASList()
      el.innerHTML = '<oas-list-item title="声明式"></oas-list-item>'
      el.data = [
        { title: '甲', description: '描述甲' },
        { title: '乙', description: '描述乙' },
      ]
      document.body.appendChild(el)
      const box = el.shadowRoot!.querySelector('[part="data-items"]')!
      const rows = box.querySelectorAll('oas-list-item')
      expect(rows.length).toBe(2)
      expect(rows[0]!.getAttribute('data-index')).toBe('0')
      expect(rows[1]!.getAttribute('data-index')).toBe('1')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!.hidden).toBe(true)
    })

    it('data 属性（JSON 字符串）同样生效', () => {
      const el = new OASList()
      el.setAttribute('data', JSON.stringify(['甲', '乙', '丙']))
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows.length).toBe(3)
    })

    it('无模板时默认渲染 String(item)', () => {
      const el = new OASList()
      el.data = ['甲', 42]
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows[0]!.textContent).toContain('甲')
      expect(rows[1]!.textContent).toContain('42')
    })

    it('无模板时对象行不做 String 兜底（itemData 元数据渲染，不出现 [object Object]）', () => {
      // 用户实测回归：数据通道对象行曾整体渲染成 "[object Object]"
      const el = new OASList()
      el.data = [{ title: '任务 A', description: '描述 A' }]
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows[0]!.textContent).not.toContain('[object Object]')
      // itemData 元数据渲染在行的 shadow 内（.title-text/.desc-text）
      const item = rows[0] as HTMLElement
      expect(item.shadowRoot!.querySelector('.title-text')!.textContent).toBe('任务 A')
      expect(item.shadowRoot!.querySelector('.desc-text')!.textContent).toBe('描述 A')
    })

    it('data 为空数组 → 空态', () => {
      const el = new OASList()
      el.data = []
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
    })

    it('template[slot="item"]：骨架克隆 + [data-index] 上下文绑定', () => {
      const el = new OASList()
      el.innerHTML = `
        <template slot="item">
          <span slot="title" data-bind="title"></span>
          <span slot="description" data-bind="description"></span>
        </template>
      `
      el.data = [
        { title: '甲', description: '描述甲' },
        { title: '乙', description: '描述乙' },
      ]
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows.length).toBe(2)
      // 模板克隆进每个条目：slot 结构由 oas-list-item 分发
      expect(rows[0]!.querySelector('[data-bind="title"]')).not.toBeNull()
      expect(rows[1]!.getAttribute('data-index')).toBe('1')
    })

    it('oas-item-render：每行派发 { index, item, element }', () => {
      const el = new OASList()
      el.data = [{ label: '甲' }, { label: '乙' }]
      document.body.appendChild(el)
      const seen: Array<{ index: number; label: string }> = []
      el.addEventListener('oas-item-render', (e: Event) => {
        const { index, item } = (e as CustomEvent).detail
        seen.push({ index, label: (item as { label: string }).label })
      })
      el.data = [{ label: '甲' }, { label: '乙' }]
      expect(seen.map((s) => s.index)).toEqual([0, 1])
      expect(seen.map((s) => s.label)).toEqual(['甲', '乙'])
    })

    it('数据行点击：oas-click detail 带 index 与原始 item', () => {
      const el = new OASList()
      const items = [{ title: '甲' }, { title: '乙' }]
      el.data = items
      document.body.appendChild(el)
      const seen: Array<{ index: number; item: unknown }> = []
      el.addEventListener('oas-click', (e: Event) => seen.push((e as CustomEvent).detail))
      const row = el.shadowRoot!.querySelector('[part="data-items"]')!.children[1] as HTMLElement
      row.setAttribute('clickable', '')
      row.click()
      expect(seen.length).toBe(1)
      expect(seen[0]!.index).toBe(1)
      expect(seen[0]!.item).toBe(items[1])
    })

    it('数据通道行打 stripe 标记', () => {
      const el = new OASList()
      el.setAttribute('stripe', '')
      el.data = ['甲', '乙', '丙']
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows[0]!.hasAttribute('data-stripe')).toBe(false)
      expect(rows[1]!.hasAttribute('data-stripe')).toBe(true)
    })
  })

  describe('数据分组（group / groupLabel 组头）', () => {
    function groupedRows(el: OASList): HTMLElement[] {
      return Array.from(el.shadowRoot!.querySelectorAll('[part="data-items"] .group-header'))
    }

    it('连续同 group 项自动归入分组容器（组头为组容器首元素，行按组收容）', () => {
      const el = new OASList()
      el.data = [
        { title: '甲', group: '进行中' },
        { title: '乙', group: '进行中' },
        { title: '丙', group: '已完成' },
        { title: '丁' },
      ]
      document.body.appendChild(el)
      const box = el.shadowRoot!.querySelector('[part="data-items"]')!
      const headers = groupedRows(el)
      expect(headers.length).toBe(2)
      expect(headers[0]!.textContent).toBe('进行中')
      expect(headers[1]!.textContent).toBe('已完成')
      // 结构：data-items 直挂两个 .group + 一个非组行；组头在组容器内首位
      const groups = Array.from(box.querySelectorAll(':scope > .group'))
      expect(groups.length).toBe(2)
      expect(groups[0]!.firstElementChild!.textContent).toBe('进行中')
      expect(groups[0]!.querySelectorAll('oas-list-item').length).toBe(2)
      expect(groups[1]!.firstElementChild!.textContent).toBe('已完成')
      expect(groups[1]!.querySelectorAll('oas-list-item').length).toBe(1)
      // 非组行直挂 data-items 末尾，行 data-index 与数据序一一对应
      const last = box.lastElementChild!
      expect(last.classList.contains('group')).toBe(false)
      expect(last.getAttribute('data-index')).toBe('3')
    })

    it('groupLabel 字段自定义组头文案（缺省回落 group）', () => {
      const el = new OASList()
      el.data = [
        { title: '甲', group: 'A', groupLabel: '自定义组名' },
        { title: '乙', group: 'A' },
        { title: '丙', group: 'B' },
      ]
      document.body.appendChild(el)
      const headers = groupedRows(el)
      expect(headers.length).toBe(2)
      expect(headers[0]!.textContent).toBe('自定义组名')
      expect(headers[1]!.textContent).toBe('B')
    })

    it('同一组字符串被非组行隔开视为两段（各自插组头）', () => {
      const el = new OASList()
      el.data = [{ title: '甲', group: 'A' }, { title: '乙' }, { title: '丙', group: 'A' }]
      document.body.appendChild(el)
      expect(groupedRows(el).length).toBe(2)
    })

    it('组头不占用 data-index：行索引仍为原始数据序号，oas-item-render index 不变', () => {
      const el = new OASList()
      el.data = [
        { title: '甲', group: 'A' },
        { title: '乙', group: 'A' },
        { title: '丙', group: 'B' },
      ]
      document.body.appendChild(el)
      const rows = el.shadowRoot!.querySelectorAll('[part="data-items"] oas-list-item')
      expect(rows.length).toBe(3)
      expect(Array.from(rows).map((r) => r.getAttribute('data-index'))).toEqual(['0', '1', '2'])
      const seen: number[] = []
      el.addEventListener('oas-item-render', (e) => seen.push((e as CustomEvent).detail.index))
      el.data = [
        { title: '甲', group: 'A' },
        { title: '乙', group: 'A' },
      ]
      expect(seen).toEqual([0, 1])
    })

    it('普通模式组头吸顶：data-sticky 标记 + position: sticky top:0 规则', () => {
      const el = new OASList()
      el.data = [
        { title: '甲', group: 'A' },
        { title: '乙', group: 'B' },
      ]
      document.body.appendChild(el)
      const headers = groupedRows(el)
      expect(headers[0]!.hasAttribute('data-sticky')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.group-header\[data-sticky\]\s*\{[^}]*position:\s*sticky/)
      expect(css).toMatch(/\.group-header\[data-sticky\]\s*\{[^}]*top:\s*0/)
      // 组头背景不透明（盖住滚经行），只走 CSS 变量 token（含暗色变体）
      expect(css).toMatch(/\.group-header\s*\{[^}]*background:\s*var\(--oas-color-bg\)/)
    })

    it('height 虚拟模式 + 分组：回退全量渲染，组头普通渲染不吸顶（无 data-sticky）', () => {
      const el = new OASList()
      el.setAttribute('height', '240')
      el.data = [
        { title: '甲', group: 'A' },
        { title: '乙', group: 'A' },
        { title: '丙', group: 'B' },
      ]
      document.body.appendChild(el)
      const vlist = el.shadowRoot!.querySelector<HTMLElement>('oas-virtual-list')!
      expect(vlist.hidden).toBe(true)
      const box = el.shadowRoot!.querySelector('[part="data-items"]')!
      expect(box.hasAttribute('hidden')).toBe(false)
      const headers = groupedRows(el)
      expect(headers.length).toBe(2)
      for (const h of headers) expect(h.hasAttribute('data-sticky')).toBe(false)
    })

    it('height 虚拟模式 + 无分组：仍走内嵌虚拟列表（分组检测不误伤普通虚拟数据）', () => {
      const el = new OASList()
      el.setAttribute('height', '240')
      el.data = Array.from({ length: 60 }, (_, i) => ({ title: `第 ${i + 1} 条` }))
      document.body.appendChild(el)
      const vlist = el.shadowRoot!.querySelector<HTMLElement>('oas-virtual-list')!
      expect(vlist.hidden).toBe(false)
      expect(groupedRows(el).length).toBe(0)
    })

    it('组头/分组容器 role="presentation"（非 listitem，不破坏 role=list 的 required-children）', () => {
      const el = new OASList()
      el.data = [{ title: '甲', group: 'A' }]
      document.body.appendChild(el)
      const h = groupedRows(el)[0]!
      expect(h.getAttribute('role')).toBe('presentation')
      expect(h.hasAttribute('tabindex')).toBe(false)
      // 分组容器同为 presentation：presentation 会把子节点透传给上层 list
      expect(h.parentElement!.getAttribute('role')).toBe('presentation')
    })
  })

  describe('虚拟滚动（内嵌 oas-virtual-list）', () => {
    it('height 属性启用虚拟模式：内嵌虚拟列表接管渲染', () => {
      const el = new OASList()
      el.setAttribute('height', '240')
      el.data = Array.from({ length: 100 }, (_, i) => `第 ${i + 1} 条`)
      document.body.appendChild(el)
      const vlist = el.shadowRoot!.querySelector<HTMLElement>('oas-virtual-list')!
      expect(vlist.hidden).toBe(false)
      expect(vlist.getAttribute('height')).toBe('240')
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="data-items"]')!.hidden).toBe(true)
      // 数据透传到内嵌虚拟列表（窗口渲染，只渲染可见项）
      expect(vlist.shadowRoot!.querySelectorAll('[part="item"]').length).toBeGreaterThan(0)
      expect(vlist.shadowRoot!.querySelectorAll('[part="item"]').length).toBeLessThan(100)
    })

    it('虚拟模式行点击派发的 oas-click detail 带 index/item', () => {
      const el = new OASList()
      el.setAttribute('height', '240')
      const data = Array.from({ length: 50 }, (_, i) => `第 ${i + 1} 条`)
      el.data = data
      document.body.appendChild(el)
      const seen: Array<{ index: number; item: unknown }> = []
      el.addEventListener('oas-click', (e: Event) => seen.push((e as CustomEvent).detail))
      const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
      const firstRow = vlist.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
      firstRow.click()
      expect(seen.length).toBe(1)
      expect(seen[0]!.index).toBe(Number(firstRow.getAttribute('data-index')))
      expect(seen[0]!.item).toBe(data[seen[0]!.index])
    })

    it('离开虚拟模式：模板回到 light DOM，普通数据渲染恢复', () => {
      const el = new OASList()
      el.setAttribute('height', '240')
      el.innerHTML = `
        <template slot="item"><span data-tpl></span></template>
      `
      el.data = ['甲', '乙']
      document.body.appendChild(el)
      const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
      expect(vlist.querySelector('template[slot="item"]')).not.toBeNull()
      el.removeAttribute('height')
      expect(el.querySelector('template[slot="item"]')).not.toBeNull()
      const rows = el.shadowRoot!.querySelector('[part="data-items"]')!.children
      expect(rows.length).toBe(2)
      expect(rows[0]!.querySelector('[data-tpl]')).not.toBeNull()
    })
  })

  describe('滚动加载（reach-bottom）', () => {
    it('max-height 下内容不溢出即触底：挂载即派发 oas-reach-bottom', () => {
      const el = new OASList()
      el.setAttribute('max-height', '200')
      el.innerHTML = '<oas-list-item title="一"></oas-list-item>'
      let fired = 0
      el.addEventListener('oas-reach-bottom', () => fired++)
      document.body.appendChild(el)
      expect(fired).toBe(1)
    })

    it('滚动容器样式：max-height 落成 body 内联样式', () => {
      const el = new OASList()
      el.setAttribute('max-height', '160')
      document.body.appendChild(el)
      const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
      expect(body.style.maxHeight).toBe('160px')
      expect(body.style.overflowY).toBe('auto')
    })

    it('max-height 内容真实溢出才补 tabindex；不溢出时不加（无空 Tab 停靠点）', () => {
      // 回归：曾设了 max-height 就无条件 tabindex=0，内容不溢出也多出一个空 Tab 停靠点
      const el = new OASList()
      el.setAttribute('max-height', '120')
      document.body.appendChild(el)
      const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
      // happy-dom 无真实布局（scrollHeight/clientHeight 均为 0）：mock 溢出判定输入（沿用文件内 defineProperty 做法）
      const mockScroll = (scrollHeight: number, clientHeight: number) => {
        Object.defineProperty(body, 'scrollHeight', { configurable: true, value: scrollHeight })
        Object.defineProperty(body, 'clientHeight', { configurable: true, value: clientHeight })
      }
      mockScroll(500, 120)
      el.setAttribute('size', 'lg') // 观察属性变化触发 update() → 真实溢出
      expect(body.getAttribute('tabindex'), '溢出时补 tabindex（键盘可达，axe: scrollable-region-focusable）').toBe('0')
      mockScroll(120, 120)
      el.setAttribute('size', 'md') // 不溢出
      expect(body.hasAttribute('tabindex'), '不溢出时不加 tabindex').toBe(false)
    })
  })

  describe('hoverable（不可点行的 hover 底色反馈）', () => {
    it('hoverable 进 observedAttributes；声明式与数据通道行都打 data-hoverable 钩子', () => {
      expect(OASList.observedAttributes).toContain('hoverable')
      // 声明式通道
      const decl = new OASList()
      decl.setAttribute('hoverable', '')
      decl.innerHTML = '<oas-list-item title="一"></oas-list-item>'
      document.body.appendChild(decl)
      expect(decl.querySelector('oas-list-item')!.hasAttribute('data-hoverable'), '声明式行打 hover 钩子').toBe(true)
      // 数据通道
      const el = new OASList()
      el.setAttribute('hoverable', '')
      el.data = [{ title: '甲' }, { title: '乙' }]
      document.body.appendChild(el)
      const dataRows = [...el.shadowRoot!.querySelectorAll('[part="data-items"] oas-list-item')]
      expect(dataRows.length).toBe(2)
      expect(
        dataRows.every((r) => r.hasAttribute('data-hoverable')),
        '数据通道行打 hover 钩子',
      ).toBe(true)
    })

    it('默认不开：未设 hoverable 时行不打钩子（现状不变，仅 clickable 行有 hover）', () => {
      const el = new OASList()
      el.innerHTML = '<oas-list-item title="一"></oas-list-item>'
      el.data = [{ title: '甲' }]
      document.body.appendChild(el)
      expect(el.querySelector('oas-list-item')!.hasAttribute('data-hoverable')).toBe(false)
      expect(el.shadowRoot!.querySelector('[part="data-items"] oas-list-item')!.hasAttribute('data-hoverable')).toBe(
        false,
      )
    })

    it('运行时移除 hoverable：行钩子同步摘除', () => {
      const el = new OASList()
      el.setAttribute('hoverable', '')
      el.innerHTML = '<oas-list-item title="一"></oas-list-item>'
      document.body.appendChild(el)
      expect(el.querySelector('oas-list-item')!.hasAttribute('data-hoverable')).toBe(true)
      el.removeAttribute('hoverable')
      expect(el.querySelector('oas-list-item')!.hasAttribute('data-hoverable')).toBe(false)
    })

    it('样式表含行 hover 底色规则（走 token；选中行排除在 hover 规则外，保持 primary 底）', () => {
      const el = new OASList()
      el.setAttribute('hoverable', '')
      el.data = [{ title: '甲' }]
      document.body.appendChild(el)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/data-hoverable='true'.*oas-list-item/)
      expect(style).toContain('var(--oas-color-bg-hover)')
      expect(style).toContain(':not([selected])')
    })
  })

  describe('sortable 行拖拽排序（能力缺口 D14）', () => {
    const transfer = (): DataTransfer =>
      ({ setData: () => {}, getData: () => '', effectAllowed: '', dropEffect: '' }) as unknown as DataTransfer
    const drag = (el: OASList, type: string, target: HTMLElement): void => {
      target.dispatchEvent(new DragEvent(type, { bubbles: true, composed: true, dataTransfer: transfer() }))
    }
    const dataRows = (el: OASList): HTMLElement[] => [
      ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="data-items"] oas-list-item'),
    ]

    it('sortable 进 observedAttributes；数据通道与声明式行都置 draggable', () => {
      expect(OASList.observedAttributes).toContain('sortable')
      const dataEl = new OASList()
      dataEl.setAttribute('sortable', '')
      dataEl.data = [{ title: '甲' }, { title: '乙' }, { title: '丙' }]
      document.body.appendChild(dataEl)
      expect(dataRows(dataEl).every((r) => r.getAttribute('draggable') === 'true')).toBe(true)
      expect(dataEl.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-sortable')).toBe('true')

      const declEl = new OASList()
      declEl.setAttribute('sortable', '')
      declEl.innerHTML = '<oas-list-item title="一"></oas-list-item><oas-list-item title="二"></oas-list-item>'
      document.body.appendChild(declEl)
      expect([...declEl.querySelectorAll('oas-list-item')].every((r) => r.getAttribute('draggable') === 'true')).toBe(
        true,
      )
    })

    it('缺省不开启：行不置 draggable、data-sortable=false', () => {
      const el = new OASList()
      el.data = [{ title: '甲' }]
      document.body.appendChild(el)
      expect(dataRows(el)[0]!.getAttribute('draggable')).not.toBe('true')
      expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-sortable')).toBe('false')
      let fired = 0
      el.addEventListener('oas-reorder', () => fired++)
      drag(el, 'dragstart', dataRows(el)[0]!)
      drag(el, 'drop', dataRows(el)[0]!)
      expect(fired).toBe(0)
    })

    it('数据通道：拖拽落点换位派发 oas-reorder { from, to, item }', () => {
      const el = new OASList()
      el.setAttribute('sortable', '')
      const items = [{ title: '甲' }, { title: '乙' }, { title: '丙' }]
      el.data = items
      document.body.appendChild(el)
      let detail: { from?: number; to?: number; item?: unknown } | undefined
      el.addEventListener('oas-reorder', (e: Event) => (detail = (e as CustomEvent).detail))
      const rows = dataRows(el)
      drag(el, 'dragstart', rows[0]!)
      drag(el, 'dragover', rows[2]!)
      drag(el, 'drop', rows[2]!)
      expect(detail).toEqual({ from: 0, to: 2, item: items[0] })
    })

    it('声明式通道：拖拽换位 detail.item 为被拖行元素', () => {
      const el = new OASList()
      el.setAttribute('sortable', '')
      el.innerHTML = '<oas-list-item title="一"></oas-list-item><oas-list-item title="二"></oas-list-item>'
      document.body.appendChild(el)
      let detail: { from?: number; to?: number; item?: unknown } | undefined
      el.addEventListener('oas-reorder', (e: Event) => (detail = (e as CustomEvent).detail))
      const rows = [...el.querySelectorAll<HTMLElement>('oas-list-item')]
      drag(el, 'dragstart', rows[0]!)
      drag(el, 'drop', rows[1]!)
      expect(detail?.from).toBe(0)
      expect(detail?.to).toBe(1)
      expect(detail?.item).toBe(rows[0])
    })

    it('落点与源同行不派发 oas-reorder', () => {
      const el = new OASList()
      el.setAttribute('sortable', '')
      el.data = [{ title: '甲' }, { title: '乙' }]
      document.body.appendChild(el)
      let fired = 0
      el.addEventListener('oas-reorder', () => fired++)
      const rows = dataRows(el)
      drag(el, 'dragstart', rows[0]!)
      drag(el, 'drop', rows[0]!)
      expect(fired).toBe(0)
    })

    it('拖拽中的落点高亮类：dragover 加、drop/dragend 清', () => {
      const el = new OASList()
      el.setAttribute('sortable', '')
      el.data = [{ title: '甲' }, { title: '乙' }]
      document.body.appendChild(el)
      const rows = dataRows(el)
      drag(el, 'dragstart', rows[0]!)
      drag(el, 'dragover', rows[1]!)
      expect(rows[1]!.classList.contains('row--drag-over')).toBe(true)
      expect(rows[0]!.classList.contains('row--dragging')).toBe(true)
      drag(el, 'dragend', rows[0]!)
      expect(rows[1]!.classList.contains('row--drag-over')).toBe(false)
      expect(rows[0]!.classList.contains('row--dragging')).toBe(false)
    })

    it('样式表含拖拽规则（token 色 + RTL 镜像）', () => {
      const el = new OASList()
      el.setAttribute('sortable', '')
      el.data = [{ title: '甲' }]
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain("data-sortable='true'")
      expect(css).toContain('.row--drag-over')
      expect(css).toContain('var(--oas-color-primary)')
      expect(css).toContain(':host([data-rtl])')
    })
  })

  describe('OASListItem 前置媒体槽（icon / image）', () => {
    function item(content: string): import('./oas-list-item.js').OASListItem {
      const row = document.createElement('oas-list-item') as import('./oas-list-item.js').OASListItem
      row.innerHTML = content
      document.body.appendChild(row)
      return row
    }

    it('slot="icon" 投影到前置图标位；无内容时容器隐藏', () => {
      const row = item('<oas-icon name="user" slot="icon"></oas-icon><span slot="title">甲</span>')
      const iconWrap = row.shadowRoot!.querySelector<HTMLElement>('[part="lead-icon"]')!
      expect(iconWrap).not.toBeNull()
      expect(iconWrap.hidden).toBe(false)
      expect(iconWrap.querySelector('slot[name="icon"]')).not.toBeNull()
      // 无内容行：图标位隐藏
      const plain = item('<span slot="title">乙</span>')
      expect((plain.shadowRoot!.querySelector('[part="lead-icon"]') as HTMLElement).hidden).toBe(true)
    })

    it('slot="image" 投影到方形缩略图位；无内容时容器隐藏', () => {
      const row = item('<img src="x.png" alt="" slot="image" /><span slot="title">甲</span>')
      const imgWrap = row.shadowRoot!.querySelector<HTMLElement>('[part="lead-image"]')!
      expect(imgWrap.hidden).toBe(false)
      // 无内容行：缩略图位隐藏
      const plain = item('<span slot="title">乙</span>')
      expect((plain.shadowRoot!.querySelector('[part="lead-image"]') as HTMLElement).hidden).toBe(true)
    })

    it('icon / image / avatar 三前置位并存互斥显隐（各自判空）', () => {
      const row = item(
        '<oas-icon name="user" slot="icon"></oas-icon><img src="x.png" alt="" slot="image" /><span slot="title">甲</span>',
      )
      expect((row.shadowRoot!.querySelector('[part="lead-icon"]') as HTMLElement).hidden).toBe(false)
      expect((row.shadowRoot!.querySelector('[part="lead-image"]') as HTMLElement).hidden).toBe(false)
      expect((row.shadowRoot!.querySelector('[part="avatar"]') as HTMLElement).hidden).toBe(true)
    })

    it('样式表含前置位布局规则（flex none + token 尺寸，image 容器方形圆角）', () => {
      const row = item('<span slot="title">甲</span>')
      const css = row.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('.lead-icon')
      expect(css).toContain('.lead-image')
      expect(css).toContain('var(--oas-radius-sm)')
    })

    it('动态增删 slot 内容即时切换显隐', async () => {
      const row = item('<span slot="title">甲</span>')
      expect((row.shadowRoot!.querySelector('[part="lead-icon"]') as HTMLElement).hidden).toBe(true)
      const icon = document.createElement('oas-icon')
      icon.setAttribute('name', 'user')
      icon.setAttribute('slot', 'icon')
      row.appendChild(icon)
      await new Promise((r) => setTimeout(r, 0))
      expect((row.shadowRoot!.querySelector('[part="lead-icon"]') as HTMLElement).hidden).toBe(false)
      icon.remove()
      await new Promise((r) => setTimeout(r, 0))
      expect((row.shadowRoot!.querySelector('[part="lead-icon"]') as HTMLElement).hidden).toBe(true)
    })
  })

  describe('OASListItem 整行链接（href / target）', () => {
    function item(
      attrs: Record<string, string>,
      content = '<span slot="title">文档行</span>',
    ): import('./oas-list-item.js').OASListItem {
      const row = document.createElement('oas-list-item') as import('./oas-list-item.js').OASListItem
      for (const [k, v] of Object.entries(attrs)) row.setAttribute(k, v)
      row.innerHTML = content
      document.body.appendChild(row)
      return row
    }

    it('href 进 observedAttributes；链接行渲染内部覆盖 <a>（href 同步）', () => {
      const row = item({ href: 'https://example.com/doc' })
      expect((row.constructor as typeof import('./oas-list-item.js').OASListItem).observedAttributes).toContain('href')
      const a = row.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!
      expect(a).not.toBeNull()
      expect(a.getAttribute('href')).toBe('https://example.com/doc')
    })

    it('target 同步到 <a>；target 在场且未显式给 rel 时自动补 noopener noreferrer', () => {
      const row = item({ href: 'https://example.com', target: '_blank' })
      const a = row.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
      // 显式 rel 不覆盖
      const row2 = item({ href: 'https://example.com', target: '_blank', rel: 'opener' })
      expect(row2.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!.getAttribute('rel')).toBe('opener')
      // 无 target 不补 rel
      const row3 = item({ href: 'https://example.com' })
      expect(row3.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!.getAttribute('rel')).toBeNull()
    })

    it('链接 <a> 有可访问名称（aria-label = 行标题；axe link-name 达标）', () => {
      const row = item({ href: '#a' })
      const a = row.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!
      expect(a.getAttribute('aria-label')).toBe('文档行')
      // slot 标题时取插槽文本
      const row2 = item({ href: '#b' }, '<b slot="title">富标题行</b>')
      expect(row2.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!.getAttribute('aria-label')).toBe(
        '富标题行',
      )
    })

    it('无 href 时不渲染链接覆盖层；移除 href 即刻摘除', () => {
      const row = item({})
      expect(row.shadowRoot!.querySelector('a.row-link')).toBeNull()
      row.setAttribute('href', '#c')
      expect(row.shadowRoot!.querySelector('a.row-link')).not.toBeNull()
      row.removeAttribute('href')
      expect(row.shadowRoot!.querySelector('a.row-link')).toBeNull()
    })

    it('链接行打 data-clickable 钩子（hover 反馈）但 host 不设 tabindex（焦点由内部 a 承担）', () => {
      const row = item({ href: '#d' })
      expect(row.hasAttribute('data-clickable')).toBe(true)
      expect(row.hasAttribute('tabindex')).toBe(false)
    })

    it('链接行 a 覆盖整行（inset-0）且 extra 操作区在其上层（行内控件可点不误导航）', () => {
      const row = item({ href: '#e' }, '<span slot="title">标题</span><oas-button slot="extra">操作</oas-button>')
      const css = row.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('.row-link')
      expect(css).toContain('inset: 0')
      // extra 层级规则：链接之上（z-index 高于 row-link）
      expect(css).toMatch(/\.extra\s*\{[^}]*z-index/)
    })

    it('链接行点击不派发 oas-click（点击=导航，语义与 clickable 行分离避免双触发歧义；键盘 Enter 交原生 a）', () => {
      const row = item({ href: '#f' })
      let clicks = 0
      row.addEventListener('oas-click', () => clicks++)
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }))
      expect(clicks, '链接行 oas-click 不派发（宿主埋点用 href 通道/监听原生导航）').toBe(0)
    })
  })
})

/**
 * windowed（服务端行窗口模式）+ 行数 a11y 元数据。
 *
 * 契约（shared/window-data.ts）：
 * - 属性 `windowed`（布尔）+ `total`（全量行数）+ `window-start`（data[0] 的绝对行下标）；
 * - data 只承载 [window-start, window-start+len) 切片；行虚拟窗口在 total 上算，
 *   已装载行按绝对行号铺位、上下 padding 撑起全量高度；
 * - 期望区间 = expandWindow(可视窗口, total)；未覆盖时派发 oas-window-request
 *   （detail { start, end, reason }，半开、绝对行下标），同区间去重、覆盖后复位；
 * - total=0/非法 → 回落普通模式（零请求）。
 */
describe('windowed（服务端行窗口协议）', () => {
  type Req = { start: number; end: number; reason: string }

  const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

  const makeSlice = (start: number, len: number): Array<{ title: string }> =>
    Array.from({ length: len }, (_, i) => ({ title: `行 ${start + i}` }))

  function mountWindowed(opts: {
    total: number
    windowStart?: number
    sliceStart?: number
    length?: number
    height?: string
    rowHeight?: string
    maxHeight?: string
  }): { el: OASList; reqs: Req[] } {
    const el = new OASList()
    el.setAttribute('role', 'list')
    el.setAttribute('windowed', '')
    el.setAttribute('total', String(opts.total))
    el.setAttribute('window-start', String(opts.windowStart ?? 0))
    if (opts.height !== undefined) el.setAttribute('height', opts.height)
    if (opts.rowHeight !== undefined) el.setAttribute('row-height', opts.rowHeight)
    if (opts.maxHeight !== undefined) el.setAttribute('max-height', opts.maxHeight)
    el.data = makeSlice(opts.sliceStart ?? opts.windowStart ?? 0, opts.length ?? 10)
    const reqs: Req[] = []
    el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent<Req>).detail))
    document.body.appendChild(el)
    // happy-dom 无真实布局：windowed 的视口守卫要求可测视口，挂载后桩出 clientHeight，
    // 再触发一次 update 让首帧窗口按可测视口评估（否则首帧判定无视口、不派 init）
    const vh = Number.parseFloat(opts.height ?? opts.maxHeight ?? '')
    if (Number.isFinite(vh) && vh > 0) {
      const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
      Object.defineProperty(body, 'clientHeight', { configurable: true, value: vh })
      Object.defineProperty(body, 'scrollHeight', { configurable: true, value: vh * 10 })
      ;(el as unknown as { requestUpdate(): void }).requestUpdate()
    }
    return { el, reqs }
  }

  const dataBox = (el: OASList): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="data-items"]')!
  const rowsOf = (el: OASList): HTMLElement[] => [...dataBox(el).querySelectorAll<HTMLElement>('oas-list-item')]
  const spacer = (el: OASList, kind: 'top' | 'bottom'): HTMLElement | null =>
    dataBox(el).querySelector<HTMLElement>(`[data-spacer="${kind}"]`)
  const bodyOf = (el: OASList): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!

  async function scrollTo(el: OASList, top: number): Promise<void> {
    bodyOf(el).scrollTop = top
    bodyOf(el).dispatchEvent(new Event('scroll'))
    await nextFrame()
    await nextFrame()
  }

  it('windowed 进 observedAttributes；init 请求绝对区间并只派一次；滚动派发 scroll 请求且同区间去重', async () => {
    expect(OASList.observedAttributes).toEqual(expect.arrayContaining(['windowed', 'total', 'window-start']))
    // height 120 / row-height 40 / total 500：可见 3 行 + buffer 4 = [0,7)，expand ±8 → [0,15)
    // 切片只装 10 行（未覆盖期望区间）→ 首帧派发 init
    const { el, reqs } = mountWindowed({ total: 500, height: '120', rowHeight: '40' })
    expect(reqs[0], '首帧派发 init 请求').toEqual({ start: 0, end: 15, reason: 'init' })
    // 已装载行按绝对行号渲染（data-index 绝对）
    expect(rowsOf(el).map((r) => r.getAttribute('data-index'))).toEqual(['0', '1', '2', '3', '4', '5', '6'])

    // 滚动到绝对第 100 行（scrollTop=4000）：可见 [96,107)，expand ±8 → [88,115)
    await scrollTo(el, 4000)
    expect(
      reqs.filter((q) => q.reason === 'scroll'),
      '滚动后派发 scroll 请求（绝对行区间）',
    ).toEqual([{ start: 88, end: 115, reason: 'scroll' }])

    const count = reqs.length
    await scrollTo(el, 4000)
    await scrollTo(el, 4000)
    expect(reqs.length, '同一期望区间不重复派发').toBe(count)
  })

  it('覆盖复位：期望区间被新切片覆盖后重置去重态，同一区间再次未覆盖时可重新派发', async () => {
    const { el, reqs } = mountWindowed({ total: 500, height: '120', rowHeight: '40' })
    await scrollTo(el, 4000) // need [88,115)
    expect(reqs.length).toBe(2)

    // 宿主回填覆盖 need 的切片 → covered → 去重态复位
    el.data = makeSlice(80, 40)
    el.setAttribute('window-start', '80') // loaded [80,120)
    await nextFrame()
    const afterCovered = reqs.length
    expect(afterCovered, '覆盖后不再派发').toBe(2)

    // 切片退回 [0,40)：同一 need [88,115) 再次未覆盖 → 必须能重新派发（证明覆盖已复位）
    el.setAttribute('window-start', '0')
    el.data = makeSlice(0, 40)
    await nextFrame()
    expect(reqs.length, '覆盖复位后同一区间可重新请求').toBeGreaterThan(afterCovered)
    expect(reqs[reqs.length - 1]).toEqual({ start: 88, end: 115, reason: 'data' })
  })

  it('total=0 / 非法回落普通模式：零请求、无占位、普通数据行渲染', async () => {
    const zero = new OASList()
    zero.setAttribute('windowed', '')
    zero.setAttribute('total', '0')
    zero.data = makeSlice(0, 3)
    const zeroReqs: Req[] = []
    zero.addEventListener('oas-window-request', (e) => zeroReqs.push((e as CustomEvent<Req>).detail))
    document.body.appendChild(zero)
    expect(zeroReqs).toEqual([])
    expect(spacer(zero, 'top'), '非 windowed 不渲染占位').toBeNull()
    expect(rowsOf(zero).length).toBe(3)

    const bad = new OASList()
    bad.setAttribute('windowed', '')
    bad.setAttribute('total', 'abc')
    bad.data = makeSlice(0, 3)
    const badReqs: Req[] = []
    bad.addEventListener('oas-window-request', (e) => badReqs.push((e as CustomEvent<Req>).detail))
    document.body.appendChild(bad)
    expect(badReqs).toEqual([])
    expect(spacer(bad, 'top')).toBeNull()
    expect(rowsOf(bad).length).toBe(3)
  })

  it('windowed 空切片也派发 init（宿主可先挂属性、按请求回填，不误显空态）', () => {
    const el = new OASList()
    el.setAttribute('role', 'list')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    const reqs: Req[] = []
    el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent<Req>).detail))
    document.body.appendChild(el)
    expect(reqs).toEqual([{ start: 0, end: 15, reason: 'init' }])
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden, '未装载不等于空态').toBe(true)
    expect(dataBox(el).hidden).toBe(false)
    expect(parseFloat(spacer(el, 'bottom')!.style.height), '空切片也撑起全量高度').toBe(500 * 40)
  })

  it('行虚拟窗口在 total 上算：长 total 只渲染可见窗口、上下占位总高守恒', () => {
    const { el } = mountWindowed({ total: 500, height: '120', rowHeight: '40', length: 40 })
    const rows = rowsOf(el)
    expect(rows.length, '只渲染可见窗口 + buffer（不是 total，也不是整个切片）').toBe(7)
    expect(rows.length).toBeLessThan(40)
    const topH = parseFloat(spacer(el, 'top')!.style.height)
    const bottomH = parseFloat(spacer(el, 'bottom')!.style.height)
    expect(topH).toBe(0)
    expect(bottomH).toBe((500 - 7) * 40)
    expect(topH + rows.length * 40 + bottomH, '占位 + 行 = 全量总高').toBe(500 * 40)
  })

  it('滚到中部：绝对行号渲染 + aria-setsize/posinset 绝对口径 + oas-item-render/click 绝对 index', async () => {
    const { el } = mountWindowed({ total: 500, height: '120', rowHeight: '40', length: 40 })
    await scrollTo(el, 8000) // 绝对第 200 行附近
    const emitted: number[] = []
    el.addEventListener('oas-item-render', (e) => emitted.push((e as CustomEvent<{ index: number }>).detail.index))
    // 宿主回填中部切片 [196,236)
    el.data = makeSlice(196, 40)
    el.setAttribute('window-start', '196')

    const rows = rowsOf(el)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]!.getAttribute('data-index'), '渲染行用绝对行号铺位').toBe('196')
    expect(rows.map((r) => r.getAttribute('aria-posinset')).slice(0, 3)).toEqual(['197', '198', '199'])
    expect(rows.every((r) => r.getAttribute('aria-setsize') === '500')).toBe(true)
    expect(parseFloat(spacer(el, 'top')!.style.height), '顶部占位按绝对首行撑起').toBe(196 * 40)
    expect(emitted[0], 'oas-item-render index 为绝对行号').toBe(196)

    const clicks: Array<{ index: number }> = []
    el.addEventListener('oas-click', (e) => clicks.push((e as CustomEvent<{ index: number }>).detail))
    rows[0]!.setAttribute('clickable', '')
    rows[0]!.click()
    expect(clicks[0]?.index, '行点击 index 为绝对行号').toBe(196)
  })

  it('非 windowed：aria-setsize=全量行数、posinset=行序，零 window 请求（容器 role=list）', () => {
    const el = new OASList()
    el.setAttribute('role', 'list')
    el.setAttribute('aria-label', '成员')
    el.data = makeSlice(0, 3)
    const reqs: Req[] = []
    el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent<Req>).detail))
    document.body.appendChild(el)
    // list 角色落在 shadow 内紧贴行的 data-items 上，宿主不再保留（否则可聚焦滚动容器是非法子元素）
    expect(dataBox(el).getAttribute('role'), '行容器承载 role=list').toBe('list')
    expect(dataBox(el).getAttribute('aria-label'), '宿主可访问名称随角色迁到行容器').toBe('成员')
    expect(el.hasAttribute('role'), '宿主 role=list 已迁走').toBe(false)
    expect(el.hasAttribute('aria-label'), '宿主 aria-label 已迁走').toBe(false)
    const rows = rowsOf(el)
    expect(rows.map((r) => r.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem'])
    expect(rows.map((r) => r.getAttribute('aria-setsize'))).toEqual(['3', '3', '3'])
    expect(rows.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2', '3'])
    expect(reqs).toEqual([])

    const decl = new OASList()
    decl.setAttribute('role', 'list')
    decl.innerHTML = '<oas-list-item title="一"></oas-list-item><oas-list-item title="二"></oas-list-item>'
    document.body.appendChild(decl)
    expect(decl.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!.getAttribute('role')).toBe('list')
    const declRows = [...decl.querySelectorAll<HTMLElement>('oas-list-item')]
    expect(declRows.map((r) => r.getAttribute('role'))).toEqual(['listitem', 'listitem'])
    expect(declRows.map((r) => r.getAttribute('aria-setsize'))).toEqual(['2', '2'])
    expect(declRows.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2'])
  })

  it('无宿主 role 时默认 list 语义：行容器 role=list、行 listitem（不依赖宿主设 role）', () => {
    const el = new OASList()
    el.data = makeSlice(0, 2)
    document.body.appendChild(el)
    expect(dataBox(el).getAttribute('role')).toBe('list')
    for (const row of rowsOf(el)) {
      expect(row.getAttribute('role')).toBe('listitem')
      expect(row.getAttribute('aria-setsize')).toBe('2')
      expect(row.getAttribute('aria-posinset')).toBeTruthy()
    }
  })

  it('可聚焦滚动容器不在 list 容器内（required-children 结构）：max-height / windowed 均如此', () => {
    const el = new OASList()
    el.setAttribute('max-height', '120')
    el.setData(makeSlice(0, 30))
    document.body.appendChild(el)
    const body = bodyOf(el)
    const box = dataBox(el)
    expect(box.parentElement, 'data-items 是 body 的子节点，body 不是 list 的 owned child').toBe(body)
    expect(box.getAttribute('role')).toBe('list')

    const win = new OASList()
    win.setAttribute('windowed', '')
    win.setAttribute('total', '500')
    win.setAttribute('height', '120')
    win.setAttribute('row-height', '40')
    win.setData(makeSlice(0, 10))
    document.body.appendChild(win)
    expect(dataBox(win).parentElement).toBe(bodyOf(win))
    expect(dataBox(win).getAttribute('role')).toBe('list')
    // spacer 是 aria-hidden 的纯布局节点，不参与 required-children
    expect(spacer(win, 'top')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('分组：行容器 role=list、组头/分组容器 presentation、行仍带 setsize/posinset', () => {
    const el = new OASList()
    el.setData([
      { title: '甲', group: 'A' },
      { title: '乙', group: 'A' },
      { title: '丙', group: 'B' },
    ])
    document.body.appendChild(el)
    const box = dataBox(el)
    expect(box.getAttribute('role')).toBe('list')
    const headers = [...box.querySelectorAll<HTMLElement>('.group-header')]
    expect(headers.map((h) => h.getAttribute('role'))).toEqual(['presentation', 'presentation'])
    for (const group of box.querySelectorAll<HTMLElement>('.group')) {
      expect(group.getAttribute('role')).toBe('presentation')
    }
    const rows = rowsOf(el)
    expect(rows.map((r) => r.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem'])
    expect(rows.map((r) => r.getAttribute('aria-setsize'))).toEqual(['3', '3', '3'])
    expect(rows.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2', '3'])
  })

  it('宿主显式行角色冲突（role=button）：容器不挂 list 角色，组件派生的行角色/ARIA 被清理', () => {
    const el = new OASList()
    el.addEventListener('oas-item-render', (e) => {
      const d = (e as CustomEvent<{ index: number; element: HTMLElement }>).detail
      if (d.index === 0) d.element.setAttribute('role', 'button')
    })
    el.setData(makeSlice(0, 3))
    document.body.appendChild(el)
    expect(dataBox(el).hasAttribute('role'), '外来行角色使 required-children 不成立 → 不设容器角色').toBe(false)
    const rows = rowsOf(el)
    expect(rows[0]!.getAttribute('role'), '宿主显式角色保留').toBe('button')
    expect(rows[1]!.hasAttribute('role'), '其他行的派生 listitem 被撤销').toBe(false)
    for (const row of rows) {
      expect(row.hasAttribute('aria-setsize'), '角色不合法时不留 stale ARIA').toBe(false)
      expect(row.hasAttribute('aria-posinset')).toBe(false)
    }
  })

  it('角色消失时清理此前写入的 aria：声明式行从 listitem 变 role=button 后无 stale ARIA', () => {
    const el = new OASList()
    el.innerHTML = '<oas-list-item title="一"></oas-list-item><oas-list-item title="二"></oas-list-item>'
    document.body.appendChild(el)
    const rows = [...el.querySelectorAll<HTMLElement>('oas-list-item')]
    expect(rows.map((r) => r.getAttribute('aria-setsize'))).toEqual(['2', '2'])

    // 宿主把首行改成显式按钮语义 → 下一次 update 判定冲突并清理
    rows[0]!.setAttribute('role', 'button')
    el.setAttribute('size', 'lg')
    expect(rows[0]!.getAttribute('role')).toBe('button')
    expect(rows[0]!.hasAttribute('aria-setsize')).toBe(false)
    expect(rows[0]!.hasAttribute('aria-posinset')).toBe(false)
    expect(rows[1]!.hasAttribute('role'), '撤销组件派生的 listitem').toBe(false)
    expect(rows[1]!.hasAttribute('aria-setsize')).toBe(false)
  })

  it('非 windowed 虚拟滚动：role=list 落在 vlist 的 .items，虚拟行带 setsize/posinset（行序口径）', () => {
    const el = new OASList()
    el.setAttribute('height', '240')
    el.data = makeSlice(0, 100)
    document.body.appendChild(el)
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const items = vlist.shadowRoot!.querySelector<HTMLElement>('.items')!
    expect(items.getAttribute('role'), 'list 容器是 vlist 内 .items（可聚焦视口在其外）').toBe('list')
    const vrows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    expect(vrows.length).toBeGreaterThan(0)
    for (const r of vrows) {
      expect(r.getAttribute('role')).toBe('listitem')
      expect(r.getAttribute('aria-setsize')).toBe('100')
      expect(r.getAttribute('aria-posinset')).toBe(String(Number(r.getAttribute('data-index')) + 1))
    }
  })

  it('宿主 role=listbox：角色迁到行容器、行派生 option（aria-selected 合法）', () => {
    const el = new OASList()
    el.setAttribute('role', 'listbox')
    el.setAttribute('aria-label', '选择成员')
    el.innerHTML = '<oas-list-item title="甲"></oas-list-item><oas-list-item title="乙"></oas-list-item>'
    document.body.appendChild(el)
    expect(el.hasAttribute('role'), '宿主 listbox 已迁走').toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!.getAttribute('role')).toBe('listbox')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="items"]')!.getAttribute('aria-label')).toBe('选择成员')
    const rows = [...el.querySelectorAll<HTMLElement>('oas-list-item')]
    expect(rows.map((r) => r.getAttribute('role'))).toEqual(['option', 'option'])
    expect(rows[0]!.getAttribute('aria-selected')).toBe('false')
    rows[0]!.setAttribute('selected', '')
    el.setAttribute('size', 'lg')
    expect(rows[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('宿主 role=listbox 但无可访问名称：回落 list 语义（listbox 必须命名，避免 aria-input-field-name 违规）', () => {
    const el = new OASList()
    el.setAttribute('role', 'listbox')
    el.setData([{ title: '甲' }])
    document.body.appendChild(el)
    expect(el.hasAttribute('role')).toBe(false)
    expect(dataBox(el).getAttribute('role'), '未命名的 listbox 不成立 → 结构列表语义').toBe('list')
    expect(rowsOf(el)[0]!.getAttribute('role')).toBe('listitem')
  })

  it('虚拟路径宿主给行显式角色（item-render 写 role=button）：放弃 list 语义且不留 stale ARIA', () => {
    const el = new OASList()
    el.setAttribute('height', '240')
    el.addEventListener('oas-item-render', (e) => {
      const d = (e as CustomEvent<{ index: number; element: HTMLElement }>).detail
      if (d.index === 0) d.element.setAttribute('role', 'button')
    })
    el.setData(makeSlice(0, 100))
    document.body.appendChild(el)
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const items = vlist.shadowRoot!.querySelector<HTMLElement>('.items')!
    expect(items.hasAttribute('role'), '外来临界行角色 → 容器不挂 list').toBe(false)
    const rows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    expect(rows[0]!.getAttribute('role'), '宿主显式角色保留').toBe('button')
    for (const row of rows) {
      expect(row.hasAttribute('aria-setsize'), '不合法角色下不写/清理 setsize').toBe(false)
      expect(row.hasAttribute('aria-posinset')).toBe(false)
    }
  })

  it('宿主其他显式角色不被覆盖/迁移（role=button 保持原样，不叠加 list 语义）', () => {
    const el = new OASList()
    el.setAttribute('role', 'button')
    el.setData(makeSlice(0, 2))
    document.body.appendChild(el)
    expect(el.getAttribute('role')).toBe('button')
    expect(dataBox(el).hasAttribute('role')).toBe(false)
    for (const row of rowsOf(el)) expect(row.hasAttribute('role')).toBe(false)
  })

  it('空列表不挂 list 角色（无 listitem 时不制造 required-children 违规）', () => {
    const el = new OASList()
    el.setData([])
    document.body.appendChild(el)
    expect(dataBox(el).hasAttribute('role')).toBe(false)
  })

  it('挂载后动态改宿主 role：role 不进 observedAttributes（标准 ARIA 非组件 API），经属性观察迁移到行容器', async () => {
    expect(OASList.observedAttributes, 'role 不应污染组件 API 面').not.toContain('role')
    const el = new OASList()
    el.setData([{ title: '甲' }])
    document.body.appendChild(el)
    expect(dataBox(el).getAttribute('role')).toBe('list')
    el.setAttribute('aria-label', '成员')
    el.setAttribute('role', 'listbox')
    // 属性观察在微任务中回调（MutationObserver），等一拍再断言
    await Promise.resolve()
    expect(el.hasAttribute('role'), '动态设置的宿主 role 同样迁走').toBe(false)
    expect(dataBox(el).getAttribute('role')).toBe('listbox')
    expect(dataBox(el).getAttribute('aria-label')).toBe('成员')
    expect(rowsOf(el)[0]!.getAttribute('role')).toBe('option')
  })

  it('windowed 下不本地行重排（渲染窗口局部 index 对全量无意义）', () => {
    const { el } = mountWindowed({ total: 500, height: '120', rowHeight: '40' })
    el.setAttribute('sortable', '')
    const rows = rowsOf(el)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.getAttribute('draggable') !== 'true')).toBe(true)
    const transfer = (): DataTransfer =>
      ({ setData: () => {}, getData: () => '', effectAllowed: '', dropEffect: '' }) as unknown as DataTransfer
    let reorders = 0
    el.addEventListener('oas-reorder', () => reorders++)
    rows[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: transfer() }))
    rows[1]!.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: transfer() }))
    expect(reorders).toBe(0)
  })

  it('oas-reach-bottom 与 windowed 共存不重复风暴（同一底部只派一次）', async () => {
    const el = new OASList()
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('max-height', '120')
    el.setAttribute('row-height', '40')
    el.data = makeSlice(0, 40)
    let reach = 0
    el.addEventListener('oas-reach-bottom', () => reach++)
    document.body.appendChild(el)
    expect(reach, '挂载即触底（既有语义）').toBe(1)
    await scrollTo(el, 0)
    await scrollTo(el, 0)
    expect(reach, '同一底部位置滚动不重复派发').toBe(1)
  })

  it('无视口（未配 height / 可测 max-height）：零请求 + devWarn 一次 + 不铺全量占位；补视口后正常请求', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = new OASList()
      el.setAttribute('windowed', '')
      el.setAttribute('total', '500')
      el.setAttribute('row-height', '40')
      const reqs: Req[] = []
      el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent<Req>).detail))
      el.data = makeSlice(0, 10)
      document.body.appendChild(el)

      const viewportWarns = (): number =>
        warn.mock.calls.filter((c) => String(c[0]).includes('windowed 需要可测的滚动视口')).length
      expect(reqs, '无视口不派发全量区间请求').toEqual([])
      expect(viewportWarns(), '告警一次说明需要可测滚动视口').toBe(1)
      // 不铺 total×rowH 的占位（否则页面出现巨量空白）
      expect(spacer(el, 'top'), '无视口不渲染 spacer').toBeNull()
      expect(spacer(el, 'bottom')).toBeNull()
      expect(rowsOf(el).length, '已装载切片照常渲染').toBe(10)
      expect(dataBox(el).getAttribute('role'), '无视口也保留 list 语义').toBe('list')

      // 再次 update（数据变更）不重复告警
      el.setData(makeSlice(0, 10))
      expect(viewportWarns(), '重渲染不重复告警').toBe(1)
      expect(reqs).toEqual([])

      // 补上可测视口（max-height 120 / row-height 40）→ 正常请求 [0,15) + 占位恢复
      el.setAttribute('max-height', '120')
      expect(reqs, '有视口后按可视窗口请求（首次成功评估 reason=init）').toEqual([
        { start: 0, end: 15, reason: 'init' },
      ])
      expect(spacer(el, 'top'), '有视口后恢复占位').not.toBeNull()
      expect(rowsOf(el).length, '按视口窗口渲染（3 可见 + 4 buffer）').toBe(7)
    } finally {
      warn.mockRestore()
    }
  })

  it('height 为非数值 CSS 长度（如 50vh）时按实际量测；happy-dom 无量测不回退全量请求', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = new OASList()
      el.setAttribute('windowed', '')
      el.setAttribute('total', '500')
      el.setAttribute('height', '50vh')
      el.setAttribute('row-height', '40')
      const reqs: Req[] = []
      el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent<Req>).detail))
      el.data = makeSlice(0, 10)
      document.body.appendChild(el)
      // happy-dom 无布局：50vh 无法换算 → 不当成视口（不派发全量请求）
      expect(reqs).toEqual([])
      // 声明长度原样落到滚动视口样式（浏览器中可量测）
      expect(bodyOf(el).style.height).toBe('50vh')
      expect(bodyOf(el).style.overflowY).toBe('auto')
    } finally {
      warn.mockRestore()
    }
  })

  it('M-2 window-start 越过 total：夹取到全量末尾 + devWarn 一次（顶部占位不超 total×rowH）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const warnMsgs = (): string[] =>
        warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('window-start'))
      const el = new OASList()
      el.setAttribute('windowed', '')
      el.setAttribute('total', '100')
      el.setAttribute('window-start', '150')
      el.setAttribute('height', '120')
      el.setAttribute('row-height', '40')
      el.data = makeSlice(150, 3)
      document.body.appendChild(el)
      const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
      Object.defineProperty(body, 'clientHeight', { configurable: true, value: 120 })
      Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 120 * 10 })
      ;(el as unknown as { requestUpdate(): void }).requestUpdate()
      // 夹取后：顶部占位 = total × rowH = 4000（不夹取会按 ws=150 铺出 6000+ 的越界空白）
      const topH = parseFloat(spacer(el, 'top')!.style.height)
      expect(topH, '顶部占位夹到全量高度').toBe(4000)
      expect(topH, '顶部占位不得超过 total×rowH').toBeLessThanOrEqual(4000)
      expect(rowsOf(el).length, '越界切片不渲染行').toBe(0)
      expect(warnMsgs().length, '越界告警一次').toBe(1)
      expect(warnMsgs()[0], '告警含越界值').toContain('150')
      // 同实例重渲染不重复告警（去重一次）
      el.setAttribute('window-start', '160')
      expect(warnMsgs().length, '同实例只提示一次').toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('I5 data property 收到 JSON 字符串（框架写 property 场景）：解析渲染；非法回落空数组', () => {
    const el = new OASList()
    // @ts-expect-error 模拟框架把静态 data attribute 的 JSON 字符串写进 property
    el.data = JSON.stringify([{ title: '字符串通道' }, { title: '第二行' }])
    document.body.appendChild(el)
    const rows = rowsOf(el)
    expect(rows.length).toBe(2)
    expect(rows[0]!.getAttribute('data-index')).toBe('0')
    // 非法 JSON / 非数组 → 空数组（同 gantt/resource 口径：不抛异常、静默清空）
    const bad = new OASList()
    // @ts-expect-error 同上
    bad.data = '{oops}'
    document.body.appendChild(bad)
    expect(rowsOf(bad).length).toBe(0)
    const arr = new OASList()
    // @ts-expect-error 非数组非字符串对象同样清空
    arr.data = { title: '不是数组' }
    document.body.appendChild(arr)
    expect(rowsOf(arr).length).toBe(0)
  })
})

describe('M-1 宿主可访问名称动态同步（迁移后随宿主属性变更更新行容器）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const makeSlice = (n: number): Array<{ title: string }> => Array.from({ length: n }, (_, i) => ({ title: `行${i}` }))

  it('迁移后宿主更新 aria-label：行容器随宿主变更同步并再次从宿主移除', async () => {
    const el = new OASList()
    el.setAttribute('role', 'listbox')
    el.setAttribute('aria-label', '旧名称')
    el.data = makeSlice(2)
    document.body.appendChild(el)
    const box = el.shadowRoot!.querySelector<HTMLElement>('[part="data-items"]')!
    expect(box.getAttribute('role')).toBe('listbox')
    expect(box.getAttribute('aria-label'), '首帧迁移').toBe('旧名称')
    expect(el.hasAttribute('aria-label'), '宿主上的名称已迁走').toBe(false)
    // 宿主框架 patch：aria-label 重新出现在宿主元素（role 已不在）→ 观察器触发 update → 同步
    el.setAttribute('aria-label', '新名称')
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(box.getAttribute('aria-label'), '行容器名称应随宿主变更更新（曾停在旧值）').toBe('新名称')
    expect(el.hasAttribute('aria-label'), '同步后再次从宿主移除').toBe(false)
    // aria-labelledby 同口径
    el.setAttribute('aria-labelledby', 'ext-label')
    await new Promise((r) => setTimeout(r, 0))
    expect(box.getAttribute('aria-labelledby')).toBe('ext-label')
    expect(el.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('宿主移除 aria-label 时行容器保留既有名称（不制造未命名 listbox）', async () => {
    const el = new OASList()
    el.setAttribute('role', 'listbox')
    el.setAttribute('aria-label', '成员')
    el.data = makeSlice(2)
    document.body.appendChild(el)
    const box = el.shadowRoot!.querySelector<HTMLElement>('[part="data-items"]')!
    expect(box.getAttribute('role')).toBe('listbox')
    expect(box.getAttribute('aria-label'), '首帧迁移').toBe('成员')
    expect(el.hasAttribute('aria-label')).toBe(false)
    // 动态更新到新值后再清空宿主绑定：行容器保留最后同步的名称（抽走 listbox 名称 = a11y 违规）
    el.setAttribute('aria-label', '新成员')
    await new Promise((r) => setTimeout(r, 0))
    expect(box.getAttribute('aria-label')).toBe('新成员')
    el.removeAttribute('aria-label')
    await new Promise((r) => setTimeout(r, 0))
    expect(box.getAttribute('aria-label'), '宿主清空绑定不抽走行容器名称').toBe('新成员')
  })
})
