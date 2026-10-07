# Button

Basic button component, an enhanced native `<button>`.

## Types

<DemoBlock title="Button types">
  <oas-button>Default</oas-button>
  <oas-button type="primary">Primary</oas-button>
  <oas-button type="success">Success</oas-button>
  <oas-button type="warning">Warning</oas-button>
  <oas-button type="danger">Danger</oas-button>
  <oas-button type="text">Text</oas-button>
</DemoBlock>

## Sizes

<DemoBlock title="Five sizes">
  <oas-button size="xs">XS</oas-button>
  <oas-button size="small">Small</oas-button>
  <oas-button size="medium">Medium</oas-button>
  <oas-button size="large">Large</oas-button>
  <oas-button size="xl">XL</oas-button>
</DemoBlock>

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning.

<DemoBlock title="Five sizes · primary">
  <oas-button type="primary" size="xs">XS</oas-button>
  <oas-button type="primary" size="small">Small</oas-button>
  <oas-button type="primary" size="medium">Medium</oas-button>
  <oas-button type="primary" size="large">Large</oas-button>
  <oas-button type="primary" size="xl">XL</oas-button>
</DemoBlock>

<DemoBlock title="Five sizes · icon-only">
  <oas-button icon="search" size="xs" aria-label="Search"></oas-button>
  <oas-button icon="search" size="small" aria-label="Search"></oas-button>
  <oas-button icon="search" size="medium" aria-label="Search"></oas-button>
  <oas-button icon="search" size="large" aria-label="Search"></oas-button>
  <oas-button icon="search" size="xl" aria-label="Search"></oas-button>
</DemoBlock>

## Disabled & Loading

`disabled` disables the button; `loading` enters the loading state — the original label keeps its space (width stays unchanged) and a spinner is centered; pair with `loading-text` to show a loading message.

<DemoBlock title="Disabled and loading states">
  <oas-button disabled>Disabled</oas-button>
  <oas-button type="primary" loading loading-text="Loading…">Load</oas-button>
  <oas-button type="success" loading loading-text="Submitting…">Submit</oas-button>
</DemoBlock>

### Async auto loading

With `loading="auto"`, the button automatically enters the loading state while the host `oas-click` handler returns a Promise, and exits after the Promise resolves or rejects.

<DemoBlock title="Auto loading for async submit">
  <oas-button type="primary" loading="auto" loading-text="Submitting…" onoas-click="new Promise((r) => setTimeout(() => { message.success('Submitted'); r() }, 1500))">Click to submit</oas-button>
  <oas-button type="success" loading="auto" onoas-click="new Promise((r) => setTimeout(() => { message.success('Saved'); r() }, 1200))">Save async</oas-button>
</DemoBlock>

### Disabled but focusable

`disabled-focusable` renders a disabled look (desaturated + `aria-disabled`) without a native `disabled` attribute — still focusable and hoverable, ideal for wrapping in a tooltip that explains why it is disabled; clicks are intercepted by the component and `oas-click` is not dispatched.

<DemoBlock title="Disabled but focusable (with tooltip)">
  <oas-tooltip content="You need to sign in first to perform this action">
    <oas-button type="primary" disabled-focusable>Sign in to continue</oas-button>
  </oas-tooltip>
  <oas-tooltip content="There is no file to download">
    <oas-button icon="download" disabled-focusable>Download report</oas-button>
  </oas-tooltip>
</DemoBlock>

## Events

<DemoBlock title="Click event">
  <oas-button type="primary" onoas-click="message.info('oas-click event fired')">Click me</oas-button>
</DemoBlock>

Clicking dispatches the `oas-click` CustomEvent (bubbles + composed); `detail.originalEvent` is the native MouseEvent.

## Icon buttons

`icon` renders an icon before the text (reusing the oas-icon icon set, `IconName`); the spacing between the icon and text follows `--oas-space-2`.

<DemoBlock title="Icon + text">
  <oas-button type="primary" icon="search">Search</oas-button>
  <oas-button type="success" icon="download">Download</oas-button>
  <oas-button type="danger" icon="trash">Delete</oas-button>
  <oas-button icon="plus">New</oas-button>
