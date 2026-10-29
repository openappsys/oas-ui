# RelativeTime

Renders epoch milliseconds / ISO 8601 / `Date` as a localized relative time, backed by a semantic `<time datetime>` element. Optional `auto-refresh` keeps it fresh and pauses while the page is hidden. Invalid or missing values render a safe empty state — never `NaN` / `Invalid Date`.

## Basic Usage

`value` accepts epoch milliseconds (numeric string) or ISO 8601; the property channel additionally accepts `number` / `Date` (a `Date` is written back as an ISO attribute).

<DemoBlock title="epoch / ISO / Date property">
  <oas-relative-time value="1700000000000" locale="en-US"></oas-relative-time>
  <oas-relative-time value="2026-01-01T00:00:00.000Z" locale="en-US" numeric="always"></oas-relative-time>
  <oas-relative-time id="relative-time-date" locale="en-US"></oas-relative-time>
</DemoBlock>

## Units and Direction

Seconds / minutes / hours / days / months / years use fixed factors and round to the nearest value; reaching the next unit's ceiling promotes the unit (59.5s → 1 minute, 23.5h → 1 day, 12 months → 1 year). Future values are positive, past values negative.

<DemoBlock title="Past and future (values injected from the current clock)">
  <oas-relative-time data-offset="-45" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-300" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-7200" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-259200" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-5184000" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-63072000" numeric="always" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="3600" numeric="always" locale="en-US"></oas-relative-time>
</DemoBlock>

## Semantic `<time>`

For valid values the inner `<time part="time">` carries a `datetime` attribute synchronized with the resolved instant (UTC ISO 8601), ready for crawlers, screen readers or host scripts. `aria-live` stays `off` so auto-refresh does not interrupt assistive technology.

<DemoBlock title="Read the datetime attribute">
  <oas-relative-time value="2026-10-29T12:00:00.000Z" locale="en-US"></oas-relative-time>
</DemoBlock>

## Locale and numeric

`locale` takes precedence over the nearest `oas-config-provider`, then falls back to the global i18n locale and finally `en-US`; malformed tags (such as `zh_CN`) never throw. `numeric="auto"` (default) lets `Intl.RelativeTimeFormat` produce idiomatic "now / yesterday", while `numeric="always"` always shows a number.

<DemoBlock title="en-US / zh-CN / invalid locale fallback / auto vs always">
  <oas-relative-time data-offset="-300" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-300" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-86400" locale="en-US" numeric="auto"></oas-relative-time>
  <oas-relative-time data-offset="-86400" locale="en-US" numeric="always"></oas-relative-time>
  <oas-relative-time data-offset="-300" locale="zh_CN"></oas-relative-time>
</DemoBlock>

## Auto Refresh

`auto-refresh` is enabled by presence (`"false"` disables it): second-level units tick every second, all other units throttle at 30 seconds. Hiding the page pauses the timer; becoming visible recomputes immediately. Disconnecting clears the timer and listener; reconnecting restores them.

<DemoBlock title="Ticks from 2 seconds ago / disabled auto-refresh">
  <oas-relative-time id="relative-time-auto" auto-refresh locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-30" auto-refresh="false" locale="en-US"></oas-relative-time>
</DemoBlock>

## Empty State

A missing or invalid `value` renders no text and no `datetime`; raw keys / `NaN` / `Invalid Date` never appear.

<DemoBlock title="Invalid and missing values">
  <span>Invalid: </span><oas-relative-time value="not-a-date"></oas-relative-time><span> | Missing: </span><oas-relative-time></oas-relative-time>
</DemoBlock>

## Styling

The host uses `--oas-color-text-secondary` by default and inherits font size; `::part(time)` overrides color and weight.

<style>
.relative-time-accent::part(time) {
  color: var(--oas-color-primary);
  font-weight: 600;
}
</style>

<DemoBlock title="::part(time) customization">
  <oas-relative-time class="relative-time-accent" data-offset="-300" numeric="always" locale="en-US"></oas-relative-time>
</DemoBlock>

## API

### oas-relative-time

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-refresh` | Throttled auto refresh (1s for second-level units, 30s otherwise); `"false"` or absent disables it; pauses while hidden, cleared on disconnect, restored on reconnect | `string` | — |
| `locale` | Relative-time locale (e.g. `zh-CN` / `en-US`); invalid or unsupported tags safely fall back to provider → global i18n → `en-US` | — | — |
| `numeric` | Intl numeric mode: `auto` (default, idiomatic “now / yesterday”) / `always` (always numeric); other values use auto | `string` | `auto` |
| `value` | Target instant: epoch milliseconds or ISO 8601; the property channel also accepts `number` / `Date` | `string \| number \| Date \| null` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Target instant property channel: `number` is epoch milliseconds, `Date` is written back as an ISO attribute, `null` clears (empty state) | `string \| number \| Date \| null` | — |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined prevents an expando from shadowing the value setter before upgrade
  customElements.whenDefined('oas-relative-time').then(() => {
    document.querySelectorAll('oas-relative-time[data-offset]').forEach((node) => {
      const offset = Number(node.getAttribute('data-offset')) || 0
      node.value = Date.now() + offset * 1000
    })
    const dateEl = document.getElementById('relative-time-date')
    if (dateEl) dateEl.value = new Date(Date.now() - 5 * 60 * 1000)
    const autoEl = document.getElementById('relative-time-auto')
    if (autoEl) autoEl.value = Date.now() - 2000
  })
})
</script>
