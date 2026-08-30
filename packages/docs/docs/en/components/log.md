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

<script setup>
import { onMounted, onUnmounted } from 'vue'

// Demo timer handle: the component is destroyed on SPA route change, must clean up in onUnmounted
let streamTimer = null

onUnmounted(() => {
  if (streamTimer) window.clearInterval(streamTimer)
})

onMounted(() => {
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
})
</script>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-log-font` (e.g. `18px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-scroll` | Auto-scroll to bottom on append (only when stuck to the bottom) | `string` | `true` |
| `empty-text` | Empty state text (overrides the locale default) | — | — |
| `line-number` | Show the left line number column | `boolean` | — |
| `lines` | Log lines JSON string (attribute channel) | `string[]` | `[]` |

Parts: `::part(viewport)` scroll viewport, `::part(log)` log content, `::part(row)` a single row, `::part(line-number)` line number, `::part(line)` line text, `::part(empty)` empty state.
