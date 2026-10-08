# MessageScroller

The conversation scroll container: a scroll-intent model — follow new content only when the reader is at the bottom (AI style), an always-pinned IM mode, a scroll-to-bottom button, jump-free history prepending (including async-resource position preservation), turn anchoring ("return to the last question"), and first-paint jump prevention. The component owns no messages (only scroll behavior), so hosts can connect any backend.

> Batch notes: batch A delivered pinning / jump-to-bottom / near-bottom detection / basic prepend preservation. Batch B is now merged — stable-anchor async preservation, same-frame mixed insertion settlement, first-paint jump prevention (`data-pending-scroll`), the `last-anchor` opening position, and turn anchoring (`turn-anchor`). Visibility tracking (which messages are in the viewport) is deferred to v2 (it pulls in outline/read-marking semantics of its own).

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

## First-paint jump prevention (data-pending-scroll)

<DemoBlock title="No top flash before the initial position is applied (end / last-anchor)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div id="msc-pending-host" style="width: 100%"></div>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-pending-replay" size="small" type="primary">Replay first mount</oas-button>
      <span id="msc-pending-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click to mount a scroller dynamically and watch the prevention timeline.</span>
    </div>
  </div>
</DemoBlock>

`default-position="end"` (and `last-anchor`) requires real positioning: on connect the component reflects `data-pending-scroll` on the host while the viewport is `visibility: hidden` (layout stays available for positioning measurements); the positioning and the attribute removal complete within the same frame — the reader never sees the "top flash then jump to bottom" unpositioned frame. `default-position="start"` is naturally positioned (scrollTop=0 is the initial value) and sets no reflection. If the reader scrolls before positioning (the yield guard), the reflection is removed as well — the viewport is never left hidden.

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

`pin-to-bottom` switches to IM mode: new content always scrolls to the bottom, even pulling readers back. Decision priority: `pin-to-bottom` > `turn-anchor` > `auto-scroll`.

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

## Load history on scroll-up (async-resource position preservation)

<DemoBlock title="Prepending older messages keeps the reading position">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-history" default-position="start" preserve-scroll-on-prepend style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <span id="msc-history-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scroll to the top to load 5 older rows — the viewport stays put (scrollTop compensated on prepend).</span>
  </div>
</DemoBlock>

<DemoBlock title="Late-loading images inside history grow without moving the anchor row">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-async" default-position="start" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-async-load" size="small" type="primary">Insert a batch of history (with a late-loading image)</oas-button>
      <span id="msc-async-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">The image grows late after insertion — the anchor row should not move.</span>
    </div>
  </div>
</DemoBlock>

When older messages are prepended, `preserve-scroll-on-prepend` (**on by default**, explicit `="false"` disables) compensates scrollTop by the content-coordinate displacement of the pre-insertion first node — when one frame both prepends history and appends new messages, only the top insertion settles (bottom appends never over-compensate). After compensation the component locks a **preservation anchor** (the pre-insertion first node): when async resources inside the history (images etc.) grow the upper content later (ResizeObserver channel, no slotchange signal), scrollTop keeps being compensated by the anchor's viewport drift, so reading never jumps while resources load. With a stable `message-id` on the row the anchor is re-queried by id first (host-side row rebuilds still resolve); without an id the element reference is used.

## Opening position last-anchor & scrollToMessage

<DemoBlock title="default-position=last-anchor: open right at the last question">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-last-anchor" default-position="last-anchor" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-la-first" size="small">scrollToMessage('m1')</oas-button>
      <span id="msc-la-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