</DemoBlock>

Without text, the button becomes an equal-width square and needs an `aria-label` for an accessible name; when not set explicitly, the icon name is used as a fallback (e.g. `icon="close"` → `aria-label="close"`). It is recommended to provide an explicit label.

<DemoBlock title="Icon-only buttons">
  <oas-button type="primary" icon="check" aria-label="Confirm"></oas-button>
  <oas-button icon="search" aria-label="Search"></oas-button>
  <oas-button type="danger" icon="trash" aria-label="Delete"></oas-button>
  <oas-button icon="heart" aria-label="Favorite"></oas-button>
</DemoBlock>

## Block

`block` makes the button fill the full width of its parent container.

<DemoBlock title="Block buttons">
  <oas-button block type="primary">Block button</oas-button>
  <oas-button block type="success" icon="download">Download</oas-button>
</DemoBlock>

## Rounded

`round` applies a pill radius (`--oas-radius-full`, falling back to `999px` when the token is unavailable).

<DemoBlock title="Rounded buttons">
  <oas-button round type="primary" icon="check">Done</oas-button>
  <oas-button round icon="search" aria-label="Search"></oas-button>
  <oas-button round type="danger">Unsubscribe</oas-button>
</DemoBlock>

## Ghost

`ghost` renders a transparent background with an outline; the outline and text are colored by `type` and darken on hover.

<DemoBlock title="Ghost buttons">
  <oas-button ghost>Default ghost</oas-button>
  <oas-button ghost type="primary">Primary ghost</oas-button>
  <oas-button ghost type="success">Success ghost</oas-button>
  <oas-button ghost type="warning">Warning ghost</oas-button>
  <oas-button ghost type="danger" icon="trash">Danger ghost</oas-button>
</DemoBlock>

## Circle

`circle` turns the button into a circle; icon-only buttons combine equal-width and full rounding into a circle.

<DemoBlock title="Circle buttons">
  <oas-button circle icon="search" aria-label="Search"></oas-button>
  <oas-button circle type="primary" icon="check" aria-label="Confirm"></oas-button>
  <oas-button circle type="danger" icon="trash" aria-label="Delete"></oas-button>
</DemoBlock>

## Icon position

`icon-position` controls the icon/text order: `start` (default, icon on the left) or `end` (icon on the right).

<DemoBlock title="Icon on the right">
  <oas-button icon-position="end" type="primary" icon="download">Download</oas-button>
  <oas-button icon-position="end" icon="chevron-right">Next</oas-button>
</DemoBlock>

## Dual icons

`icon` renders an icon before the text and `icon-end` renders a second icon after the text (both reuse the oas-icon set); they can coexist with `icon-position`.

<DemoBlock title="Dual icons">
  <oas-button type="primary" icon="download" icon-end="arrow-right">Download & continue</oas-button>
  <oas-button icon="user" icon-end="chevron-right">Next</oas-button>
  <oas-button type="success" icon="check-circle" icon-end="arrow-right">Confirm & submit</oas-button>
</DemoBlock>

## Secondary text (compound two-row variant)

When the `slot="description"` secondary line is present, the button switches to a vertical two-row layout: the main row (icon + text) on top, the secondary line below (smaller, muted). Good for card entries, settings entries, upload entries — "main action + one line of explanation". Fully compatible with loading / icon / disabled / href.

<DemoBlock title="Two-row button">
  <oas-space size="small">
    <oas-button type="primary" icon="upload">Upload file<span slot="description">Drag & drop supported, ≤ 500KB per file</span></oas-button>
    <oas-button icon="setting">Preferences<span slot="description">Shortcut ⌘ + ,</span></oas-button>
    <oas-button size="large" type="primary" loading loading-text="Submitting">Submit order<span slot="description">~3 seconds to complete</span></oas-button>
  </oas-space>
</DemoBlock>

## Link button

Setting `href` renders a native link (`<a>`); `target` controls how it opens (`_blank` / `_self` etc.); `download` (file download) and `rel` (link relationship) are passed through.

<DemoBlock title="Link buttons">
  <oas-button href="#">Default link</oas-button>
  <oas-button href="#" target="_blank" type="primary">Open in new tab</oas-button>
