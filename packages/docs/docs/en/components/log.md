# Log

A monospace log display container that supports incremental appending and "stick-to-bottom" auto-scrolling, suitable for consoles / build output scenarios.

## Basic Usage

<DemoBlock title="Basic log stream">
  <oas-log id="log-basic" style="height: 280px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
</DemoBlock>

Provide data via the `lines` property (or the `lines` attribute as a JSON string); when appending, only the new lines are rendered incrementally — existing nodes are not rebuilt.

## Line Numbers

<DemoBlock title="Show line numbers">
  <oas-log id="log-number" line-number style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
</DemoBlock>

## Appending and Auto-Scroll

<DemoBlock title="Appending log stream (stick-to-bottom auto-scroll)">
  <oas-log id="log-stream" line-number style="height: 240px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Appends a log line every 1.2s; auto-scroll happens only when pinned to the bottom, and scrolling up to read history does not interrupt it.
  </p>
</DemoBlock>

## Disabling Auto-Scroll

<DemoBlock title="auto-scroll=false">
  <oas-log id="log-fixed" auto-scroll="false" style="height: 200px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    With <code>auto-scroll="false"</code>, appended content does not auto-scroll to the bottom.
  </p>
</DemoBlock>

## Empty State

<DemoBlock title="Empty log">
  <oas-log style="height: 200px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    An empty <code>lines</code> shows the empty-state placeholder; the copy follows the locale (overridable via <code>empty-text</code>).
  </p>
</DemoBlock>

<DemoBlock title="Custom empty text">
  <oas-log empty-text="No log output yet, waiting for the command to run…" style="height: 180px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>empty-text</code> overrides the default empty-state copy (default: "No logs yet").
  </p>
</DemoBlock>

## Loading History on Scroll-Up

<DemoBlock title="require-more pagination">
  <oas-log id="log-history" line-number offset-top="8" style="height: 240px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Scrolling to the top fires <code>oas-require-more</code> (detail <code>{ from: 'top' }</code>); after a simulated delay, 10 older lines are prepended (key-aligned reconcile — existing rows are not rebuilt), line numbers re-flow and the reading position is preserved.
  </p>
</DemoBlock>

## Line Highlight

<DemoBlock title="Keyword / regex highlight">
  <oas-log id="log-highlight" highlight='["ERROR", "WARN", {"pattern": "\\b5\\d\\d\\b"}]' style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The <code>highlight</code> JSON array: strings are literal keywords, <code>pattern</code> entries are regexes (escape backslashes as JSON, e.g. <code>\\d</code>); matches are wrapped in a mark span (token semantic background) and all text goes through textContent to prevent injection.
  </p>
</DemoBlock>

## Level Colors

<DemoBlock title="levels semantic colors">
  <oas-log id="log-levels" line-number levels='["info", "success", "warning", "error", "debug"]' style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The <code>levels</code> JSON array aligns with <code>lines</code> by index: info / success / warning / error map to token semantic colors (dark-theme aware), with aliases like warn / fatal; unknown levels are not colored.
  </p>
</DemoBlock>

## Loading and scrollTo

<DemoBlock title="loading + scrollTo()">
  <div style="width: 100%; display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-2)">
    <oas-button id="log-fetch-btn" size="small" type="primary">Fetch again</oas-button>
    <oas-button id="log-to-top" size="small">Back to top</oas-button>
    <oas-button id="log-to-bottom" size="small">Back to bottom</oas-button>
  </div>
  <oas-log id="log-methods" style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The <code>loading</code> attribute shows an overlay and syncs <code>aria-busy</code>; the <code>scrollTo('top' | 'bottom' | px)</code> method lets external buttons jump around.
  </p>
</DemoBlock>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// Demo timer handle: the component is destroyed on SPA route change, must clean up in onUnmounted
let streamTimer = null
const historyTimers = []

onUnmounted(() => {
  if (streamTimer) window.clearInterval(streamTimer)
  for (const t of historyTimers) window.clearTimeout(t)
})

