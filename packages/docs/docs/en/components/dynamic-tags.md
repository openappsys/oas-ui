# DynamicTags

Always-visible input + tag flow: press Enter or a separator to create tags; supports deduplication, validation, limits, save-on-blur, reordering, overflow collapsing, and in-place tag editing.

## Basic Usage

<DemoBlock title="Deduplicate by default">
  <oas-dynamic-tags model-value='["vue","react"]'></oas-dynamic-tags>
</DemoBlock>

`model-value` is a JSON array attribute; duplicate tags are not allowed by default. Keyboard: `Enter` / separator to submit; with the input empty, `Backspace` deletes the last tag.

## Allow Duplicates

<DemoBlock title="allow-duplicate">
  <oas-dynamic-tags allow-duplicate model-value='["a"]'></oas-dynamic-tags>
</DemoBlock>

## Separator & Paste Batching

<DemoBlock title="separator=; (semicolon submits)">
  <oas-dynamic-tags separator=";" placeholder="Type, then press ; to add"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="Paste comma-separated text to batch-create (on by default)">
  <oas-dynamic-tags add-on-paste maxlength="10" placeholder="Try pasting: a,b,c"></oas-dynamic-tags>
</DemoBlock>

- `separator` customizes the commit separator (single character, default `,`; empty string = Enter only; `separator=" "` gives space triggering)
- `add-on-paste` (default `true`): pasting text that contains the separator splits and batch-creates tags, each going through dedup/limit/format checks; pastes without a separator keep native insertion
- `maxlength` limits the input length

## Save on Blur (Behavior Change)

<DemoBlock title="save-on-blur defaults to true">
  <oas-dynamic-tags placeholder="Type, then click anywhere on the page"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="save-on-blur=false discards on blur (old behavior)">
  <oas-dynamic-tags save-on-blur="false" placeholder="Leftover text is discarded on blur"></oas-dynamic-tags>
</DemoBlock>

> **Behavior change (since v2.5.0)**: `save-on-blur` now defaults to `true` — leftover input text is committed as a tag on blur (aligning with the mainstream default). Previously the text was silently discarded; set `save-on-blur="false"` explicitly to keep the old behavior.

## Reordering

<DemoBlock title="sortable drag + keyboard reorder">
  <oas-dynamic-tags sortable model-value='["tag-1","tag-2","tag-3"]'></oas-dynamic-tags>
</DemoBlock>

`sortable` enables two reorder channels; a reorder dispatches `oas-change` (`detail.trigger = "sort"`):

- Drag: hold a tag and drop it on the target position
- Keyboard: with the input empty, `←` focuses the last tag / `→` the first; `←` / `→` walk between tags (both ends return to the input); `Alt + ←` / `Alt + →` swap with the neighbor

## Overflow Collapsing

<DemoBlock title="max-tag-count=2 collapses to +N">
  <oas-dynamic-tags max-tag-count="2" model-value='["apple","banana","orange","grape","melon"]'></oas-dynamic-tags>
</DemoBlock>

Tags beyond `max-tag-count` collapse into a `+N` counter with a `title` tooltip listing hidden tags; combine with `oas-tooltip` for richer display (attach the overlay to `.tag-overflow` after render).

## Validation

<DemoBlock title="pattern regex (digits only)">
  <oas-dynamic-tags pattern="^\d+$" placeholder="Only pure-digit tags allowed"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="oas-before-add cancelable event (banned words)">
  <oas-dynamic-tags id="tags-veto" placeholder="Try adding admin or root"></oas-dynamic-tags>
</DemoBlock>

- `pattern`: a regex string; a mismatch rejects the add with a hint (reusing the duplicate-hint channel: `aria-invalid` + a 2s message)
- `oas-before-add`: a cancelable event (`detail: { value }`); hosts call `preventDefault()` to veto (synchronous validation only; async validation is not supported)
- Check order: limit > format > duplicate > `oas-before-add` veto

## Editing Existing Tags

<DemoBlock title="Double-click a tag to edit in place">
  <oas-dynamic-tags id="tags-edit" model-value='["helo","world"]'></oas-dynamic-tags>
</DemoBlock>

Double-click a tag (or press `Enter` on a focused tag when `sortable`) to edit in place: `Enter` commits, `Esc` cancels, blur follows `save-on-blur`. Commits go through dedup/format checks; success dispatches `oas-edit` (`detail: { index, value, oldValue }`) and `oas-change` (`trigger = "edit"`); committing an empty value reverts.

## Custom Tags

<DemoBlock title="template[slot=tag]">
  <oas-dynamic-tags model-value='["frontend","backend","qa"]'>
    <template slot="tag">
      <span>🔹 <span data-tag-label></span></span>
    </template>
  </oas-dynamic-tags>
</DemoBlock>

`template[slot="tag"]` is cloned into each tag (`[data-tag-label]` binds the tag text; the remove button stays component-side). `template[slot="prefix"]` / `template[slot="suffix"]` clone to the start/end of the tag container.

## Size / Status / Readonly / Clearable

<DemoBlock title="size variants">
  <oas-dynamic-tags size="small" model-value='["small"]'></oas-dynamic-tags>
  <oas-dynamic-tags model-value='["medium (default)"]'></oas-dynamic-tags>
  <oas-dynamic-tags size="large" model-value='["large"]'></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="status=error">
  <oas-dynamic-tags status="error" model-value='["required tags"]'></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="readonly / clearable">
  <oas-dynamic-tags readonly model-value='["readonly tag"]'></oas-dynamic-tags>
  <oas-dynamic-tags clearable model-value='["clear in one click"]'></oas-dynamic-tags>
