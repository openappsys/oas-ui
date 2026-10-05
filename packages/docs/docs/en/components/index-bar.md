# IndexBar

A mobile sectioned list with an alphabet index rail: tap or drag a letter to jump to a section, and scrolling highlights the current letter in reverse (scroll spy). Great for quickly locating entries in long lists such as contacts or city pickers.

Pass the data via `sections`; the letter rail is derived from `sections` automatically, so there is nothing extra to maintain.

## Basic usage

Pass a JSON array via `sections` `[{ key, title?, items: [{ label, value? }] }]`; `title` falls back to `key`, and an item's `value` falls back to `label`. Set `height` to make the list scroll within a fixed height.

<DemoBlock title="Basic usage">
  <div style="width: 100%">
    <oas-index-bar id="ib-basic" height="240" sections='[{"key":"A","title":"A","items":[{"label":"Adam","value":"adam"},{"label":"Anna","value":"anna"}]},{"key":"B","items":[{"label":"Ben","value":"ben"},{"label":"Bella","value":"bella"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]},{"key":"G","items":[{"label":"Gina","value":"gina"}]},{"key":"H","items":[{"label":"Hugo","value":"hugo"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## Event feedback

Clicking an item fires `oas-item-click` (`detail: { value, label, section }`); tapping/dragging a letter or a scroll-driven highlight change fires `oas-change` (`detail: { key }`, not fired on initial render).

<DemoBlock title="Event feedback">
  <div style="width: 100%">
    <oas-index-bar id="ib-events" height="240" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"},{"label":"Anna","value":"anna"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]}]'></oas-index-bar>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Item: <span id="ib-item-out">(click an item to see it)</span><br />
    Highlighted letter: <span id="ib-change-out">(tap a letter or scroll the list)</span>
  </p>
  </div>
</DemoBlock>

## Disabling sticky (sticky)

Section headers are sticky by default (`position: sticky`); explicitly set `sticky="false"` to disable so headers scroll with the list.

<DemoBlock title="sticky=false disables sticky headers">
  <div style="width: 100%">
    <oas-index-bar id="ib-nosticky" height="200" sticky="false" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## Scroll linkage (scrollspy)

While the list scrolls, the section whose header last crossed the detection line is highlighted. Without `height` there is no internal scrolling, so the scroll spy listens to the page viewport instead.

<DemoBlock title="No height: the list grows with its content">
  <div style="width: 100%">
    <oas-index-bar id="ib-auto" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## RTL direction

The rail sits at the inline-end (logical properties, flipping with the writing direction): on the right in LTR, on the left in RTL.

<DemoBlock title="RTL (rail on the left)">
  <div style="width: 100%">
    <oas-index-bar id="ib-rtl" dir="rtl" height="200" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## Variable customization

Pure CSS variable openings (no attribute); dark mode picks up tokens automatically:

- `--oas-index-bar-letter-color`: idle letter color, defaults to the secondary text token
- `--oas-index-bar-letter-active-color`: current letter color, defaults to the primary token
- `--oas-index-bar-letter-active-bg`: current letter background, defaults to the hover background token
- `--oas-index-bar-header-bg`: section header background, defaults to the hover background token

<DemoBlock title="Variable customization (active letter color + header background)">
  <div style="width: 100%">
    <oas-index-bar id="ib-var" height="200" style="--oas-index-bar-letter-active-color: var(--oas-color-success-text); --oas-index-bar-header-bg: var(--oas-color-bg-elevated)" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ev = document.getElementById('ib-events')
  const itemOut = document.getElementById('ib-item-out')
  const changeOut = document.getElementById('ib-change-out')
  ev?.addEventListener('oas-item-click', (e) => {
    itemOut.textContent = `oas-item-click: { value: "${e.detail.value}", label: "${e.detail.label}", section: "${e.detail.section}" }`
  })
  ev?.addEventListener('oas-change', (e) => {
    changeOut.textContent = `oas-change: { key: "${e.detail.key}" }`
  })
})
</script>

## API

### oas-index-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `height` | Fixed height of the list area in px; when it overflows the list scrolls internally. When unset the list grows with its content and the scroll spy watches the viewport | `string` | — |
| `sections` | Sections JSON: `[{ key, title?, items: [{ label, value? }] }]`; the letter rail is derived from sections (keys are unique, the first duplicate wins), `title` falls back to `key`, and an item's `value` falls back to `label` | `string` | `[]` |
| `sticky` | Sticky section headers (default true); explicitly set `sticky="false"` to disable | `string` | `true` |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Fired when the highlighted letter changes (via tap/drag jump or scroll linkage), `detail: { key }`; not fired on initial render |
| `oas-item-click` | Fired when a list item is clicked, `detail: { value, label, section }` (`section` is the section key) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-index-bar-header-bg` | `var(--oas-color-bg-hover)` |
| `--oas-index-bar-letter-active-bg` | `var(--oas-color-bg-hover)` |
| `--oas-index-bar-letter-active-color` | `var(--oas-color-primary)` |
| `--oas-index-bar-letter-color` | `var(--oas-color-text-secondary)` |
