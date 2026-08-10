# Mentions

A mention input component that pops a suggestion overlay when typing `@`, suited for @member / @task scenarios.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-mentions style="width: 320px" placeholder="Type @ to mention a member" options='[{"label":"Alice","value":"zhangsan"},{"label":"Bob","value":"lisi"},{"label":"Charlie","value":"wangwu"},{"label":"David","value":"zhaoliu"}]'></oas-mentions>
</DemoBlock>

Typing `@` pops the suggestion list: `↑`/`↓` to select, `Enter` to insert (the selected item is merged into the text), `Esc` or clicking outside closes it.

## Keyword Filtering

<DemoBlock title="Keyword filtering">
  <oas-mentions style="width: 320px" placeholder="Type e.g. @zh to filter" options='[{"label":"Alice","value":"zhangsan"},{"label":"Emily","value":"zhangwei"},{"label":"Bob","value":"lisi"},{"label":"Charlie","value":"wangwu"}]'></oas-mentions>
</DemoBlock>

Continue typing after `@` to filter by label; when nothing matches, the empty state "无匹配提及" is shown.

## Custom Prefix

<DemoBlock title="prefix">
  <oas-mentions prefix="#" style="width: 320px" placeholder="Type # to mention a task" options='[{"label":"Requirement review","value":"req-review"},{"label":"Implementation","value":"impl"},{"label":"QA","value":"qa"}]'></oas-mentions>
</DemoBlock>

`prefix` defaults to `@`; it can be changed to any trigger character (e.g. `#`).

## Disabled

<DemoBlock title="disabled">
  <oas-mentions disabled value="Disabled mention input" style="width: 320px" options='[{"label":"Alice","value":"zhangsan"}]'></oas-mentions>
</DemoBlock>

When `disabled`, the textarea cannot be typed into and the mention overlay cannot be triggered (greyed-out disabled state).

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-mentions id="mention-label" label="Meeting attendees" style="width: 320px" placeholder="Type @ to mention a member" options='[{"label":"Alice","value":"zhangsan"},{"label":"Bob","value":"lisi"}]'></oas-mentions>
  <span id="mention-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`label` serves as the accessible name (`aria-label`) of the textarea: once set, screen readers announce it; when unset, it falls back to `placeholder` → built-in text "提及输入框".

## Controlled Value

<DemoBlock title="value (controlled)">
  <oas-mentions value="Today @Alice finished QA" style="width: 320px" options='[{"label":"Alice","value":"zhangsan"},{"label":"Bob","value":"lisi"}]'></oas-mentions>
</DemoBlock>

The `value` property is a controlled channel; external changes sync to the textarea immediately.

## Events

<DemoBlock title="Selection events">
  <oas-mentions id="mention-event" style="width: 320px" placeholder="Selecting triggers oas-select / oas-change" options='[{"label":"Alice","value":"zhangsan"},{"label":"Bob","value":"lisi"},{"label":"Charlie","value":"wangwu"}]'></oas-mentions>
  <span id="mention-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

After selecting a suggestion, `oas-select` (`detail: { value, label }`) and `oas-change` (`detail: { value }`, the full text after insertion) fire:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('mention-event')
  const out = document.getElementById('mention-output')
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: ${e.detail.label}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  // label (accessible name) demo: read the inner textarea's aria-label
  const mLabel = document.getElementById('mention-label')
  const mLabelOut = document.getElementById('mention-label-output')
  const readMLabel = () => {
    const a = mLabel?.shadowRoot?.querySelector('textarea')?.getAttribute('aria-label')
    if (a !== undefined) {
      mLabelOut.textContent = `aria-label: ${a}`
    } else {
      setTimeout(readMLabel, 60)
    }
  }
  readMLabel()
})
</script>

## API

| Property       | Description                              | Default |
| -------------- | ---------------------------------------- | ------- |
| `value`        | Value (controlled, full text)            | —       |
| `options`      | Options, JSON array `[{ label, value }]` | `[]`    |
| `prefix`       | Trigger prefix                           | `@`     |
| `placeholder`  | Placeholder text                         | —       |
| `label`        | Accessible name (built-in text by default)| —      |
| `disabled`     | Disabled                                 | `false` |

Keyboard: type `@` to open, `↑`/`↓` to move the highlight, `Enter` to insert, `Esc` to close.

| Event         | Description                                  |
| ------------- | -------------------------------------------- |
| `oas-select`  | Suggestion selected, `detail: { value, label }` |
| `oas-change`  | Text changed after insertion, `detail: { value }` (full text) |