onMounted(() => {
  // whenDefined guards against pre-upgrade expando shadowing the lines setter (lost assignment = empty log page)
  customElements.whenDefined('oas-log').then(() => {
  const basic = document.querySelector('#log-basic')
  if (basic) {
    basic.lines = [
      '$ pnpm dev',
      '> oas-ui@0.1.0 dev',
      '> vitepress dev docs --port 5175',
      '',
      '  vitepress v1.0.0',
      '  ➜ Local: http://localhost:5175/',
      '  ➜ Network: use --host to expose',
      '[debug] Components registered: oas-log / oas-masonry / oas-comment',
    ]
  }

  const numbered = document.querySelector('#log-number')
  if (numbered) {
    numbered.lines = Array.from({ length: 40 }, (_, i) => `task-${i + 1} done in ${(i % 9) + 1}ms`)
  }

  const stream = document.querySelector('#log-stream')
  if (stream) {
    const payload = [
      'GET /api/users 200 12ms',
      'GET /api/orders 200 8ms',
      'POST /api/session 201 15ms',
      'PUT /api/cart 204 6ms',
      'GET /api/products 200 21ms',
      'WARN Disk usage above 80%',
      'GET /api/reports 200 33ms',
    ]
    let i = 0
    stream.lines = Array.from({ length: 3 }, (_, k) => `[${new Date().toLocaleTimeString()}] Service starting… (line ${k + 1})`)
    streamTimer = window.setInterval(() => {
      const line = payload[i % payload.length]
      stream.lines = [...stream.lines, `[${new Date().toLocaleTimeString()}] ${line}`]
      i += 1
    }, 1200)
  }

  const fixed = document.querySelector('#log-fixed')
  if (fixed) {
    fixed.lines = Array.from({ length: 20 }, (_, i) => `fixed-line ${i + 1}`)
  }

  // require-more: reaching the top -> simulated delay -> prepend an older batch
  customElements.whenDefined('oas-log').then(() => {
    const history = document.querySelector('#log-history')
    if (history) {
      let oldest = 41
      history.lines = Array.from({ length: 40 }, (_, i) => `audit record ${oldest + i}, ok`)
      history.addEventListener('oas-require-more', (e) => {
        const from = e.detail && e.detail.from
        if (from !== 'top' || oldest <= 1 || history.hasAttribute('loading')) return
        history.setAttribute('loading', '')
        const timer = window.setTimeout(() => {
          const start = Math.max(1, oldest - 10)
          const batch = Array.from(
            { length: oldest - start },
            (_, i) => `audit record ${start + i}, ok`,
          )
          oldest = start
          history.lines = [...batch, ...history.lines]
          history.removeAttribute('loading')
        }, 400)
        historyTimers.push(timer)
      })
    }

    const highlight = document.querySelector('#log-highlight')
    if (highlight) {
      highlight.lines = [
        'INFO  service started, listening on :5175',
        'INFO  GET /api/users 200 12ms',
        'WARN  disk usage above 80%, please clean up',
        'ERROR database connection timed out, retry 1',
        'INFO  POST /api/orders 201 15ms',
        'ERROR database connection timed out, retry 2',
        'INFO  GET /api/products 200 21ms',
        'WARN  slow query: SELECT * FROM orders took 500ms',
        'INFO  scheduled gc finished',
      ]
    }

    const levels = document.querySelector('#log-levels')
    if (levels) {
      levels.lines = [
        'INFO  app starting…',
        'DEBUG loading config oas.config.ts',
        'INFO  database pool ready (10 connections)',
        'DEBUG cache warmed: 12 keys',
        'SUCCESS build finished in 3.2s',
        'WARN  dependency foo has a new version 2.0',
        'ERROR deploy node node-3 failed health check',
        'INFO  traffic switched to node-1/node-2',
      ]
    }

    // loading + scrollTo: simulate first fetch -> fill 50 lines -> external jump buttons
    const methods = document.querySelector('#log-methods')
    const fetchBtn = document.querySelector('#log-fetch-btn')
    if (methods) {
      methods.setAttribute('loading', '')
      const timer = window.setTimeout(() => {
        methods.lines = Array.from(
          { length: 50 },
          (_, i) => `[${String(i + 1).padStart(2, '0')}] build step ${i + 1} done`,
        )
        methods.removeAttribute('loading')
      }, 900)
      historyTimers.push(timer)
    }
    if (methods && fetchBtn) {
      fetchBtn.addEventListener('oas-click', () => {
        if (methods.hasAttribute('loading')) return
        methods.setAttribute('loading', '')
        const timer = window.setTimeout(() => {
          methods.lines = Array.from(
            { length: 50 },
            (_, i) => `[${String(i + 1).padStart(2, '0')}] refetch: step ${i + 1} done`,
          )
          methods.removeAttribute('loading')
        }, 900)
        historyTimers.push(timer)
      })
      document.querySelector('#log-to-top')?.addEventListener('oas-click', () => methods.scrollTo('top'))
      document
        .querySelector('#log-to-bottom')
        ?.addEventListener('oas-click', () => methods.scrollTo('bottom'))
    }
  })
  })
})
</script>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-log-font` (e.g. `18px`).

## Events and Methods

- `oas-require-more`: fired when scrolling into the top/bottom threshold zone (detail `{ from: 'top' | 'bottom' }`). Edge-triggered — no repeated firing while staying in the zone, reset after leaving; thresholds controlled by `offset-top` / `offset-bottom` (px).
- `scrollTo('top' | 'bottom' | number)`: scrolls the viewport to top / bottom / a pixel offset, for external "back to bottom" buttons.
- `loading`: overlay mask on the viewport, syncs `aria-busy`; copy follows the locale (`loading.loading`).
- `levels` / `highlight`: per-line level semantic colors / keyword·regex highlight channels (JSON attributes, see demos above).

When history lines are prepended, the reconcile aligns rows by content key: existing row nodes are reused, line numbers re-flow, and the viewport reading position is compensated automatically.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-scroll` | Auto-scroll to bottom on append (only when stuck to the bottom) | `string` | `true` |
| `empty-text` | Empty state text (overrides the locale default) | — | — |
| `highlight` | Line highlight rules (JSON array): string = literal keyword; `{ text }` / `{ pattern, flags }` = regex; matches are wrapped with a mark background (warning token) | `string` | — |
| `levels` | Line levels (JSON array, index-aligned with lines): info/success/warning/error (aliases like warn/fatal normalized), mapped to semantic color tokens | `string` | — |
| `line-number` | Show the left line number column | `boolean` | — |
| `lines` | Log lines JSON string (attribute channel) | `string[]` | `[]` |
| `loading` | Loading state (viewport overlay + spinner + aria-busy) | `boolean` | — |
| `offset-bottom` | Distance from the bottom that counts as reaching it (px, fires `oas-require-more` with from=bottom, default 0) | — | — |
| `offset-top` | Distance from the top that counts as reaching it (px, fires `oas-require-more` with from=top, default 0) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-require-more` | Fired once when scrolling enters the top/bottom threshold edge (not repeatedly while staying, re-arms after leaving), `detail: { from: "top" \| "bottom" }`; for loading history/new entries |

Parts: `::part(viewport)` scroll viewport, `::part(log)` log content, `::part(row)` a single row, `::part(line-number)` line number, `::part(line)` line text, `::part(empty)` empty state.
