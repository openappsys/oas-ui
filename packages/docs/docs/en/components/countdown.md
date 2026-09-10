# Countdown

A countdown component that refreshes in real time, supports day/hour/minute/second formatting templates, emits `oas-finish` when reaching zero, and automatically cleans up its timer on disconnect. Set `type="countup"` to switch to count-up mode (increments from `start`, no end point).

## Basic Usage

<DemoBlock title="Default HH:mm:ss">
  <oas-countdown value="90000"></oas-countdown>
</DemoBlock>

## Days, Hours, Minutes, Seconds

<DemoBlock title="DD:HH:mm:ss template">
  <oas-countdown value="90061000" format="DD:HH:mm:ss"></oas-countdown>
</DemoBlock>

## Chinese Unit Template

<DemoBlock title="Chinese units">
  <oas-countdown value="90061000" format="D天H时m分s秒"></oas-countdown>
</DemoBlock>

## Millisecond Precision

Add the `SSS` token to output milliseconds (zero-padded to 3 digits); internal refresh automatically accelerates to a 50ms granularity. `aria-live` stays off so high-frequency text changes don't disturb screen readers.

<DemoBlock title="SSS millisecond template">
  <oas-countdown value="10000" format="ss.SSS"></oas-countdown>
  <oas-countdown value="10000" format="mm分ss秒SSS"></oas-countdown>
</DemoBlock>

## Pause / Resume / Reset

`active` controls pausing (`"false"` freezes the frame and stops counting elapsed time; resuming continues from where it stopped); the `reset()` method restarts from the initial value. Ideal for verification-code resend timers, pomodoro clocks, etc.

<DemoBlock title="active pause/resume + reset()">
  <oas-countdown id="countdown-active" value="60000" title="Time left to pay"></oas-countdown>
  <oas-countdown value="90000" active="false" title="Paused (active=false, frozen at the start value)"></oas-countdown>
  <oas-button id="countdown-toggle" size="small">Pause</oas-button>
  <oas-button id="countdown-reset" size="small">Reset</oas-button>
</DemoBlock>

## Count-Up (countup)

`type="countup"` switches to count-up mode: it increments from `start` (milliseconds, default 0) with no end point (**no `oas-finish` is emitted**), ideal for pomodoro timers, work-time tracking, etc. `active` pauses/resumes and `reset()` returns to `start`, with the same semantics as countdown; `format` tokens and SSS millisecond precision apply as well; elapsed changes reuse the `oas-change` event (`detail.value` is the elapsed milliseconds). In this mode the `value` attribute is ignored.

<DemoBlock title="Count-up: from 0 + pause/resume + reset()">
  <oas-countdown id="countup-active" type="countup" title="Focus time"></oas-countdown>
  <oas-button id="countup-toggle" size="small">Pause</oas-button>
  <oas-button id="countup-reset" size="small">Reset</oas-button>
</DemoBlock>

## Prefix / Suffix / Title

The `title` attribute (or `slot="title"`) renders a heading above; `prefix-text` / `suffix-text` flank the display value (attribute text or same-named slots, dual channel; in plain HTML the legacy `prefix` / `suffix` attributes still work as aliases).

<DemoBlock title="title + prefix / suffix">
  <oas-countdown value="90000" title="Until the event" prefix-text="in " suffix-text=" left"></oas-countdown>
  <oas-countdown value="300000">
    <span slot="title">Verification code valid for</span>
    <span slot="suffix"> before expiry</span>
  </oas-countdown>
</DemoBlock>

## Finish Callback

<DemoBlock title="oas-finish finished state">
  <oas-countdown id="countdown-event" value="3000"></oas-countdown>
  <span id="countdown-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Font Size

Font size is fixed at `--oas-font-size-lg` (16px) by default and does not follow the outer context; override with the CSS variable `--oas-countdown-font` (e.g. `32px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Controlled pause: `"false"` freezes the frame and stops counting elapsed time, resuming continues (absent = running) | `string` | — |
| `format` | Template: `DD`/`D` days, `HH`/`H` hours, `mm`/`m` minutes, `ss`/`s` seconds, `SSS` milliseconds (50ms internal refresh when SSS present) | `string` | `HH:mm:ss` |
| `prefix-text` | Leading text of the display value | — | — |
| `start` | Count-up start offset (milliseconds), only effective with `type="countup"`; changing it restarts counting | `string` | `0` |
| `suffix-text` | Trailing text of the display value | — | — |
| `title` | Heading above the display value (native global attribute, absorbed after rendering) | `string` | — |
| `type` | Timing mode: `"countup"` counts up from `start` with no end point (no `oas-finish`); absent = countdown | `string` | — |
| `value` | Total countdown duration (milliseconds); ignored in count-up mode | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted on a throttled basis when the remaining displayed value changes, detail `{ value: remaining milliseconds }`; in count-up mode `{ value: elapsed milliseconds }` |
| `oas-finish` | Emitted once when the countdown reaches zero (not emitted in count-up mode, which has no end point) |

### Slots

| Name | Description |
| --- | --- |
| `prefix` | Leading content (distributed content takes precedence over the `prefix` attribute text) |
| `suffix` | Trailing content (distributed content takes precedence over the `suffix` attribute text) |
| `title` | Heading above the value (distributed content takes precedence over the `title` attribute text) |

When the template contains `D`/`DD`, hours are counted within the day (0-23); without days, hours roll up into them (e.g. `25:01:01`).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guards against pre-upgrade expando shadowing (property assignment / method calls must wait for the custom element definition)
  customElements.whenDefined('oas-countdown').then(() => {
    const el = document.getElementById('countdown-active')
    const toggle = document.getElementById('countdown-toggle')
    const reset = document.getElementById('countdown-reset')
    const eventEl = document.getElementById('countdown-event')
    const out = document.getElementById('countdown-output')
    const upEl = document.getElementById('countup-active')
    const upToggle = document.getElementById('countup-toggle')
    const upReset = document.getElementById('countup-reset')
    eventEl?.addEventListener('oas-finish', () => {
      out.textContent = 'oas-finish: countdown finished'
    })
    toggle?.addEventListener('click', () => {
      if (!el) return
      const paused = el.getAttribute('active') === 'false'
      el.setAttribute('active', paused ? 'true' : 'false')
      toggle.textContent = paused ? 'Pause' : 'Resume'
    })
    reset?.addEventListener('click', () => {
      el?.reset()
    })
    upToggle?.addEventListener('click', () => {
      if (!upEl) return
      const paused = upEl.getAttribute('active') === 'false'
      upEl.setAttribute('active', paused ? 'true' : 'false')
      upToggle.textContent = paused ? 'Pause' : 'Resume'
    })
    upReset?.addEventListener('click', () => {
      upEl?.reset()
    })
  })
})
</script>
