---
description: "Flash sale recipe: oas-countdown + oas-progress + oas-submit-bar assembled on the host side — stock-driven states, behavior switch on timeout/sellout, and a disable-timing decision table."
---

# Flash sale (scenario recipe)

> A **host-side assembly** of three existing components — countdown, progress and the submit bar. This page introduces no new component and no new component API; the flash-sale business rules (when to disable, when to switch behavior) live entirely in the host.

## Roles

| Role | Component | Component provides | Host provides |
| --- | --- | --- | --- |
| Countdown | `oas-countdown` | Time display + `oas-finish` deadline signal | Feed `value` with `endAt − Date.now()` in milliseconds |
| Sale progress | `oas-progress` | Percent bar (`percent`, flowing stripes, `label`) | Convert "sold / total" to 0–100 |
| Buy bar | `oas-submit-bar` | Total + main button three states + `oas-submit` | Submit queue, stock decrement, disable decisions |

The countdown `value` is a **duration in milliseconds**, not an absolute timestamp — the host does the subtraction; drift correction under background-tab throttling is built in (timestamp-based bookkeeping, auto-corrected on the first frame after returning to the foreground).

## Full flash-sale loop

<DemoBlock title="60-second round: buy → progress advances → auto switch on sellout / timeout (resettable)">
  <div class="fs-stage">
    <div class="fs-head">
      <div class="fs-head-main">
        <p class="fs-title">Flagship noise-cancelling headphones (glossy white)</p>
        <oas-price value="199" original="399" size="lg"></oas-price>
      </div>
      <oas-tag id="fs-state-en" type="danger" variant="solid">Live</oas-tag>
    </div>
    <oas-progress id="fs-progress-en" percent="0" striped-flow label="Sold 0%"></oas-progress>
    <p class="fs-stock"><strong id="fs-stock-num-en">5</strong> of 5 left · sold <span id="fs-sold-num-en">0</span></p>
    <oas-countdown id="fs-countdown-en" value="60000" format="mm:ss" title="Round ends in"></oas-countdown>
    <oas-submit-bar id="fs-bar-en" total="199" label="Flash price" action-text="Buy now"></oas-submit-bar>
    <p id="fs-out-en" class="fs-out" role="status">Press "Buy now": each success advances the progress; on sellout or timeout the button switches automatically.</p>
    <oas-button id="fs-reset-en" size="small">Reset demo</oas-button>
  </div>
</DemoBlock>

**Key points**:

1. **Disable timing is two independent conditions, first wins**: timeout (`oas-finish`) → `disabled` + `action-text="Ended"`; stock reaches zero (host ledger) → `disabled` + `action-text="Sold out"`. Both are inputs to the host state machine — the component knows nothing about "campaigns".
2. **In-flight submits are protected for free**: on `oas-submit` the host sets `loading` — while loading the button is unclickable and no further events fire (built-in semantics), so no hand-rolled debounce is needed; after the async response resolves, remove `loading` and advance stock/progress.
3. **Progress linkage is a one-line conversion**: `percent = sold / total × 100`; `label` gives the bar an accessible name so screen-reader users perceive the heat too.
4. **The demo is resettable**: `countdown.reset()` restarts from the initial value (component method) while the host rolls back stock / button / copy — the real "restock / reopen" path.

## Disable-timing decision table

| Signal | Source | Host action |
| --- | --- | --- |
| Timeout | `oas-finish` from `oas-countdown` | `disabled` + `action-text="Ended"`, state tag → "Ended" |
| Sold out | Host stock ledger (decrement on `oas-submit` success) | `disabled` + `action-text="Sold out"`, state tag → "Sold out" |
| Submit in flight | Host sets `loading` on click | Built-in: loading is unclickable, no `oas-submit` fires |
| Restore / restock | Host writes state back | Remove `disabled`, restore `action-text`, `countdown.reset()` |

## Three states side by side: preview / live / ended

