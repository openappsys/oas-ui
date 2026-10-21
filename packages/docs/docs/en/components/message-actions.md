# MessageActions

Message action bar: copy, retry, edit, regenerate, branch, feedback and more. The component only renders buttons and dispatches `oas-action`; business actions and conversation state stay in the host.

## Basic Usage

<DemoBlock title="Click an action to dispatch oas-action (detail: { key, messageId })">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-message-actions
      id="message-actions-basic"
      message-id="m1"
      label="Message actions"
      align="start"
      actions='[{"key":"copy","label":"Copy"},{"key":"retry","label":"Retry"},{"key":"edit","label":"Edit"},{"key":"regenerate","label":"Regenerate"},{"key":"like","label":"Like","active":true}]'
    ></oas-message-actions>
    <span id="message-actions-output" role="status" style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)">Waiting</span>
  </div>
</DemoBlock>

## Disabled / Danger

<DemoBlock title="Host disabled, per-action disabled and danger">
  <oas-message-actions
    disabled
    actions='[{"key":"delete","label":"Delete","tone":"danger"},{"key":"copy","label":"Copy","disabled":true}]'
  ></oas-message-actions>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-message-actions')
  const actions = document.getElementById('message-actions-basic')
  const output = document.getElementById('message-actions-output')
  actions?.addEventListener('oas-action', (event) => {
    output.textContent = `Action: ${event.detail.key} (${event.detail.messageId ?? 'no message id'})`
  })
})
</script>

## API

### oas-message-actions

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions` | Actions JSON: [{ key, label, title?, disabled?, active?, tone? }] | `string` | — |
| `align` | Alignment: start (default) / end | `string` | `start` |
| `disabled` | Disable every action | `boolean` | — |
| `label` | Optional aria-label for the action group | `string` | — |
| `message-id` | Message id echoed in oas-action detail | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-action` | Dispatched on click, detail: { key, messageId } |
