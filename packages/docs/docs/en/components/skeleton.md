# Skeleton

Placeholder skeletons for loading states: a full paragraph composition (avatar/title/rows) plus single-shape placeholder blocks (`oas-skeleton-item`), with controlled loading toggle, three animation effects, list repetition, per-row widths, and an anti-flicker delay.

## Basic usage

<DemoBlock title="Basic usage">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton active avatar title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## Combinations

<DemoBlock title="Combinations">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton avatar title rows="2"></oas-skeleton>
      <oas-skeleton rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## Effect

`effect` comes in three modes: `sheen` (sweeping highlight), `pulse` (breathing opacity), and `none` (static, default). `active` is the boolean shortcut for sheen (kept for compatibility); `effect` takes precedence over `active` — an explicit `effect="none"` overrides `active`, and invalid values fall back to the `active` rule.

<DemoBlock title="Three effects">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton effect="sheen" title rows="2"></oas-skeleton>
      <oas-skeleton effect="pulse" title rows="2"></oas-skeleton>
      <oas-skeleton effect="none" title rows="2"></oas-skeleton>
      <oas-skeleton active title rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

Animation duration and skeleton colors can be customized via CSS variables: `--oas-skeleton-duration` (animation duration), `--oas-skeleton-color` (base color), and `--oas-skeleton-sheen` (sheen highlight color).

## Loading toggle

`loading` controls the switch between skeleton and real content: `loading="true"` (or omitted) renders the skeleton, `loading="false"` renders the real content in the default slot. The skeleton container is `aria-hidden="true"` internally (purely decorative, silent to screen readers); hosts are advised to set `aria-busy="true"` on the loading region and remove it when done, so screen readers perceive the loading state.

<DemoBlock title="Loading toggle">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-switch id="sk-load-switch" checked></oas-switch>
      <div aria-busy="true" role="region" aria-label="Details loading region" style="width: 100%">
        <oas-skeleton id="sk-load" avatar title rows="2" effect="sheen">
          <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
            <div style="font-weight: 600">Item title</div>
            <div>Description text: once data loads, the real content in the default slot replaces the skeleton.</div>
          </div>
        </oas-skeleton>
      </div>
    </oas-space>
  </div>
</DemoBlock>

## Anti-flicker delay

`delay` (milliseconds): showing the skeleton is delayed after `loading` becomes `true`; during the delay window neither the skeleton nor the content renders — if the request completes within the window, the skeleton never appears (fast requests don't flash a skeleton).

<DemoBlock title="Anti-flicker delay (delay=500ms)">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-space>
        <oas-button id="sk-delay-fast" size="small">Fast request (150ms)</oas-button>
        <oas-button id="sk-delay-slow" size="small">Slow request (1.2s)</oas-button>
      </oas-space>
      <div id="sk-delay-out" aria-live="polite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-height: 20px">Click a button to simulate a request</div>
      <oas-skeleton id="sk-delay" avatar title rows="2" delay="500" effect="sheen" loading="false">
        <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Real content</div>
      </oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## List count

`count` repeats the whole skeleton group (avatar/title/rows) N times — ideal for list loading placeholders.

<DemoBlock title="count=3">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton avatar title rows="2" count="3" effect="sheen"></oas-skeleton>
  </div>
</DemoBlock>

## Per-row widths

`widths` is a comma-separated list overriding each row's width in order; uncovered rows keep the alternating default widths (92% / 76%), and extra entries beyond the row count are ignored.

<DemoBlock title="widths=100%,80%,45%">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton title rows="3" widths="100%,80%,45%" effect="sheen"></oas-skeleton>
  </div>
</DemoBlock>

## Single shapes: oas-skeleton-item

`oas-skeleton-item` renders a single-shape placeholder block, complementing the full composition: combine blocks freely into cards, tables, forms, and any layout. `type` has seven values: `text` (text row, default), `title`, `avatar` (circle), `button` (button-shaped), `input` (input-shaped), `image` (image block), and `rect` (generic rectangle).

<DemoBlock title="Seven types">
  <div style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="avatar" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="title" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="button" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="image" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="rect" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

`width` / `height` accept free CSS values and override each `type`'s default size inline; `effect` follows the same semantics as `oas-skeleton` (self-controlled when used standalone, default `none`).

<DemoBlock title="Custom sizes">
  <div style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="image" width="240px" height="120px" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="rect" width="120px" height="12px" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" width="45%" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

### Recipes

Card placeholder (avatar + title + two text rows):

<DemoBlock title="Card">
  <div aria-busy="true" role="region" aria-label="Card loading" style="width: 100%; max-width: 360px; display: flex; gap: var(--oas-space-3); align-items: flex-start">
    <oas-skeleton-item type="avatar" effect="sheen" style="width: auto; flex: none"></oas-skeleton-item>
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--oas-space-2)">
      <oas-skeleton-item type="title" width="70%" effect="sheen"></oas-skeleton-item>
      <oas-skeleton-item type="text" effect="sheen"></oas-skeleton-item>
      <oas-skeleton-item type="text" width="55%" effect="sheen"></oas-skeleton-item>
    </div>
  </div>
