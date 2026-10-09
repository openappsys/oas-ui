# ActionBar

A bottom command strip + readout wells (container `role="group"` + aria-label): command buttons + statistic / task-progress / media transport / music rhythm readouts, three surfaces (charcoal/dark/light). Distinct from `oas-toolbar` (a tool palette) — the action-bar is bottom commands + readouts, and readout wells are vocabulary the toolbar lacks; because the `center` slot routinely carries readout wells (progressbar and other readout regions are not command controls), the container does not claim the `toolbar` role (whose roving arrow-key navigation contract presumes a pure command set) and degrades to an honest `group` with natively tabbable command buttons.

## Basic usage

`slot="start"` / the default slot hold command buttons (`oas-action-bar-button`), `slot="center"` holds readout wells (`oas-action-bar-well` container + `oas-statistic-well` / `oas-task-progress-well` / `oas-transport-well` / `oas-music-well`), `slot="end"` holds end content.

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

When fully empty (`label`/`detail` both absent and no `progress` set) the well collapses entirely (host `data-empty` reflection, no layout footprint, same as `oas-statistic-well`) — no idle capsule when there is no task.

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

## Media transport well (oas-transport-well)

`frames` (current frame, controlled display — keyboard seek only emits, the host writes back) / `frame-rate` (fps, the timecode conversion base) / `duration` (total frames, optional — drives the /total segment and the seek upper bound) / `label` / `detail`. The timecode reads `HH:MM:SS:FF` (pure display conversion — no drop-frame / playback clock); the timecode doubles as a scrub slider (`role="slider"`, accessible name `label` > built-in copy): after focusing, ←/→ step ±1 frame, ↑/↓ ±1 second, Home/End jump to first/last frame, each dispatching `oas-seek` (detail `{ frames }`, proposal already clamped to [0, duration]).

When fully empty (all of `label`/`frames`/`frame-rate`/`duration`/`detail` absent) the well collapses entirely (host `data-empty` reflection, no layout footprint, same as `oas-statistic-well`).

<DemoBlock title="Timecode scrub (keyboard seek, host write-back)">
  <div style="width: 100%">
    <oas-action-bar id="ab-tc">
      <oas-action-bar-button value="play">Play</oas-action-bar-button>
      <oas-action-bar-button value="snap" slot="start">Snap</oas-action-bar-button>
      <oas-action-bar-well slot="center">
        <oas-transport-well id="ab-tc-well" label="Timecode" frames="1079" frame-rate="25" duration="2500" detail="3840 × 2160"></oas-transport-well>
      </oas-action-bar-well>
    </oas-action-bar>
  </div>
  <p id="ab-tc-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Focus the timecode with Tab, then press ←/→ (±1 frame), ↑/↓ (±1 second), Home/End (first/last frame) to watch oas-seek and the timecode advance (host write-back demo).</p>
</DemoBlock>

## Music rhythm well (oas-music-well)

`bars` / `beats` (current bar / beat, 1-based, together driving the bar.beat position segment) / `tempo` (BPM) / `meter` (time signature, shown verbatim) / `label` / `detail`; pure readout (no interaction, no events — the rhythm position is host-driven display, the well has no beat clock); the detail segment auto-composes `{tempo} BPM · {meter} · {detail}`.

When fully empty (all six attributes absent) the well collapses entirely (no layout footprint, same as `oas-statistic-well`).

<DemoBlock title="Rhythm position readout">
  <div style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="metronome">Metronome</oas-action-bar-button>
      <oas-action-bar-well>
        <oas-music-well label="Position" bars="5" beats="3" tempo="120" meter="4/4"></oas-music-well>
      </oas-action-bar-well>
      <oas-action-bar-button value="rate" slot="end">48 kHz</oas-action-bar-button>
    </oas-action-bar>
  </div>
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
  const tcWell = document.getElementById('ab-tc-well')
  const tcOut = document.getElementById('ab-tc-out')
  tcWell?.addEventListener('oas-seek', (e) => {
    // Controlled write-back: the host writes the proposed frame number back to frames, advancing the timecode
    tcWell.setAttribute('frames', String(e.detail.frames))
    tcOut.textContent = `oas-seek dispatched: frames=${e.detail.frames} (written back, timecode advanced)`
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

### oas-transport-well

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `detail` | Supplementary info (resolution / color space etc., composed with the auto frame-rate text; hides when empty) | `string` | — |
| `duration` | Total frames (optional — drives the /total segment, the seek upper bound and aria-valuemax) | `string` | — |
| `frame-rate` | Frame rate fps (timecode conversion base; when absent/invalid the timecode degrades to a raw frame count) | `string` | — |
| `frames` | Current frame (controlled display — keyboard seek only emits, the host writes back to drive the readout; invalid falls back to 0, negatives clamp to 0, beyond duration clamps to the last frame) | `string` | — |
| `label` | Readout label (hides when empty) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-seek` | Dispatched on keyboard seek (←/→ ±1 frame, ↑/↓ ±1 second, Home/End first/last frame; RTL mirrors the horizontal arrows); detail { frames } (proposal already clamped); controlled display — the component never changes frames itself, the host writes back |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-action-bar-well-bg` | `color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent)` |
| `--oas-action-bar-well-height` | `32px` |

### oas-music-well

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bars` | Current bar (1-based; with beats drives the bar.beat position segment, hidden when both are absent) | `string` | `1` |
| `beats` | Current beat (1-based; with bars drives the bar.beat position segment, hidden when both are absent) | `string` | `1` |
| `detail` | Supplementary info (composed with the auto BPM/meter text; hides when empty) | `string` | — |
| `label` | Readout label (hides when empty) | `string` | — |
| `meter` | Time signature (e.g. 4/4, shown verbatim; hides when empty) | `string` | — |
| `tempo` | Tempo BPM (invalid values drop the segment) | `string` | — |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-action-bar-well-bg` | `color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent)` |
| `--oas-action-bar-well-height` | `32px` |
