# LoadingBar

A global loading progress bar at the top (or bottom) of the page, driven by an imperative API. Multiple `start` calls count concurrent sessions — only the last `finish`/`error` closes the bar. Supports incremental control, local containers, reverse/RTL, and lifecycle events.

## Basic usage

<DemoBlock title="Start & finish">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 2000)">Start loading</oas-button>
    <oas-button onclick="loadingBar.finish()">Finish now</oas-button>
  </oas-space>
  <p>Active sessions: <code id="lb-active">false</code></p>
</DemoBlock>

`loadingBar.start()` auto-advances the progress (asymptotically approaching 90%); `finish()` fills the bar and fades it out.

## Error state

<DemoBlock title="Error & fallback">
  <oas-space>
    <oas-button type="danger" onclick="loadingBar.start(); setTimeout(() => loadingBar.error(), 2000)">Simulate load failure</oas-button>
    <oas-button type="danger" onclick="loadingBar.error()">Error without start</oas-button>
  </oas-space>
</DemoBlock>

Calling `error()` without a prior `start` is a fallback scenario: it skips the loading phase and closes directly in the error state (red + fade-out), so failures stay visible without flicker. Any `error()` in a batch decides the final state.

## Session counting

<DemoBlock title="Concurrent sessions">
  <oas-space>
    <oas-button type="primary" onclick="lbStart(1)">Start task A</oas-button>
    <oas-button type="primary" onclick="lbStart(1)">Start task B</oas-button>
    <oas-button onclick="loadingBar.finish()">Finish one task</oas-button>
  </oas-space>
  <p>Active sessions: <code id="lb-count">0</code></p>
</DemoBlock>

Multiple `start` calls are counted; the bar advances once. Each completed session calls `finish()` once — only the last one closes the bar. The active count is displayed live (query it with `loadingBar.getEl()?.sessions`).

## Position

<DemoBlock title="Top / bottom">
  <oas-space>
    <oas-button onclick="loadingBar.start()">Top (default)</oas-button>
    <oas-button onclick="loadingBar.start({ position: 'bottom' })">Bottom</oas-button>
  </oas-space>
</DemoBlock>

## Local container

<DemoBlock title="Local loading bar">
  <div id="lb-local-box" style="position: relative; height: 72px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); display: flex; align-items: flex-end">
    <oas-button type="primary" onclick="lbLocal()" id="lb-local-btn">Load inside container</oas-button>
  </div>
</DemoBlock>

`to` mounts the bar into a specific container (element / selector / function); it is positioned relative to that container and does not affect the global bar. The container must be a positioning context (e.g. `position: relative`), otherwise `position: absolute` resolves against the nearest positioned ancestor.

## Incremental control

<DemoBlock title="Incremental control & speed">
  <oas-space>
    <oas-button type="primary" onclick="lbStartSpeed()" id="lb-inc-start">Start</oas-button>
    <oas-button onclick="loadingBar.increment(10)">Advance 10</oas-button>
    <oas-button onclick="loadingBar.set(60)">Set 60%</oas-button>
    <oas-button onclick="loadingBar.decrement(10)">Back 10</oas-button>
  </oas-space>
  <oas-space>
    <span>Advance speed:</span>
    <select onchange="lbPickSpeed(this.value)">
      <option value="100">Fast (100ms)</option>
      <option value="200" selected>Default (200ms)</option>
      <option value="500">Slow (500ms)</option>
      <option value="1000">Slower (1000ms)</option>
    </select>
  </oas-space>
  <p>Current progress: <code id="lb-progress">—</code></p>
</DemoBlock>

`increment`/`decrement` move the progress relatively (default random 0–10); `set` positions it exactly (clamped to 0–100). `start(speed)` or the `speed` attribute control the advance tick (ms per tick).

## Reverse & RTL

<DemoBlock title="Reverse / RTL">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start({ reverse: true })">Reverse</oas-button>
  </oas-space>
  <div id="lb-rtl-box" dir="rtl" style="position: relative; height: 72px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); display: flex; align-items: flex-end">
    <oas-button type="primary" onclick="lbRtl()">Load in RTL container</oas-button>
  </div>
</DemoBlock>

`reverse` grows the bar from the inline end; in RTL it grows from the inline start (right side) by default. Layout uses logical properties (`inset-inline-*` / `inset-block-*`) throughout.

## Lifecycle events

<DemoBlock title="Events & active state">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start()">Start</oas-button>
    <oas-button onclick="loadingBar.finish()">Finish</oas-button>
    <oas-button type="danger" onclick="loadingBar.error()">Error</oas-button>
  </oas-space>
  <p>Latest event: <code id="lb-log">—</code></p>