</DemoBlock>

Table placeholder (rows × columns grid):

<DemoBlock title="Table rows">
  <div aria-busy="true" role="region" aria-label="Table loading" style="width: 100%; max-width: 480px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--oas-space-2)">
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
  </div>
</DemoBlock>

Form placeholder (three inputs + submit button):

<DemoBlock title="Form">
  <div aria-busy="true" role="region" aria-label="Form loading" style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" width="60%" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="button" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

## Accessibility

Skeletons and `oas-skeleton-item` are purely decorative: their internal elements are `aria-hidden="true"` and expose nothing to screen readers. Host-side recommendation: set `aria-busy="true"` on the loading region container (remove it when data arrives) and give the region an accessible name (e.g. `role="region"` + `aria-label`), so screen readers perceive "region updating" instead of announcing each skeleton block.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Loading toggle: oas-switch drives the loading attribute
  const sw = document.getElementById('sk-load-switch')
  const sk = document.getElementById('sk-load')
  const region = document.getElementById('sk-load')?.closest('[aria-busy]')
  sw?.addEventListener('oas-change', (e) => {
    if (!sk) return
    const loading = e.detail.checked
    if (loading) sk.setAttribute('loading', '')
    else sk.setAttribute('loading', 'false')
    if (region) region.setAttribute('aria-busy', String(loading))
  })
  // Anti-flicker: fast request (150ms < delay 500ms) never shows the skeleton; slow request shows it then switches back
  const fast = document.getElementById('sk-delay-fast')
  const slow = document.getElementById('sk-delay-slow')
  const delaySk = document.getElementById('sk-delay')
  const out = document.getElementById('sk-delay-out')
  let token = 0
  const request = (ms, label) => {
    const cur = ++token
    delaySk?.setAttribute('loading', '')
    if (out) out.textContent = `${label} request in flight…`
    setTimeout(() => {
      if (cur !== token) return
      delaySk?.setAttribute('loading', 'false')
      if (out) out.textContent = ms <= 500 ? `${label} request done: skeleton never shown (anti-flicker)` : `${label} request done`
    }, ms)
  }
  fast?.addEventListener('oas-click', () => request(150, 'Fast'))
  slow?.addEventListener('oas-click', () => request(1200, 'Slow'))
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Whether to enable the shimmer animation | `boolean` | — |
| `avatar` | Whether to show the avatar placeholder | `boolean` | — |
| `count` | Repeat count of the whole skeleton group (list scenarios), default 1 | `string` | `1` |
| `delay` | Anti-flicker delay (ms): the skeleton shows only after this window once loading turns true; if loading finishes within the window the skeleton never appears; neither skeleton nor content renders inside the window | `string` | — |
| `effect` | Animation: `sheen` / `pulse` / `none` (default); wins over active (active remains as a sheen shortcut) | `string` | — |
| `loading` | Controlled toggle: `true` (default) renders the skeleton, `"false"` renders the default slot content | `string` | `true` |
| `rows` | Number of paragraph rows | `string` | `3` |
| `title` | Whether to show the title placeholder (title is a presence-only switch, its value is not rendered; absorbed from the host on read so no native hover tooltip remains) | `string` | — |
| `widths` | Comma-separated per-row widths (e.g. `100%,80%,45%`), overriding the default text row widths inline | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | Real content outlet: rendered when loading="false" (skeleton and content both live in shadow DOM, toggled via hidden) |
