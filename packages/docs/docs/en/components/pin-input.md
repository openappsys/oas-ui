# PinInput

A segmented code input with per-character constraint filtering (type / pattern), separator grouping, size and variant tiers, OTP SMS autofill, submit-on-complete, and loading / success validation feedback; plus keyboard arrow navigation, Backspace fallback, and paste auto-distribution (with filtering).

## Basic Usage

<DemoBlock title="Default 6 digits">
  <oas-pin-input></oas-pin-input>
</DemoBlock>

Defaults to `type="number"` (digits only), which covers most verification code scenarios.

## Custom Length

<DemoBlock title="length=4">
  <oas-pin-input length="4"></oas-pin-input>
</DemoBlock>

Set the number of cells via `length`.

## Character Constraint (semantic type)

<DemoBlock title="number (default) / alphanumeric / text">
  <oas-pin-input length="4" value="1024"></oas-pin-input>
  <oas-pin-input type="alphanumeric" length="4" value="ab12"></oas-pin-input>
  <oas-pin-input type="text" length="4" value="-+#a"></oas-pin-input>
</DemoBlock>

`type` is a **semantic character-constraint tier** (no longer passed through to the native input type):

- `number` (default): digits `[0-9]` only, with `inputmode="numeric"` (numeric keyboard on mobile)
- `alphanumeric`: letters + digits
- `text`: any character

Internally the cells are always native `text` inputs with per-character filtering — the legacy `type="number"` passthrough accepted `e` / `E` / `+` / `-` / `.` (legal syntax of native number inputs); that defect is now fixed. The constraint applies consistently to keystrokes, paste distribution, and the controlled `value` prefill; invalid characters are silently rejected (the common convention). With `mask` set, the cells switch to `password` masking. An invalid `type` falls back to `number` with a console.warn (deduplicated per value).

## Custom Regex (pattern)

<DemoBlock title="pattern=[0-3] (digits 0–3 only)">
  <oas-pin-input length="4" pattern="[0-3]" placeholder="?"></oas-pin-input>
</DemoBlock>

`pattern` accepts a regex string matched **per character** (e.g. `[0-3]` restricts to 0–3, `[a-m]` to the first half of the alphabet); when set it overrides the built-in charset of `type` (`inputmode` still follows `type`). An invalid regex string warns and falls back to the `type` constraint.

## Separators

<DemoBlock title="3+4 phone code grouping">
  <oas-pin-input length="7" separator="-" separator-after="3"></oas-pin-input>
</DemoBlock>

<DemoBlock title="Between every pair (separator-after omitted)">
  <oas-pin-input length="6" separator="·" size="small"></oas-pin-input>
</DemoBlock>

`separator` is the separator content (string); `separator-after` is a comma-separated list of 1-based cell indices (`"3"` = after the 3rd cell, `"2,5"` = after the 2nd and 5th); when omitted, separators are inserted **between every adjacent pair**. The separator element exposes `part="separator"` for styling, is `aria-hidden` to screen readers, and never participates in the value.

## Sizes

<DemoBlock title="small / medium / large">
  <oas-pin-input size="small" length="4" value="1234"></oas-pin-input>
  <oas-pin-input size="medium" length="4" value="1234"></oas-pin-input>
  <oas-pin-input size="large" length="4" value="1234"></oas-pin-input>
</DemoBlock>

`size` has three tiers aligned with the global control-height tokens (small=24px / medium=32px default / large=40px); cell width and font scale along. Invalid values fall back to medium with a warning.

## Placeholder

<DemoBlock title="placeholder on every cell">
  <oas-pin-input length="4" placeholder="○"></oas-pin-input>
</DemoBlock>

`placeholder` is shown in each empty cell (a single character like `○` by convention).

## Variants & Attached

<DemoBlock title="outlined (default) / filled / underlined">
  <oas-pin-input length="4" value="1234"></oas-pin-input>
  <oas-pin-input length="4" value="1234" variant="filled"></oas-pin-input>
  <oas-pin-input length="4" value="1234" variant="underlined"></oas-pin-input>
