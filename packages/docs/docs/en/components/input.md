# Input

An enhanced base input built on the native `<input>` element.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-input placeholder="Please enter content" style="width: 240px"></oas-input>
</DemoBlock>

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-input id="input-label-set" label="Login email" placeholder="name@example.com" style="width: 240px"></oas-input>
  <oas-input id="input-label" placeholder="No label, falls back to placeholder" style="width: 240px"></oas-input>
  <span id="input-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

`label` serves as the accessible name (`aria-label`) source for the input, announced by screen readers. When `label` is not set, it falls back to `placeholder` → built-in text "输入框"; once set (e.g. "Login email"), it overrides the fallback chain.

## Types

<DemoBlock title="type">
  <oas-input type="password" placeholder="Password" style="width: 240px"></oas-input>
  <oas-input type="number" placeholder="Number" style="width: 240px"></oas-input>
  <oas-input type="email" placeholder="Email" style="width: 240px"></oas-input>
</DemoBlock>

`type` is passed through to the native input type, supporting `text` / `password` / `number` / `email`, etc.

## Password Visibility Toggle

<DemoBlock title="show-password">
  <oas-input type="password" show-password placeholder="Password" value="oasui123" style="width: 240px"></oas-input>
</DemoBlock>

With `show-password` and `type="password"`, an eye button is rendered on the right side of the input; clicking toggles between plaintext and masked text. The button has an `aria-label` (locale text), `aria-pressed`, and a focus ring when focused.

## Clearable

<DemoBlock title="clearable">
  <oas-input clearable value="One-click clear when there is content" style="width: 240px"></oas-input>
</DemoBlock>

When there is content and `clearable` is set, a clear button is shown; clicking clears the value, refocuses, and dispatches `oas-clear`.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <oas-input disabled placeholder="Disabled" style="width: 240px"></oas-input>
  <oas-input readonly value="Read-only content" style="width: 240px"></oas-input>
</DemoBlock>

## Addons

<DemoBlock title="addon-before / addon-after">
  <oas-input addon-before="http://" placeholder="Domain" style="width: 240px"></oas-input>
  <oas-input addon-after="USD" placeholder="Amount" style="width: 240px"></oas-input>
  <oas-input addon-before="¥" addon-after="/person" placeholder="Unit price" style="width: 240px"></oas-input>
</DemoBlock>

`addon-before` / `addon-after` render external addon text blocks (e.g. units, domains) outside the input, going through dedicated `::part(prepend)` / `::part(append)` parts; addons are greyed out when disabled.

## Icons

<DemoBlock title="prefix-icon / suffix-icon">
  <oas-input prefix-icon="search" placeholder="Search" style="width: 240px"></oas-input>
  <oas-input suffix-icon="eye" placeholder="Password" type="password" style="width: 240px"></oas-input>
</DemoBlock>

`prefix-icon` / `suffix-icon` accept icon names (from `@oas-ui/icons` iconRegistry) and inline-render decorative SVG icons.

## Inline Affixes & Clear Together

<DemoBlock title="prefix / suffix + clearable">
  <oas-input prefix-text="$" suffix-text=".00" clearable value="1280" style="width: 240px"></oas-input>
  <oas-input suffix-icon="chevron-down" clearable value="Clearable with icon" style="width: 240px"></oas-input>
</DemoBlock>

`prefix-text` / `suffix-text` are inline text inside the input and can coexist with `clearable`, icons, and addons without conflicts.

## Character Count

<DemoBlock title="show-count + maxlength">
  <oas-input show-count maxlength="10" placeholder="Up to 10 characters" style="width: 240px"></oas-input>
  <oas-input show-count value="No length limit" style="width: 240px"></oas-input>
</DemoBlock>

`show-count` displays a character counter at the bottom-right of the input: with `maxlength` it shows `current/maxlength`, without it just the current length; `maxlength` is also passed through to the native input to limit input length. When the limit is exceeded, the counter number turns danger-colored.