<DemoBlock title="One component set, three campaign states (preview card subscribes a reminder)">
  <div class="fs-cols">
    <div class="fs-col">
      <oas-tag type="info">Preview</oas-tag>
      <oas-countdown value="94260000" format="Dd HH:mm:ss" title="Starts in"></oas-countdown>
      <p class="fs-meta">Starts today 20:00 · 8,241 subscribed</p>
      <oas-submit-bar total="199" label="Preview price" action-text="Not started" disabled></oas-submit-bar>
      <oas-button id="fs-remind-en" size="small" block>Notify me at start</oas-button>
    </div>
    <div class="fs-col">
      <oas-tag type="danger" variant="solid">Live</oas-tag>
      <oas-countdown value="45000" format="mm:ss" title="Ends in"></oas-countdown>
      <oas-progress percent="72" striped-flow label="Sold 72%"></oas-progress>
      <oas-submit-bar total="199" label="Flash price" action-text="Buy now"></oas-submit-bar>
    </div>
    <div class="fs-col">
      <oas-tag type="default">Ended</oas-tag>
      <oas-countdown value="0" title="Round ended"></oas-countdown>
      <oas-progress percent="100" status="success" label="Sold 100%"></oas-progress>
      <oas-submit-bar total="199" action-text="Ended" disabled></oas-submit-bar>
    </div>
  </div>
  <p id="fs-remind-out-en" class="fs-out" role="status" style="margin-top: var(--oas-space-2)">Preview card: press "Notify me at start" for the host-side feedback.</p>
</DemoBlock>

**Key points**:

1. All three states share the same components — only **attribute values** differ: preview = button disabled, countdown runs toward the start time; live = button active, progress flows; ended = both disabled, progress full at `status="success"` green.
2. "Notify me" is host business — the submit-bar stays disabled guarding the buy entry while a plain button takes the subscription.
3. `value="0"` parks the ended card's countdown at zero: a zero value finishes immediately, so component state and business state agree.

## Key code

```ts
// Host state machine (pseudo code, copy-ready)
let stock = TOTAL_STOCK
let ended = false

countdown.addEventListener('oas-finish', () => {
  ended = true
  sealBar('Ended', 'Ended', 'default')
})

bar.addEventListener('oas-submit', () => {
  if (ended || stock <= 0) return // belt and braces (no event fires while disabled / loading)
  bar.setAttribute('loading', '')
  queueSubmit().then(() => {
    bar.removeAttribute('loading')
    stock--
    renderProgress() // percent = sold / total × 100
    if (stock === 0) sealBar('Sold out', 'Sold out', 'default')
  })
})

function sealBar(text: string, tag: string, type: string) {
  bar.setAttribute('disabled', '')
  bar.setAttribute('action-text', text)
  stateTag.setAttribute('type', type)
  // Timeout / sold-out are weak states: fall back to soft (the solid "Live" belongs to the live state only, consistent with static weak states)
  stateTag.removeAttribute('variant')
  stateTag.textContent = tag
}
```

## Notes