</DemoBlock>

<DemoBlock title="attached (shared borders)">
  <oas-pin-input length="6" value="123456" attached></oas-pin-input>
  <oas-pin-input length="6" value="123456" attached variant="filled"></oas-pin-input>
</DemoBlock>

`variant` tiers: `outlined` (default) / `filled` / `underlined`; `attached` removes the gaps and merges adjacent borders (rounded corners only at the ends, the focused cell paints above its neighbors). An invalid `variant` falls back to `outlined` with a warning. All styles use logical properties and mirror automatically under `dir="rtl"`.

## Mask

<DemoBlock title="mask">
  <oas-pin-input mask value="123456"></oas-pin-input>
</DemoBlock>

`mask` switches the cells to password type (native platform dots), masking the input values.

## OTP SMS Autofill

<DemoBlock title="otp">
  <oas-pin-input length="6" otp></oas-pin-input>
</DemoBlock>

The `otp` boolean sets `autocomplete="one-time-code"` on the cells, so mobile platforms (iOS / Android) show the SMS code suggestion above the keyboard and fill it on tap.

## Autofocus & Focus Methods

<DemoBlock title="autofocus + focus(index) / blur()">
  <oas-space size="small">
    <oas-button size="small" onclick="pinFocusFirst()">Focus first empty</oas-button>
    <oas-button size="small" onclick="pinFocusAt()">Focus cell 3</oas-button>
    <oas-button size="small" onclick="pinBlur()">Blur</oas-button>
  </oas-space>
  <oas-pin-input id="pin-methods" length="4" :autofocus="true"></oas-pin-input>
</DemoBlock>

Setting the autofocus attribute focuses the first empty cell on first connect; `focus(index?)` focuses a given cell (defaulting to the first empty cell, or the last cell when full; out-of-range falls back to the default strategy), and `blur()` blurs the active cell. Component-level enter/leave dispatches `oas-focus` / `oas-blur` (carrying the cell `index`); moving between cells does not re-dispatch.

> Vue note: `autofocus` is a reflected HTMLElement property — a bare attribute gets coerced away by Vue's property assignment, so use the `:autofocus="true"` binding form (it takes effect via attribute reflection).

## Submit on Complete (auto-submit)

<DemoBlock title="auto-submit (explicit opt-in)">
  <form id="pin-form">
    <oas-pin-input id="pin-submit" length="4" auto-submit otp></oas-pin-input>
    <oas-space size="small">
      <oas-button size="small" type="primary" onclick="pinFormSubmit()">Submit</oas-button>
      <span id="pin-form-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-space>
  </form>
</DemoBlock>

The `auto-submit` boolean automatically calls `requestSubmit()` on the **associated form** (nearest `form` ancestor) when the code becomes complete — it fires the `submit` event and native constraint validation (no bypass), and is a safe no-op without a form. The "verify as soon as it's full" OTP flow needs no intermediate button.

## Validation Feedback (loading / success / aria-invalid)

Type the correct code `1234` for the full flow: complete → loading (cells locked + spinner) → success; any other code → error for 1.6s, then auto-cleared for retry.

<DemoBlock title="loading → success / error">
  <oas-pin-input id="pin-verify" length="4" otp :autofocus="true"></oas-pin-input>
  <span id="pin-verify-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<DemoBlock title="aria-invalid manual toggle">
  <oas-space size="small">
    <oas-button size="small" type="danger" onclick="pinInvalid('true')">Mark as invalid</oas-button>
    <oas-button size="small" onclick="pinInvalid('false')">Restore normal</oas-button>
  </oas-space>
  <oas-pin-input id="pin-invalid" length="4" value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="aria-invalid / success static example">
  <oas-pin-input length="4" value="123" aria-invalid="true"></oas-pin-input>
  <oas-pin-input length="4" value="456" success></oas-pin-input>
</DemoBlock>