## Enter Submit Event

<DemoBlock title="oas-enter">
  <oas-input id="input-enter" placeholder="Type then press Enter" style="width: 240px"></oas-input>
  <span id="enter-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

Pressing Enter while typing (not an IME composition commit) dispatches `oas-enter` with `detail: { value }`.

## Events

<DemoBlock title="Input and clear events">
  <oas-input id="input-event" clearable placeholder="Type or click to clear" style="width: 240px"></oas-input>
  <span id="input-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

Listen to `oas-input` (while typing) and `oas-clear` (on clear):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('input-event')
  const out = document.getElementById('input-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })
  const enter = document.getElementById('input-enter')
  const enterOut = document.getElementById('enter-output')
  enter?.addEventListener('oas-enter', (e) => {
    enterOut.textContent = `oas-enter: ${e.detail.value}`
  })

  // label (accessible name) demo: read the inner input's aria-label after the component upgrades
  const labelSet = document.getElementById('input-label-set')
  const labelFallback = document.getElementById('input-label')
  const labelOut = document.getElementById('input-label-output')
  const readLabel = () => {
    const a = labelSet?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    const b = labelFallback?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    if (a !== undefined && b !== undefined) {
      labelOut.textContent = `aria-label: set "${a}" / fallback "${b}"`
    } else {
      setTimeout(readLabel, 60)
    }
  }
  readLabel()

  // focus / blur / change + select() method
  const fcb = document.getElementById('input-fcb')
  const fcbOut = document.getElementById('input-fcb-output')
  fcb?.addEventListener('oas-focus', () => (fcbOut.textContent = 'oas-focus'))
  fcb?.addEventListener('oas-blur', () => (fcbOut.textContent = 'oas-blur'))
  fcb?.addEventListener('oas-change', (e) => (fcbOut.textContent = `oas-change: ${e.detail.value}`))
  document.getElementById('btn-input-select')?.addEventListener('click', () => {
    fcb?.focus()
    fcb?.select()
    fcbOut.textContent = 'select() called (content selected)'
  })

  // addon slot search composition
  document.getElementById('input-search-btn')?.addEventListener('click', () => {
    const el = document.getElementById('input-search-output'); if (el) el.textContent = 'Search triggered'
  })

  // allow-over-max validate feedback
  const over = document.getElementById('input-overmax')
  const overOut = document.getElementById('input-overmax-output')
  over?.addEventListener('oas-validate', (e) => {
    overOut.textContent = e.detail.error
      ? `oas-validate: ${e.detail.error}`
      : 'oas-validate: back within limit'
  })

  // formatter / parser (property channel only): thousand separators
  const fmt = document.getElementById('input-format')
  const fmtOut = document.getElementById('input-format-output')
  if (fmt) {
    fmt.formatter = (v) => v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    fmt.parser = (v) => v.replace(/,/g, '')
    fmt.addEventListener('oas-input', (e) => {
      fmtOut.textContent = `raw value: ${e.detail.value}`
    })
  }
})
</script>

## Complex Affixes (slot distribution)

<DemoBlock title="slot=prefix / slot=suffix">
  <oas-input placeholder="Search username" style="width: 240px">
    <oas-icon slot="prefix" name="search"></oas-icon>
  </oas-input>
  <oas-input placeholder="Phone number" style="width: 240px">
    <span slot="suffix">📱</span>
  </oas-input>
  <oas-input placeholder="Amount" value="1280" prefix-text="¥" suffix-text=".00" style="width: 240px"></oas-input>
</DemoBlock>

Use the `prefix-text` / `suffix-text` attributes for simple text; for complex content (icons/buttons/badges etc.) distribute via the same-named `slot="prefix"` / `slot="suffix"` slots — distributed content natively replaces the attribute text. In plain HTML, the legacy `prefix` / `suffix` attributes still work as aliases.

## Sizes

