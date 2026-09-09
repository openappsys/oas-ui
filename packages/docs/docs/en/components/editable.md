# Editable

Click/Enter/Space enters edit mode; Enter submits, Esc cancels, and empty-value submission is non-destructive by default. Supports multiline editing, icon triggering, controlled editing state, and the four-way submit-mode matrix.

## Basic Usage

<DemoBlock title="Click to edit">
  <oas-editable value="Click me to edit"></oas-editable>
</DemoBlock>

Click the text (or press Enter/Space when focused) to enter edit mode; `Enter` submits, `Esc` reverts.

## Placeholder

<DemoBlock title="Empty value placeholder">
  <oas-editable placeholder="No content, click to add"></oas-editable>
</DemoBlock>

`placeholder` is shown when the value is empty.

## Submit Mode Matrix

<DemoBlock title="submit-on-enter=false (button/blur only)">
  <oas-editable value="Enter does not submit; use the button or blur" submit-on-enter="false"></oas-editable>
</DemoBlock>

<DemoBlock title="submit-on-blur=false (no accidental submits)">
  <oas-editable value="Blur does not submit; you must click OK/Cancel" submit-on-blur="false"></oas-editable>
</DemoBlock>

<DemoBlock title="Both off (explicit buttons only)">
  <oas-editable value="Only the buttons submit" submit-on-enter="false" submit-on-blur="false"></oas-editable>
</DemoBlock>

`submit-on-enter` (default `true`) and `submit-on-blur` (default `true`) combine into four submit modes: both (default) / Enter only / blur only / buttons only.

## Controlled Editing

<DemoBlock title="editing attribute programmatic control">
  <oas-space>
    <oas-button id="edit-toggle" size="small">Enter/exit editing</oas-button>
    <oas-editable id="edit-controlled" value="Programmatic"></oas-editable>
  </oas-space>
</DemoBlock>

<DemoBlock title="default-editing starts in edit mode (new-item scenario)">
  <oas-editable default-editing value="New row starts editing"></oas-editable>
</DemoBlock>

- Setting the `editing` attribute enters edit mode; removing it exits through the cancel path (non-destructive, dispatches `oas-cancel`)
- Internal enter/exit reflects the `editing` attribute; hosts can watch the attribute or the `oas-editing` event (`detail: { editing: boolean }`, dispatched once on enter and once on exit)

## Multiline Editing

<DemoBlock title="multiline (Ctrl/⌘+Enter submits)">
  <oas-editable multiline value="Line one&#10;Line two"></oas-editable>
</DemoBlock>

With `multiline` the edit mode renders a textarea: `Enter` inserts a newline, `Ctrl/⌘ + Enter` submits, `Esc` cancels; the height auto-grows with content (minimum one line). Ctrl+Enter during an IME composition (candidate confirmation) does not submit accidentally.

## Icon Triggering

<DemoBlock title="trigger=icon (pencil button, accidental-click safe)">
  <oas-editable trigger="icon" value="Clicking the text does nothing; use the pencil"></oas-editable>
</DemoBlock>