</DemoBlock>

- `readonly`: tags stay, the input and remove buttons are hidden (form semantics differ from disabled)
- `clearable`: a clear button appears when there is a value and the component is interactive; clicking dispatches `oas-clear` and `oas-change` (`trigger = "clear"`)

## IME Safety

While an IME composition is active (`isComposing`), pressing `Enter` or the separator (candidate confirmation) does not create a tag; pressing `Enter` after the composition ends commits normally. Safe for CJK input methods.

## When to Use Select Multiple Instead

For "pick from suggestions + free input", use `oas-select` with `multiple + searchable + allow-create` (built-in suggestion dropdown, highlighting, multi-select chips) instead of building a dropdown over DynamicTags:

<DemoBlock title="Select multiple + searchable + allow-create (comparison)">
  <oas-select multiple searchable allow-create placeholder="Type or pick, press Enter to create" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

Rule of thumb: free-form short token sets (recipients, keywords) use DynamicTags; a candidate list that also accepts new values uses Select multiple.

## max Limit

<DemoBlock title="max=3">
  <oas-dynamic-tags max="3" model-value='["a","b"]'></oas-dynamic-tags>
</DemoBlock>

When `max` is reached, the input is automatically disabled; deleting a tag restores input.

## Placeholder & Disabled

<DemoBlock title="placeholder">
  <oas-dynamic-tags placeholder="Type and press Enter to add"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="disabled">
  <oas-dynamic-tags disabled model-value='["vue"]'></oas-dynamic-tags>
</DemoBlock>

## Events

<DemoBlock title="Add/remove/edit/clear/sort events">
  <oas-dynamic-tags id="tags-event" model-value='["a"]'></oas-dynamic-tags>
  <span id="tags-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

`oas-change` detail is `{ value, trigger }` with `trigger ∈ add | remove | clear | sort | edit` (backward compatible: the `value` field is unchanged); there are also `oas-add` / `oas-remove` (`detail: { value }`), `oas-edit` (`detail: { index, value, oldValue }`), `oas-clear`, `oas-before-add` (cancelable), and `oas-focus` / `oas-blur`:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const veto = document.getElementById('tags-veto')
  veto?.addEventListener('oas-before-add', (e) => {
    if (['admin', 'root'].includes(e.detail.value)) e.preventDefault()
  })
  const el = document.getElementById('tags-event')
  const out = document.getElementById('tags-output')
  el?.addEventListener('oas-add', (e) => { out.textContent = `oas-add: ${e.detail.value}` })
  el?.addEventListener('oas-remove', (e) => { out.textContent = `oas-remove: ${e.detail.value}` })
  el?.addEventListener('oas-edit', (e) => { out.textContent = `oas-edit: ${e.detail.oldValue} → ${e.detail.value}` })
  el?.addEventListener('oas-clear', () => { out.textContent = 'oas-clear' })
  el?.addEventListener('oas-change', (e) => { out.textContent = `oas-change(${e.detail.trigger}): ${JSON.stringify(e.detail.value)}` })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `add-on-paste` | Split pasted text into tags by separator (default true) | `string` | `true` |
| `allow-duplicate` | Allow duplicate tags | `boolean` | — |
| `clearable` | Clear button (one-click clears all tags) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `max` | Maximum number of tags | `string` | — |
| `max-tag-count` | Collapse overflow into a `+N` chip (title lists hidden tags) | `string` | — |
| `maxlength` | Maximum length per tag | `string` | — |
| `model-value` | Tag array (property or JSON) | `string[]` | `[]` |
| `pattern` | Regex for new tags (mismatch warns and rejects) | `string` | — |
| `placeholder` | Input placeholder | `string` | — |
| `readonly` | Read-only (input/remove buttons hidden, tags display-only) | `boolean` | — |
| `save-on-blur` | Commit leftover input as a tag on blur (**default true, behavior change**: previously silently discarded; set `"false"` for the old behavior) | `string` | `true` |
| `separator` | Separator (creates a tag on type; default `,`; empty string = Enter only) | `string` | `,` |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `sortable` | Tag sorting: drag + keyboard Alt+←/→ adjacent swap | `boolean` | — |
| `status` | Validation status: `error` / `warning` / `success` | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-add` | Tag added, `detail: { value }` |
| `oas-before-add` | Fires before creating a tag (cancellable via preventDefault; limit/format/duplicate checks run first), `detail: { value }` |
| `oas-blur` | Fires when the input loses focus |
| `oas-change` | Dispatched after add/remove, `detail: { value }` |
| `oas-clear` | Fires on clear, `detail: {}` |
| `oas-edit` | Tag edit committed, `detail: { index, value, oldValue }` (double-click or focused Enter to edit) |
| `oas-focus` | Fires when the input gains focus |
| `oas-remove` | Tag removed, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="prefix"]` | Prefix content slot |
| `template[slot="suffix"]` | Suffix content slot |
| `template[slot="tag"]` | Custom tag (`[data-tag-label]` binding; remove button stays component-side) |

Keyboard: `Enter` / `,` to submit; with the input empty, `Backspace` deletes the last tag.

ARIA: the container has `role="list"`, tags have `role="listitem"`, remove buttons are focusable with an `aria-label`; when submitting a duplicate, the input is marked `aria-invalid` with a hint shown.