</DemoBlock>

<DemoBlock title="Download and rel">
  <oas-button href="/files/report.zip" download="quarterly-report.zip" type="primary">Download quarterly report</oas-button>
  <oas-button href="https://example.com" target="_blank" rel="noopener">External link (rel=noopener)</oas-button>
</DemoBlock>

## Plain

`plain` uses a low-contrast, subtle style (transparent background with softened outline and text), gentler on light backgrounds.

<DemoBlock title="Plain buttons">
  <oas-button plain>Plain button</oas-button>
  <oas-button plain type="primary">Primary plain</oas-button>
  <oas-button plain type="danger">Danger plain</oas-button>
</DemoBlock>

## Variant

`variant` controls the button shape, orthogonal to the `type` semantic color: `solid` (default filled) / `outlined` / `dashed` / `filled` (soft) / `text` / `link`. Legacy `ghost` equals `outlined`, `plain` equals `filled`.

<DemoBlock title="Outlined / Dashed / Filled">
  <oas-button variant="outlined" type="primary">Outlined</oas-button>
  <oas-button variant="dashed" type="primary">Dashed</oas-button>
  <oas-button variant="filled" type="primary">Filled</oas-button>
  <oas-button variant="outlined">Default outlined</oas-button>
  <oas-button variant="dashed">Default dashed</oas-button>
</DemoBlock>

<DemoBlock title="Text / Link">
  <oas-button variant="text">Text button</oas-button>
  <oas-button variant="text" type="primary">Primary text</oas-button>
  <oas-button variant="link" href="#">Link button</oas-button>
</DemoBlock>

## Custom color

`color` overrides the `type` semantic color with any color value.

Color priority: `--oas-button-bg` (host-injected CSS variable, gradients allowed) > `color` attribute > `type` semantic color > default gray. In `outlined` / `filled` / `dashed` / `text` variants, `color` tints the border/text/light background; for solid buttons the text color is picked black or white by background luminance (stays readable in dark mode).

Custom color values are rendered as-is (never rewritten) — make sure the text/background contrast meets WCAG AA (4.5:1).

<DemoBlock title="Custom color">
  <oas-button color="#7c3aed">Purple solid</oas-button>
  <oas-button color="#047857" variant="outlined">Green outlined</oas-button>
  <oas-button color="#be185d" variant="filled">Pink filled</oas-button>
</DemoBlock>

## Press feedback

`wave` enables a subtle press feedback (slight sink + darken, on by default); `wave="false"` disables it.

<DemoBlock title="Press feedback">
  <oas-button type="primary">Press me (on by default)</oas-button>
  <oas-button wave="false">Feedback off</oas-button>
</DemoBlock>

## CJK auto spacing

`auto-insert-space` inserts a space between two consecutive CJK characters (typography optimization, off by default).

<DemoBlock title="CJK auto spacing">
  <oas-button auto-insert-space>保存设置</oas-button>
  <oas-button auto-insert-space type="primary">确认提交订单</oas-button>
</DemoBlock>

## Autofocus

`autofocus` gives the button focus after page load (native `autofocus` does not pierce Shadow DOM; the component forwards focus to the inner button on mount).

<DemoBlock title="autofocus">
  <oas-button autofocus type="primary">Focused on load</oas-button>
  <oas-button>Normal button</oas-button>
</DemoBlock>

## Long content wrapping

Buttons are single-line by default (`white-space: nowrap`). With the explicit `wrap` attribute, long text wraps within a constrained width (parent container or `width` / `max-width`) and the box grows with the content (same height as default when it fits on one line).

<DemoBlock title="wrap for long content">
  <oas-button wrap style="width: 120px;">A long button label that wraps automatically</oas-button>
  <oas-button wrap type="primary" style="max-width: 160px;">Long primary button text wraps in a narrow container</oas-button>
</DemoBlock>

## Touch targets on mobile

On touch devices (`pointer: coarse`) the button minimum height grows to 44px (`--oas-touch-target-min`): small sizes such as the 32px default or the 20px xs become 44px tall on touch, while sizes already ≥44px (e.g. xl) are unchanged; `icon-only` / `circle` buttons become 44×44 hit areas via `aspect-ratio`. Only the height grows — padding, font size, and border radius stay untouched; desktop (fine pointer) is unaffected.