`trigger="text"` (default) edits on text click; with `trigger="icon"` the text is plain display and the trailing pencil button carries the interaction (focusable; Enter/Space/click enters edit); with `trigger="dblclick"` double-click enters edit (single click doesn't trigger, so text stays selectable; Enter/Space while focused enters edit as a keyboard fallback). Useful when text clicks may conflict with page behavior.

<DemoBlock title="trigger=dblclick (double-click to edit)">
  <oas-editable trigger="dblclick" value="Double-click me to edit (single click only selects, doesn't trigger)"></oas-editable>
</DemoBlock>

## Custom Display

<DemoBlock title="template[slot=display] icon + text">
  <oas-editable value="John">
    <template slot="display">
      <span>👤 <span data-display-value></span></span>
    </template>
  </oas-editable>
</DemoBlock>

`template[slot="display"]` clones the display content: `[data-display-value]` binds the current value and `[data-display-placeholder]` binds the placeholder text; the default falls back to plain text.

## Custom Action Icons

<DemoBlock title="template[slot=ok-icon] / [slot=cancel-icon]">
  <oas-editable value="Custom button icons">
    <template slot="ok-icon"><span style="font-size:12px">OK</span></template>
    <template slot="cancel-icon"><span style="font-size:12px">✗</span></template>
  </oas-editable>
</DemoBlock>

## Empty-Value Semantics

<DemoBlock title="allow-empty (allow clearing)">
  <oas-editable allow-empty value="Clear everything and submit"></oas-editable>
</DemoBlock>

By default an empty submission reverts to the old value and dispatches `oas-cancel` (non-destructive); with `allow-empty` an empty value submits as an empty string and dispatches `oas-change` (the "clear/reset" scenario).

## Size / Status / Readonly

<DemoBlock title="size variants">
  <oas-space direction="vertical">
    <oas-editable size="small" value="small size"></oas-editable>
    <oas-editable value="medium size (default)"></oas-editable>
    <oas-editable size="large" value="large size"></oas-editable>
  </oas-space>
</DemoBlock>

<DemoBlock title="status=error">
  <oas-editable status="error" value="Error text"></oas-editable>
</DemoBlock>

<DemoBlock title="readonly (focusable, readable, not editable)">
  <oas-editable readonly value="Readonly text"></oas-editable>
</DemoBlock>

`readonly` differs from `disabled`: it keeps normal text color, stays focusable and copyable, and only blocks entering edit mode (`aria-readonly`).

## maxlength

<DemoBlock title="Length limit">
  <oas-editable value="Up to 10 characters" maxlength="10"></oas-editable>
</DemoBlock>

## Disabled

<DemoBlock title="disabled">
  <oas-editable disabled value="Not editable"></oas-editable>
</DemoBlock>

## Events

<DemoBlock title="Submit/cancel/editing-state events">
  <oas-editable id="edit-event" value="Edit me"></oas-editable>
  <span id="edit-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-change` (submit), `oas-cancel` (cancel/empty submit), and `oas-editing` (editing-state toggle, `detail: { editing }`):

## Non-Text Inplace Editing (Composition Pattern)

For "click to swap in arbitrary content" (tables, images), no extra component is needed — `display slot` + host-side toggling replaces it:

<DemoBlock title="Host v-if toggle + display slot composition">
  <div style="display:inline-flex;align-items:center;gap:8px;padding:8px;border:1px dashed var(--oas-color-border);border-radius:var(--oas-radius-md)">
    <span id="inplace-view" style="display:inline-flex;align-items:center;gap:8px">
      <span style="width:32px;height:32px;border-radius:50%;background:var(--oas-color-primary);color:var(--oas-color-text-on-primary);display:inline-flex;align-items:center;justify-content:center">A</span>
      <span>Display: avatar + name (arbitrary content)</span>
      <oas-button id="inplace-edit-btn" size="small">Edit</oas-button>
    </span>
    <span id="inplace-edit" hidden style="display:inline-flex;align-items:center;gap:8px">
      <input id="inplace-input" value="Display: avatar + name (arbitrary content)" style="height:var(--oas-control-height-sm);padding:0 8px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-sm)" />
      <oas-button id="inplace-save" size="small" variant="primary">Save</oas-button>
    </span>
  </div>
</DemoBlock>

The host toggles between display and edit blocks of arbitrary content with `v-if` / `hidden` (a few lines of boilerplate); for text scenarios use `oas-editable` directly (its `display slot` + controlled `editing` encapsulate the same mechanism).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // controlled editing demo
  const btn = document.getElementById('edit-toggle')
  const target = document.getElementById('edit-controlled')
  btn?.addEventListener('click', () => {
    if (target.hasAttribute('editing')) target.removeAttribute('editing')
    else target.setAttribute('editing', '')
  })
  // events demo
  const el = document.getElementById('edit-event')
  const out = document.getElementById('edit-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-cancel', () => {
    out.textContent = 'oas-cancel'
  })
  el?.addEventListener('oas-editing', (e) => {
    out.textContent = `oas-editing: ${e.detail.editing}`
  })
  // Inplace composition demo
  const view = document.getElementById('inplace-view')
  const edit = document.getElementById('inplace-edit')
  const input = document.getElementById('inplace-input')
  document.getElementById('inplace-edit-btn')?.addEventListener('click', () => {
    view.hidden = true
    edit.hidden = false
    input.focus()
  })
  document.getElementById('inplace-save')?.addEventListener('click', () => {
    const label = view.querySelector('span:nth-of-type(2)')
    if (label) label.textContent = input.value
    edit.hidden = true
    view.hidden = false
  })
})
</script>

## Capability Overview (page notes)

- `submit-on-blur`: default `true` (blur submits, the existing behavior); `false` completes the four-way submit matrix
- `editing` / `default-editing`: controlled / initial editing state (exits always go through the submit/cancel paths)
- `multiline`: multiline editing — Ctrl/⌘+Enter submits, Enter inserts a newline, auto-growing height
- `trigger`: `text | icon | dblclick` (click text / pencil button / double-click to edit, all configurable)
- `allow-empty`: allow submitting an empty string (non-destructive revert by default)
- `size` / `status` / `readonly`: three sizes, validation status, readonly
- Slots: `template[slot="display"]` (`data-display-value` / `data-display-placeholder` bindings), `ok-icon` / `cancel-icon`
- Events: `oas-editing` `{ editing }` (existing `oas-change` / `oas-cancel` unchanged)

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `allow-empty` | Allow committing an empty value (default unchanged/non-breaking; empty restores the old value) | `boolean` | — |
| `default-editing` | Start in editing on mount (consumed once) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `editing` | Controlled editing state (internal enter/exit auto-reflects; host removal takes the cancel path) | `boolean` | — |
| `maxlength` | Maximum input length | `string` | — |
| `multiline` | Multi-line editing (textarea; Enter for newline, Ctrl/⌘+Enter to commit, auto-grow) | `boolean` | — |
| `placeholder` | Empty value placeholder | `string` | — |
| `readonly` | Read-only (focusable, readable, not editable, aria-readonly) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success` | `string` | — |
| `submit-on-blur` | Commit on blur (default true; with submit-on-enter forms both/enter/blur/none) | `string` | `true` |
| `submit-on-enter` | Whether Enter submits | `string` | `true` |
| `trigger` | Trigger: `text` (default, click text) / `icon` (pencil button, prevents misclicks) / `dblclick` (double-click to edit; single click doesn't trigger; Enter/Space while focused enters edit as keyboard fallback) | `string` | — |
| `value` | Current value (controlled) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Cancel/empty-value submit (reverts to old value), non-destructive by default, `detail: { value: oldValue } \| { value: this.getAttr('value', '') }` |
| `oas-change` | New value submitted, `detail: { value }` |
| `oas-editing` | Fires on entering/exiting editing, `detail: { editing }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="display"]` | Custom display state (`[data-display-value]`/`[data-display-placeholder]` bindings) |

Keyboard: in display mode `Enter`/Space/click enters edit mode; in edit mode `Enter` submits, `Esc` reverts and blurs.

ARIA: display mode has `role="button"` + `aria-label="Edit"`; the edit-mode input keeps the same label.
