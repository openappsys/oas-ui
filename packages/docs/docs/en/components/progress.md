# Progress

Shows task progress, supporting line / circle / dashboard forms, status colors, indeterminate state, custom colors and text, stripes, step segments, buffer segments, and more.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0"></oas-progress>
    <oas-progress percent="30"></oas-progress>
    <oas-progress percent="60"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

`percent` is the current progress value (default range 0–100, clamped automatically); when it reaches 100 with no `status` set, success green is shown. `value` is an alias of `percent` (`percent` wins when both are set), so writing `value` works the same.

## Status

<DemoBlock title="Status">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="66" status="warning"></oas-progress>
    <oas-progress percent="66" status="error"></oas-progress>
    <oas-progress percent="100" status="success"></oas-progress>
  </oas-space>
</DemoBlock>

`status` supports `success` (green) / `warning` (orange) / `error` (red) semantic colors, taking priority over the automatic success green at 100%.

## Hidden text

<DemoBlock title="Hidden text">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="80"></oas-progress>
    <oas-progress percent="80" no-text></oas-progress>
  </oas-space>
</DemoBlock>

`no-text` hides the side/center percentage; `show-text="false"` is equivalent.

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

<DemoBlock title="Circle status colors & status icons">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="66" status="error"></oas-progress>
    <oas-progress type="circle" percent="66" status="warning"></oas-progress>
    <oas-progress type="circle" percent="100" status="success"></oas-progress>
    <oas-progress type="circle" percent="100"></oas-progress>
    <oas-progress type="circle" percent="40" show-text="false"></oas-progress>
  </oas-space>
</DemoBlock>

`status="success|error|warning"` recolors the ring and replaces the center percentage with the matching status icon (✓ / ✗ / alert, real SVG icons); the success icon also shows at 100% without an explicit `status`.

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

## Indeterminate

<DemoBlock title="Indeterminate loading">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress indeterminate label="Loading data"></oas-progress>
    <oas-progress indeterminate status="error"></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" indeterminate></oas-progress>
      <oas-progress type="dashboard" indeterminate></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

`indeterminate` means "in progress with unknown duration": it ignores `percent` / `steps` / `buffer` / `striped`; line shows a sweeping bar, circle / dashboard a rotating arc; `aria-valuenow` is removed per the APG. The `label` attribute provides an accessible name for screen readers (invisible).

## Dashboard

<DemoBlock title="Dashboard">
  <oas-space size="large" wrap align="center">
    <oas-progress type="dashboard" percent="25"></oas-progress>
    <oas-progress type="dashboard" percent="60"></oas-progress>
    <oas-progress type="dashboard" percent="100"></oas-progress>
    <oas-progress type="dashboard" percent="75" size="96" stroke-width="12" label="Storage usage">
      <b>75/128G</b>
    </oas-progress>
  </oas-space>
</DemoBlock>

`type="dashboard"` is a gauge form with a bottom opening (270° usable arc); `size` / `stroke-width` / `status` / `color` / `stroke-linecap` work the same as circle; the default slot projects into the gauge center (e.g. `75/128G` above).

## Custom colors

<DemoBlock title="color / track-color">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="40" color="magenta"></oas-progress>
    <oas-progress percent="60" color="#7c3aed" track-color="rgba(124,58,237,.15)"></oas-progress>
    <oas-progress percent="80" color="linear-gradient(90deg, var(--oas-preset-cyan), var(--oas-preset-blue))" striped-flow></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" percent="66" color="gold"></oas-progress>
      <oas-progress type="dashboard" percent="42" color="lime" track-color="cyan"></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

`color` / `track-color` accept 11 preset palette names (theme tokens, dark-adaptive) or any CSS color string; `color` also accepts gradient strings (line form recommended — ring strokes cannot consume `linear-gradient()` background syntax). An explicit `color` takes priority over `status` colors.

## Custom text

<DemoBlock title="Default slot custom text">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="70"><span>2m 10s left</span></oas-progress>
    <oas-progress percent="35" max="200"><span>35MB / 200MB downloaded</span></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" percent="60"><b>3/5</b></oas-progress>
      <oas-progress type="dashboard" percent="88"><span>Good</span></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

The default slot overrides the built-in percentage: line projects into the side text area, circle / dashboard into the center, and takes priority over status icons.

## Stripes

<DemoBlock title="striped / striped-flow">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="60" striped></oas-progress>
    <oas-progress percent="80" striped-flow></oas-progress>
    <oas-progress percent="45" status="warning" striped-flow></oas-progress>
    <oas-progress percent="30" size="large" striped></oas-progress>
  </oas-space>
</DemoBlock>

`striped` overlays diagonal stripes (density adapts to track height); `striped-flow` animates them (implies `striped` when used alone); line form only.

## Steps

<DemoBlock title="steps segments">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0" steps="3"></oas-progress>
    <oas-progress percent="50" steps="5" show-text="false"></oas-progress>
    <oas-progress percent="80" steps="8"></oas-progress>
    <oas-progress id="step-bar" percent="25" steps="4" status="warning"></oas-progress>
    <oas-space size="medium" wrap>
      <oas-button onclick="stepForward()">Next step</oas-button>
      <span id="step-label">Step 1 / 4</span>
    </oas-space>
  </oas-space>
</DemoBlock>

`steps` splits the line into N equal segments (gap overridable via `--oas-progress-step-gap`); the lit count follows `percent` with rounding; line form only.

## Buffer

<DemoBlock title="buffer (video/download)">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress id="buffer-bar" percent="10" buffer="35" label="Video buffering"></oas-progress>
    <oas-space size="medium" wrap>
      <oas-button type="primary" onclick="startBuffer()">Play (simulated buffering)</oas-button>
      <span id="buffer-label">Played 10% / Buffered 35%</span>
    </oas-space>
  </oas-space>