## Native form submission

`html-type` sets the native form behavior: `button` (default, no form behavior) / `submit` / `reset`. Buttons inside Shadow DOM do not participate in native form submission — the component bridges automatically: clicking triggers native submit/reset on the target form (the enclosing `<form>`, or the form id referenced by `form`); `formaction` / `formmethod` / `formnovalidate` / `formtarget` take effect through the native submitter mechanism (overriding the form's own action / method / novalidate / target). Submission is not triggered in `disabled` / `loading` state; in `href` link mode this attribute group is silently ignored.

> Bridging notes (two boundaries): ① the bridge works via a transient native proxy submitter injected at click time — the form's `submit` event sees this proxy as `submitter`, not the `oas-button` (the proxy carries `data-oas-form-proxy` for identification); hosts with click delegation on the form area will see both the host's synthetic click and the proxy's native click bubble. ② `html-type="submit"` does not work inside `oas-form`: its real `<form>` lives in shadow DOM, so a light-DOM proxy finds no ancestor form — use `oas-form`'s `submit()` method / `oas-submit` event instead.

<DemoBlock title="Native form submission (html-type / form attributes)">
  <form id="btn-native-form" style="display: flex; flex-wrap: wrap; gap: var(--oas-space-3); align-items: flex-end">
    <oas-input name="username" label="Username" value="OAS-UI"></oas-input>
    <oas-input name="email" label="Email" value="hello@example.com"></oas-input>
    <oas-space>
      <oas-button html-type="submit" type="primary">Submit</oas-button>
      <oas-button html-type="submit" formtarget="_blank">Submit in new tab (formtarget)</oas-button>
      <oas-button html-type="reset">Reset</oas-button>
      <oas-button html-type="submit" formnovalidate formaction="/search" formmethod="post">No-validate submit (formaction/formmethod)</oas-button>
    </oas-space>
  </form>
  <div id="btn-form-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2); min-height: 20px"></div>
</DemoBlock>

Clicking "Submit" fires the native `submit` event (the demo calls `preventDefault` and shows the fields about to be submitted); "Reset" restores the initial input values and fires `reset`; "No-validate submit" demonstrates `formnovalidate` skipping required validation plus `formaction`/`formmethod` overriding the submission target.

## Custom Loading Icon

`slot="loading-icon"` replaces the built-in spinner ring with custom content while loading (the spinner positioning is reused, so stable loading width etc. are unchanged); when absent, the built-in spinner shows. Commonly paired with `oas-icon spin` for a themed loading icon.

<DemoBlock title="loading-icon slot">
  <oas-button loading type="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-icon slot="loading-icon" name="loading" spin></oas-icon>
    Icon loading
  </oas-button>
  <oas-button loading style="margin-inline-end: var(--oas-space-4)">
    <span slot="loading-icon" style="font-size: 0.9em">⟳</span>
    Glyph loading
  </oas-button>
  <oas-button loading type="danger">
    Built-in spinner (default)
  </oas-button>
</DemoBlock>

## API

### oas-button

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-insert-space` | CJK auto spacing: inserts a space between two consecutive CJK characters (off by default) | `string` | — |
| `autofocus` | Autofocus: focuses the inner button on mount (native autofocus does not pierce Shadow DOM; the component forwards it) | `boolean` | — |
| `block` | Fill the full width of the parent container (block level) | `boolean` | — |
| `circle` | Circle button (icon-only, square + full rounding) | `boolean` | — |
| `color` | Custom color: overrides the `type` semantic color (any color value) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `disabled-focusable` | Visually disabled but stays focusable/hoverable (aria-disabled + click intercepted), for tooltips explaining why | `boolean` | — |
| `download` | Passthrough `download` attribute in link mode (href) for file-download buttons | `string` | — |
| `form` | Associated form id for buttons outside the target form (native form-attribute association) | `string` | — |
| `formaction` | Target URL for this submission (overrides the form action) | `string` | — |
| `formmethod` | HTTP method for this submission (get/post/dialog, overrides the form method) | `string` | — |
| `formnovalidate` | Skip native validation for this submission only | `boolean` | — |
| `formtarget` | Browsing target for the response (_blank/_self etc., overrides the form target) | `string` | — |
| `ghost` | Ghost/outline style: transparent background + outline colored by `type`, darkens on hover | `boolean` | — |
| `href` | Link address: renders a native `<a>` when set | `string` | — |
| `html-type` | Native form behavior: `button` (default, none) / `submit` submits the containing or `form`-targeted form / `reset` resets it (bridged via a proxy submitter) | `string` | `button` |
| `icon` | Icon name (reusing the oas-icon icon set); without text it becomes an equal-width square and uses the icon name as the fallback label | `string` | — |
| `icon-end` | A second icon after the text (iconRegistry name), works with `icon`/`icon-position` — e.g. left icon + right dropdown arrow | `string` | — |
| `icon-position` | Icon position: `start` (default, left) / `end` (right) | `string` | `start` |
| `loading` | Loading state | — | — |
| `loading-text` | Text shown while loading (e.g. "Submitting…"); replaces the label content when set | `string` | — |
| `plain` | Plain style: low-contrast soft (transparent bg + softened text), equals `variant="filled"` | `boolean` | — |
| `rel` | Passthrough `rel` attribute in link mode (pair `noopener` with `target="_blank"`) | `string` | — |
| `round` | Pill radius (`--oas-radius-full` / `999px`) | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `ButtonSize` | `medium` |
| `target` | How the link opens (`_blank` / `_self` etc.), with `href` | `string` | — |
| `type` | Type | `ButtonType` | `default` |
| `variant` | Shape (orthogonal to `type`): `solid` (default filled) / `outlined` / `dashed` / `filled` (soft) / `text` / `link` | `ButtonVariant \| ''` | — |
| `wave` | Press feedback: slight sink + darken (on by default); `wave="false"` disables | `string` | `true` |
| `wrap` | Long-text wrapping: single-line nowrap by default; when enabled, content wraps within constrained widths and the box grows with it | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Button content (text / icon) |
| `description` | Secondary text line (compound two-row variant): when present, the button switches to a vertical two-row layout (main row on top, secondary below, smaller muted text) |
| `loading-icon` | Custom loading icon replacing the built-in spinner ring when slot content is present |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-button-bg` | — | `var(--oas-color-primary)` |
| `--oas-button-color` | — | `var(--oas-color-text-primary)` |
| `--oas-button-color-deep` | Text-safe deepened variant of the custom `color`: the color-mix used for hover/active and outlined/dashed/filled text (injected by the component via `--oas-deep-mix` / `--oas-deep-sink`; inert without a custom color) | `var(--btn-color, var(--oas-color-text-primary))` |
| `--oas-button-group-radius` | — | `var(--oas-radius-md)` |
| `--oas-button-group-width` | — | `auto` |
| `--oas-button-height` | Button height override (falls back to the size-tier value by default); containers needing full-row-height buttons (e.g. swipe-cell actions) inject 100% via ::slotted (built into swipe-cell) | `var(--oas-control-height-md)` |
| `--oas-button-on-color` | — | `var(--oas-color-text-on-primary)` |
| `--oas-glass-px` | — | `50%` |
| `--oas-glass-py` | — | `50%` |
| `--oas-glass-refraction` | Liquid-glass edge refraction filter (active under `data-glass`, default none); for local opt-out override with an **empty** value (`--oas-glass-refraction: ;`)—not `none` (mixing `none` with button-state brightness() invalidates the whole filter declaration) | `none` |
| `--oas-glass-sheen` | — | `transparent` |
| `--oas-glass-sheen-press` | — | `transparent` |
| `--oas-glass-sheen-size` | — | `180px` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const form = document.getElementById('btn-native-form')
  const out = document.getElementById('btn-form-out')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const entries = [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`).join(' & ')
    out.textContent = `submit (intercepted by the demo, no navigation): ${entries || '(empty form)'}`
  })
  form?.addEventListener('reset', () => {
    out.textContent = 'reset: inputs restored to initial values'
  })
})
</script>