Marking a row with the `anchor` attribute makes it a turn anchor (in AI scenarios typically the user's question row); `default-position="last-anchor"` opens at the top of the **last anchor** — long conversations resume at "the last question position" instead of dropping to the bottom or jumping to the top; when the anchor sits near the bottom (less than a viewport of content below), it displays bottom-clamped (the scroll ceiling, matching the product intuition of "the last question at the bottom of the screen"). With no anchor it falls back to `end`. `scrollToMessage(id, opts?)` scrolls precisely to the top of a message by `message-id` (returns `true` on hit; unknown ids return `false` without scrolling).

## Turn anchoring (turn-anchor)

<DemoBlock title="turn-anchor: the question stays pinned at the viewport top while the answer streams in (prev-peek context)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-turn" turn-anchor style="height: 240px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-turn-anchor" size="small">Jump to current question</oas-button>
      <oas-button id="msc-turn-stream" size="small" type="primary">Stream an answer segment</oas-button>
      <span id="msc-turn-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">The anchor row (question) sits ~64px from the viewport top — appending answers does not move it.</span>
    </div>
  </div>
</DemoBlock>

With `turn-anchor` set, one "question + answer" exchange is the anchoring unit: while following, the last `anchor`-marked turn anchor is pinned at `prev-peek` px from the viewport top (64 default, showing the tail of the previous message for context) and the answer flows in beneath it. Position is intent — anchor near the viewport top (or in the peek alignment window) means anchor-top following; the reader at the bottom keeps bottom following (new turns enter from below); away from both means the reader has taken over and nothing is pulled. The follow mode is resolved once per following episode, so an anchor crossing the top window during bottom following is never yanked to the top.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  // First-paint jump prevention: dynamic mount replays "connect → pending reflection → removed after first-frame positioning"
  const pendingHost = document.querySelector('#msc-pending-host')
  const pendingOut = document.querySelector('#msc-pending-out')
  document.querySelector('#msc-pending-replay')?.addEventListener('click', async () => {
    if (!pendingHost) return
    pendingHost.innerHTML = ''
    const el = document.createElement('oas-message-scroller')
    el.style.height = '160px'
    el.style.width = '100%'
    for (let i = 1; i <= 10; i++) {
      const p = document.createElement('p')
      p.textContent = 'Message ' + i
      el.appendChild(p)
    }
    pendingHost.appendChild(el)
    const duringConnect = el.hasAttribute('data-pending-scroll')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const vp = el.shadowRoot?.querySelector('.viewport')
    const atBottom = vp ? Math.abs(vp.scrollHeight - vp.clientHeight - vp.scrollTop) <= 8 : false
    if (pendingOut) {
      pendingOut.textContent = `data-pending-scroll present on connect: ${duringConnect}; removed after the first frame: ${!el.hasAttribute('data-pending-scroll')}; positioned at bottom: ${atBottom}`
    }
  })
  // Auto-play once so the result is statically visible
  document.querySelector('#msc-pending-replay')?.click()

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

  // Async preservation demo: rows with a stable message-id anchor; the button prepends history containing a placeholder image that grows late
  const asyncEl = document.querySelector('#msc-async')
  const asyncOut = document.querySelector('#msc-async-out')
  const addAsyncRows = (from, to) => {
    if (!asyncEl) return
    for (let i = from; i <= to; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `Message #${i}`
      row.appendChild(bubble)
      asyncEl.appendChild(row)
    }
  }
  addAsyncRows(101, 112)
  asyncEl?.querySelector('oas-message-row')?.setAttribute('message-id', 'm-anchor')
  let asyncSeq = 100
  document.querySelector('#msc-async-load')?.addEventListener('click', async () => {
    if (!asyncEl || asyncEl.dataset.loading === '1') return
    asyncEl.dataset.loading = '1'
    const vp = asyncEl.shadowRoot?.querySelector('.viewport')
    const anchorRow = asyncEl.querySelector('[message-id="m-anchor"]')
    if (!vp || !anchorRow) return
    const before = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    const first = asyncEl.firstElementChild
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `Older history #${asyncSeq--}`
      if (i === 1) {
        const img = document.createElement('div')
        img.className = 'fake-img'
        img.style.cssText = 'height: 36px; border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); transition: height .2s'
        bubble.appendChild(img)
      }
      row.appendChild(bubble)
      asyncEl.insertBefore(row, first)
    }
    await delay(150)
    const fake = asyncEl.querySelector('.fake-img')
    if (fake) fake.style.height = '200px'
    await delay(500)
    const after = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    const drift = Math.round(Math.abs(after - before))
    if (asyncOut) {
      asyncOut.textContent =
        drift <= 2
          ? `Anchor row drifted ${drift}px after the image grew — reading position stable (preservation anchor active)`
          : `Anchor row drifted ${drift}px (unexpected, should be ≤2px)`
    }
    delete asyncEl.dataset.loading
  })

  // last-anchor demo: multi-turn conversation with anchor-marked question rows; opens at the last anchor's top
  const la = document.querySelector('#msc-last-anchor')
  const laOut = document.querySelector('#msc-la-out')
  const laRound = (q, a, seq) => {
    const qRow = document.createElement('oas-message-row')
    qRow.setAttribute('align', 'end')
    qRow.setAttribute('anchor', '')
    qRow.setAttribute('message-id', seq === 1 ? 'm1' : 'q' + seq)
    const qBubble = document.createElement('oas-bubble')
    qBubble.setAttribute('variant', 'secondary')
    qBubble.textContent = q
    qRow.appendChild(qBubble)
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = a
    aRow.appendChild(aBubble)
    la?.appendChild(qRow)
    la?.appendChild(aRow)
  }
  laRound('How does position preservation work?', 'Prepending compensates by the pre-insertion first node displacement.', 1)
  for (let i = 0; i < 6; i++) laRound('Middle question ' + i, 'Middle answer ' + i + ' (filler to create scroll distance).', 10 + i)
  laRound('Last question: where does the conversation open?', 'default-position="last-anchor" lands at the top of the last question row.', 99)
  // Client-side async fill: the last-anchor opening position only auto-applies when content exists on the component's first frame;
  // after filling, the host calls scrollToMessage to land on the last anchor (AI convention: return to the last question after fetching history)
  const lastAnchorRow = la ? [...la.querySelectorAll('oas-message-row[anchor]')].at(-1) ?? null : null
  // Position settling: page-level styles/fonts applied late make early geometry stale (row heights change after the fact); poll with rAF+timeout and re-position until stable
  let laTries = 0
  const laSettle = () => {
    const vp = la?.shadowRoot?.querySelector('.viewport')
    if (!vp || !lastAnchorRow || laTries++ > 12) return
    const offset = lastAnchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    if (Math.abs(offset) > 2) la?.scrollToMessage(lastAnchorRow.getAttribute('message-id') ?? '')
    requestAnimationFrame(() => window.setTimeout(laSettle, 120))
  }
  laSettle()
  document.querySelector('#msc-la-first')?.addEventListener('click', () => {
    const hit = la?.scrollToMessage('m1')
    if (laOut) laOut.textContent = `scrollToMessage('m1') → ${hit} (scrolled to the first message's top)`
  })
  // Opening position verification output (after positioning settles)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const vp = la?.shadowRoot?.querySelector('.viewport')
      if (vp && lastAnchorRow && laOut) {
        const offset = Math.round(lastAnchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top)
        laOut.textContent = `Settled at the last question row: viewport offset ${offset}px (≈0 when top-aligned; the bottom-clamp remainder when the anchor sits near the bottom)`
      }
    })
  })

  // Turn anchoring demo: anchor-marked question row + turn-anchor; streaming answers keep the anchor top-anchored
  const turn = document.querySelector('#msc-turn')
  const turnOut = document.querySelector('#msc-turn-out')
  const turnRound = (q, seq) => {
    const qRow = document.createElement('oas-message-row')
    qRow.setAttribute('align', 'end')
    qRow.setAttribute('anchor', '')
    qRow.setAttribute('message-id', 'tq' + seq)
    const qBubble = document.createElement('oas-bubble')
    qBubble.setAttribute('variant', 'secondary')
    qBubble.textContent = q
    qRow.appendChild(qBubble)
    turn?.appendChild(qRow)
    return qRow
  }
  turnRound('Turn 1: what is turn anchoring?', 1)
  for (let i = 0; i < 8; i++) {
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = `Answer line ${i + 1} (streaming growth).`
    aRow.appendChild(aBubble)
    turn?.appendChild(aRow)
  }
  document.querySelector('#msc-turn-anchor')?.addEventListener('click', () => {
    turn?.scrollToMessage('tq1')
  })
  let turnSeq = 2
  document.querySelector('#msc-turn-stream')?.addEventListener('click', async () => {
    if (!turn) return
    const vp = turn.shadowRoot?.querySelector('.viewport')
    const anchorRow = turn ? [...turn.querySelectorAll('oas-message-row[anchor]')].at(-1) ?? null : null
    if (!vp || !anchorRow) return
    // First appended row: the component aligns the anchor from its exact top to the prev-peek position (64px, previous-message context); the drift baseline is taken after that alignment
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = `Appended answer ${turnSeq}-1 (component aligns the anchor to the peek position).`
    aRow.appendChild(aBubble)
    turn.appendChild(aRow)
    await delay(220)
    const before = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    for (let i = 1; i < 4; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `Appended answer ${turnSeq}-${i + 1} (flows in beneath the anchor, anchor top unchanged).`
      row.appendChild(bubble)
      turn.appendChild(row)
      await delay(120)
    }
    turnSeq++
    const after = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    const drift = Math.round(Math.abs(after - before))
    if (turnOut) {
      turnOut.textContent =
        drift <= 2
          ? `Anchor row sits ${Math.round(after)}px from the viewport top, drifting ${drift}px while appending — the question stays pinned (anchor-top following)`
          : `Anchor row drifted ${drift}px (expected if you scrolled away and took over)`
    }
  })
})
</script>