</DemoBlock>

`buffer` (same value range as `percent`) renders a light buffer segment on the track with the main progress on top; line form only.

## Line thickness & inside text

<DemoBlock title="size / stroke-width / text-inside">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="30" size="small" no-text></oas-progress>
    <oas-progress percent="50" no-text></oas-progress>
    <oas-progress percent="70" size="large" no-text></oas-progress>
    <oas-progress percent="60" text-inside></oas-progress>
    <oas-progress percent="85" stroke-width="24" text-inside status="success"></oas-progress>
  </oas-space>
</DemoBlock>

For the line form, `size` is a height tier (`small` 4px / `medium` 8px / `large` 12px) and `stroke-width` sets the track height directly (px, priority over tiers); `text-inside` moves text into the bar (track height auto-lifts when not explicitly set).

## Linecap

<DemoBlock title="stroke-linecap">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="42" stroke-linecap="round"></oas-progress>
    <oas-progress type="circle" percent="42" stroke-linecap="butt"></oas-progress>
    <oas-progress type="dashboard" percent="42" stroke-linecap="butt"></oas-progress>
  </oas-space>
</DemoBlock>

`stroke-linecap` controls the progress arc cap of circle / dashboard: `round` (default) / `butt`; not applicable to the line form.

## Value range

<DemoBlock title="max">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="120" max="200"><span>120MB / 200MB</span></oas-progress>
    <oas-progress percent="160" max="200" buffer="190"></oas-progress>
    <oas-progress type="dashboard" percent="128" max="256" label="Disk usage"></oas-progress>
  </oas-space>
</DemoBlock>

`max` defines the full value (default 100): `percent` / `buffer` mean "current value" (clamped to 0–max), width and percentage are computed as `value / max`, and `aria-valuenow` / `aria-valuemax` sync real values.

## Accessibility

- `role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` sync across forms; `aria-valuenow` is removed in the indeterminate state per the APG.
- The `label` attribute writes `aria-label`, giving screen readers a readable name (invisible; see the "Indeterminate" demo).
- Component CSS variable openings: `--oas-progress-color` / `--oas-progress-track-color` / `--oas-progress-height` / `--oas-progress-buffer-color` / `--oas-progress-stripe-color` / `--oas-progress-stripe-size` / `--oas-progress-step-gap` / `--oas-progress-inside-color` / `--oas-progress-duration`.

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
  let step = 1
  window.stepForward = () => {
    step = step >= 4 ? 1 : step + 1
    const label = document.getElementById('step-label')
    const bar = document.getElementById('step-bar')
    label.textContent = `Step ${step} / 4`
    bar.setAttribute('percent', String((step / 4) * 100))
  }
  window.startBuffer = () => {
    const bar = document.getElementById('buffer-bar')
    const label = document.getElementById('buffer-label')
    let played = 10
    let buffered = 35
    const timer = setInterval(() => {
      played += 4
      buffered = Math.min(100, buffered + 3)
      bar.setAttribute('percent', String(played))
      bar.setAttribute('buffer', String(buffered))
      label.textContent = `Played ${Math.min(played, 100)}% / Buffered ${buffered}%`
      if (played >= 100) {
        clearInterval(timer)
        message.success('Playback finished')
      }
    }, 300)
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `buffer` | Buffer value (line only, clamped to 0–max): static buffered segment behind the main bar for streaming/loading scenarios | `string` | — |
| `color` | Progress color: preset name (via --oas-preset-* tokens) or any CSS color/gradient string (gradients recommended for line); wins over status colors and the full-value green | `string` | — |
| `indeterminate` | Indeterminate loading: ignores percent/steps/buffer/striped and drops aria-valuenow (APG); sweeping bar (line) or rotating segmented arc (circle/dashboard) | `boolean` | — |
| `label` | Accessible name (written to the progress bar aria-label) | — | — |
| `max` | Value range upper bound (default 100): percent/buffer read as current values; width and text are computed as value/max and aria reflects real values | `string` | `100` |
| `no-text` | Hide the side/center percentage text | `boolean` | — |
| `percent` | Progress percentage (0–100, clamped automatically) | `string` | `0` |
| `show-text` | Whether to show the percentage text | `string` | `true` |
| `size` | Size: line = height preset `small`(4px) / `medium`(8px, default) / `large`(12px); circle/dashboard = diameter in px (default 48) | `string` | `48` |
| `status` | Status color; `error` red, `success` green; when unset and progress reaches 100, success green is shown | `string` | — |
| `steps` | Stepped segments (line only): integer ≥2 equal segments; lit count = round(percent × steps) | `string` | — |
| `striped` | Striped texture (line only) | `boolean` | — |
| `striped-flow` | Animated flowing stripes (line only; implies striped when used alone) | `boolean` | — |
| `stroke-linecap` | Arc line cap `round` (default) / `butt` (circle/dashboard) | `string` | `round` |
| `stroke-width` | Stroke width in px: circle/dashboard ring thickness (default 6); line track height (wins over the size preset) | `string` | `6` |
| `text-inside` | Text inside the bar (line only; the track auto-grows to fit text when no explicit thickness is set) | `boolean` | — |
| `track-color` | Track color: same protocol as color | `string` | — |
| `type` | Shape: `line` (default) / `circle` / `dashboard` (gauge: 270° arc open at the bottom) | `string` | `line` |
| `value` | Alias of percent (current value, clamped to 0–max): when both are set percent wins; read only when percent is absent | `string` | `0` |

### Slots

| Name | Description |
| --- | --- |
| default | Custom text: right of the line / inside the bar (text-inside) / circle center; wins over status icons and the built-in percentage |

`role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (synced for both line and circle).
