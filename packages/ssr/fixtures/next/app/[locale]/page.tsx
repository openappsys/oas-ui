import { notFound } from 'next/navigation'
import { ensureFixtureLocales, renderOptionsFor, resolveRequestLocale } from '../../lib/locale'
import { loadSsr } from '../../lib/ssr-runtime'

// 每个请求都真实执行 renderToString：禁止构建期静态化/请求缓存（locale 是请求局部状态）。
export const dynamic = 'force-dynamic'

const TABLE_COLUMNS = String(
  JSON.stringify([
    { key: 'name', title: 'Name' },
    { key: 'status', title: 'Status' },
  ]),
)

const SELECT_OPTIONS = JSON.stringify([
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
])

const TOOL_ATTRS = {
  name: 'search_docs',
  summary: 'Search the API reference',
  status: 'success',
  args: '{"query":"oas-ui"}',
  result: '{"hits":3}',
}

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ theme?: string }>
}

export async function generateMetadata({ params }: Pick<PageProps, 'params'>) {
  const { locale } = await params
  return { title: `OAS-UI · Next.js · ${locale}` }
}

/**
 * DSD 快照经 `dangerouslySetInnerHTML` 进 RSC 输出流：浏览器 HTML 解析器在首屏解析时
 * 附加 shadow root（禁 JS 可见）；客户端注册后按快照指纹水合，不重建 shadow root。
 */
function Dsd({ html }: { html: string }) {
  return <div className="oas-ssr" dangerouslySetInnerHTML={{ __html: html }} />
}

export default async function LocalePage({ params, searchParams }: PageProps) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams])
  const resolved = resolveRequestLocale(raw)
  if (!resolved) notFound()
  const { request, render, dir } = resolved
  const theme = query.theme === 'dark' ? 'dark' : 'light'
  await ensureFixtureLocales()
  const opts = renderOptionsFor(render)
  const { renderToString } = await loadSsr()

  // 同一请求内并发生成 4 个快照：证明 locale 是请求局部状态（无全局锁、无串语言）
  const [empty, table, select, tool] = await Promise.all([
    renderToString('oas-empty', {}, '', opts),
    renderToString('oas-table', { columns: TABLE_COLUMNS, data: '[]', bordered: 'true' }, '', opts),
    renderToString('oas-select', { options: SELECT_OPTIONS, 'aria-label': 'select' }, '', opts),
    renderToString('oas-tool-call', TOOL_ATTRS, '', opts),
  ])

  return (
    <main className="page" data-locale={render} data-request-locale={request} data-theme={theme} dir={dir}>
      <header className="hero">
        <p className="eyebrow">OAS-UI · Next.js App Router · production build</p>
        <h1>Server-rendered Web Components</h1>
        <p className="lede">
          Each request renders Declarative Shadow DOM with a request-scoped locale. With JavaScript disabled the
          snapshot below is complete; with JavaScript enabled the same shadow roots are hydrated in place.
        </p>
        <nav className="locales" aria-label="Locale requests">
          <a data-nav="zh-CN" href="/zh-CN" aria-current={request === 'zh-CN' ? 'true' : undefined}>
            zh-CN
          </a>
          <a data-nav="en-US" href="/en-US" aria-current={request === 'en-US' ? 'true' : undefined}>
            en-US
          </a>
          <a data-nav="ar" href="/ar" aria-current={request === 'ar' ? 'true' : undefined}>
            ar
          </a>
        </nav>
      </header>

      <oas-config-provider locale={render}>
        <div className="grid">
          <section className="case" data-case="empty">
            <h2>oas-empty</h2>
            <p>Default description comes from the request locale.</p>
            <Dsd html={empty} />
          </section>

          <section className="case" data-case="table">
            <h2>oas-table</h2>
            <p>Empty data set keeps the header and localized empty state.</p>
            <Dsd html={table} />
          </section>

          <section className="case" data-case="select">
            <h2>oas-select</h2>
            <p>Placeholder text is resolved through the component i18n catalog.</p>
            <Dsd html={select} />
          </section>

          <section className="case" data-case="tool">
            <h2>oas-tool-call</h2>
            <p>Click the header to expand. Each click dispatches exactly one oas-toggle event.</p>
            <Dsd html={tool} />
            <p className="tool-hint">Hydrated interaction · one event per click</p>
          </section>
        </div>
      </oas-config-provider>
    </main>
  )
}