## Boundaries

- **Visibility tracking (which messages are in the viewport)**: deferred to v2 (pulls in outline/read-marking semantics of its own, pay-for-use) — this component ships no `oas-visible-change` / `data-visible`; hosts can compose IntersectionObserver themselves.
- **Virtualization & render cost**: offscreen-row render skipping (`content-visibility` etc.) arrives with virtualization (enabling it alone on slotted elements stalls at the intrinsic-size placeholder — verified and pulled); multi-thousand-turn conversations compose with a virtual list on the host side.
- **Empty state**: renders an empty log; hosts place their own empty-state content.
- **Prepend preservation boundary**: the preservation anchor releases on real reader scrolling (reader position wins); with `pin-to-bottom` / bottom following the compensation is moot (pinning settles after). Same-frame mixed settlement relies on the pre-insertion first element still being in the DOM (no compensation for that frame if the host removed it).
- **First-paint prevention boundary**: `data-pending-scroll` only covers the "connect → first-frame positioning" window; hosts fetching the first messages asynchronously after mount are handled by the `auto-scroll`/`pin-to-bottom` loading behavior. The viewport is unfocusable while pending (a millisecond-scale window).
- `label` is absorbed into the viewport accessible name and removed from the host (global-attribute absorption convention).
- `anchor` / `message-id` are host-authored cooperation markers on slotted rows (read-only to the scroller); under Vue hosts both pass through as plain attributes and are never stripped.

