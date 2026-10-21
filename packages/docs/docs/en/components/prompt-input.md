# PromptInput

Conversation composer: auto-growing multiline input, Enter to submit, Shift+Enter for a newline, suggestions, send/stop state, plus prefix/actions/footer slots.

## Basic Usage

<DemoBlock title="Type a message + suggestions (click to fill; Enter submits)">
  <oas-prompt-input
    id="prompt-input-basic"
    placeholder="Type a message, Enter to send"
    suggestions='["Summarize this chat","Write another version","Explain the code above"]'
  ></oas-prompt-input>
  <div id="prompt-input-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

## Loading / Disabled

While `loading`, the host reflects `aria-busy="true"`, the send button becomes "Stop" and dispatches `oas-stop`; `readonly` restricts editing but does not block the stop command.

<DemoBlock title="loading: send becomes stop; disabled: input and submit are blocked">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-3)">
    <oas-prompt-input id="prompt-input-stop" loading value="Generating a response…"></oas-prompt-input>
    <oas-prompt-input disabled placeholder="Input disabled"></oas-prompt-input>
  </div>
</DemoBlock>

<DemoBlock title="Read-only / maxlength / rows / submit policy">
  <oas-prompt-input readonly maxlength="200" rows="3" submit-on-enter="false" clear-on-submit="false" value="Read-only text; Enter will not submit"></oas-prompt-input>
</DemoBlock>

## Slots

<DemoBlock title="prefix / actions / footer slots">
  <oas-prompt-input id="prompt-input-slots" placeholder="Message with attachment…">
    <oas-tag slot="prefix">Attachment</oas-tag>
    <oas-button slot="actions" size="small">Template</oas-button>
    <span slot="footer" style="font-size:var(--oas-font-size-xs);color:var(--oas-color-text-secondary)">Enter to send · Shift+Enter for newline</span>
  </oas-prompt-input>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-prompt-input')
  const input = document.getElementById('prompt-input-basic')
  const out = document.getElementById('prompt-input-output')
  input?.addEventListener('oas-submit', (e) => {
    out.textContent = `Submitted: ${e.detail.value}`
  })
  input?.addEventListener('oas-suggestion-select', (e) => {
    out.textContent = `Suggestion: ${e.detail.label}`
  })
  const stop = document.getElementById('prompt-input-stop')
  stop?.addEventListener('oas-stop', () => {
    stop.removeAttribute('loading')
    out.textContent = 'Generation stopped'
  })
})
</script>

## API

### oas-prompt-input

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clear-on-submit` | Clear after submit (default true) | `string` | `true` |
| `disabled` | Disable input and submit | `boolean` | — |
| `loading` | Generating; send button becomes stop | `boolean` | — |
| `maxlength` | Maximum character count | `string` | — |
| `placeholder` | Placeholder (defaults to i18n promptInput.placeholder) | `string` | — |
| `readonly` | Read-only (focus/copy, no edits) | `boolean` | — |
| `rows` | Initial rows (1+, auto-grow capped at 160px) | `string` | `1` |
| `submit-on-enter` | Enter submits (default true; false requires the button; Shift+Enter always newlines) | `string` | `true` |
| `suggestions` | Suggestions JSON: strings or { label?, value } items | `string` | — |
| `value` | Current text (property channel; attribute is the initial value) | `string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current text (read/write) | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `submit` | `submit(): boolean` | Submit current text; returns false for empty/disabled/loading |
| `stop` | `stop(): void` | Stop generation (dispatches oas-stop only while loading) |
| `focusInput` | `focusInput(): void` | Focus the inner textarea |

#### Events

| Event | Description |
| --- | --- |
| `oas-stop` | Dispatched when the stop button is clicked while loading, `detail: {}` |
| `oas-submit` | Dispatched on submit, detail: { value } |
| `oas-suggestion-select` | Dispatched when a suggestion is clicked, detail: { value, label } |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Actions before the send button |
| `footer` | Footer/help row |
| `prefix` | Content before the input |
