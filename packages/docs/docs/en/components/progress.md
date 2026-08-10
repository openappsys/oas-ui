# Progress

Shows task progress, supporting line and circle forms, status colors, and hidden text.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0"></oas-progress>
    <oas-progress percent="30"></oas-progress>
    <oas-progress percent="60"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

## Status

<DemoBlock title="Status">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="66" status="error"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

## Hidden text

<DemoBlock title="Hidden text">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="80"></oas-progress>
    <oas-progress percent="80" no-text></oas-progress>
  </oas-space>
</DemoBlock>

## Circle progress

<DemoBlock title="Circle">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="0"></oas-progress>
    <oas-progress type="circle" percent="30"></oas-progress>
    <oas-progress type="circle" percent="60"></oas-progress>
    <oas-progress type="circle" percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

The circle defaults to a 48px diameter and 6px stroke, showing the percentage in the center; `type="circle"` switches the form.

## Circle size & stroke width

<DemoBlock title="Size / stroke width">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="75" size="72" stroke-width="10"></oas-progress>
    <oas-progress type="circle" percent="40" size="96" stroke-width="14"></oas-progress>
    <oas-progress type="circle" percent="60" size="48" stroke-width="4"></oas-progress>
  </oas-space>
</DemoBlock>

## Circle status

<DemoBlock title="Circle status colors">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="66" status="error"></oas-progress>
    <oas-progress type="circle" percent="100" status="success"></oas-progress>
    <oas-progress type="circle" percent="40" show-text="false"></oas-progress>
  </oas-space>
</DemoBlock>

`status="success|error"` recolors the whole ring (success green, error red); `show-text="false"` hides the center percentage.

## Dynamic progress

<DemoBlock title="Dynamic progress">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-space size="large" wrap>
      <oas-progress id="dynamic-progress" percent="0"></oas-progress>
      <oas-progress id="dynamic-circle" type="circle" percent="0"></oas-progress>
    </oas-space>
    <oas-button type="primary" onclick="startProgress()">Start simulated task</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.startProgress = () => {
    const bar = document.getElementById('dynamic-progress')
    const circle = document.getElementById('dynamic-circle')
    let percent = 0
    const timer = setInterval(() => {
      percent += 10
      bar.setAttribute('percent', String(percent))
      circle.setAttribute('percent', String(percent))
      if (percent >= 100) {
        clearInterval(timer)
        message.success('Task completed')
      }
    }, 300)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `no-text` | Hide the side/center percentage text | — | — |
| `percent` | Progress percentage (0–100, clamped automatically) | — | `0` |
| `show-text` | Whether to show the percentage text | — | `true` |
| `size` | Circle diameter (px) | — | `48` |
| `status` | Status color; `error` red, `success` green; when unset and progress reaches 100, success green is shown | — | — |
| `stroke-width` | Circle stroke width (px) | — | `6` |
| `type` | Form: `line` / `circle` | — | `line` |

`role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (synced for both line and circle).
