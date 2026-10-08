# MessageScroller

The conversation scroll container: a scroll-intent model — follow new content only when the reader is at the bottom (AI style), an always-pinned IM mode, a scroll-to-bottom button, and jump-free history prepending. The component owns no messages (only scroll behavior), so hosts can connect any backend.

> **Batch A scope**: pinning / jump-to-bottom / near-bottom detection / prepend position preservation. Turn anchoring (`last-anchor` opening position), visibility tracking, and first-paint jump prevention arrive with batch B — see boundary notes at the end.

## Basic Usage

<DemoBlock title="Conversation flow (default-position=end opens at the bottom)">
  <oas-message-scroller id="msc-basic" label="Support chat" style="height: 300px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
    <oas-marker variant="separator">Today 10:00</oas-marker>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">S</oas-avatar>
      <span slot="header">Support · 10:01</span>
      <oas-bubble>Hello! How can I help you today?</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">M</oas-avatar>
      <span slot="header">Me · 10:02</span>
      <oas-bubble variant="secondary">I'd like to learn how the message scroller works.</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">S</oas-avatar>
      <span slot="header">Support · 10:03</span>
      <oas-bubble>Scroll up for more history; new messages follow only while you stay at the bottom.</oas-bubble>
    </oas-message-row>
    <oas-marker>System: conversation encrypted</oas-marker>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">S</oas-avatar>
      <span slot="header">Support · 10:05</span>
      <oas-bubble>Anything else?</oas-bubble>
    </oas-message-row>
  </oas-message-scroller>
</DemoBlock>

Defaults to `default-position="end"`: opening lands at the bottom. The viewport is `role="region"` with an accessible name (locale "Messages" by default, override with `label`) and `tabindex="0"` (focus with Tab, scroll with arrow keys); the content container is `role="log"` + `aria-relevant="additions"` (screen readers announce only new rows).

## AI-style bottom follow (auto-scroll)

<DemoBlock title="auto-scroll: follow streaming output only while at the bottom">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-ai" auto-scroll edge-threshold="24" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <oas-message-row>
        <oas-bubble id="msc-ai-bubble">Write me a short poem about autumn.</oas-bubble>
      </oas-message-row>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="msc-ai-send" size="small" type="primary">Start streaming answer</oas-button>
      <span id="msc-ai-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scroll up first, then click — reading is never interrupted; following resumes at the bottom.</span>
    </div>
  </div>
</DemoBlock>

`auto-scroll` is the safe AI-assistant mode: it follows streaming growth **only while the reader is at the bottom** (near-bottom ≤ `edge-threshold`, 8px default); scrolled-up reading is never hijacked — "never move the reader against their intent". Content growth is sensed via slotchange + ResizeObserver (pure text growth without slotchange still follows).

## IM-style always pinned (pin-to-bottom)

<DemoBlock title="pin-to-bottom: always pulled back to the bottom">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-im" pin-to-bottom style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <oas-message-row><oas-bubble>IM group chat: every new message must land.</oas-bubble></oas-message-row>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-im-send" size="small" type="primary">Deliver a new message</oas-button>
      <span id="msc-im-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scroll up, then click — you get pulled back (typical support/IM reception).</span>
    </div>
  </div>
</DemoBlock>

`pin-to-bottom` switches to IM mode: new content always scrolls to the bottom, even pulling readers back. When both modes are set, `pin-to-bottom` wins.

## Jump button & state events

<DemoBlock title="Jump-to-bottom button + oas-scroll-state feedback">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-jump" style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <div style="display: flex; flex-direction: column; gap: var(--oas-space-3)">
        <p style="margin: 0">Filler 1 — once content overflows, the jump button appears at the bottom-right when you leave the bottom.</p>
        <p style="margin: 0">Filler 2</p>
        <p style="margin: 0">Filler 3</p>
        <p style="margin: 0">Filler 4</p>
        <p style="margin: 0">Filler 5</p>
        <p style="margin: 0">Filler 6 (very bottom)</p>
      </div>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-jump-top" size="small">scrollToStart()</oas-button>
      <oas-button id="msc-jump-bottom" size="small">scrollToEnd()</oas-button>
      <span id="msc-jump-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">oas-scroll-state shows here after scrolling.</span>
    </div>
  </div>
</DemoBlock>

The built-in jump button (`part="button"`, localized accessible name; customize via `slot="button"`) appears when off-bottom and scrollable downward; clicking scrolls to the bottom and it disappears. Crossing a decision line dispatches `oas-scroll-state` (detail `{ atBottom, atTop, canScrollStart, canScrollEnd }`) and reflects `data-scrollable="start end"` (for edge fades etc.). `scrollToEnd()/scrollToStart()` provide programmatic positioning (`behavior` accepts `'smooth'`).

## Load history on scroll-up (prepend position preservation)

<DemoBlock title="Prepending older messages keeps the reading position">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-history" default-position="start" preserve-scroll-on-prepend style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <span id="msc-history-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scroll to the top to load 5 older rows — the viewport stays put (scrollTop compensated on prepend).</span>
  </div>
</DemoBlock>

