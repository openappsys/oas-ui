# NumberAnimation

An animation component that eases a number from its current value to the target value, stops at the target and emits `oas-finish`; under `prefers-reduced-motion` it jumps straight to the target, and disconnecting cancels the rAF without leaks.

## Basic Usage

<DemoBlock title="Default 1500ms roll from 0 to target">
  <oas-number-animation value="9999"></oas-number-animation>
</DemoBlock>

## Speed and Decimal Places

<DemoBlock title="duration=3000 + to-fixed=2">
  <oas-number-animation value="3.1415926" duration="3000" to-fixed="2"></oas-number-animation>
</DemoBlock>

## Start Value (from)

`from` sets the start value of each new round (default 0). Changing `value` mid-animation still continues from the currently displayed value — `from` does not affect continuation.

<DemoBlock title="from=500 start">
  <oas-number-animation value="2000" from="500" duration="1500"></oas-number-animation>
</DemoBlock>

## Controlled Playback (active + play())

`active` controls playback: plays by default; `"false"` freezes the frame, changing back to `"true"` continues from the current value to the target. `play()` manually replays a round (starting from `from`; re-entrant safe while playing) — replay with the same `value` works for data refreshes without mutating `value`. To animate only when scrolled into view, feed `active` from an IntersectionObserver. The second example in the block statically shows the `active="false"` frozen state (held at the start value 6666).

<DemoBlock title="active pause/resume + play() replay">
  <oas-number-animation id="num-anim-active" value="8888" from="0" duration="1500"></oas-number-animation>
  <oas-number-animation value="8888" from="6666" active="false" duration="1500"></oas-number-animation>
  <oas-button id="num-anim-toggle" size="small">Pause</oas-button>
  <oas-button id="num-anim-play" size="small">Replay</oas-button>
</DemoBlock>

## Easing

`easing` is a four-level enum: `ease-out` (default, fast then slow) / `linear` (constant speed, e.g. download bytes) / `ease-in` / `ease-in-out` / `spring` (mild overshoot bounce); invalid values fall back to `ease-out`.

<DemoBlock title="easing four levels compared">
  <oas-number-animation value="1000" duration="1200" easing="linear"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="ease-out"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="ease-in-out"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="spring"></oas-number-animation>
</DemoBlock>

## Thousands Separator

`group-separator="true"` formats the animated value with locale-aware thousands separators (Intl.NumberFormat, aware of config-provider / setLocale; the formatter is cached per locale|decimals — zero per-frame construction cost).

<DemoBlock title="group-separator thousands">
  <oas-number-animation value="1234567" duration="1500" group-separator="true"></oas-number-animation>
  <oas-number-animation value="98765.432" duration="1500" to-fixed="2" group-separator="true"></oas-number-animation>
</DemoBlock>

## Finish Event

<DemoBlock title="oas-finish callback">
  <oas-number-animation id="number-anim-event" value="88" duration="1200"></oas-number-animation>
  <span id="number-anim-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-3)"></span>
</DemoBlock>

## Font Size

Font size is fixed at `--oas-font-size-lg` (16px) by default and does not follow the outer context; override with the CSS variable `--oas-number-animation-font` (e.g. `32px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Controlled playback: plays by default; `"false"` freezes the frame, changing back to `"true"` continues from the current value to the target | `string` | — |
| `duration` | Animation duration (ms); 0 jumps straight to the target | `number \| string` | — |
| `easing` | Easing: `ease-out` (default) / `linear` / `ease-in` / `ease-in-out` / `spring` (mild overshoot); invalid values fall back to `ease-out` | `string` | `ease-out` |
| `from` | Start value (default 0); applies at each new round start, continuation unaffected | `string` | `0` |
| `group-separator` | Thousands grouping (`"true"` enables, Intl locale-aware; disabled by default) | `string` | — |
| `to-fixed` | Decimal places (`Number.prototype.toFixed`); when omitted, integer display | `string` | — |
| `value` | Target value; invalid values treated as 0 | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-finish` | Emitted once when the animation reaches the target, detail `{ value: target value }` |

- Changing `value` mid-animation continues from the currently displayed value to the new target.
- When the system enables "reduce motion", the animation is skipped and the target value is shown directly (`oas-finish` is still emitted).
- On disconnect, any unfinished rAF is cancelled — no leaks.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guards against pre-upgrade expando shadowing (property assignment / method calls must wait for the custom element definition)
  customElements.whenDefined('oas-number-animation').then(() => {
    const el = document.getElementById('num-anim-active')
    const toggle = document.getElementById('num-anim-toggle')
    const play = document.getElementById('num-anim-play')
    const eventEl = document.getElementById('number-anim-event')
    const out = document.getElementById('number-anim-output')
    eventEl?.addEventListener('oas-finish', (e) => {
      out.textContent = `oas-finish: ${e.detail.value}`
    })
    toggle?.addEventListener('click', () => {
      if (!el) return
      const paused = el.getAttribute('active') === 'false'
      el.setAttribute('active', paused ? 'true' : 'false')
      toggle.textContent = paused ? 'Pause' : 'Resume'
    })
    play?.addEventListener('click', () => {
      el?.play()
    })
  })
})
</script>