<DemoBlock title="size">
  <oas-input size="small" placeholder="Small" style="width: 200px"></oas-input>
  <oas-input placeholder="Medium (default)" style="width: 200px"></oas-input>
  <oas-input size="large" placeholder="Large" style="width: 200px"></oas-input>
</DemoBlock>

`size` supports `small` / `medium` (default) / `large`, with heights aligned to the global size tokens (`--oas-control-height-sm/md/lg`, 24/32/40px). Font size, inline affixes, addons, and the clear/eye buttons scale together. When not set, it inherits the `size` injected by the nearest `oas-config-provider` (global form density).

## Variants

<DemoBlock title="variant">
  <oas-input placeholder="outlined (default)" style="width: 200px"></oas-input>
  <oas-input variant="filled" placeholder="filled" style="width: 200px"></oas-input>
  <oas-input variant="borderless" placeholder="borderless" style="width: 200px"></oas-input>
</DemoBlock>

`variant` supports `outlined` (default) / `filled` (filled background, border appears on focus) / `borderless` (no border or background, for plain-text embedding scenarios).

## Validation Status

<DemoBlock title="status">
  <oas-input status="error" value="Validation failed" style="width: 200px"></oas-input>
  <oas-input status="warning" value="Warning" style="width: 200px"></oas-input>
  <oas-input status="success" value="Passed" style="width: 200px"></oas-input>
</DemoBlock>

`status` supports `error` / `warning` / `success`: the border and focus ring switch to the semantic color. `error` also syncs `aria-invalid="true"` onto the inner input (announced as invalid by screen readers); `warning` / `success` are visual-only without invalid semantics. The existing channel where form validation (`oas-form`) writes host-level `aria-invalid` still works and composes with `status` (error takes priority).

## Native Attribute Passthrough

<DemoBlock title="Native attribute passthrough">
  <oas-input name="username" autocomplete="username" required placeholder="Username (required)" style="width: 240px"></oas-input>
  <oas-input name="code" inputmode="numeric" maxlength="6" placeholder="Code (numeric keyboard)" style="width: 240px"></oas-input>
  <oas-input name="nick" minlength="2" spellcheck="false" enterkeyhint="done" placeholder="Nickname (min 2 chars)" style="width: 240px"></oas-input>
</DemoBlock>

The following native attributes are mirrored onto the inner native input (and removed in sync when the host attribute is removed): `name` / `autocomplete` / `autofocus` / `inputmode` / `minlength` / `required` / `spellcheck` / `enterkeyhint` / `pattern`. Useful for native form semantics, autofill, and mobile keyboard hints (`inputmode` / `enterkeyhint`).

## Focus & Commit Events

<DemoBlock title="oas-focus / oas-blur / oas-change + select()">
  <oas-input id="input-fcb" placeholder="Focus, type, then blur" style="width: 220px"></oas-input>
  <oas-button id="btn-input-select" size="small">Select all</oas-button>
  <span id="input-fcb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

- `oas-focus` / `oas-blur`: dispatched when the inner input gains/loses focus, `detail: { value }` carries the current value.
- `oas-change`: **commit semantics** — dispatched on blur or Enter only when the value changed since the last commit (not on every keystroke, unlike `oas-input`).
- `select()` method: selects all content (delegates to the native input.select); `blur()` delegates likewise.

## Complex Addons (slot distribution)

<DemoBlock title="slot=prepend / slot=append (text / icons / buttons)">
  <oas-input placeholder="Enter site name" style="width: 360px">
    <span slot="prepend">http://</span>
    <span slot="append">.com</span>
  </oas-input>
  <oas-input placeholder="Search keyword" style="width: 300px">
    <oas-icon slot="prefix" name="search"></oas-icon>
    <oas-button slot="append" id="input-search-btn" type="primary">Search</oas-button>
  </oas-input>
  <span id="input-search-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 100px"></span>
</DemoBlock>

