import { OASElement, escapeText } from '@oas-ui/core'

export type PaginationSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const VALID_PAGINATION_SIZES: readonly PaginationSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 md 并在 dev 下 console.warn 一次（同值去重，对齐 button 做法） */
function normalizePaginationSize(raw: string): PaginationSize {
  if ((VALID_PAGINATION_SIZES as readonly string[]).includes(raw)) return raw as PaginationSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-pagination] 非法 size "${raw}"，已回落 md；合法值：xs/sm/md/lg/xl`)
  }
  return 'md'
}

/** pager-count 最小值：低于 5 的窗口无法同时容纳首尾各 2 页与当前页 */
const MIN_PAGER_COUNT = 5
const DEFAULT_PAGER_COUNT = 9
const warnedPagerCounts = new Set<string>()

/** 非法 pager-count 归一化：低于最小值 5 回落 5 并在 dev 下 console.warn 一次（同值去重） */
function normalizePagerCount(raw: string): number {
  const trimmed = raw.trim()
  const n = trimmed === '' ? DEFAULT_PAGER_COUNT : Number(trimmed)
  const value = Math.floor(Number.isFinite(n) ? n : DEFAULT_PAGER_COUNT)
  if (value >= MIN_PAGER_COUNT) return value
  if (!warnedPagerCounts.has(trimmed)) {
    warnedPagerCounts.add(trimmed)
    console.warn(
      `[oas-pagination] 非法 pager-count "${trimmed}"（低于最小值 ${MIN_PAGER_COUNT}），已回落 ${MIN_PAGER_COUNT}`,
    )
  }
  return MIN_PAGER_COUNT
}

/**
 * 页码序列：siblings 先算候选集，pager-count 再截断（截断优先）。
 * - 候选集 = {1, pageCount} ∪ [current-siblings, current+siblings]，间隙 > 1 插省略号
 * - |候选集| ≤ pager-count → 原样返回（向后兼容，不设 pager-count 时行为不变）
 * - 超过上限 → 按当前页居中收缩窗口：固定保留 {1, 2} 与 {pageCount-1, pageCount}
 *   （省略号两端至少留 2 页，首尾页可达），窗口大小 = pager-count - 4，
 *   夹取到 [2, pageCount-1] 并始终含当前页，保证渲染页码数 ≤ pager-count
 */
function buildPages(
  current: number,
  pageCount: number,
  siblings: number,
  pagerCount: number,
): number[] {
  const candidate = new Set<number>()
  candidate.add(1)
  candidate.add(pageCount)
  for (
    let i = Math.max(2, current - siblings);
    i <= Math.min(pageCount - 1, current + siblings);
    i++
  ) {
    candidate.add(i)
  }
  if (candidate.size <= pagerCount) return [...candidate].sort((a, b) => a - b)
  const windowSize = Math.max(1, pagerCount - 4)
  let start = current - Math.floor(windowSize / 2)
  let end = start + windowSize - 1
  if (start < 2) {
    start = 2
    end = Math.min(pageCount - 1, start + windowSize - 1)
  }
  if (end > pageCount - 1) {
    end = pageCount - 1
    start = Math.max(2, end - windowSize + 1)
  }
  const shown = new Set<number>([1, 2, current, pageCount - 1, pageCount])
  for (let i = start; i <= end; i++) shown.add(i)
  return [...shown].sort((a, b) => a - b)
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* size 档位：默认 md；data-size 由 update() 写入归一化结果（含非法回落与 config-provider 注入） */
  --oas-pagination-height: var(--oas-control-height-md);
  --oas-pagination-font: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
:host([data-size='xs']) {
  --oas-pagination-height: var(--oas-control-height-xs);
  --oas-pagination-font: var(--oas-font-size-xs);
}
:host([data-size='sm']) {
  --oas-pagination-height: var(--oas-control-height-sm);
  --oas-pagination-font: var(--oas-font-size-sm);
}
:host([data-size='lg']) {
  --oas-pagination-height: var(--oas-control-height-lg);
  --oas-pagination-font: var(--oas-font-size-lg);
}
:host([data-size='xl']) {
  --oas-pagination-height: var(--oas-control-height-xl);
  --oas-pagination-font: var(--oas-font-size-xl);
}
.group {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.btn {
  min-width: var(--oas-pagination-height);
  height: var(--oas-pagination-height);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-pagination-font);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  padding: 0 var(--oas-space-1);
  /* 链接/禁用降级 span 复用按钮盒模型：内联 flex 居中 + 去下划线（a 默认有） */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  text-decoration: none;
}
.btn:hover:not(:disabled):not([aria-disabled='true']):not([aria-current='true']) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.btn:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
.btn:disabled,
.btn[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.4;
}
.btn[aria-current='true'],
.btn[aria-current='page'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.ellipsis-btn {
  color: var(--oas-color-text-secondary);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-pagination-font);
}
/* show-more 总数未知形态的「更多」状态指示钮：盒模型对齐页码钮，文字弱化（次级色），
   disabled 由 .btn:disabled 透明度进一步弱化；始终不可点不可聚焦 */
.more-btn {
  color: var(--oas-color-text-secondary);
}
.simple {
  color: var(--oas-color-text-primary);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-pagination-font);
  white-space: nowrap;
}
.total {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-pagination-font);
  white-space: nowrap;
}
.size-select {
  height: var(--oas-pagination-height);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-pagination-font);
  font-family: inherit;
  padding: 0 var(--oas-space-1);
  cursor: pointer;
}
.size-select:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
  border-color: var(--oas-color-primary);
}
.size-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.jumper {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-pagination-font);
  white-space: nowrap;
}
.jumper-input {
  width: var(--oas-pagination-height);
  height: var(--oas-pagination-height);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-pagination-font);
  font-family: inherit;
  text-align: center;
  padding: 0;
}
.jumper-input:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
  border-color: var(--oas-color-primary);
}
.jumper-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
`

