import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASAttachment } from './index.js'

function mount(inner = '', attrs: Record<string, string> = {}): OASAttachment {
  const el = new OASAttachment()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

const STATES = ['idle', 'uploading', 'processing', 'error', 'done']

describe('OASAttachment', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 name 与 detail 文本（textContent 通道，无注入面）', () => {
    const el = mount('<span slot="actions"></span>', { name: 'report.pdf', detail: 'PDF · 2.4 MB' })
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('report.pdf')
    expect(el.shadowRoot!.querySelector('[part="description"]')!.textContent).toBe('PDF · 2.4 MB')
  })

  it('缺 name 只渲染 media 容器不报错（空态合法）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="media"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
  })

  it('state 全词表：uploading/processing 反射 aria-busy，其余不反射', () => {
    for (const state of STATES) {
      const el = mount('', { name: 'f.txt', state })
      if (state === 'uploading' || state === 'processing') {
        expect(el.hasAttribute('aria-busy'), `state=${state}`).toBe(true)
      } else {
        expect(el.hasAttribute('aria-busy'), `state=${state}`).toBe(false)
      }
      expect(el.getAttribute('data-state')).toBe(state)
    }
  })

  it('error 态：缺省 description 显示 locale 错误文案；显式 detail 保留宿主文案', () => {
    const a = mount('', { name: 'f.txt', state: 'error' })
    expect(a.shadowRoot!.querySelector('[part="description"]')!.textContent).toBe('上传失败')
    const b = mount('', { name: 'f.txt', state: 'error', detail: '磁盘已满' })
    expect(b.shadowRoot!.querySelector('[part="description"]')!.textContent).toBe('磁盘已满')
  })

  it('进行中态（uploading/processing）显示 spinner、终态不显示', () => {
    for (const state of STATES) {
      const el = mount('', { name: 'f.txt', state })
      const spin = el.shadowRoot!.querySelector('[part="spinner"]')!
      expect(spin.hasAttribute('hidden'), `state=${state}`).toBe(state !== 'uploading' && state !== 'processing')
    }
  })

  it('progress 越界 clamp 到 0–100，进度条仅在 uploading 态渲染', () => {
    const low = mount('', { name: 'f', state: 'uploading', progress: '-5' })
    expect(low.shadowRoot!.querySelector('[part="progress"]')!.getAttribute('aria-valuenow')).toBe('0')
    const high = mount('', { name: 'f', state: 'uploading', progress: '150' })
    expect(high.shadowRoot!.querySelector('[part="progress"]')!.getAttribute('aria-valuenow')).toBe('100')
    const mid = mount('', { name: 'f', state: 'uploading', progress: '42' })
    expect(mid.shadowRoot!.querySelector('[part="progress"]')!.getAttribute('aria-valuenow')).toBe('42')
    const done = mount('', { name: 'f', state: 'done', progress: '42' })
    expect(done.shadowRoot!.querySelector('[part="progress"]')).toBeNull()
  })

  it('size 三档 + 全库别名归一（small/sm、medium/md、非法回退 default）', () => {
    for (const [raw, want] of [
      ['', 'default'],
      ['default', 'default'],
      ['sm', 'sm'],
      ['small', 'sm'],
      ['xs', 'xs'],
      ['weird', 'default'],
    ] as const) {
      const el = mount('', { name: 'f', ...(raw ? { size: raw } : {}) })
      expect(el.getAttribute('data-size'), `size="${raw}"`).toBe(want)
    }
  })

  it('orientation=vertical 有 :host([orientation="vertical"]) 纵排规则（逻辑属性）', () => {
    const el = mount('', { name: 'f', orientation: 'vertical' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([orientation="vertical"])')
    expect(css).not.toMatch(/margin-left:|margin-right:|padding-left:|padding-right:/)
  })

  it('媒体：缺省渲染内置文件 svg（aria-hidden 装饰）；slot=media 即覆盖（无形态属性）', async () => {
    const el = mount('', { name: 'f' })
    const media = el.shadowRoot!.querySelector('[part="media"]')!
    expect(media.querySelector('svg')).not.toBeNull()
    const img = document.createElement('img')
    img.setAttribute('slot', 'media')
    img.src = 'data:image/png;base64,x'
    el.appendChild(img)
    await new Promise((r) => setTimeout(r, 0))
    expect(media.querySelector<HTMLSlotElement>('slot[name="media"]')!.assignedNodes()).toContain(img)
  })

  it('removable：删除按钮显形，点击派发 oas-remove；缺省隐藏（模板恒定，hidden 切换）', () => {
    const plain = mount('', { name: 'f' })
    expect(plain.shadowRoot!.querySelector('[part="remove"]')!.hasAttribute('hidden')).toBe(true)
    const el = mount('', { name: 'a.pdf', removable: '' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="remove"]')!
    expect(btn.hasAttribute('hidden')).toBe(false)
    let fired = 0
    el.addEventListener('oas-remove', () => fired++)
    btn.click()
    expect(fired).toBe(1)
  })

  it('removable/downloadable 运行时增删属性即时生效（observedAttributes 联动，非仅首帧）', () => {
    const el = mount('', { name: 'a.pdf' })
    const remove = el.shadowRoot!.querySelector<HTMLElement>('[part="remove"]')!
    const download = el.shadowRoot!.querySelector<HTMLElement>('[part="download"]')!
    expect(remove.hasAttribute('hidden')).toBe(true)
    expect(download.hasAttribute('hidden')).toBe(true)
    el.setAttribute('removable', '')
    el.setAttribute('downloadable', '')
    expect(remove.hasAttribute('hidden'), '运行时加 removable 应即时显形').toBe(false)
    expect(download.hasAttribute('hidden'), '运行时加 downloadable 应即时显形').toBe(false)
    el.removeAttribute('removable')
    el.removeAttribute('downloadable')
    expect(remove.hasAttribute('hidden'), '运行时移除应即时隐藏').toBe(true)
    expect(download.hasAttribute('hidden'), '运行时移除应即时隐藏').toBe(true)
  })

  it('删除/下载按钮 aria-label 含文件名（含目标，不只「删除」）', () => {
    const el = mount('', { name: 'sales.pdf', removable: '', downloadable: '' })
    expect(el.shadowRoot!.querySelector('[part="remove"]')!.getAttribute('aria-label')).toBe('移除 sales.pdf')
    expect(el.shadowRoot!.querySelector('[part="download"]')!.getAttribute('aria-label')).toBe('下载 sales.pdf')
  })

  it('downloadable：下载按钮出现，点击派发 oas-download（detail 带 name）', () => {
    const el = mount('', { name: 'a.pdf', downloadable: '' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="download"]')!
    let detail: unknown
    el.addEventListener('oas-download', (e) => {
      detail = (e as CustomEvent).detail
    })
    btn.click()
    expect(detail).toEqual({ name: 'a.pdf' })
  })

  it('href：触发器为 <a part="trigger">，点击派发 oas-open（detail 带 href）', () => {
    const el = mount('', { name: 'a.pdf', href: 'https://example.com/a.pdf' })
    const a = el.shadowRoot!.querySelector<HTMLAnchorElement>('a[part="trigger"]')!
    expect(a).not.toBeNull()
    expect(a.getAttribute('href')).toBe('https://example.com/a.pdf')
    let detail: unknown
    el.addEventListener('oas-open', (e) => {
      detail = (e as CustomEvent).detail
    })
    a.click()
    expect(detail).toEqual({ href: 'https://example.com/a.pdf' })
  })

  it('无 href 时触发器不是链接（div），点击不派发 oas-open', () => {
    const el = mount('', { name: 'a.pdf' })
    expect(el.shadowRoot!.querySelector('a[part="trigger"]')).toBeNull()
    let fired = 0
    el.addEventListener('oas-open', () => fired++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(fired).toBe(0)
  })

  it('断开重连后操作按钮事件仍生效（bind 幂等重入）', () => {
    const el = mount('', { name: 'a.pdf', removable: '' })
    el.remove()
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-remove', () => fired++)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="remove"]')!.click()
    expect(fired).toBe(1)
  })

  it('observedAttributes 覆盖全部公开属性', () => {
    for (const a of [
      'name',
      'detail',
      'state',
      'progress',
      'size',
      'orientation',
      'href',
      'removable',
      'downloadable',
    ]) {
      expect(OASAttachment.observedAttributes, `缺 ${a}`).toContain(a)
    }
    // media 已移除（此前是空转属性：文档有、组件不读——PRD 口径媒体形态由 slot 决定）
    expect(OASAttachment.observedAttributes, 'media 空转属性已移除').not.toContain('media')
  })

  it('oas-open cancelable：宿主 preventDefault 后组件返回 false 且阻断导航（click 同步 veto）', () => {
    const el = mount('', { name: 'a.pdf', href: 'https://example.com/a.pdf' })
    const a = el.shadowRoot!.querySelector<HTMLAnchorElement>('a[part="trigger"]')!
    const veto = (e: Event) => e.preventDefault()
    el.addEventListener('oas-open', veto)
    const click = new MouseEvent('click', { cancelable: true, bubbles: true, composed: true })
    a.dispatchEvent(click)
    expect(click.defaultPrevented, 'oas-open 被 veto → 组件同步阻断 <a> 默认导航').toBe(true)
    el.removeEventListener('oas-open', veto)
    const click2 = new MouseEvent('click', { cancelable: true, bubbles: true, composed: true })
    a.dispatchEvent(click2)
    expect(click2.defaultPrevented, '未被 veto → 浏览器接管导航（不阻断）').toBe(false)
  })

  it('DSD 真水合：SSR 快照结构命中时跳过重建（快照先于首连就位）', () => {
    const el = document.createElement('oas-attachment') as OASAttachment
    // DSD 场景：快照在元素连接前已存在于 shadow root（浏览器解析 <template shadowrootmode> 产物）
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-attachment"><div class="attachment" part="attachment"><div class="trigger" part="trigger"></div></div>'
    document.body.appendChild(el)
    // 水合成功：指纹被移除、骨架保留（未被 innerHTML 重建覆盖）
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="attachment"]')).not.toBeNull()
  })
})