</DemoBlock>

Lifecycle events fire on the bar element (`oas-start` / `oas-finish` / `oas-error`, bubbles + composed, reachable from `document`). Query the active state with `loadingBar.active` / `isActive()`, or grab the element with `getEl()` to attach listeners.

## Clear

<DemoBlock title="Clear">
  <oas-space>
    <oas-button onclick="loadingBar.start()">Start</oas-button>
    <oas-button onclick="destroyAllLoadingBar()">Remove loading bar</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { loadingBar, destroyAllLoadingBar } = await import('@oas-ui/ui')
  window.loadingBar = loadingBar
  window.destroyAllLoadingBar = destroyAllLoadingBar

  window.lbLog = (msg) => {
    const el = document.getElementById('lb-log')
    if (el) el.textContent = msg
    const active = document.getElementById('lb-active')
    if (active) active.textContent = String(loadingBar.active)
  }
  // lifecycle events → event log + session count display
  for (const name of ['oas-start', 'oas-finish', 'oas-error']) {
    document.addEventListener(name, (e) => {
      const count = e.detail && e.detail.count
      const countEl = document.getElementById('lb-count')
      if (countEl) countEl.textContent = String(count ?? '')
      window.lbLog(`${name}${count !== undefined ? ` (${count} session(s) left)` : ''}`)
    })
  }

  window.lbProgress = () => {
    const el = loadingBar.getEl()
    const out = document.getElementById('lb-progress')
    if (!out) return
    const track = el && el.shadowRoot && el.shadowRoot.querySelector('[role="progressbar"]')
    out.textContent = track ? `${track.getAttribute('aria-valuenow')}%` : '—'
  }
  window.lbStart = (n) => {
    for (let i = 0; i < n; i++) loadingBar.start()
  }
  // poll the session count (finish/error mid-batch decrement without an event)
  window.lbSyncCount = () => {
    const countEl = document.getElementById('lb-count')
    if (countEl) countEl.textContent = String(loadingBar.getEl()?.sessions ?? 0)
  }
  setInterval(window.lbSyncCount, 200)
  window.lbLocal = () => {
    loadingBar.start({ to: document.getElementById('lb-local-box') })
  }
  window.lbRtl = () => {
    loadingBar.start({ to: document.getElementById('lb-rtl-box') })
  }
  let lbSpeed = 200
  window.lbPickSpeed = (v) => {
    lbSpeed = Number(v)
    const el = loadingBar.getEl()
    if (el) el.setAttribute('speed', String(lbSpeed))
  }
  window.lbStartSpeed = () => {
    loadingBar.start({ speed: lbSpeed })
    window.lbProgress()
  }
  for (const fn of ['increment', 'set', 'decrement']) {
    const orig = loadingBar[fn].bind(loadingBar)
    loadingBar[fn] = (...args) => {
      orig(...args)
      window.lbProgress()
    }
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `loadingBar.start(options?)` | Start loading; returns a `{ el }` handle. Concurrent `start` calls are counted. `options`: `speed` (tick ms), `to` (container: element / selector / function), `position` (`top`/`bottom`), `reverse` |
| `loadingBar.finish(target?)` | Finish one session; only the last one closes the bar |
| `loadingBar.error(target?)` | Close with an error; without a prior `start` it still closes in the error state (no flicker) |
| `loadingBar.increment(step?, target?)` | Advance the progress (default random 0–10, clamped 0–100) |
| `loadingBar.set(percent, target?)` | Set the progress exactly (clamped 0–100) |
| `loadingBar.decrement(step?, target?)` | Move the progress back (default random 0–10, clamped 0–100) |
| `loadingBar.active` | Whether the default host has an active session |
| `loadingBar.isActive(target?)` | Whether the given container has an active session |
| `loadingBar.getEl(target?)` | Get the bar element (attach lifecycle listeners); `null` if not started |
| `destroyAllLoadingBar()` | Remove all loading bars (across containers) |

`target` is a container element / CSS selector / function returning an element; it defaults to the nearest `oas-app` host or `body`.

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `local` | — | — | — |
| `position` | — | — | — |
| `reverse` | — | — | — |
| `speed` | — | `string` | `200` |
| `status` | — | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-error` | — |
| `oas-finish` | — |
| `oas-start` | — |

The bar uses `role="progressbar"` with progress synced via `aria-valuenow` and the active state via `aria-busy`.