/** responsive 断点：组件宽度 < 640px 时自动按 simple 形态渲染 */
const RESPONSIVE_BREAKPOINT = 640

export class OASPagination extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'total',
      'page-size',
      'current',
      'siblings',
      'pager-count',
      'show-total',
      'page-sizes',
      'show-jumper',
      'disabled',
      'size',
      'simple',
      'show-edges',
      'hide-on-single',
      'href-template',
      'target',
      'responsive',
      'show-more',
      'total-boundary',
    ]
  }

  /** responsive：容器宽度监听（清理走 onCleanup，断连后 update 幂等重建） */
  private resizeObserver: ResizeObserver | null = null
  /** responsive：容器是否窄于断点（clientWidth>0 且 <640；0=未布局/SSR 不误判） */
  private narrow = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group" role="navigation" aria-label=""></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；按钮事件在 update 重建时绑定） */
  private bind(): void {}

  /** responsive：容器宽度变化重算窄态（<640 自动切 simple）；清理走 onCleanup */
  private syncResponsive(): void {
    if (this.hasRendered) this.runUpdateAndNotify()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const group = this.shadow.querySelector('.group')
    if (!group) return
    // 全局禁用（config-provider 注入：组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    // size 就近读取注入值（自身属性 > config-provider > md），非法回落 md 并告警；
    // 归一化结果写入 data-size，供 CSS 尺寸规则匹配（含 provider 注入场景）
    const size = normalizePaginationSize(this.injectValue('size', 'md'))
    this.setAttribute('data-size', size)
    // rawTotal 保留原始值（≤0 表示总数未知，供 show-more / total-boundary 判定）；
    // total 夹取到 ≥1 维持既有分页计算语义（单页渲染不受影响）
    const rawTotal = Number(this.getAttr('total', '0')) || 0
    const total = Math.max(1, rawTotal)
    const pageSize = Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const current = Math.min(Math.max(Number(this.getAttr('current', '1')) || 1, 1), pageCount)
    const siblings = Number(this.getAttr('siblings', '1')) || 1
    // pager-count：页码钮上限，低于最小值 5 回落 5 并告警（同值去重）；''/缺失取默认 9
    // （getAttr 第二实参用字面量 '9'，供 api:scan 提取 API 表默认值）
    const pagerCount = normalizePagerCount(this.getAttr('pager-count', '9'))
    // responsive：窄屏（<640）自动按 simple 形态渲染，与显式 simple 等效；宽度度量收敛到
    // update() 统一执行，RO 回调只负责触发重刷（clientWidth=0 未布局/SSR 不误判）
    const w = this.clientWidth
    this.narrow = w > 0 && w < RESPONSIVE_BREAKPOINT
    const simple = this.hasAttr('simple') || (this.hasAttr('responsive') && this.narrow)
    // 链接模式：href-template 含 {page} 占位符，页码/前后/首末钮渲染 <a>（模板替换）；
    // target 透传 a；disabled 时降级 span（不可点）
    const hrefTemplate = this.getAttr('href-template', '')
    const target = this.getAttr('target', '')

    // responsive：惰性建立 ResizeObserver（首次 update 时创建；断连清理后 update 幂等重建）
    if (this.hasAttr('responsive') && !this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncResponsive())
      this.resizeObserver.observe(this)
      this.onCleanup(() => {
        this.resizeObserver?.disconnect()
        this.resizeObserver = null
      })
    }

    // show-more：total≤0（总数未知）时的极简三钮形态（"上一页 / 更多 / 下一页"）。
    // 无总页数概念，故页码序列/省略号/总数/simple/首末页/跳转/条数切换全部不适用；
    // hide-on-single 同样不适用（未知总数不算单页）。total>0 时该属性无效，走正常渲染。
    const showMore = this.hasAttr('show-more') && rawTotal <= 0

    // hide-on-single：单页时不渲染（host hidden，宿主无感知；恢复多页时自动取消隐藏）；
    // show-more 形态下不适用（无 pageCount 语义）
    if (this.hasAttr('hide-on-single') && !showMore && pageCount <= 1) {
      this.setAttribute('hidden', '')
      group.setAttribute('aria-label', this.t('pagination.nav'))
      group.innerHTML = ''
      return
    }
    this.removeAttribute('hidden')

    // 内置文案走 locale registry（setLocale 切换自动刷新）
    group.setAttribute('aria-label', this.t('pagination.nav'))
    group.innerHTML = ''
    // 导航钮工厂：链接模式（href-template）渲染 <a>；disabled/边界禁用降级 span（不可点）；
    // 默认渲染 button。事件统一由 goto 处理（链接模式在 before-change veto 时阻止原生导航）
    const nav = (
      label: string,
      part: string,
      ariaLabel: string,
      boundaryDisabled: boolean,
      targetPage: number,
      slotMarkup?: string,
    ): HTMLElement => {
      const bDisabled = disabled || boundaryDisabled
      const fill = (el: HTMLElement): void => {
        if (slotMarkup !== undefined) {
          // 命名插槽：宿主提供内容时替换默认箭头（受控常量，非用户数据）
          el.innerHTML = slotMarkup
        } else if (part === 'page') {
          this.renderPageContent(el, targetPage)
        } else {
          el.textContent = label
        }
      }
      if (hrefTemplate !== '' && !bDisabled) {
        const a = document.createElement('a')
        a.className = 'btn'
        a.setAttribute('part', part)
        a.href = this.renderHref(hrefTemplate, targetPage)
        if (target !== '') a.setAttribute('target', target)
        a.setAttribute('aria-label', ariaLabel)
        fill(a)
        a.addEventListener('click', (e) => this.onLinkClick(e as MouseEvent, targetPage))
        return a
      }
      if (hrefTemplate !== '' && bDisabled) {
        // 链接模式降级 span：不可聚焦不可点，aria-disabled 同步语义（全局/边界禁用均走此路径）
        const s = document.createElement('span')
        s.className = 'btn'
        s.setAttribute('part', part)
        s.setAttribute('aria-disabled', 'true')
        s.setAttribute('aria-label', ariaLabel)
        fill(s)
        return s
      }
      const b = document.createElement('button')
      b.className = 'btn'
      b.setAttribute('part', part)
      b.type = 'button'
      b.setAttribute('aria-label', ariaLabel)
      b.disabled = bDisabled
      if (bDisabled) b.setAttribute('aria-disabled', 'true')
      fill(b)
      b.addEventListener('click', () => this.goto(targetPage))
      return b
    }

    // show-more 总数未知形态：prev / 更多（不可点状态指示）/ next 三钮。
    // current 无上界（无总页数概念），仅保证 ≥1；prev 在首页禁用避免减到 0，
    // next 始终可点（current+1 无上限）。href-template 链接模式对 prev/next 同样生效。
    if (showMore) {
      const current = Math.max(1, Number(this.getAttr('current', '1')) || 1)
      group.appendChild(
        nav(
          '‹',
          'prev',
          this.t('pagination.prev'),
          current <= 1,
          current - 1,
          '<slot name="prev-icon">‹</slot>',
        ),
      )
      const moreBtn = document.createElement('button')
      moreBtn.className = 'btn more-btn'
      moreBtn.setAttribute('part', 'more')
      moreBtn.type = 'button'
      moreBtn.disabled = true
      moreBtn.setAttribute('aria-disabled', 'true')
      moreBtn.textContent = this.t('pagination.more')
      group.appendChild(moreBtn)
      group.appendChild(
        nav(
          '›',
          'next',
          this.t('pagination.next'),
          false,
          current + 1,
          '<slot name="next-icon">›</slot>',
        ),
      )
      return
    }

    // 总条数文案：show-total 布尔或 total 插槽内容任一开启时渲染；
    // 插槽有内容时替换内置「共 N 条」文案，否则显示兜底文案
    const hasTotalSlot = this.querySelector('[slot="total"]') !== null
    if (this.hasAttr('show-total') || hasTotalSlot) {
      const totalSpan = document.createElement('span')
      totalSpan.className = 'total'
      totalSpan.setAttribute('part', 'total')
      totalSpan.innerHTML = `<slot name="total">${escapeText(this.t('pagination.total', { total }))}</slot>`
      group.appendChild(totalSpan)
    }

    // 首/末页双箭头钮（show-edges，边界禁用；simple 极简形态不叠加）
    if (this.hasAttr('show-edges') && !simple) {
      group.appendChild(
        nav('«', 'first', this.t('pagination.first'), current === 1, 1),
      )
    }

    group.appendChild(
      nav(
        '‹',
        'prev',
        this.t('pagination.prev'),
        current === 1,
        current - 1,
        '<slot name="prev-icon">‹</slot>',
      ),
    )

    if (simple) {
      // 极简形态：‹ current/pageCount ›（与 siblings/省略算法互斥）
      const simpleEl = document.createElement('span')
      simpleEl.className = 'simple'
      simpleEl.setAttribute('part', 'simple')
      simpleEl.textContent = `${current} / ${pageCount}`
      group.appendChild(simpleEl)
    } else {
      const pageNumbers = buildPages(current, pageCount, siblings, pagerCount)
      let last = 0
      for (const page of pageNumbers) {
        if (page - last > 1) {
          // 省略号可点跳页：向该侧跳 siblings+1 页（边界夹取 [1, pageCount]，受 before-change 拦截）
          const backward = last < current
          const jump = backward
            ? Math.max(1, current - siblings - 1)
            : Math.min(pageCount, current + siblings + 1)
          const ell = nav(
            '…',
            'ellipsis',
            this.t(backward ? 'pagination.jumpBackward' : 'pagination.jumpForward'),
            false,
            jump,
          )
          ell.classList.add('ellipsis-btn')
          group.appendChild(ell)
        }
        const p = nav(String(page), 'page', this.t('pagination.page', { page }), false, page)
        // 当前页标记：链接模式用 aria-current="page"，按钮模式沿用 'true'/'false'
        p.setAttribute(
          'aria-current',
          page === current ? (hrefTemplate !== '' ? 'page' : 'true') : 'false',
        )
        group.appendChild(p)
        last = page
      }
    }

    group.appendChild(
      nav(
        '›',
        'next',
        this.t('pagination.next'),
        current === pageCount,
        current + 1,
        '<slot name="next-icon">›</slot>',
      ),
    )

    if (this.hasAttr('show-edges') && !simple) {
      group.appendChild(
        nav('»', 'last', this.t('pagination.last'), current === pageCount, pageCount),
      )
    }

    // 每页条数下拉
    const sizes = this.parseSizes(this.getAttr('page-sizes', ''))
    // total-boundary：设置后仅 total > 阈值才渲染条数切换器（total ≤ 阈值隐藏）；
    // 未设置时维持现状（有 page-sizes 即显示，零回归）；非法值（非数字）忽略
    const boundaryRaw = Number(this.getAttr('total-boundary', ''))
    const totalBoundary =
      this.hasAttr('total-boundary') && Number.isFinite(boundaryRaw) ? boundaryRaw : null
    if (sizes.length > 0 && (totalBoundary === null || rawTotal > totalBoundary)) {
      const options = new Set(sizes)
      options.add(pageSize)
      const select = document.createElement('select')
      select.className = 'size-select'
      select.setAttribute('part', 'size')
      select.setAttribute('aria-label', this.t('pagination.sizes'))
      select.disabled = disabled
      if (disabled) select.setAttribute('aria-disabled', 'true')
      for (const sizeOption of [...options].sort((a, b) => a - b)) {
        const opt = document.createElement('option')
        opt.value = String(sizeOption)
        opt.textContent = this.t('pagination.sizePerPage', { size: sizeOption })
        select.appendChild(opt)
      }
      select.value = String(pageSize)
      select.addEventListener('change', () => {
        const next = Number(select.value)
        if (next > 0 && next !== pageSize) this.changePageSize(next)
      })
      group.appendChild(select)
    }

    // 快速跳转
    if (this.hasAttr('show-jumper')) {
      const jumper = document.createElement('span')
      jumper.className = 'jumper'
      jumper.setAttribute('part', 'jumper')
      const pre = document.createElement('span')
      pre.textContent = this.t('pagination.goto')
      const input = document.createElement('input')
      input.className = 'jumper-input'
      input.type = 'text'
      input.inputMode = 'numeric'
      input.autocomplete = 'off'
      input.setAttribute('aria-label', this.t('pagination.jumperInput'))
      input.disabled = disabled
      if (disabled) input.setAttribute('aria-disabled', 'true')
      const post = document.createElement('span')
      post.textContent = this.t('pagination.pageClassifier')
      jumper.append(pre, input, post)
      input.addEventListener('keydown', (e) => this.onJumperKeydown(e as KeyboardEvent, input))
      group.appendChild(jumper)
    }
  }

  /** 翻页/跳转前的统一拦截点：oas-before-change（cancelable），宿主 preventDefault 可 veto。
   *  返回是否放行，供链接模式在 veto 时同步 preventDefault 原生导航 */
  private goto(page: number): boolean {
    if (this.injectDisabled()) return false
    if (!this.emit('before-change', { page }, { cancelable: true })) return false
    this.setAttribute('current', String(page))
    this.emit('change', { page })
    this.update()
    return true
  }

  /** 链接模式点击：修饰键/非左键（中键/右键/新标签）交给浏览器原生处理；
   *  oas-before-change 被 veto 时 preventDefault 阻止原生导航（oas-click 语义不变） */
  private onLinkClick(e: MouseEvent, page: number): void {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    if (!this.goto(page)) e.preventDefault()
  }

  /** href 模板替换：{page} → 目标页码（split/join，避免 replace 正则特殊字符问题） */
  private renderHref(template: string, page: number): string {
    return template.split('{page}').join(String(page))
  }

  /** page-item 插槽：克隆宿主模板并为每个页码钮替换 {page}（仅 textContent，防注入）；
   *  未提供插槽时回退纯页码数字。prev/next/首尾钮不受影响 */
  private renderPageContent(button: HTMLElement, page: number): void {
    const source = this.querySelector('[slot="page-item"]')
    if (!source) {
      button.textContent = String(page)
      return
    }
    const clone = source.cloneNode(true)
    if (clone instanceof HTMLElement) {
      // 宿主用 hidden 隐藏模板本体，克隆进按钮时必须剥离（否则页码内容不可见）
      clone.removeAttribute('hidden')
      clone.removeAttribute('slot')
    }
    this.replacePagePlaceholder(clone, page)
    button.appendChild(clone)
  }

  /** 递归遍历文本节点替换 {page}（只写 textContent，不解析 HTML，杜绝注入） */
  private replacePagePlaceholder(root: Node, page: number): void {
    const replace = (node: Node): void => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.textContent?.includes('{page}')) {
            child.textContent = child.textContent.split('{page}').join(String(page))
          }
        } else {
          replace(child)
        }
      }
    }
    replace(root)
  }

  /** 切换每页条数：回到第 1 页并派发 { page: 1, pageSize }（不派发 before-change） */
  private changePageSize(pageSize: number): void {
    if (this.injectDisabled()) return
    this.setAttribute('page-size', String(pageSize))
    this.setAttribute('current', '1')
    this.emit('change', { page: 1, pageSize })
    this.update()
  }

  /** 快速跳转：越界夹取到 [1, pageCount]，派发 { page, pageSize } */
  private jumpTo(pageInput: number, pageSize: number): void {
    if (this.injectDisabled()) return
    const total = Math.max(1, Number(this.getAttr('total', '0')) || 0)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(pageInput, 1), pageCount)
    if (!this.emit('before-change', { page }, { cancelable: true })) return
    this.setAttribute('current', String(page))
    this.emit('change', { page, pageSize })
    this.update()
  }

  private onJumperKeydown(e: KeyboardEvent, input: HTMLInputElement): void {
    if (e.key !== 'Enter') return
    const text = input.value.trim()
    if (text === '') return
    const raw = Number(text)
    if (!Number.isFinite(raw)) return
    const pageSize = Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    input.value = ''
    this.jumpTo(Math.floor(raw), pageSize)
  }

  /** 解析 page-sizes JSON 数组属性，非法/非数组返回空数组 */
  private parseSizes(raw: string): number[] {
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
    } catch {
      return []
    }
  }
}