1. **Feed `value` a duration**, not a future timestamp: `countdown.value = String(endAt - Date.now())`; for multi-day rounds use `format="Dd HH:mm:ss"`.
2. **`oas-finish` fires once**; call `reset()` to reopen a round; reconnecting leaves no stray timer (built into the component's `onCleanup`).
3. **submit-bar defaults to `position: sticky`** with its placeholder in the document flow; if the host overrides to `fixed`, the placeholder is the host's job (see the submit-bar page's safe-area recipe).
4. **The real stock truth lives on the backend**: front-end progress and disables are experience layers only — whether `oas-submit` succeeded is decided by the server response; this demo simulates it with a delay.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Components register late (theme dynamic import): wire everything after customElements.whenDefined (first-frame race discipline)
  const tags = ['oas-price', 'oas-progress', 'oas-countdown', 'oas-submit-bar', 'oas-tag', 'oas-button']
  Promise.all(tags.map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    // —— Full flash-sale loop ——
    const bar = el('fs-bar-en')
    const countdown = el('fs-countdown-en')
    const progress = el('fs-progress-en')
    const stateTag = el('fs-state-en')
    const out = el('fs-out-en')
    if (bar && countdown && progress && stateTag && out) {
      const TOTAL = 5
      let stock = TOTAL
      let ended = false
      const pct = () => Math.round(((TOTAL - stock) / TOTAL) * 100)
      const seal = (text, tag, type) => {
        bar.setAttribute('disabled', '')
        bar.setAttribute('action-text', text)
        stateTag.setAttribute('type', type)
        // Timeout / sold-out are weak states: fall back to the soft form (the initial solid "Live" belongs to the strong state only, consistent with the static weak states on this page)
        stateTag.removeAttribute('variant')
        stateTag.textContent = tag
      }
      const render = () => {
        progress.setAttribute('percent', String(pct()))
        progress.setAttribute('label', 'Sold ' + pct() + '%')
        el('fs-stock-num-en').textContent = String(stock)
        el('fs-sold-num-en').textContent = String(TOTAL - stock)
        if (stock === 0 && !ended) {
          seal('Sold out', 'Sold out', 'default')
          out.textContent = 'Sold out: stock ledger hit zero → submit-bar disabled + copy switch.'
        }
      }
      bar.addEventListener('oas-submit', () => {
        if (ended || stock <= 0) return
        bar.setAttribute('loading', '')
        out.textContent = 'Queuing… (while loading the button is locked and no oas-submit fires)'
        setTimeout(() => {
          bar.removeAttribute('loading')
          stock--
          render()
          if (stock > 0) out.textContent = 'Success! Only ' + stock + ' left.'
        }, 600)
      })
      countdown.addEventListener('oas-finish', () => {
        ended = true
        bar.removeAttribute('loading')
        seal('Ended', 'Ended', 'default')
        out.textContent = 'oas-finish fired: time is up → buy channel closed (decision table row 1).'
      })
      el('fs-reset-en').addEventListener('oas-click', () => {
        stock = TOTAL
        ended = false
        bar.removeAttribute('disabled')
        bar.removeAttribute('loading')
        bar.setAttribute('action-text', 'Buy now')
        stateTag.setAttribute('type', 'danger')
        stateTag.setAttribute('variant', 'solid') // back to the strong live state: restore solid
        stateTag.textContent = 'Live'
        countdown.reset()
        render()
        if (stock > 0) out.textContent = 'Reset: stock / progress / countdown back to initial values.'
      })
      render()
    }
    // —— Three states: preview reminder ——
    const remind = el('fs-remind-en')
    const remindOut = el('fs-remind-out-en')
    if (remind && remindOut) {
      remind.addEventListener('oas-click', () => {
        remind.setAttribute('loading', '')
        setTimeout(() => {
          remind.removeAttribute('loading')
          remind.setAttribute('disabled', '')
          remind.textContent = 'Subscribed'
          remindOut.textContent = 'Subscribed: push 5 minutes before start (persistence is host business).'
        }, 500)
      })
    }
  })
})
</script>

<style>
.fs-stage {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  width: 100%;
  max-width: 460px;
}
.fs-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--oas-space-3);
}
.fs-head-main {
  min-width: 0;
}
.fs-title {
  margin: 0 0 var(--oas-space-1);
  font-weight: 600;
}
.fs-stock {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fs-out {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fs-stage > oas-button {
  /* flex-column 默认 stretch 会把 oas-button host 拉到容器宽，而内层实体按钮只有内容宽
     ——host 拉宽区点击无响应（oas-button 只有 block 属性才让内层按钮填满）。
     收窄 host 到内容宽，视觉与可点区一致。 */
  align-self: flex-start;
}
.fs-cols {
  /* Stacked vertically: the submit-bar (total + button) min-content width exceeds any
     three-column track and would squeeze internally (measured ~356px needed in en) */
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  width: 100%;
  max-width: 460px;
}
.fs-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  container-type: inline-size;
}
/* Narrow container (phone width): let the submit-bar row wrap — total on one line,
   button filling the next (::part override + container query is the legitimate
   narrow-screen recipe; wide containers are unaffected) */
@container (max-width: 400px) {
  .fs-col oas-submit-bar::part(row) {
    flex-wrap: wrap;
    row-gap: var(--oas-space-2);
  }
  .fs-col oas-submit-bar::part(action) {
    flex: 1 1 100%;
  }
}
.fs-col > oas-tag {
  align-self: flex-start;
}
.fs-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
</style>
