import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-bordered')).toBe(
      'true',
    )
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
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="empty-default"]')!.hidden,
      ).toBe(true)
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
    it('clickable：可聚焦、有 role，点击派发 oas-click', () => {
      const el = new OASListItem()
      el.setAttribute('clickable', '')
      el.textContent = '设置项'
      document.body.appendChild(el)
      expect(el.getAttribute('tabindex')).toBe('0')
      expect(el.getAttribute('role')).toBe('button')
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.click()
      expect(fired).toBe(1)
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

    it('selected：aria-selected 同步 + 视觉态 CSS 钩子', () => {
      const el = new OASListItem()
      el.setAttribute('selected', '')
      document.body.appendChild(el)
      expect(el.getAttribute('aria-selected')).toBe('true')
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/:host\(\[selected\]\)\s*\{[^}]*background/)
      el.removeAttribute('selected')
      expect(el.getAttribute('aria-selected')).toBe('false')
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
  })
})
