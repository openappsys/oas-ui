import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASKanban } from './index.js'

// oas-kanban 看板组件：columns/cards JSON 双通道 + HTML5 DnD 拖拽换列/列内排序 +
// oas-change { id, from, to, index } + 触屏移动菜单 + renderCard 自定义渲染。
// 二期：列拖拽重排（oas-column-reorder）+ WIP 限制（limit / data-over-limit）+
// 卡片多选（Ctrl/Shift 点击 + 多选拖拽 ids）+ 泳道（swimlane-by 分带 + 折叠 + 跨带拖拽）。
//
// happy-dom 限制（与 table 行拖拽测试同口径）：
// - 无排版测量（getBoundingClientRect 全 0）→ dragover 的上/下半按 clientY（列按 clientX）显式给值；
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

/** 泳道测试数据：prio 字段分带——high（s1,s4）/ low（s2）/（空）（s3、s5，首现序） */
const SWIM_COLUMNS = [
  { key: 'todo', title: '待办' },
  { key: 'doing', title: '进行中' },
]
const SWIM_CARDS = [
  { id: 's1', column: 'todo', title: '高优一', prio: 'high' },
  { id: 's2', column: 'doing', title: '低优一', prio: 'low' },
  { id: 's3', column: 'todo', title: '无值' },
  { id: 's4', column: 'doing', title: '高优二', prio: 'high' },
  { id: 's5', column: 'todo', title: '空串', prio: '' },
]

function mountSwim(attrs: Record<string, string> = {}): OASKanban {
  return mount({
    'swimlane-by': 'prio',
    columns: JSON.stringify(SWIM_COLUMNS),
    cards: JSON.stringify(SWIM_CARDS),
    ...attrs,
  })
}

/** 泳道带（.lane），按 data-lane 原值查找 */
function laneOf(el: OASKanban, lane: string): HTMLElement {
  return [...shadow(el).querySelectorAll<HTMLElement>('.lane[data-lane]')].find(
    (l) => l.getAttribute('data-lane') === lane,
  )!
}

/** 泳道带 × 列 = 单元格 */
function cellOf(el: OASKanban, lane: string, key: string): HTMLElement {
  return [...shadow(el).querySelectorAll<HTMLElement>('.lane-cell[data-column]')].find(
    (c) => c.getAttribute('data-column') === key && c.closest('.lane')?.getAttribute('data-lane') === lane,
  )!
}

/** 单元格内卡片元素 */
function cardsInCell(el: OASKanban, lane: string, key: string): HTMLElement[] {
  return [...cellOf(el, lane, key).querySelectorAll<HTMLElement>('.card[data-id]')]
}

/** 列头（两种模式统一携带 data-key） */
function headOf(el: OASKanban, key: string): HTMLElement {
  return shadow(el).querySelector<HTMLElement>(`.column-head[data-key="${key}"]`)!
}

/** 列头拖拽手柄 */
function handleOf(el: OASKanban, key: string): HTMLElement {
  return headOf(el, key).querySelector<HTMLElement>('.column-drag')!
}

/** 完整列拖放：手柄 dragstart → 目标列头 dragover（clientX 定前/后半）→ drop → dragend */
function columnDragDrop(el: OASKanban, fromKey: string, toKey: string, clientX: number): void {
  handleOf(el, fromKey).dispatchEvent(dragEvent('dragstart'))
  headOf(el, toKey).dispatchEvent(dragEvent('dragover', { clientX }))
  headOf(el, toKey).dispatchEvent(dragEvent('drop', { clientX }))
  handleOf(el, fromKey).dispatchEvent(dragEvent('dragend'))
}

/** 收集 oas-column-reorder 事件 */
function trackColumnReorder(el: OASKanban): CustomEvent[] {
  const events: CustomEvent[] = []
  el.addEventListener('oas-column-reorder', (e) => events.push(e as CustomEvent))
  return events
}

/** 点击卡片（可带修饰键） */
function clickCard(el: OASKanban, id: string, init: MouseEventInit = {}): void {
  cardOf(el, id).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ...init }))
}

