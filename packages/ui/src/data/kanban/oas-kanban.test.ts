import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASKanban } from './index.js'

// oas-kanban 看板组件：columns/cards JSON 双通道 + HTML5 DnD 拖拽换列/列内排序 +
// oas-change { id, from, to, index } + 触屏移动菜单 + renderCard 自定义渲染。
//
// happy-dom 限制（与 table 行拖拽测试同口径）：
// - 无排版测量（getBoundingClientRect 全 0）→ dragover 的上/下半按 clientY 显式给值；
// - DragEvent 是裸 Event（不带 clientY/dataTransfer）→ 拖拽测试用 MouseEvent 补齐，
//   实现内部持有拖拽源 id，不依赖 dataTransfer。

const COLUMNS = [
  { key: 'todo', title: '待办' },
  { key: 'doing', title: '进行中' },
  { key: 'done', title: '已完成' },
]
const CARDS = [
  { id: 'c1', column: 'todo', title: '任务一' },
  { id: 'c2', column: 'todo', title: '任务二' },
  { id: 'c3', column: 'doing', title: '任务三' },
]

function mount(attrs: Record<string, string> = {}): OASKanban {
  const el = new OASKanban()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('columns' in attrs)) el.setAttribute('columns', JSON.stringify(COLUMNS))
  if (!('cards' in attrs)) el.setAttribute('cards', JSON.stringify(CARDS))
  document.body.appendChild(el)
  return el
}

function shadow(el: OASKanban): ShadowRoot {
  return el.shadowRoot!
}

/** 各列容器（.column），按 columns 顺序 */
function columnEls(el: OASKanban): HTMLElement[] {
  return [...shadow(el).querySelectorAll<HTMLElement>('.column[data-key]')]
}

/** 按 columns 定义序取列 key 对应的列容器 */
function columnOf(el: OASKanban, key: string): HTMLElement {
  return shadow(el).querySelector<HTMLElement>(`.column[data-key="${key}"]`)!
}

/** 列内卡片元素（按展示顺序） */
function cardsOf(el: OASKanban, key: string): HTMLElement[] {
  return [...columnOf(el, key).querySelectorAll<HTMLElement>('.card[data-id]')]
}

function cardOf(el: OASKanban, id: string): HTMLElement {
  return shadow(el).querySelector<HTMLElement>(`.card[data-id="${id}"]`)!
}

/** happy-dom 拖拽事件：MouseEvent 补 clientY（DragEvent 为裸 Event） */
function dragEvent(type: string, init: MouseEventInit = {}): Event {
  return new MouseEvent(type, { bubbles: true, composed: true, ...init })
}

/** 收集 oas-change 事件 */
function trackChange(el: OASKanban): CustomEvent[] {
  const events: CustomEvent[] = []
  el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
  return events
}

/** 完整拖放：dragstart → dragover → drop → dragend */
function dragDrop(el: OASKanban, fromId: string, target: HTMLElement, clientY: number): void {
  cardOf(el, fromId)!.dispatchEvent(dragEvent('dragstart'))
  target.dispatchEvent(dragEvent('dragover', { clientY }))
  target.dispatchEvent(dragEvent('drop', { clientY }))
  cardOf(el, fromId)!.dispatchEvent(dragEvent('dragend'))
}