## API

### oas-message-scroller

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-scroll` | AI-style bottom follow (boolean presence, off by default): follows streaming growth only while the reader is at the bottom (near-bottom ≤ edge-threshold); scrolled-up reading is never interrupted | `boolean` | — |
| `default-position` | Opening position: start (top) / end (bottom, default; invalid values fall back to end) / last-anchor (top of the last anchor-marked message — the AI "return to the last question" scenario; falls back to end with no anchor) | — | — |
| `edge-threshold` | Bottom detection threshold in px (default 8) — within the threshold of the bottom counts as at-bottom (near-bottom detection) | — | — |
| `label` | Overrides the viewport accessible name (locale "Messages" by default; absorbed into the viewport and removed from the host — global-attribute absorption convention) | — | — |
| `pin-to-bottom` | IM-style always pinned (boolean presence): new content always scrolls to the bottom, pulling readers back; wins when combined with auto-scroll | `boolean` | — |
| `preserve-scroll-on-prepend` | Compensates scrollTop when older messages are prepended to keep the reading position (on by default; explicit ="false" disables) — settles precisely by the pre-insertion first-node displacement (same-frame append+prepend mixes settle only the top insertion), then locks a preservation anchor: async resources (images etc.) growing the upper history keep being compensated by the anchor's viewport drift (message-id re-queried first) | — | — |
| `prev-peek` | Context px revealed above the anchor top during turn-anchor alignment (default 64; invalid/negative values fall back to 64) | — | — |
| `turn-anchor` | Turn anchoring (boolean presence): one question+answer exchange is the anchoring unit — while the anchor sits at the viewport top the last anchor-marked message is pinned at prev-peek from the top with answers flowing in beneath; bottom following continues at the bottom; scrolled-up readers are never pulled | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-scroll-state` | Dispatched when scrolling crosses a decision line, detail { atBottom, atTop, canScrollStart, canScrollEnd }; an initial state is broadcast once on the first frame (after initial positioning) — received even when the host attaches its listener after the upgrade |

#### Slots

| Name | Description |
| --- | --- |
| default | Message rows (oas-message-row / oas-marker etc.; the anchor / message-id attributes on rows are scroller cooperation markers) |
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
| `scrollToMessage(id, opts?)` | Scroll to the top of the message row with the given `message-id`; returns `true` on hit, `false` without scrolling for unknown ids (same options) |

State reflection: `data-scrollable` (`"start"` / `"end"` / `"start end"` space-separated); `data-pending-scroll` (first-paint jump prevention — present until the initial position is applied, removed after positioning or reader yield). ARIA: viewport `role="region"` + accessible name + `tabindex="0"`; content container `role="log"` + `aria-relevant="additions"`. CSS variable: `--oas-message-gap` (row gap, default `var(--oas-space-4)`). Parts: `::part(scroller)` / `::part(viewport)` / `::part(content)` / `::part(button)`.