The `addon-before` / `addon-after` attributes accept text only; for complex content distribute via `slot="prepend"` / `slot="append"`. Addon slots suit **plain text, icons and buttons** — elements visually at home on the gray addon surface (radius merging / border dedup work the same as with the addon attributes, and distributed content natively replaces the attribute fallback across the two coexisting channels). **Avoid dropping bordered compound controls like selectors into addon slots**: the host cannot safely strip their internal styles across the Shadow boundary (their dropdown shares color tokens with the trigger — making them transparent would also transparentize the dropdown). To compose a selector with an input, use the `oas-compact` container:

<DemoBlock title="select + input composition (oas-compact)">
  <oas-compact style="width: 420px">
    <oas-select placeholder="Protocol" options='[{"label":"http://","value":"http"},{"label":"https://","value":"https"}]' style="width: 120px"></oas-select>
    <oas-input placeholder="Enter site name"></oas-input>
    <oas-button type="primary">Go</oas-button>
  </oas-compact>
</DemoBlock>

## Count Position & Grapheme Counting

<DemoBlock title="count-position + emoji grapheme counting">
  <oas-input show-count count-position="inside" maxlength="10" placeholder="Counter inside" style="width: 220px"></oas-input>
  <oas-input show-count maxlength="10" value="👍👨‍👩‍👧你" placeholder="Emoji counted as graphemes" style="width: 220px"></oas-input>
</DemoBlock>

`show-count` counts by **grapheme clusters** (built-in `Intl.Segmenter`, falling back to code points when unavailable) — emoji and ZWJ sequences (like the family emoji) count as 1, avoiding the JS `length` behavior that counts one emoji as multiple. `count-position="inside"` moves the counter to the right inside the input (default `outside`, bottom-right). Note: native `maxlength` truncation still uses the UTF-16 code-unit metric — counting and truncation are separate concerns (see `allow-over-max` below for over-limit scenarios).

## Allow Over Max

<DemoBlock title="allow-over-max + oas-validate">
  <oas-input id="input-overmax" allow-over-max show-count maxlength="5" placeholder="Keep typing past 5 chars" style="width: 240px"></oas-input>
  <span id="input-overmax-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

By default `maxlength` is passed through to the native hard truncation; with `allow-over-max`, input beyond the limit is no longer truncated — the counter turns danger-red and `oas-validate` is dispatched whenever the over-limit state flips (`detail.error` is `exceed-maximum`, or `null` when back within the limit), so hosts can warn without interrupting typing.

## Display Formatting (formatter / parser)

<DemoBlock title="formatter / parser (thousand separator, property channel)">
  <oas-input id="input-format" placeholder="Type digits for thousand separators" style="width: 260px"></oas-input>
  <span id="input-format-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

`formatter` / `parser` are **JS property-channel only** (`el.formatter = fn`) — Web Components attributes cannot carry functions, so there is no corresponding HTML attribute. Display = `formatter(rawValue)`; `detail.value` of `oas-input` / `oas-change` carries the parsed raw value (`parser(display)`). Removing them (set to `null`) restores the raw display. While typing, the cursor is approximately preserved by shifting with the length delta of the format change (sufficient for card-number grouping and similar cases).

## Clear Button Visibility

<DemoBlock title="show-clear-on">
  <oas-input clearable show-clear-on="focus" value="Clear shows on focus" style="width: 220px"></oas-input>
  <oas-input clearable show-clear-on="hover" value="Clear shows on hover/focus" style="width: 220px"></oas-input>
</DemoBlock>

`show-clear-on` controls the clear-button visibility strategy: default `always` (shown whenever there is a value, unchanged behavior); `focus` shows only while focused; `hover` shows while hovering or focused (reduces visual noise in dense forms).

## Auto Width

<DemoBlock title="auto-width">
  <oas-input auto-width auto-width-min="120" value="Short" placeholder="Type to try" style="margin-inline-end: 24px"></oas-input>
  <oas-input auto-width auto-width-min="120" auto-width-max="320" value="Width follows content" placeholder="auto-width"></oas-input>