- `loading`: pending state — cells disabled, container `aria-busy="true"`, an overlay spinner, all input and keyboard locked
- `success`: success state — cells get the `--oas-color-success` green border (focus ring follows)
- `aria-invalid`: error state — synced to the container and all cells with a danger border (in observedAttributes; dynamic `setAttribute` applies immediately); **error takes precedence over success** when both are set

## Controlled Initial Value

<DemoBlock title="value prefill">
  <oas-pin-input value="25"></oas-pin-input>
</DemoBlock>

`value` is distributed to each cell; the portion beyond `length` is truncated, and characters violating the current `type` / `pattern` constraint are filtered at the display layer. Internal input writes back to the `value` attribute (uncontrolled channel); external changes sync immediately without rebuilding cell references.

## Disabled / Readonly

<DemoBlock title="disabled">
  <oas-pin-input disabled value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-pin-input readonly value="456"></oas-pin-input>
</DemoBlock>

## Events

Try in order: click into a cell (`oas-focus`) → type digits (`oas-input`) → fill up (`oas-complete`) → click the page blank to blur (`oas-change` + `oas-blur`).

<DemoBlock title="input / complete / change / focus / blur">
  <oas-pin-input id="pin-event" length="4"></oas-pin-input>
  <span id="pin-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

The three value events are orthogonal, with no overlap:

