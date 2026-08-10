# DynamicTags

Type in the input and press Enter/comma to create tags; supports deduplication, a maximum limit, and keyboard deletion.

## Basic Usage

<DemoBlock title="Deduplicate by default">
  <oas-dynamic-tags model-value='["vue","react"]'></oas-dynamic-tags>
</DemoBlock>

`model-value` is a JSON array attribute; duplicate tags are not allowed by default.

## Allow Duplicates

<DemoBlock title="allow-duplicate">
  <oas-dynamic-tags allow-duplicate model-value='["a"]'></oas-dynamic-tags>
</DemoBlock>

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

<DemoBlock title="Add/remove events">
  <oas-dynamic-tags id="tags-event" model-value='["a"]'></oas-dynamic-tags>
  <span id="tags-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-add` / `oas-remove` / `oas-change`:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tags-event')
  const out = document.getElementById('tags-output')
  const show = (e) => { out.textContent = `${e.type}: ${JSON.stringify(e.detail.value)}` }
  el?.addEventListener('oas-add', show)
  el?.addEventListener('oas-remove', show)
  el?.addEventListener('oas-change', show)
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `allow-duplicate` | Allow duplicate tags | — | — |
| `disabled` | Disabled | — | — |
| `max` | Maximum number of tags | — | — |
| `model-value` | Tag array (property or JSON) | — | — |
| `placeholder` | Input placeholder | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-add` | Tag added, `detail: { value }` |
| `oas-change` | Dispatched after add/remove, `detail: { value }` |
| `oas-remove` | Tag removed, `detail: { value }` |

Keyboard: `Enter` / `,` to submit; with the input empty, `Backspace` deletes the last tag.

ARIA: the container has `role="list"`, tags have `role="listitem"`, remove buttons are focusable with an `aria-label`; when submitting a duplicate, the input is marked `aria-invalid` with a hint shown.