</DemoBlock>

With `auto-width`, the input width follows its content (mirror measurement: a hidden element sharing the input's font and paddings; empty value falls back to the placeholder width). `auto-width-min` / `auto-width-max` (px numbers) clamp the range — `min` defaults to 72px and `max` to 100%. Common in inline editing and tag-input scenarios.

## Range Input (Composition)

<DemoBlock title="Two inputs + separator (range input)">
  <div style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
    <oas-input placeholder="Min price" inputmode="numeric" style="width: 120px"></oas-input>
    <span style="color: var(--oas-color-text-secondary)">~</span>
    <oas-input placeholder="Max price" inputmode="numeric" style="width: 120px"></oas-input>
  </div>
</DemoBlock>

A range input is just two `oas-input` elements plus a separator layout (the component does not provide a pair API): each input commits its own `oas-change`, and the host combines them into a range. Wrap in an `oas-compact` container when you need tight radius-merged composition.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `addon-after` | Addon text block after the input | — | — |
| `addon-before` | Addon text block before the input | — | — |
| `allow-over-max` | Over-limit without truncation: maxlength is no longer passed native (typing continues), count turns red and oas-validate fires | `boolean` | — |
| `auto-width` | Auto width following content (mirror measurement; empty value falls back to placeholder width), usually with auto-width-min/max | `boolean` | — |
| `auto-width-max` | Maximum width for auto-width, px or percentage (default 100%) | — | — |
| `auto-width-min` | Minimum width in px for auto-width (default 72) | — | — |
| `clearable` | Clearable | `boolean` | — |
| `count-position` | Character count position: `outside` (default) / `inside` (right side within the field) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `label` | Accessible name (`aria-label` source; falls back to `placeholder` → built-in "输入框" when unset) | — | — |
| `maxlength` | Maximum input length (passed through to native maxlength) | `string` | — |
| `placeholder` | Placeholder text | `string` | — |
| `prefix-icon` | Icon name for the leading icon | `string` | — |
| `prefix-text` | Inline text before the input value (plain HTML may use the legacy alias prefix) | `string` | — |
| `readonly` | Readonly | `boolean` | — |
| `show-clear-on` | Clear button visibility: `always` (default) / `hover` / `focus` | `string` | — |
| `show-count` | Show character count (bottom-right; danger when over limit) | `boolean` | — |
| `show-password` | Password visibility toggle (renders an eye button when `type="password"`) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large`: height and font scale | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid on the inner input | `string` | — |
| `suffix-icon` | Icon name for the trailing icon | `string` | — |
| `suffix-text` | Inline text after the input value (plain HTML may use the legacy alias suffix) | `string` | — |
| `type` | Native input type | `string` | `text` |
| `value` | Value (controlled) | `string` | — |
| `variant` | Variant: `outlined` (default) / `filled` / `borderless` | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Fires on blur, `detail: { value }` |
| `oas-change` | Commit semantics: fires on blur/Enter when the value differs from the last commit, `detail: { value }` |
| `oas-clear` | Cleared by click, `detail: { originalEvent }` |
| `oas-enter` | Enter pressed (not IME composition), `detail: { value }` |
| `oas-focus` | Fires on focus, `detail: { value }` |
| `oas-input` | While typing, `detail: { value }` |
| `oas-validate` | Fires when the over-limit state flips (allow-over-max), `detail: { error: "exceed-maximum" \| null }` |

### Slots

| Name | Description |
| --- | --- |
| `append` | Append addon area (may contain select/button or any content) |
| `prefix` | Inline leading content (icons/buttons etc.; distributed content takes precedence over the `prefix` attribute text). For simple text use the `prefix` attribute |
| `prepend` | Prepend addon area (may contain select/button or any content) |
| `suffix` | Inline trailing content (icons/buttons etc.; distributed content takes precedence over the `suffix` attribute text). For simple text use the `suffix` attribute |