describe('OASKanban', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  describe('渲染', () => {
    it('按 columns 渲染列容器与列头标题', () => {
      const el = mount()
      const cols = columnEls(el)
      expect(cols.length).toBe(3)
      expect(cols.map((c) => c.getAttribute('data-key'))).toEqual(['todo', 'doing', 'done'])
      const titles = cols.map((c) => c.querySelector<HTMLElement>('.column-title')!.textContent)
      expect(titles).toEqual(['待办', '进行中', '已完成'])
    })

    it('卡片按 column 字段分组渲染，卡片渲染 title', () => {
      const el = mount()
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c1', 'c2'])
      expect(cardsOf(el, 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['c3'])
      expect(cardsOf(el, 'done')).toEqual([])
      expect(cardOf(el, 'c1')!.querySelector<HTMLElement>('.card-title')!.textContent).toBe('任务一')
    })

    it('列头显示卡片计数', () => {
      const el = mount()
      const count = (key: string) => columnOf(el, key).querySelector<HTMLElement>('.column-count')!.textContent
      expect(count('todo')).toBe('2')
      expect(count('doing')).toBe('1')
      expect(count('done')).toBe('0')
    })

    it('键盘可达：卡片 tabindex=0 + listitem 语义；非空列体 role=list + aria-label 列名（空列无 list 语义）', () => {
      const el = mount()
      for (const card of shadow(el).querySelectorAll<HTMLElement>('.card')) {
        expect(card.getAttribute('tabindex')).toBe('0')
        expect(card.getAttribute('role')).toBe('listitem')
      }
      for (const col of columnEls(el)) {
        const body = col.querySelector<HTMLElement>('.column-body')!
        const hasCards = body.querySelector('.card') !== null
        if (hasCards) {
          expect(body.getAttribute('role')).toBe('list')
          expect(body.getAttribute('aria-label')).toBe(col.querySelector<HTMLElement>('.column-title')!.textContent)
        } else {
          // 空列不设 role=list（axe aria-required-children：list 必有 listitem 子元素）
          expect(body.getAttribute('role')).toBeNull()
          expect(body.querySelector('.empty-column'), '空列占位在').not.toBeNull()
        }
      }
    })

    it('column 字段不在 columns 中的卡片忽略（不渲染）', () => {
      const el = mount({ cards: JSON.stringify([...CARDS, { id: 'cx', column: 'nope', title: '游卡' }]) })
      expect(cardOf(el, 'cx')).toBeNull()
      expect(shadow(el).querySelectorAll('.card').length).toBe(3)
    })

    it('空列显示占位文案（i18n zh-CN）', () => {
      const el = mount()
      const empty = columnOf(el, 'done').querySelector<HTMLElement>('.empty-column')!
      expect(empty.textContent).toBe('拖拽卡片到此处')
      // 非空列无占位
      expect(columnOf(el, 'todo').querySelector('.empty-column')).toBeNull()
    })

    it('locale 切换：占位文案随 setLocale 翻译', () => {
      const el = mount({ cards: '[]' })
      expect(columnOf(el, 'todo').querySelector<HTMLElement>('.empty-column')!.textContent).toBe('拖拽卡片到此处')
      setLocale(en)
      expect(columnOf(el, 'todo').querySelector<HTMLElement>('.empty-column')!.textContent).toBe('Drag cards here')
    })

    it('empty-column-text 属性覆盖占位文案', () => {
      const el = mount({ 'empty-column-text': '把任务拖进来' })
      expect(columnOf(el, 'done').querySelector<HTMLElement>('.empty-column')!.textContent).toBe('把任务拖进来')
    })

    it('columns 空数组：无列容器不炸；cards 空数组：全部空列占位', () => {
      const noCols = mount({ columns: '[]', cards: '[]' })
      expect(columnEls(noCols).length).toBe(0)
      const noCards = mount({ cards: '[]' })
      for (const col of columnEls(noCards)) {
        expect(col.querySelector('.empty-column')).not.toBeNull()
      }
    })

    it('非法 JSON 属性：回退空数组不抛异常', () => {
      const el = mount({ columns: '{bad', cards: 'not-json' })
      expect(columnEls(el).length).toBe(0)
    })
  })

  describe('数据双通道（attribute JSON + property）', () => {
    it('cards property setter 反射回 attribute，getter 返回数组', () => {
      const el = mount({ cards: '[]' })
      const next = [{ id: 'p1', column: 'todo', title: '属性卡' }]
      el.cards = next
      expect(JSON.parse(el.getAttribute('cards')!)).toEqual(next)
      expect(el.cards).toEqual(next)
      expect(cardsOf(el, 'todo').length).toBe(1)
    })

    it('columns property setter 反射回 attribute', () => {
      const el = mount({ columns: '[]', cards: '[]' })
      el.columns = [{ key: 'a', title: '甲列' }]
      expect(JSON.parse(el.getAttribute('columns')!)).toEqual([{ key: 'a', title: '甲列' }])
      expect(columnEls(el).length).toBe(1)
    })
  })

  describe('拖拽换列（HTML5 DnD）', () => {
    it('dragstart 标记源卡淡化；dragend/drop 后清除标记', () => {
      const el = mount()
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      expect(cardOf(el, 'c1').classList.contains('drag-source')).toBe(true)
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragend'))
      expect(cardOf(el, 'c1').classList.contains('drag-source')).toBe(false)
    })

    it('dragover 期间源卡淡化保持（落点标记清除不连带源淡化）', () => {
      const el = mount()
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      // 多次 dragover（落点标记反复清除重画）：源卡淡化必须全程保持
      cardOf(el, 'c3').dispatchEvent(dragEvent('dragover', { clientY: -10 }))
      expect(cardOf(el, 'c1').classList.contains('drag-source')).toBe(true)
      cardOf(el, 'c2').dispatchEvent(dragEvent('dragover', { clientY: 10 }))
      expect(cardOf(el, 'c1').classList.contains('drag-source')).toBe(true)
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragend'))
      expect(cardOf(el, 'c1').classList.contains('drag-source')).toBe(false)
    })

    it('非卡片发起的 dragstart 不进入拖拽态', () => {
      const el = mount()
      columnOf(el, 'todo').dispatchEvent(dragEvent('dragstart'))
      expect(shadow(el).querySelector('.drag-source')).toBeNull()
    })

    it('dragover 目标卡上半/下半显示插入指示线（before/after）', () => {
      const el = mount()
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      const c3 = cardOf(el, 'c3')
      c3.dispatchEvent(dragEvent('dragover', { clientY: -10 }))
      expect(c3.classList.contains('drop-before')).toBe(true)
      expect(c3.classList.contains('drop-after')).toBe(false)
      c3.dispatchEvent(dragEvent('dragover', { clientY: 10 }))
      expect(c3.classList.contains('drop-before')).toBe(false)
      expect(c3.classList.contains('drop-after')).toBe(true)
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragend'))
      expect(c3.classList.contains('drop-after')).toBe(false)
    })

    it('dragover 空列/列尾：列体显示落点标记', () => {
      const el = mount()
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      const emptyBody = columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!
      emptyBody.dispatchEvent(dragEvent('dragover', { clientY: 0 }))
      expect(emptyBody.classList.contains('drop-tail')).toBe(true)
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragend'))
      expect(emptyBody.classList.contains('drop-tail')).toBe(false)
    })

    it('跨列拖放：派发 oas-change { id, from, to, index }，回写 cards attribute（column 更新）', () => {
      const el = mount()
      const events = trackChange(el)
      dragDrop(el, 'c2', cardOf(el, 'c3'), -10) // todo 的 c2 → doing 的 c3 上方（index 0）
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c2', from: 'todo', to: 'doing', index: 0 })
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
      const cards = JSON.parse(el.getAttribute('cards')!) as Array<Record<string, unknown>>
      const moved = cards.find((c) => c.id === 'c2')!
      expect(moved.column).toBe('doing')
      // 重渲染后分组正确
      expect(cardsOf(el, 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['c2', 'c3'])
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c1'])
    })

    it('跨列拖到列尾/空列：index = 目标列卡数', () => {
      const el = mount()
      const events = trackChange(el)
      dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'done', index: 0 })
    })

    it('跨列插入目标列中间：before 目标卡 index=其位次，after 则 +1', () => {
      const el = mount({
        cards: JSON.stringify([
          { id: 'a', column: 'todo', title: 'A' },
          { id: 'x', column: 'doing', title: 'X' },
          { id: 'y', column: 'doing', title: 'Y' },
        ]),
      })
      const events = trackChange(el)
      dragDrop(el, 'a', cardOf(el, 'y'), -10) // doing 的 Y 上方 → index 1（X 之后）
      expect(events[0]!.detail).toEqual({ id: 'a', from: 'todo', to: 'doing', index: 1 })
      expect(cardsOf(el, 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['x', 'a', 'y'])
    })

    it('同列排序：index 为移除自身后的插入位；cards 数组顺序更新', () => {
      const el = mount()
      const events = trackChange(el)
      // c2（todo[1]）拖到 c1（todo[0]）上半 → 移除自身后插入位 0
      dragDrop(el, 'c2', cardOf(el, 'c1'), -10)
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c2', from: 'todo', to: 'todo', index: 0 })
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c2', 'c1'])
      const cards = JSON.parse(el.getAttribute('cards')!) as Array<Record<string, unknown>>
      expect(cards.map((c) => c.id)).toEqual(['c2', 'c1', 'c3'])
    })

    it('拖回原位：不派发 oas-change、attribute 不变', () => {
      const el = mount()
      const before = el.getAttribute('cards')
      const events = trackChange(el)
      // c1（todo[0]）拖到 c2（todo[1]）上半：视觉位 1 == 原位 0 的下方（紧贴自身）→ 原位
      dragDrop(el, 'c1', cardOf(el, 'c2'), -10)
      // c2（todo[1]）拖到 c1（todo[0]）下半：视觉位 1 == 原位 → 原位
      dragDrop(el, 'c2', cardOf(el, 'c1'), 10)
      expect(events.length).toBe(0)
      expect(el.getAttribute('cards')).toBe(before)
    })

    it('未经过 dragover 的 drop：零操作', () => {
      const el = mount()
      const before = el.getAttribute('cards')
      const events = trackChange(el)
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      columnOf(el, 'done').dispatchEvent(dragEvent('drop', { clientY: 0 }))
      expect(events.length).toBe(0)
      expect(el.getAttribute('cards')).toBe(before)
    })

    it('drop 后指示线全部清除（无孤儿标记）', () => {
      const el = mount()
      cardOf(el, 'c1').dispatchEvent(dragEvent('dragstart'))
      cardOf(el, 'c3').dispatchEvent(dragEvent('dragover', { clientY: -10 }))
      cardOf(el, 'c3').dispatchEvent(dragEvent('drop', { clientY: -10 }))
      expect(shadow(el).querySelector('.drop-before, .drop-after, .drop-tail, .drag-source')).toBeNull()
    })
  })

  describe('触屏移动菜单', () => {
    function moveBtn(el: OASKanban, id: string): HTMLButtonElement {
      return cardOf(el, id).querySelector<HTMLButtonElement>('.card-move')!
    }

    function openMenu(el: OASKanban, id: string): HTMLElement {
      moveBtn(el, id).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      return shadow(el).querySelector<HTMLElement>('.move-menu')!
    }

    it('每张卡片带移动按钮（aria-label + haspopup）', () => {
      const el = mount()
      const btn = moveBtn(el, 'c1')
      expect(btn).not.toBeNull()
      expect(btn.getAttribute('aria-label')).toBe('移动卡片')
      expect(btn.getAttribute('aria-haspopup')).toBe('menu')
    })

    it('点击按钮打开菜单：上移/下移/其它列名；aria-expanded 同步', () => {
      const el = mount()
      const menu = openMenu(el, 'c2')
      expect(menu.getAttribute('role')).toBe('menu')
      const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      const labels = items.map((i) => i.textContent)
      expect(labels[0]).toBe('上移')
      expect(labels[1]).toBe('下移')
      expect(labels.slice(2)).toEqual(['进行中', '已完成']) // 其它列（排除当前列 todo）
      expect(moveBtn(el, 'c2').getAttribute('aria-expanded')).toBe('true')
    })

    it('首卡上移禁用、末卡下移禁用（aria-disabled）', () => {
      const el = mount()
      openMenu(el, 'c1')
      const items = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')]
      expect(items[0]!.getAttribute('aria-disabled')).toBe('true')
      expect(items[1]!.getAttribute('aria-disabled')).not.toBe('true')
      // 关掉再开末卡（同列末张 c2）
      shadow(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
      openMenu(el, 'c2')
      const items2 = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')]
      expect(items2[0]!.getAttribute('aria-disabled')).not.toBe('true')
      expect(items2[1]!.getAttribute('aria-disabled')).toBe('true')
    })

    it('点击「上移」：同列 index-1，派发 oas-change 并关菜单', () => {
      const el = mount()
      const events = trackChange(el)
      openMenu(el, 'c2')
      const up = shadow(el).querySelector<HTMLElement>('.move-menu [role="menuitem"]')!
      up.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c2', from: 'todo', to: 'todo', index: 0 })
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c2', 'c1'])
      expect(shadow(el).querySelector('.move-menu')).toBeNull()
    })

    it('点击「下移」：同列下移一位（index 经原位判定换算后正确落位），派发 oas-change——回归（旧版 idx+1 被原位判定静默吞掉恒为死按钮）', () => {
      const el = mount()
      const events = trackChange(el)
      // 中间卡下移：c1（todo 首位）→ 移到第二位
      openMenu(el, 'c1')
      const down = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find(
        (i) => i.textContent === '下移',
      )!
      down.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length, '下移必须派发事件（旧版恒零操作）').toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'todo', index: 1 })
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c2', 'c1'])
      // 换一张卡（c2，此时在首位）下移：回到原序，事件 index=1
      openMenu(el, 'c2')
      const down2 = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find(
        (i) => i.textContent === '下移',
      )!
      down2.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(2)
      expect(events[1]!.detail).toEqual({ id: 'c2', from: 'todo', to: 'todo', index: 1 })
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c1', 'c2'])
    })

    it('菜单自身滚动豁免：composedPath 含 .move-menu 的 document scroll 不关菜单，外部滚动关闭', () => {
      const el = mount()
      openMenu(el, 'c1')
      const menu = shadow(el).querySelector('.move-menu') as HTMLElement
      expect(menu).not.toBeNull()
      // 菜单内部滚动（composedPath 含 .move-menu）：豁免，菜单保持打开
      menu.dispatchEvent(new Event('scroll', { bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu'), '菜单自身滚动豁免').not.toBeNull()
      // 外部滚动（document 级，path 不含菜单）：关闭
      document.body.dispatchEvent(new Event('scroll', { bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu'), '外部滚动关菜单').toBeNull()
    })

    it('菜单关闭后重开：document 监听幂等重挂（断开重连场景的外点关闭仍可用）', () => {
      const el = mount()
      openMenu(el, 'c1')
      expect(shadow(el).querySelector('.move-menu')).not.toBeNull()
      // 外点关闭
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu')).toBeNull()
      // 重开后外点仍可关闭（监听随菜单生命周期幂等重挂）
      openMenu(el, 'c1')
      expect(shadow(el).querySelector('.move-menu')).not.toBeNull()
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu')).toBeNull()
    })

    it('点击列名项：跨列移动', () => {
      const el = mount()
      const events = trackChange(el)
      openMenu(el, 'c1')
      const done = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find(
        (i) => i.textContent === '已完成',
      )!
      done.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'done', index: 0 })
      expect(cardsOf(el, 'done').map((c) => c.getAttribute('data-id'))).toEqual(['c1'])
    })

    it('Esc 与点击外部关闭菜单', () => {
      const el = mount()
      openMenu(el, 'c1')
      expect(shadow(el).querySelector('.move-menu')).not.toBeNull()
      shadow(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu')).toBeNull()
      openMenu(el, 'c1')
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(shadow(el).querySelector('.move-menu')).toBeNull()
    })

    it('aria-disabled 的菜单项点击不生效', () => {
      const el = mount()
      const before = el.getAttribute('cards')
      const events = trackChange(el)
      openMenu(el, 'c1')
      const up = shadow(el).querySelector<HTMLElement>('.move-menu [role="menuitem"]')!
      up.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(0)
      expect(el.getAttribute('cards')).toBe(before)
      expect(shadow(el).querySelector('.move-menu')).not.toBeNull()
    })
  })

  describe('renderCard 自定义渲染（property 函数通道）', () => {
    it('返回 Node 直接挂载', () => {
      const el = mount()
      el.renderCard = () => {
        const badge = document.createElement('oas-tag')
        badge.textContent = '高优'
        return badge
      }
      const card = cardOf(el, 'c1')!
      expect(card.querySelectorAll('oas-tag').length).toBe(1)
      expect(card.querySelector('oas-tag')!.textContent).toBe('高优')
      expect(card.querySelector('.card-title')).toBeNull()
    })

    it('返回字符串按 textContent 渲染（防注入，不解析 HTML）', () => {
      const el = mount()
      el.renderCard = (card) => `<b>${String(card.title)}</b>`
      const card = cardOf(el, 'c1')!
      expect(card.textContent).toBe('<b>任务一</b>')
      expect(card.querySelector('b')).toBeNull()
    })

    it('函数在场时拖放只更新内存数据，不反射 cards attribute', () => {
      const el = mount()
      const before = el.getAttribute('cards')
      el.renderCard = (card) => String(card.title)
      const events = trackChange(el)
      dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events.length).toBe(1)
      expect(el.getAttribute('cards')).toBe(before) // attribute 保持原值
      expect(el.cards.find((c) => c.id === 'c1')!.column).toBe('done')
      // 渲染跟随内存数据
      expect(cardsOf(el, 'done').length).toBe(1)
    })

    it('非函数赋值静默忽略（回落默认 title 渲染）', () => {
      const el = mount()
      el.renderCard = 'not-a-function' as unknown as (card: Record<string, unknown>) => Node | string
      expect(cardOf(el, 'c1')!.querySelector('.card-title')).not.toBeNull()
    })

    it('触屏移动按钮在自定义渲染下保留', () => {
      const el = mount()
      el.renderCard = (card) => String(card.title)
      expect(cardOf(el, 'c1')!.querySelector('.card-move')).not.toBeNull()
    })

    it('renderCard 先于连接赋值：首帧 cards 仍解析（面板非空）——回归', () => {
      // 框架桥接层常见时序：property 在 appendChild 前赋值。旧版 parse() 按 renderCard
      // 在场一刀切跳过 cards 解析 → 首帧空板且无告警
      const el = new OASKanban()
      el.setAttribute('columns', JSON.stringify(COLUMNS))
      el.setAttribute('cards', JSON.stringify(CARDS))
      el.renderCard = (card) => String(card.title)
      document.body.appendChild(el)
      expect(el.cards.length, 'cards 首帧解析（不被 renderCard 阻断）').toBe(CARDS.length)
      expect(shadow(el).querySelectorAll('.card').length, '面板渲染卡片').toBeGreaterThan(0)
    })

    it('renderCard 置 null 后：内存态（拖拽成果）保留，恢复默认 title 渲染', () => {
      const el = mount()
      el.renderCard = (card) => String(card.title)
      dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      el.renderCard = null
      // I2 修复后：parse 按 attribute 原文变化判定——attribute 未变（renderCard 路径不反射），
      // 内存态保留（拖拽成果不丢），渲染回落默认 title
      expect(el.cards.find((c) => c.id === 'c1')!.column).toBe('done')
      expect(cardsOf(el, 'done').length).toBe(1)
      expect(cardsOf(el, 'done')[0]!.querySelector('.card-title')).not.toBeNull()
    })
  })
})