/** 当前带 data-selected 的卡片 id */
function selectedIds(el: OASKanban): string[] {
  return [...shadow(el).querySelectorAll<HTMLElement>('.card[data-selected]')].map((c) => c.getAttribute('data-id')!)
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

  describe('列拖拽重排', () => {
    it('列头带拖拽手柄：draggable=true + aria-label（i18n）', () => {
      const el = mount()
      for (const col of columnEls(el)) {
        const handle = col.querySelector<HTMLElement>('.column-drag')!
        expect(handle, '每列头一个手柄').not.toBeNull()
        expect(handle.getAttribute('draggable')).toBe('true')
        expect(handle.getAttribute('aria-label')).toBe('拖拽调整列顺序')
      }
    })

    it('手柄拖拽换序：派发 oas-column-reorder { from, to, keys }，回写 columns，DOM 列序更新，cards 不动', () => {
      const el = mount()
      const cardsBefore = el.getAttribute('cards')
      const events = trackColumnReorder(el)
      columnDragDrop(el, 'todo', 'done', -10) // done 头左半 = 插在 done 之前 → 新位次 1
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ from: 0, to: 1, keys: ['doing', 'todo', 'done'] })
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
      expect(JSON.parse(el.getAttribute('columns')!).map((c: { key: string }) => c.key)).toEqual([
        'doing',
        'todo',
        'done',
      ])
      expect(columnEls(el).map((c) => c.getAttribute('data-key'))).toEqual(['doing', 'todo', 'done'])
      expect(el.getAttribute('cards')).toBe(cardsBefore)
    })

    it('拖到紧邻位置零操作：不派发、columns 不变、无落点指示残留', () => {
      const el = mount()
      const before = el.getAttribute('columns')
      const events = trackColumnReorder(el)
      // doing(1) 拖到 done 头左半 → 视觉位 2 → 移除后插入位 1 === 原位 → 零操作
      columnDragDrop(el, 'doing', 'done', -10)
      expect(events.length).toBe(0)
      expect(el.getAttribute('columns')).toBe(before)
      expect(shadow(el).querySelector('.drop-before, .drop-after')).toBeNull()
    })

    it('拖到列头右半 = 之后落点（from 末位移到中间）', () => {
      const el = mount()
      const events = trackColumnReorder(el)
      columnDragDrop(el, 'done', 'todo', 10) // done(2) 拖到 todo 头右半 → 视觉位 1 → 新位次 1
      expect(events[0]!.detail).toEqual({ from: 2, to: 1, keys: ['todo', 'done', 'doing'] })
      expect(columnEls(el).map((c) => c.getAttribute('data-key'))).toEqual(['todo', 'done', 'doing'])
    })

    it('dragend 清除手柄淡化与落点指示（取消路径无孤儿标记）', () => {
      const el = mount()
      handleOf(el, 'todo').dispatchEvent(dragEvent('dragstart'))
      expect(headOf(el, 'todo').classList.contains('drag-source')).toBe(true)
      headOf(el, 'done').dispatchEvent(dragEvent('dragover', { clientX: -10 }))
      expect(headOf(el, 'done').classList.contains('drop-before')).toBe(true)
      handleOf(el, 'todo').dispatchEvent(dragEvent('dragend'))
      expect(shadow(el).querySelector('.drag-source, .drop-before, .drop-after')).toBeNull()
    })

    it('列头落点指示：目标头左半 drop-before / 右半 drop-after（列间插入线）', () => {
      const el = mount()
      handleOf(el, 'todo').dispatchEvent(dragEvent('dragstart'))
      headOf(el, 'done').dispatchEvent(dragEvent('dragover', { clientX: -10 }))
      expect(headOf(el, 'done').classList.contains('drop-before')).toBe(true)
      headOf(el, 'done').dispatchEvent(dragEvent('dragover', { clientX: 10 }))
      expect(headOf(el, 'done').classList.contains('drop-after')).toBe(true)
      expect(headOf(el, 'done').classList.contains('drop-before')).toBe(false)
      handleOf(el, 'todo').dispatchEvent(dragEvent('dragend'))
    })

    it('触屏列移动按钮：coarse 降级——边界 aria-disabled，点击换序派发事件', () => {
      const el = mount()
      const prev = headOf(el, 'todo').querySelector<HTMLButtonElement>('.column-nav[data-nav="prev"]')!
      const next = headOf(el, 'todo').querySelector<HTMLButtonElement>('.column-nav[data-nav="next"]')!
      expect(prev.getAttribute('aria-label')).toBe('列左移')
      expect(next.getAttribute('aria-label')).toBe('列右移')
      expect(prev.getAttribute('aria-disabled')).toBe('true') // 首列左移禁用
      expect(next.getAttribute('aria-disabled')).not.toBe('true')
      expect(
        headOf(el, 'done')
          .querySelector<HTMLButtonElement>('.column-nav[data-nav="next"]')!
          .getAttribute('aria-disabled'),
      ).toBe('true') // 末列右移禁用
      const events = trackColumnReorder(el)
      next.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ from: 0, to: 1, keys: ['doing', 'todo', 'done'] })
      // aria-disabled 项点击零操作
      prev.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(1)
    })

    it('手柄键盘 ←/→ 换序（键盘可达；边界零操作）', () => {
      const el = mount()
      const events = trackColumnReorder(el)
      handleOf(el, 'done').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
      )
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ from: 2, to: 1, keys: ['todo', 'done', 'doing'] })
      handleOf(el, 'todo').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
      )
      expect(events.length).toBe(1) // 首列左移零操作
      handleOf(el, 'todo').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
      )
      expect(events.length).toBe(2)
      expect(events[1]!.detail).toEqual({ from: 0, to: 1, keys: ['done', 'todo', 'doing'] })
    })

    it('泳道模式下列重排：各带内单元格列序跟随新列序，带序不变', () => {
      const el = mountSwim()
      const events = trackColumnReorder(el)
      columnDragDrop(el, 'todo', 'doing', 10) // todo(0) → doing 头右半 → 视觉位 1 → 新位次 1
      expect(events[0]!.detail).toEqual({ from: 0, to: 1, keys: ['doing', 'todo'] })
      // high 带内单元格：doing 在前
      const highBody = laneOf(el, 'high').querySelector<HTMLElement>('.lane-body')!
      expect(
        [...highBody.querySelectorAll<HTMLElement>('.lane-cell')].map((c) => c.getAttribute('data-column')),
      ).toEqual(['doing', 'todo'])
      // 带序不变
      expect(
        [...shadow(el).querySelectorAll<HTMLElement>('.lane[data-lane]')].map((l) => l.getAttribute('data-lane')),
      ).toEqual(['high', 'low', ''])
    })
  })

  describe('WIP 限制', () => {
    it('无 limit：不标 data-over-limit，计数无 over-limit 类', () => {
      const el = mount()
      for (const col of columnEls(el)) {
        expect(col.hasAttribute('data-over-limit')).toBe(false)
        expect(col.querySelector('.column-count')!.classList.contains('over-limit')).toBe(false)
      }
    })

    it('超限：列容器 data-over-limit + 列头计数 warning 类', () => {
      const el = mount({
        columns: JSON.stringify([
          { key: 'todo', title: '待办', limit: 1 },
          { key: 'doing', title: '进行中' },
          { key: 'done', title: '已完成' },
        ]),
      })
      expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(true)
      expect(columnOf(el, 'todo').querySelector('.column-count')!.classList.contains('over-limit')).toBe(true)
      expect(columnOf(el, 'doing').hasAttribute('data-over-limit')).toBe(false)
      expect(columnOf(el, 'done').hasAttribute('data-over-limit')).toBe(false)
    })

    it('恰好等于 limit：不标记（超限才标）', () => {
      const el = mount({
        columns: JSON.stringify([
          { key: 'todo', title: '待办', limit: 2 },
          { key: 'doing', title: '进行中' },
          { key: 'done', title: '已完成' },
        ]),
      })
      expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(false)
    })

    it('limit 0 / 负数 = 不限制', () => {
      for (const limit of [0, -1]) {
        const el = mount({
          columns: JSON.stringify([
            { key: 'todo', title: '待办', limit },
            { key: 'doing', title: '进行中' },
            { key: 'done', title: '已完成' },
          ]),
        })
        expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(false)
      }
    })

    it('拖入超限列正常落定（提示语义非阻断）：事件照发、数据落定、标记保持', () => {
      const el = mount({
        columns: JSON.stringify([
          { key: 'todo', title: '待办', limit: 1 },
          { key: 'doing', title: '进行中' },
          { key: 'done', title: '已完成' },
        ]),
      })
      const events = trackChange(el)
      dragDrop(el, 'c3', columnOf(el, 'todo').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c3', from: 'doing', to: 'todo', index: 2 })
      expect(JSON.parse(el.getAttribute('cards')!).find((c: { id: string }) => c.id === 'c3').column).toBe('todo')
      expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(true)
    })

    it('宿主更新数据解除超限', () => {
      const columns = JSON.stringify([
        { key: 'todo', title: '待办', limit: 1 },
        { key: 'doing', title: '进行中' },
        { key: 'done', title: '已完成' },
      ])
      const el = mount({ columns })
      expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(true)
      el.cards = [{ id: 'c1', column: 'todo', title: '任务一' }]
      expect(columnOf(el, 'todo').hasAttribute('data-over-limit')).toBe(false)
      expect(columnOf(el, 'todo').querySelector('.column-count')!.classList.contains('over-limit')).toBe(false)
    })

    it('泳道下按列聚合判定（跨带合计）', () => {
      const el = mountSwim({
        columns: JSON.stringify([{ key: 'todo', title: '待办', limit: 2 }, ...SWIM_COLUMNS.slice(1)]),
      })
      // todo 列跨带合计 s1/s3/s5 = 3 > 2
      expect(headOf(el, 'todo').hasAttribute('data-over-limit')).toBe(true)
      expect(headOf(el, 'todo').querySelector('.column-count')!.classList.contains('over-limit')).toBe(true)
      for (const lane of ['high', 'low', '']) {
        expect(cellOf(el, lane, 'todo').hasAttribute('data-over-limit')).toBe(true)
      }
      expect(headOf(el, 'doing').hasAttribute('data-over-limit')).toBe(false)
      expect(cellOf(el, 'low', 'doing').hasAttribute('data-over-limit')).toBe(false)
    })
  })

  describe('卡片多选', () => {
    it('Ctrl+点击逐枚切换选中（data-selected）', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      expect(selectedIds(el)).toEqual(['c1'])
      clickCard(el, 'c2', { ctrlKey: true })
      expect(selectedIds(el).sort()).toEqual(['c1', 'c2'])
      clickCard(el, 'c1', { ctrlKey: true })
      expect(selectedIds(el)).toEqual(['c2'])
    })

    it('Cmd+点击同 Ctrl（metaKey）', () => {
      const el = mount()
      clickCard(el, 'c1', { metaKey: true })
      expect(selectedIds(el)).toEqual(['c1'])
    })

    it('Shift+点击同列范围选（锚点到最后点击）', () => {
      const el = mount()
      clickCard(el, 'c1') // 锚点 c1
      clickCard(el, 'c2', { shiftKey: true })
      expect(selectedIds(el)).toEqual(['c1', 'c2'])
      // 新锚点为 c2：shift 回点 c1 → 仍是整段
      clickCard(el, 'c1', { shiftKey: true })
      expect(selectedIds(el)).toEqual(['c1', 'c2'])
    })

    it('Shift+点击跨列（跨单元格）退化为单选该枚', () => {
      const el = mount()
      clickCard(el, 'c1')
      clickCard(el, 'c3', { shiftKey: true })
      expect(selectedIds(el)).toEqual(['c3'])
    })

    it('普通点击清空多选选中该枚', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      expect(selectedIds(el).length).toBe(2)
      clickCard(el, 'c3')
      expect(selectedIds(el)).toEqual(['c3'])
    })

    it('空白处点击（列体空白）清空多选', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      columnOf(el, 'done')
        .querySelector<HTMLElement>('.column-body')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(selectedIds(el)).toEqual([])
    })

    it('Esc 清空多选（菜单未开时）', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      expect(selectedIds(el).length).toBe(1)
      shadow(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
      expect(selectedIds(el)).toEqual([])
    })

    it('多选拖拽：移动全部选中卡到落点列——一条 oas-change，detail 含 ids（id 为首枚），落定后清空选中', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      const events = trackChange(el)
      dragDrop(el, 'c1', cardOf(el, 'c3'), 10) // 拖 c1 到 doing 的 c3 下半
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'doing', index: 1, ids: ['c1', 'c2'] })
      expect(cardsOf(el, 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['c3', 'c1', 'c2'])
      expect(cardsOf(el, 'todo')).toEqual([])
      const cards = JSON.parse(el.getAttribute('cards')!) as Array<Record<string, unknown>>
      expect(cards.find((c) => c.id === 'c1')!.column).toBe('doing')
      expect(cards.find((c) => c.id === 'c2')!.column).toBe('doing')
      expect(selectedIds(el)).toEqual([])
    })

    it('多选拖拽 index 为移除选中卡后的插入位', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      const events = trackChange(el)
      dragDrop(el, 'c1', cardOf(el, 'c3'), -10) // c3 上半：视觉位 0 → 移除后插入位 0
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'doing', index: 0, ids: ['c1', 'c2'] })
      expect(cardsOf(el, 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['c1', 'c2', 'c3'])
    })

    it('选中卡跨列时 from 取首枚列，全部选中卡换列', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true }) // todo
      clickCard(el, 'c3', { ctrlKey: true }) // doing
      const events = trackChange(el)
      dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'done', index: 0, ids: ['c1', 'c3'] })
      expect(cardsOf(el, 'done').map((c) => c.getAttribute('data-id'))).toEqual(['c1', 'c3'])
    })

    it('单枚选中拖拽保持单卡契约（detail 无 ids 字段）', () => {
      const el = mount()
      clickCard(el, 'c1') // 普通点击 = 单选
      const events = trackChange(el)
      dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events.length).toBe(1)
      expect(Object.keys(events[0]!.detail).sort()).toEqual(['from', 'id', 'index', 'to'])
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'done', index: 0 })
    })

    it('拖拽未选中卡只动该卡（其余选中保持）', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      const events = trackChange(el)
      dragDrop(el, 'c3', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
      expect(events[0]!.detail).toEqual({ id: 'c3', from: 'doing', to: 'done', index: 0 })
      expect(cardsOf(el, 'done').map((c) => c.getAttribute('data-id'))).toEqual(['c3'])
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c1', 'c2'])
    })

    it('触屏菜单移动不受多选影响：菜单只作用于按钮所在卡（第一期语义）', () => {
      const el = mount()
      clickCard(el, 'c1', { ctrlKey: true })
      clickCard(el, 'c2', { ctrlKey: true })
      const events = trackChange(el)
      cardOf(el, 'c1')
        .querySelector<HTMLButtonElement>('.card-move')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      const done = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find(
        (i) => i.textContent === '已完成',
      )!
      done.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(1)
      expect(Object.keys(events[0]!.detail).sort()).toEqual(['from', 'id', 'index', 'to'])
      expect(events[0]!.detail).toEqual({ id: 'c1', from: 'todo', to: 'done', index: 0 })
      // c2 留在 todo（未被带动）
      expect(cardsOf(el, 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['c2'])
    })

    it('泳道下 Shift 范围选限同一单元格（跨带退化单选）', () => {
      const el = mountSwim()
      clickCard(el, 's1') // high-todo 锚点
      clickCard(el, 's5', { shiftKey: true }) // （空）-todo：不同单元格
      expect(selectedIds(el)).toEqual(['s5'])
    })

    it('多选拖拽 × 泳道：全部选中卡改写泳道字段，detail 含 ids + swimlane（首枚口径）', () => {
      const el = mountSwim()
      clickCard(el, 's1', { ctrlKey: true }) // high-todo
      clickCard(el, 's5', { ctrlKey: true }) // （空）-todo
      const events = trackChange(el)
      dragDrop(el, 's1', cardOf(el, 's2'), 10) // 拖到 low-doing 的 s2 下半
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({
        id: 's1',
        from: 'todo',
        to: 'doing',
        index: 1,
        ids: ['s1', 's5'],
        swimlane: { from: 'high', to: 'low' },
      })
      const cards = JSON.parse(el.getAttribute('cards')!) as Array<Record<string, unknown>>
      expect(cards.find((c) => c.id === 's1')!.prio).toBe('low')
      expect(cards.find((c) => c.id === 's5')!.prio).toBe('low')
      expect(cardsInCell(el, 'low', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s2', 's1', 's5'])
    })
  })

  describe('泳道（swimlane-by）', () => {
    it('按字段值横向分带：带序为首次出现序，带头含字段值 + 计数 + 折叠箭头', () => {
      const el = mountSwim()
      const lanes = [...shadow(el).querySelectorAll<HTMLElement>('.lane[data-lane]')]
      expect(lanes.map((l) => l.getAttribute('data-lane'))).toEqual(['high', 'low', ''])
      expect(laneOf(el, 'high').querySelector<HTMLElement>('.lane-label')!.textContent).toBe('high')
      expect(laneOf(el, 'high').querySelector<HTMLElement>('.lane-count')!.textContent).toBe('2')
      expect(laneOf(el, 'low').querySelector<HTMLElement>('.lane-count')!.textContent).toBe('1')
      const toggle = laneOf(el, 'high').querySelector<HTMLButtonElement>('.lane-toggle')!
      expect(toggle.getAttribute('aria-label')).toBe('展开/收起泳道')
      expect(toggle.getAttribute('aria-expanded')).toBe('true') // 默认全展开
    })

    it('字段值缺失/空归「（空）」泳道（i18n，table.groupEmpty 同语义）', () => {
      const el = mountSwim()
      expect(laneOf(el, '').querySelector<HTMLElement>('.lane-label')!.textContent).toBe('（空）')
      expect(laneOf(el, '').querySelector<HTMLElement>('.lane-count')!.textContent).toBe('2')
    })

    it('泳道内卡片按列分组渲染（带 × 列 = 单元格矩阵）', () => {
      const el = mountSwim()
      expect(cardsInCell(el, 'high', 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['s1'])
      expect(cardsInCell(el, 'high', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s4'])
      expect(cardsInCell(el, 'low', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s2'])
      expect(cardsInCell(el, '', 'todo').map((c) => c.getAttribute('data-id'))).toEqual(['s3', 's5'])
      expect(cellOf(el, 'low', 'todo').querySelector('.card')).toBeNull()
    })

    it('无 swimlane-by：保持原列结构（无 .lane）', () => {
      const el = mount()
      expect(shadow(el).querySelector('.lane')).toBeNull()
      expect(columnEls(el).length).toBe(3)
    })

    it('空单元格显示占位文案（复用空列占位 i18n / empty-column-text 覆盖）', () => {
      const el = mountSwim()
      expect(cellOf(el, 'low', 'todo').querySelector<HTMLElement>('.empty-cell')!.textContent).toBe('拖拽卡片到此处')
      const el2 = mountSwim({ 'empty-column-text': '这里空着' })
      expect(cellOf(el2, 'low', 'todo').querySelector<HTMLElement>('.empty-cell')!.textContent).toBe('这里空着')
    })

    it('点击折叠/展开：aria-expanded 同步 + 带体显隐', () => {
      const el = mountSwim()
      const toggle = laneOf(el, 'high').querySelector<HTMLButtonElement>('.lane-toggle')!
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(laneOf(el, 'high').classList.contains('lane-collapsed')).toBe(true)
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(laneOf(el, 'high').classList.contains('lane-collapsed')).toBe(false)
      expect(toggle.getAttribute('aria-expanded')).toBe('true')
    })

    it('折叠状态在数据变化（重渲染）时保留', () => {
      const el = mountSwim()
      laneOf(el, 'high')
        .querySelector<HTMLButtonElement>('.lane-toggle')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      // 同单元格内排序触发数据变化重渲染
      dragDrop(el, 's5', cardOf(el, 's3'), -10)
      expect(laneOf(el, 'high').classList.contains('lane-collapsed')).toBe(true)
    })

    it('swimlane-by 变化清空折叠残留', () => {
      const el = mountSwim()
      laneOf(el, 'high')
        .querySelector<HTMLButtonElement>('.lane-toggle')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(laneOf(el, 'high').classList.contains('lane-collapsed')).toBe(true)
      el.setAttribute('swimlane-by', 'owner')
      expect(shadow(el).querySelector('.lane-collapsed')).toBeNull()
    })

    it('跨泳道拖拽 = 改泳道字段值：oas-change detail 加 swimlane { from, to }，数据回写', () => {
      const el = mountSwim()
      const events = trackChange(el)
      dragDrop(el, 's1', cardOf(el, 's2'), 10) // high-todo → low-doing 的 s2 下半
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({
        id: 's1',
        from: 'todo',
        to: 'doing',
        index: 1,
        swimlane: { from: 'high', to: 'low' },
      })
      const cards = JSON.parse(el.getAttribute('cards')!) as Array<Record<string, unknown>>
      expect(cards.find((c) => c.id === 's1')!.prio).toBe('low')
      expect(cards.find((c) => c.id === 's1')!.column).toBe('doing')
      // 重渲染后落入 low 带
      expect(cardsInCell(el, 'low', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s2', 's1'])
    })

    it('同带拖拽（跨列）不派发 swimlane 字段、字段值不变', () => {
      const el = mountSwim()
      const events = trackChange(el)
      dragDrop(el, 's1', cardOf(el, 's4'), 10) // high-todo → high-doing
      expect(events.length).toBe(1)
      expect(Object.keys(events[0]!.detail).sort()).toEqual(['from', 'id', 'index', 'to'])
      expect(events[0]!.detail).toEqual({ id: 's1', from: 'todo', to: 'doing', index: 1 })
      expect(JSON.parse(el.getAttribute('cards')!).find((c: { id: string }) => c.id === 's1').prio).toBe('high')
    })

    it('拖到「（空）」泳道：字段值写空串，swimlane.to 为空串', () => {
      const el = mountSwim()
      const events = trackChange(el)
      dragDrop(el, 's1', cardOf(el, 's3'), 10) // high-todo → （空）-todo 的 s3 下半
      expect(events[0]!.detail).toEqual({
        id: 's1',
        from: 'todo',
        to: 'todo',
        index: 1,
        swimlane: { from: 'high', to: '' },
      })
      expect(JSON.parse(el.getAttribute('cards')!).find((c: { id: string }) => c.id === 's1').prio).toBe('')
    })

    it('拖拽悬停折叠带头自动展开（只切类不重建，drop 可正常落定）', () => {
      const el = mountSwim()
      laneOf(el, 'low')
        .querySelector<HTMLButtonElement>('.lane-toggle')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(laneOf(el, 'low').classList.contains('lane-collapsed')).toBe(true)
      cardOf(el, 's1').dispatchEvent(dragEvent('dragstart'))
      laneOf(el, 'low').dispatchEvent(dragEvent('dragover', { clientY: 0 }))
      expect(laneOf(el, 'low').classList.contains('lane-collapsed')).toBe(false)
      // 展开后可正常拖入
      dragDrop(el, 's1', cardOf(el, 's2'), 10)
      expect(cardsInCell(el, 'low', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s2', 's1'])
    })

    it('泳道下菜单移动保持泳道不变（菜单作用于所在单元格）', () => {
      const el = mountSwim()
      const events = trackChange(el)
      cardOf(el, 's1')
        .querySelector<HTMLButtonElement>('.card-move')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      const doing = [...shadow(el).querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find(
        (i) => i.textContent === '进行中',
      )!
      doing.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(events.length).toBe(1)
      // 目标列同带（high）内已有 s4 → index 1；泳道字段不变、无 swimlane 字段
      expect(events[0]!.detail).toEqual({ id: 's1', from: 'todo', to: 'doing', index: 1 })
      expect(JSON.parse(el.getAttribute('cards')!).find((c: { id: string }) => c.id === 's1').prio).toBe('high')
      expect(cardsInCell(el, 'high', 'doing').map((c) => c.getAttribute('data-id'))).toEqual(['s4', 's1'])
    })

    it('DSD 真水合兼容泳道结构（.lane 快照接管不重建）', () => {
      const el = new OASKanban()
      el.setAttribute('swimlane-by', 'prio')
      el.setAttribute('columns', JSON.stringify(SWIM_COLUMNS))
      el.setAttribute('cards', JSON.stringify(SWIM_CARDS))
      // 泳道结构快照（与 update() 产物同构）
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-kanban"><div class="kanban swimlane"><div class="lane-header"></div><div class="lane" data-lane="high"><div class="lane-body"><div class="lane-cell" data-column="todo"></div></div></div></div>'
      document.body.appendChild(el)
      // 水合接管成功：render() 未跑（shadow 无新增 <style>，只有 update() 重建板体内容）
      expect(el.shadowRoot!.querySelector('style'), '水合路径不重建 shadow（无新 <style>）').toBeNull()
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.shadowRoot!.querySelectorAll('.card').length, '水合后 update 正常填充卡片').toBeGreaterThan(0)
    })

    it('DSD 真水合兼容旧列结构（.column 快照接管不重建）', () => {
      const el = new OASKanban()
      el.setAttribute('columns', JSON.stringify(COLUMNS))
      el.setAttribute('cards', JSON.stringify(CARDS))
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-kanban"><div class="kanban"><div class="column" data-key="todo"><div class="column-head"></div><div class="column-body"></div></div></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('style'), '水合路径不重建 shadow（无新 <style>）').toBeNull()
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.shadowRoot!.querySelectorAll('.card').length, '水合后 update 正常填充卡片').toBeGreaterThan(0)
    })
  })
})

describe('断开重连 onReconnect 重绑（core 重连架构接线）', () => {
  it('断开重连后拖拽/点击委托恢复且不双挂：dragstart 设置 dragId、applyMove 只触发一次', () => {
    const el = mount()
    // 断开重连两次（bind 跑三次）——shadow 根委托若双挂会重复触发 applyMove
    const parent = el.parentElement!
    el.remove()
    parent.appendChild(el)
    el.remove()
    parent.appendChild(el)
    // 拖拽换列：dragId 设置（shadow 根 dragstart 委托恢复）+ 落定只移动一次
    const events = trackChange(el)
    dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
    expect(events.length, '重连后拖拽派发一次 oas-change（委托不双挂）').toBe(1)
    expect((events[0]!.detail as { to: string }).to).toBe('done')
    expect(cardsOf(el, 'done').map((c) => c.getAttribute('data-id'))).toEqual(['c1'])
  })

  it('断开重连后 applyMove 只被调用一次（spy 直接锁「不双挂」——零操作判定兜底会让 events=1 的假绿无处遁形）', () => {
    const el = mount()
    const parent = el.parentElement!
    el.remove()
    parent.appendChild(el)
    el.remove()
    parent.appendChild(el)
    // 双挂时 drop 委托触发 N 次 → applyMove 被调 N 次（事件层的零操作判定虽兜住派发，
    // 但调用次数暴露双挂本体）——spy 直接数调用
    type WithApplyMove = { applyMove(id: string, toKey: string, visualIndex: number, targetLane?: string): void }
    const host = el as unknown as WithApplyMove
    const original = host.applyMove.bind(el)
    let calls = 0
    host.applyMove = ((...args: Parameters<WithApplyMove['applyMove']>) => {
      calls++
      return original(...args)
    }) as WithApplyMove['applyMove']
    dragDrop(el, 'c1', columnOf(el, 'done').querySelector<HTMLElement>('.column-body')!, 0)
    expect(calls, 'applyMove 只被调用一次（重连两次 bind 后委托不双挂）').toBe(1)
  })
})
