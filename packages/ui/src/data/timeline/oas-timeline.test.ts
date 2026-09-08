import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTimeline, OASTimelineItem } from './index.js'

function mount(): OASTimeline {
  const el = new OASTimeline()
  el.innerHTML = `
    <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
    <oas-timeline-item time="2024-02-01"><p>事件二</p></oas-timeline-item>
  `
  document.body.appendChild(el)
  return el
}

function items(el: OASTimeline): OASTimelineItem[] {
  return Array.from(el.querySelectorAll('oas-timeline-item'))
}

/** 取条目自身 shadow 内的行结构（自包含行：dot/line/time/content 都在 item shadow 里） */
function row(item: OASTimelineItem): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!
}

describe('OASTimeline', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染时间线项（行结构在 item 自身 shadow 内）', () => {
    const el = mount()
    const [first, second] = items(el)
    const firstRow = row(first!)
    expect(firstRow).not.toBeNull()
    expect(firstRow.querySelector('[part="dot"]')).not.toBeNull()
    expect(firstRow.querySelector('[part="time"]')!.textContent).toBe('2024-01-01')
    // 内容在宿主 light DOM 原位（slot 分发）：happy-dom 里 slot textContent 不含分布式内容，
    // 用条目自身 textContent + 默认插槽 assignedNodes 断言
    expect(first!.textContent).toContain('事件一')
    const defaultSlot = firstRow.querySelector<HTMLSlotElement>('slot:not([name])')!
    expect(defaultSlot.assignedNodes().length).toBeGreaterThan(0)
    expect(second!.textContent).toContain('事件二')
    // 内容不再被 cloneNode 进 timeline shadow：timeline shadow 只有 slot 分发
    expect(el.shadowRoot!.querySelector('[part="timeline"]')!.querySelector('p')).toBeNull()
  })

  it('机制债修复：内容里的宿主事件监听在渲染后仍然有效（不再 cloneNode）', () => {
    const el = new OASTimeline()
    const item = document.createElement('oas-timeline-item')
    const btn = document.createElement('button')
    btn.textContent = '详情'
    item.appendChild(btn)
    el.appendChild(item)
    document.body.appendChild(el)
    let clicked = 0
    // 宿主在连接前绑定到【原节点】——克隆渲染下此监听会随克隆丢失
    btn.addEventListener('click', () => clicked++)
    btn.click()
    expect(clicked).toBe(1)
    // 点击的是宿主 light DOM 里的那个原按钮（不是克隆体）
    expect(item.contains(btn)).toBe(true)
  })

  it('type 语义色枚举：dot 携带归一化后的 data-type', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item type="success"><p>成功</p></oas-timeline-item>
      <oas-timeline-item type="warning"><p>警告</p></oas-timeline-item>
      <oas-timeline-item type="danger"><p>危险</p></oas-timeline-item>
      <oas-timeline-item type="info"><p>信息</p></oas-timeline-item>
      <oas-timeline-item type="neutral"><p>归档</p></oas-timeline-item>
      <oas-timeline-item><p>默认</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const dots = items(el).map((i) => row(i).querySelector('[part="dot"]')!)
    expect(dots.map((d) => d.getAttribute('data-type'))).toEqual([
      'success',
      'warning',
      'danger',
      'info',
      'neutral',
      'primary',
    ])
  })

  it('color 旧值映射（迁移兼容）：green→success、red→danger、gray→neutral', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item color="green"><p>旧绿</p></oas-timeline-item>
      <oas-timeline-item color="red"><p>旧红</p></oas-timeline-item>
      <oas-timeline-item color="gray"><p>旧灰</p></oas-timeline-item>
      <oas-timeline-item color="green" type="warning"><p>type 优先</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const dots = items(el).map((i) => row(i).querySelector('[part="dot"]')!)
    expect(dots.map((d) => d.getAttribute('data-type'))).toEqual([
      'success',
      'danger',
      'neutral',
      'warning',
    ])
  })

  it('任意色走 --oas-timeline-dot-color CSS 变量（dot 背景变量链优先取它）', () => {
    const el = new OASTimeline()
    el.innerHTML = `<oas-timeline-item><p>任意色</p></oas-timeline-item>`
    document.body.appendChild(el)
    const style = items(el)[0]!.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('--oas-timeline-dot-color')
    expect(style).toMatch(/background:\s*var\(--oas-timeline-dot-color/)
  })

  it('direction/mode 上下文下发到每个 item', () => {
    const el = new OASTimeline()
    el.setAttribute('direction', 'horizontal')
    el.setAttribute('mode', 'alternate')
    el.innerHTML = `<oas-timeline-item><p>事件</p></oas-timeline-item>`
    document.body.appendChild(el)
    const item = items(el)[0]!
    expect(item.getAttribute('data-direction')).toBe('horizontal')
    expect(item.getAttribute('data-mode')).toBe('alternate')
    expect(
      el.shadowRoot!.querySelector('[part="timeline"]')!.getAttribute('data-direction'),
    ).toBe('horizontal')
    // 运行时切换同步下发
    el.setAttribute('direction', 'vertical')
    expect(item.getAttribute('data-direction')).toBe('vertical')
  })

  it('reverse：容器标记 data-reverse，条目 DOM 顺序不变（视觉倒序由 CSS 承担）', () => {
    const el = mount()
    el.setAttribute('reverse', '')
    const wrap = el.shadowRoot!.querySelector('[part="timeline"]')!
    expect(wrap.getAttribute('data-reverse')).toBe('true')
    expect(items(el)[0]!.textContent).toContain('事件一')
  })

  it('动态新增 item：上下文自动下发（MutationObserver）', async () => {
    const el = mount()
    el.setAttribute('mode', 'alternate')
    const item = document.createElement('oas-timeline-item')
    item.innerHTML = '<p>事件三</p>'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(item.getAttribute('data-mode')).toBe('alternate')
  })

  it('pending 尾节点：默认文案与脉冲态样式钩子', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    `
    document.body.appendChild(el)
    const [first, tail] = items(el)
    expect(first!.hasAttribute('pending')).toBe(false)
    expect(tail!.hasAttribute('pending')).toBe(true)
    expect(row(tail!).textContent).toContain('敬请期待')
    // 尾节点短虚线桩的样式规则存在（:host 组合选择器，单行书写）
    const style = tail!.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/:host\(\[pending\]:last-child\)\s+\.axis::after/)
  })

  it('pending 节点有内容时保留内容（不显示兜底文案）', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item pending>正在开发中</oas-timeline-item>
    `
    document.body.appendChild(el)
    const item = items(el)[0]!
    expect(item.textContent).toContain('正在开发中')
    expect(
      row(item).querySelector<HTMLElement>('[part="pending-text"]')!.hidden,
    ).toBe(true)
  })

  it('loading 节点：内容区 aria-busy，dot 渲染 spinner 钩子', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01" loading><p>同步中</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const item = items(el)[0]!
    const content = row(item).querySelector<HTMLElement>('[part="content"]')!
    expect(content.getAttribute('aria-busy')).toBe('true')
    const style = item.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/:host\(\[loading\]\)\s+\.dot/)
  })

  it('variant：dot 携带 data-variant（outlined 空心变体）', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item variant="outlined" type="success"><p>描边</p></oas-timeline-item>
      <oas-timeline-item><p>默认实心</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const dots = items(el).map((i) => row(i).querySelector('[part="dot"]')!)
    expect(dots[0]!.getAttribute('data-variant')).toBe('outlined')
    expect(dots[1]!.getAttribute('data-variant')).toBe('filled')
  })

  it('icon 属性：dot 内渲染 oas-icon', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item icon="check" type="success"><p>上传成功</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const dot = row(items(el)[0]!).querySelector('[part="dot"]')!
    const icon = dot.querySelector('oas-icon')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('name')).toBe('check')
  })

  it('dot 插槽：自定义节点替换默认圆点', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item>
        <span slot="dot" style="font-size: 14px">★</span>
        <p>自定义点</p>
      </oas-timeline-item>
    `
    document.body.appendChild(el)
    const dot = row(items(el)[0]!).querySelector<HTMLElement>('[part="dot"]')!
    expect(dot.hasAttribute('data-custom')).toBe(true)
    const slot = dot.querySelector<HTMLSlotElement>('slot[name="dot"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
  })

  it('title 插槽：标题行渲染且与正文分区', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-07-01">
        <span slot="title">v1.2.0 发布</span>
        <p>新增数据展示组件</p>
      </oas-timeline-item>
    `
    document.body.appendChild(el)
    const r = row(items(el)[0]!)
    const title = r.querySelector<HTMLElement>('[part="title"]')!
    expect(title.hidden).toBe(false)
    const titleSlot = title.querySelector<HTMLSlotElement>('slot[name="title"]')!
    expect(
      titleSlot.assignedNodes().some((n: Node) => (n.textContent ?? '').includes('v1.2.0')),
    ).toBe(true)
    expect(r.querySelector('[part="content"]')).not.toBeNull()
  })

  it('opposite 插槽：alternate 模式下分配对侧内容；单侧模式隐藏', () => {
    const el = new OASTimeline()
    el.setAttribute('mode', 'alternate')
    el.innerHTML = `
      <oas-timeline-item time="2024-07-01">
        <span slot="opposite">对侧标签</span>
        <p>交替内容</p>
      </oas-timeline-item>
    `
    document.body.appendChild(el)
    const item = items(el)[0]!
    const opp = row(item).querySelector<HTMLElement>('[part="opposite"]')!
    const slot = opp.querySelector<HTMLSlotElement>('slot[name="opposite"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
    expect(opp.hidden).toBe(false)

    const single = new OASTimeline()
    single.innerHTML = `
      <oas-timeline-item>
        <span slot="opposite">对侧</span>
        <p>内容</p>
      </oas-timeline-item>
    `
    document.body.appendChild(single)
    expect(row(items(single)[0]!).querySelector<HTMLElement>('[part="opposite"]')!.hidden).toBe(
      true,
    )
  })

  it('item 点击派发 oas-click（detail 带 index）', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
      <oas-timeline-item time="2024-02-01"><p>事件二</p></oas-timeline-item>
    `
    document.body.appendChild(el)
    const seen: number[] = []
    el.addEventListener('oas-click', (e: Event) => seen.push((e as CustomEvent).detail.index))
    const body = row(items(el)[1]!).querySelector<HTMLElement>('[part="body"]')!
    body.click()
    expect(seen).toEqual([1])
  })

  it('连接线规则：末条目断线、非末条目画线（CSS 钩子存在）', () => {
    const el = mount()
    const style = items(el)[0]!.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/:host\(:last-child\)\s+\.axis::after\s*\{[^}]*display:\s*none/)
    expect(style).toMatch(/\.axis::after\s*\{[^}]*background:\s*var\(--oas-color-border\)/)
  })

  it('locale：pending 默认文案随 setLocale 切换', () => {
    const el = new OASTimeline()
    el.innerHTML = `
      <oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    `
    document.body.appendChild(el)
    expect(row(items(el)[1]!).textContent).toContain('敬请期待')

    setLocale(en)
    expect(row(items(el)[1]!).textContent).toContain('Coming soon')

    setLocale('zh-CN')
    expect(row(items(el)[1]!).textContent).toContain('敬请期待')
  })

  it('水合接管：SSR 快照结构命中后跳过重建', () => {
    const el = new OASTimeline()
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-timeline" data-oas-ssr-v="1">' +
      '<style></style><div class="timeline" part="timeline"><slot></slot></div>'
    el.innerHTML = '<oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="timeline"]')!.querySelector('slot')).not.toBeNull()
    expect(items(el)[0]!.getAttribute('data-direction')).toBe('vertical')
  })
})
