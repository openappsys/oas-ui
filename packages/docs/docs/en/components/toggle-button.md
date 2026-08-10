# ToggleButton

An `aria-pressed` two-state toggle button; the pressed state uses the primary color background.

## Basic Usage

<DemoBlock title="Basic">
  <oas-toggle-button value="bold">加粗</oas-toggle-button>
  <oas-toggle-button value="italic" pressed>斜体</oas-toggle-button>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-toggle-button id="tb-event" value="underline">下划线</oas-toggle-button>
  <span id="tb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tb-event')
  const out = document.getElementById('tb-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: ${e.detail.value}, pressed: ${e.detail.pressed} }`
  })
})
</script>

## Disabled

<DemoBlock title="Disabled">
  <oas-toggle-button value="strike" disabled>删除线</oas-toggle-button>
  <oas-toggle-button value="strike" pressed disabled>删除线（按下）</oas-toggle-button>
</DemoBlock>

## API

| Property   | Description                         | Default |
| ---------- | ----------------------------------- | ------- |
| `value`    | Value (returned with events)        | —       |
| `pressed`  | Whether pressed (controlled)        | `false` |
| `disabled` | Disabled                            | `false` |

| Event         | Description                              |
| ------------- | ---------------------------------------- |
| `oas-change`  | Toggle, `detail: { value, pressed }`     |
