/**
 * DSD 页面构造（在独立 worker 线程里执行）。
 *
 * 为什么必须在独立线程：`@oas-ui/ssr` 首次渲染会把 happy-dom 的 `window` / `document` /
 * `HTMLElement` 等安装到 `globalThis`（组件类求值需要）。若与 Nuxt 的 Vue SSR 同进程，
 * 后续 Vue 页面会误判运行在浏览器（实测 `/vue` 在 DSD 请求之后 500：`history is not defined`）。
 * 独立 worker 的 globalThis 隔离，两个渲染栈可共存；worker 常驻 → 模块/标签缓存复用，
 * 同一进程内后续请求为热路径。
 */
import { renderToString } from '@oas-ui/ssr'
import { THEME_CSS } from './theme-css.generated.mjs'

export const REQUEST_LOCALES = ['zh-CN', 'en-US', 'ar']

const LOCALES = {
  'zh-CN': { render: 'zh-CN', dir: 'ltr', label: 'zh-CN' },
  'en-US': { render: 'en', dir: 'ltr', label: 'en-US' },
  ar: { render: 'ar', dir: 'rtl', label: 'ar' },
}

export function resolveRequestLocale(input) {
  return Object.prototype.hasOwnProperty.call(LOCALES, input) ? input : null
}

const TABLE_COLUMNS = JSON.stringify([
  { key: 'name', title: 'Name' },
  { key: 'status', title: 'Status' },
])

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

/**
 * 显式 locale 直接交给渲染器：`RenderToStringOptions.locale` 已内置官方语言名
 * （含 ar），渲染器按需装载并注册语言包，fixture 不再手工 bootstrap / registerLocale。
 */
function renderOptionsFor(locale) {
  return { locale }
}

const FIXTURE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.page { max-width: 1080px; margin: 0 auto; padding: 48px 24px 72px; }
.hero { margin: 0 0 32px; }
.eyebrow {
  margin: 0 0 8px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.hero h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 44px); line-height: 1.15; }
.lede { margin: 0 0 20px; max-width: 62ch; color: var(--oas-color-text-secondary); }
.locales { display: flex; flex-wrap: wrap; gap: 8px; }
.locales a {
  display: inline-flex; align-items: center; min-height: 32px; padding: 4px 12px;
  border: 1px solid var(--oas-color-border); border-radius: 999px; color: inherit;
  font-size: 13px; text-decoration: none; background: var(--oas-color-bg);
}
.locales a[aria-current='true'] { border-color: var(--oas-color-primary); color: var(--oas-color-primary-text); font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.case {
  min-width: 0; padding: 20px; border: 1px solid var(--oas-color-border);
  border-radius: 14px; background: var(--oas-color-bg);
}
.case h2 { margin: 0 0 4px; font-size: 15px; }
.case p { margin: 0 0 16px; font-size: 13px; color: var(--oas-color-text-secondary); }
.case .oas-ssr { display: block; }
.tool-hint { font-size: 12px; color: var(--oas-color-text-secondary); }
.vue-link { font-size: 13px; color: var(--oas-color-primary-text); }
`

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 生成完整 DSD 文档。4 个组件并发生成——同一请求内并发调用也必须各自语言正确
 * （locale 是请求局部临时 provider，无全局锁）。
 */
export async function buildDsdDocument({ requestLocale, theme = 'light' }) {
  const config = LOCALES[requestLocale]
  if (!config) throw new Error(`[nuxt-fixture] 未知 locale「${requestLocale}」`)
  const opts = renderOptionsFor(config.render)

  const [empty, table, select, tool] = await Promise.all([
    renderToString('oas-empty', {}, '', opts),
    renderToString('oas-table', { columns: TABLE_COLUMNS, data: '[]', bordered: 'true' }, '', opts),
    renderToString('oas-select', { options: SELECT_OPTIONS, 'aria-label': 'select' }, '', opts),
    renderToString('oas-tool-call', TOOL_ATTRS, '', opts),
  ])

  const nav = REQUEST_LOCALES.map((locale) => {
    const current = locale === requestLocale ? ' aria-current="true"' : ''
    return `<a data-nav="${escapeHtml(locale)}" href="/?locale=${encodeURIComponent(locale)}&amp;theme=${theme}"${current}>${escapeHtml(locale)}</a>`
  }).join('')

  return `<!doctype html>
<html lang="${escapeHtml(config.label)}" dir="${config.dir}" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OAS-UI · Nuxt fixture · ${escapeHtml(config.label)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='4' fill='%230b6cff'/%3E%3C/svg%3E">
<style>${THEME_CSS}</style>
<style>${FIXTURE_CSS}</style>
</head>
<body>
<main class="page" data-locale="${config.render}" data-request-locale="${escapeHtml(requestLocale)}" data-theme="${theme}" dir="${config.dir}">
  <header class="hero">
    <p class="eyebrow">OAS-UI · Nuxt 4 · Nitro SSR</p>
    <h1>Server-rendered Web Components</h1>
    <p class="lede">
      Declarative Shadow DOM straight from the Nitro response stream. No JavaScript is required to read this
      page; the module below only registers the components so the same shadow roots are hydrated in place.
    </p>
    <nav class="locales" aria-label="Locale requests">${nav}</nav>
    <p><a class="vue-link" href="/vue">Vue template page (Nuxt module isCustomElement)</a></p>
  </header>
  <div class="grid-wrap">
    <oas-config-provider locale="${config.render}">
      <div class="grid">
        <section class="case" data-case="empty">
          <h2>oas-empty</h2>
          <p>Default description comes from the request locale.</p>
          <div class="oas-ssr">${empty}</div>
        </section>
        <section class="case" data-case="table">
          <h2>oas-table</h2>
          <p>Empty data set keeps the header and localized empty state.</p>
          <div class="oas-ssr">${table}</div>
        </section>
        <section class="case" data-case="select">
          <h2>oas-select</h2>
          <p>Placeholder text is resolved through the component i18n catalog.</p>
          <div class="oas-ssr">${select}</div>
        </section>
        <section class="case" data-case="tool">
          <h2>oas-tool-call</h2>
          <p>Click the header to expand. Each click dispatches exactly one oas-toggle event.</p>
          <div class="oas-ssr">${tool}</div>
          <p class="tool-hint">Hydrated interaction · one event per click</p>
        </section>
      </div>
    </oas-config-provider>
  </div>
</main>
<script type="module" src="/vendor/oas-client.js"></script>
</body>
</html>`
}