| Event | When | detail |
| --- | --- | --- |
| `oas-input` | every cell input (realtime) | `{ value, index }` |
| `oas-complete` | code becomes complete (re-fires after edit-back and refill) | `{ value }` |
| `oas-change` | **blur commit**: fired when the component loses focus with a value changed since focus | `{ value }` |
| `oas-focus` / `oas-blur` | focus enters / leaves the component (cell moves don't dispatch) | `{ index }` |

## RTL

<DemoBlock title="dir=rtl">
  <div dir="rtl">
    <oas-pin-input length="4" value="1234" separator="-" separator-after="2"></oas-pin-input>
  </div>
</DemoBlock>

Under `dir="rtl"` the cells lay out right-to-left, arrow keys reverse (`ArrowLeft` forward, `ArrowRight` back), and separator positions mirror with the visual order.

## Migration Notes (Breaking Changes)

**`oas-change` semantics changed** (aligned with the form-family change convention; no longer duplicated with `oas-complete`):

- Legacy: `oas-change` and `oas-complete` fired **together** on completion with identical semantics
- New: `oas-input` (per-cell) / `oas-complete` (filled) / `oas-change` (blur commit) are orthogonal
- Migration guide:
  - Legacy `oas-change` listeners doing **realtime validation / input linkage** → switch to `oas-input`
  - Legacy `oas-change` listeners doing **validate-on-complete** → switch to `oas-complete` (add `auto-submit` if auto submission is desired)
  - Need to **confirm the final value on blur** (form commit semantics) → keep listening to `oas-change`

**`type` attribute is now semantic**:

- Legacy: `type` passed through to the native input type (e.g. `tel`) and defaulted to `text` (any character); under `type="number"` the native input accepted `e` / `E` / `+` / `-` / `.`
- New: `type` is a semantic tier `number` (**default**) / `text` / `alphanumeric`, always a native `text` cell with per-character filtering; invalid values (including legacy native types like `tel`) fall back to `number` with a warning
- Existing usages without an explicit `type` change from "any character" to "digits only" — set `type="text"` explicitly if arbitrary characters are needed

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.pinInvalid = (invalid) => {
    const el = document.getElementById('pin-invalid')
    if (invalid === 'true') el?.setAttribute('aria-invalid', 'true')
    else el?.setAttribute('aria-invalid', 'false')
  }

  // Focus methods demo
  const methods = document.getElementById('pin-methods')
  window.pinFocusFirst = () => methods?.focus()
  window.pinFocusAt = () => methods?.focus(2)
  window.pinBlur = () => methods?.blur()

  // Validation feedback demo: 1234 → loading → success; otherwise → error → clear & retry
  const verify = document.getElementById('pin-verify')
  const vOut = document.getElementById('pin-verify-out')
  let verifyTimer = 0
  verify?.addEventListener('oas-complete', (e) => {
    const value = e.detail.value
    clearTimeout(verifyTimer)
    verify.setAttribute('loading', '')
    verify.removeAttribute('success')
    verify.removeAttribute('aria-invalid')
    vOut.textContent = 'Verifying…'
    verifyTimer = window.setTimeout(() => {
      verify.removeAttribute('loading')
      if (value === '1234') {
        verify.setAttribute('success', '')
        vOut.textContent = '✓ Verified'
      } else {
        verify.setAttribute('aria-invalid', 'true')
        vOut.textContent = `✗ Wrong code (${value}); correct code is 1234`
        verifyTimer = window.setTimeout(() => {
          verify.removeAttribute('aria-invalid')
          verify.setAttribute('value', '')
          verify.focus()
        }, 1600)
      }
    }, 1200)
  })

  // Submit-on-complete demo
  const form = document.getElementById('pin-form')
  const fOut = document.getElementById('pin-form-out')
  window.pinFormSubmit = () => form?.requestSubmit()
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const value = document.getElementById('pin-submit')?.getAttribute('value') ?? ''
    fOut.textContent = `form submitted (requestSubmit), code: ${value || '(empty)'}`
  })

  // Events demo
  const ev = document.getElementById('pin-event')
  const out = document.getElementById('pin-output')
  const log = (msg) => {
    out.textContent = msg
  }
  ev?.addEventListener('oas-focus', (e) => log(`oas-focus: entered cell ${e.detail.index + 1}`))
  ev?.addEventListener('oas-input', (e) => log(`oas-input: ${e.detail.value}`))
  ev?.addEventListener('oas-complete', (e) => log(`oas-complete: ${e.detail.value}`))
  ev?.addEventListener('oas-change', (e) => log(`oas-change (blur commit): ${e.detail.value}`))
  ev?.addEventListener('oas-blur', (e) => log(`oas-blur: left cell ${e.detail.index + 1}`))
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-invalid` | Invalid state (synced to container and cells, marked danger) | `string` | — |
| `attached` | Attached form: no gaps between cells, shared borders, end-point radii only | `boolean` | — |
| `auto-submit` | Auto-submit when full (calls requestSubmit on the closest form; no-op without one) | `boolean` | — |
| `autofocus` | Focus the first empty cell on first connection | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `length` | Number of code digits | `string` | `6` |
| `loading` | Submitting: cells disabled + aria-busy + spinner overlay, keyboard input fully locked | `boolean` | — |
| `mask` | Asterisk masking | `boolean` | — |
| `otp` | OTP semantics: inner cells get autocomplete="one-time-code" (triggers system SMS code autofill) | `boolean` | — |
| `pattern` | Per-character regex constraint (overrides type filter; invalid regex warns and falls back) | `string` | — |
| `placeholder` | Placeholder for empty cells | `string` | — |
| `readonly` | Readonly | `boolean` | — |
| `separator` | Separator content (positioned via separator-after) | `string` | — |
| `separator-after` | Insert a separator after cell N (1-based indexes, comma-separated, e.g. `3,7`; defaults to between every adjacent pair) | `string` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `success` | Success green border (error wins when both set) | — | — |
| `type` | Cell input type | `string` | `number` |
| `value` | Current value (controlled) | `string` | — |
| `variant` | Variant: `outlined` (default) / `filled` / `underlined` | `string` | `outlined` |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Fires when focus leaves the component, `detail: { index }` |
| `oas-change` | Dispatched when filled, `detail: { value }` |
| `oas-complete` | Dispatched when filled, `detail: { value }` |
| `oas-focus` | Fires when focus enters the component (not on cell-to-cell moves), `detail: { index }` |
| `oas-input` | Per-cell input, `detail: { value, index }` |

Keyboard: `←`/`→` to move between cells, `Backspace` deletes the current cell and moves back, paste auto-distribution is supported; when all cells are empty, each cell is focusable (native caret).

ARIA: the container has `role="group"` + `aria-label`, each cell has `aria-label="第 n 位"`, and `aria-invalid` is synced to both the container and all cells.
