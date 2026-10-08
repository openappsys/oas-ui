# ActionBar

A bottom command strip + readout wells (container `role="group"` + aria-label): command buttons + statistic / task-progress readouts, three surfaces (charcoal/dark/light). Distinct from `oas-toolbar` (a tool palette) — the action-bar is bottom commands + readouts, and readout wells are vocabulary the toolbar lacks; because the `center` slot routinely carries readout wells (progressbar and other readout regions are not command controls), the container does not claim the `toolbar` role (whose roving arrow-key navigation contract presumes a pure command set) and degrades to an honest `group` with natively tabbable command buttons; media transport/music wells are deferred to v2.

## Basic usage

`slot="start"` / the default slot hold command buttons (`oas-action-bar-button`), `slot="center"` holds readout wells (`oas-action-bar-well` container + `oas-statistic-well` / `oas-task-progress-well`), `slot="end"` holds end content.

<DemoBlock title="Command buttons + statistic wells">
  <div style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="snap" slot="start">Snap</oas-action-bar-button>
      <oas-action-bar-button value="markers">Markers · 3</oas-action-bar-button>
      <oas-action-bar-button value="stereo">Stereo</oas-action-bar-button>
      <oas-action-bar-well slot="center" max-width="360">
        <oas-statistic-well label="Frame rate" value="25 fps"></oas-statistic-well>
        <oas-statistic-well label="Resolution" value="3840 × 2160" detail="Rec. 709"></oas-statistic-well>
      </oas-action-bar-well>
      <oas-action-bar-button value="settings" slot="end">48 kHz</oas-action-bar-button>
    </oas-action-bar>
  </div>
</DemoBlock>

## Command buttons (oas-action / active / plain)

Clicking dispatches `oas-action` (detail `{ value, active }` — active is the state at click time); the `active` boolean attribute is the selected state (controlled display — the host listens and writes back); `active-tint` customizes the highlight color (one of the 11 preset names or any CSS color, e.g. record-red); `plain` removes fills within groups.

<DemoBlock title="Record button (record-red active-tint) and toggle feedback">
  <div style="width: 100%">
    <oas-action-bar id="ab-btn">
      <oas-action-bar-button id="ab-record" value="record" active-tint="#e11d48" plain>● Record</oas-action-bar-button>
      <oas-action-bar-button value="solo">Solo</oas-action-bar-button>
      <oas-action-bar-button value="mute">Mute</oas-action-bar-button>
    </oas-action-bar>
  </div>
  <p id="ab-btn-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click "Record" to watch the oas-action feedback and the active state flip (host write-back demo).</p>
</DemoBlock>

## Surfaces (theme)

`theme="charcoal"` (default, constant-ink surface) / `"dark"` (constant ink · deep) / `"light"` (theme-native); the constant-ink surfaces use the `--oas-color-ink*` semantic tokens and do not flip with the host theme (transport-bar visual anchor).

<DemoBlock title="Three surfaces">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-action-bar theme="charcoal">
      <oas-action-bar-button value="play">Play</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
    <oas-action-bar theme="dark">
      <oas-action-bar-button value="play">Play</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
    <oas-action-bar theme="light">
      <oas-action-bar-button value="play">Play</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
  </div>
</DemoBlock>

## Task progress well (oas-task-progress-well)

`label` / `progress` (0-100, controlled display — host-driven) / `detail`; the cancel button dispatches `oas-cancel` (detail `{ label }`; the component only emits — it does not remove itself, the host decides what follows); progress 100 keeps the finished state.

<DemoBlock title="Export task progress + cancel">
  <div style="width: 100%">
    <oas-action-bar id="ab-task">
      <oas-action-bar-button value="export">Export</oas-action-bar-button>
      <oas-action-bar-well slot="center">
        <oas-task-progress-well id="ab-task-well" label="Exporting “Trailer cut”" progress="62" detail="About 40s left"></oas-task-progress-well>
      </oas-action-bar-well>
    </oas-action-bar>
  </div>
  <p id="ab-task-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the × in the well to watch the oas-cancel feedback; the "Export" button drives the progress forward.</p>
</DemoBlock>

## RTL

With `dir="rtl"` on the container the component mirrors automatically: `data-rtl` hook + logical-properties-only layout (the well area's auto margin follows the writing direction).

<DemoBlock title="RTL mirror">
  <div dir="rtl" style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="play">تشغيل</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="الدقة" value="3840 × 2160"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const record = document.getElementById('ab-record')
  const btnOut = document.getElementById('ab-btn-out')
  record?.addEventListener('oas-action', (e) => {
    // Host write-back demo: flip active on click (controlled display is host-driven)
    if (record.hasAttribute('active')) record.removeAttribute('active')
    else record.setAttribute('active', '')
    btnOut.textContent = `oas-action dispatched: value=${e.detail.value}, active (at click)=${e.detail.active}, after write-back active=${record.hasAttribute('active')}`
  })
  const taskBar = document.getElementById('ab-task')
  const taskWell = document.getElementById('ab-task-well')
  const taskOut = document.getElementById('ab-task-out')
  let progress = 62
  let timer = null
  const exportBtn = taskBar?.querySelector('oas-action-bar-button[value="export"]')
  exportBtn?.addEventListener('oas-action', () => {
    if (timer) return
    timer = setInterval(() => {
      progress = Math.min(100, progress + 2)
      taskWell.setAttribute('progress', String(progress))
      if (progress >= 100) {
        clearInterval(timer)
        timer = null
        taskOut.textContent = 'Export finished (progress 100 keeps the finished state; the host decides when to hide it)'
      }
    }, 300)
  })
  taskWell?.addEventListener('oas-cancel', (e) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    taskOut.textContent = `oas-cancel dispatched: label=${e.detail.label} (the component does not remove itself — host wires the cancel logic)`
  })
})
</script>

## API

### oas-action-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `theme` | Surface: charcoal (default, constant-ink surface) / dark (constant ink · deep) / light (theme-native); constant-ink surfaces use the --oas-color-ink* semantic tokens and do not flip with the host theme; invalid values fall back to charcoal with a one-time warning | `string` | `charcoal` |

#### Slots

| Name | Description |
| --- | --- |
| default | Command area (oas-action-bar-button or any command control) |
| `center` | Readout well area (oas-action-bar-well + well children; pushed to the far end of the writing direction) |
| `end` | End area |
| `start` | Leading command area |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-action-bar-bg` | `var(--oas-color-ink)` |
| `--oas-action-bar-fg` | `var(--oas-color-on-ink)` |
| `--oas-action-bar-height` | `44px` |