When older messages are prepended (first node changes), `preserve-scroll-on-prepend` (**on by default**, explicit `="false"` disables) compensates scrollTop by the scrollHeight delta so reading never jumps. Precise stable-`message-id` anchoring arrives with batch B — hosts should still give rows stable ids.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  const ai = document.querySelector('#msc-ai')
  const aiBubble = document.querySelector('#msc-ai-bubble')
  const aiHint = document.querySelector('#msc-ai-hint')
  document.querySelector('#msc-ai-send')?.addEventListener('click', async () => {
    ai?.scrollToEnd()
    const text = 'Sure: Autumn wind rises, leaves turn gold, a warm tea and pages of old; geese fly south, the night grows cold, short lines by lamp light, warmly told.'
    aiBubble.textContent = ''
    for (let i = 0; i < text.length; i++) {
      aiBubble.textContent += text[i]
      await delay(28)
    }
    aiHint.textContent = 'Done — it followed only at the bottom while streaming.'
  })

  document.querySelector('#msc-im-send')?.addEventListener('click', () => {
    const row = document.createElement('oas-message-row')
    row.setAttribute('align', 'end')
    const bubble = document.createElement('oas-bubble')
    bubble.setAttribute('variant', 'secondary')
    bubble.textContent = 'New message ' + new Date().toLocaleTimeString()
    row.appendChild(bubble)
    document.querySelector('#msc-im')?.appendChild(row)
  })

  const out = document.querySelector('#msc-jump-out')
  const jump = document.querySelector('#msc-jump')
  jump?.addEventListener('oas-scroll-state', (e) => {
    const d = e.detail
    out.textContent = `atBottom=${d.atBottom} atTop=${d.atTop}`
  })
  document.querySelector('#msc-jump-top')?.addEventListener('click', () => {
    jump?.scrollToStart()
  })
  document.querySelector('#msc-jump-bottom')?.addEventListener('click', () => {
    jump?.scrollToEnd()
  })

  const scroller = document.querySelector('#msc-history')
  let seq = 8
  // from→to ascending; on prepend, anchor the old firstChild and insert each row before it (keeps 9,10,… ascending)
  const addRows = (from, to, prepend = false) => {
    const anchor = prepend ? (scroller?.firstChild ?? null) : null
    for (let i = from; i <= to; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `History message #${i}`
      row.appendChild(bubble)
      if (!scroller) return
      if (prepend) scroller.insertBefore(row, anchor)
      else scroller.appendChild(row)
    }
  }
  addRows(1, 8)
  let loading = false
  // Native scroll events neither bubble nor compose: bind to the shadow .viewport (a host listener never fires).
  const bindHistoryLoader = () => {
    const vp = scroller?.shadowRoot?.querySelector('.viewport')
    if (!vp) {
      requestAnimationFrame(bindHistoryLoader)
      return
    }
    vp.addEventListener('scroll', () => {
      if (vp.scrollTop > 4 || loading) return
      loading = true
      window.setTimeout(() => {
        addRows(seq + 1, seq + 5, true)
        seq += 5
        loading = false
      }, 300)
    })
  }
  bindHistoryLoader()
})
</script>

## Boundaries & batch B preview

- **Turn anchoring / `last-anchor` opening position / first-paint jump prevention (`data-pending-scroll`) / visibility tracking**: batch B; this batch supports `default-position` of `start`/`end` only.
- **Virtualization & render cost**: offscreen-row render skipping (`content-visibility` etc.) arrives with batch B virtualization (enabling it alone on slotted elements stalls at the intrinsic-size placeholder — verified and pulled); multi-thousand-turn conversations compose with a virtual list on the host side.
- **Empty state**: renders an empty log; hosts place their own empty-state content.
- **Known boundary of prepend preservation**: the compensation settles once per top insertion (slotchange) by the height delta; async resources inside history messages (images etc.) that grow the upper content after insertion are not tracked in this batch (the reading position gets pushed) — precise anchoring (stable `message-id` row alignment) arrives with batch B; for media-heavy histories, reserve placeholder sizes for images.
- `label` is absorbed into the viewport accessible name and removed from the host (global-attribute absorption convention).

## API

### oas-message-scroller

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-scroll` | AI-style bottom follow (boolean presence, off by default): follows streaming growth only while the reader is at the bottom (near-bottom ≤ edge-threshold); scrolled-up reading is never interrupted | `boolean` | — |
| `default-position` | Opening position: start (top) / end (bottom, default; invalid values fall back to end); last-anchor arrives with batch B anchoring | — | — |
| `edge-threshold` | Bottom detection threshold in px (default 8) — within the threshold of the bottom counts as at-bottom (near-bottom detection) | — | — |
| `label` | Overrides the viewport accessible name (locale "Messages" by default; absorbed into the viewport and removed from the host — global-attribute absorption convention) | — | — |
| `pin-to-bottom` | IM-style always pinned (boolean presence): new content always scrolls to the bottom, pulling readers back; wins when combined with auto-scroll | `boolean` | — |
| `preserve-scroll-on-prepend` | Compensates scrollTop when older messages are prepended to keep the reading position (on by default; explicit ="false" disables) | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-scroll-state` | Dispatched when scrolling crosses a decision line, detail { atBottom, atTop, canScrollStart, canScrollEnd }; an initial state is broadcast once on the first frame (after initial positioning) — received even when the host attaches its listener after the upgrade |

#### Slots

| Name | Description |
| --- | --- |
| default | Message rows (oas-message-row / oas-marker etc.) |
| `button` | Custom jump-to-bottom button content (replaces the built-in arrow glyph; visibility and click remain component-owned; default is the built-in part=button) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-message-gap` | `var(--oas-space-4)` |

#### Methods

| Method | Description |
| --- | --- |
| `scrollToEnd(opts?)` | Scroll to bottom; `opts.behavior` accepts `'smooth'` (instant by default) |
| `scrollToStart(opts?)` | Scroll to top (same options) |

State reflection: `data-scrollable` (`"start"` / `"end"` / `"start end"` space-separated). ARIA: viewport `role="region"` + accessible name + `tabindex="0"`; content container `role="log"` + `aria-relevant="additions"`. CSS variable: `--oas-message-gap` (row gap, default `var(--oas-space-4)`). Parts: `::part(scroller)` / `::part(viewport)` / `::part(content)` / `::part(button)`.
