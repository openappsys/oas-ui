# Spin

A loading indicator that can be used standalone or wrap content with an overlaid mask; supports tips, progress, fullscreen and custom indicators.

## Basic usage

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; the old abbreviations `sm` / `md` / `lg` remain supported.

<DemoBlock title="Five sizes">
  <oas-space size="large">
    <oas-spin size="xs"></oas-spin>
    <oas-spin size="small"></oas-spin>
    <oas-spin></oas-spin>
    <oas-spin size="large"></oas-spin>
    <oas-spin size="xl"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="Legacy abbreviations (sm / md / lg)">
  <oas-space size="large">
    <oas-spin size="sm"></oas-spin>
    <oas-spin size="md"></oas-spin>
    <oas-spin size="lg"></oas-spin>
  </oas-space>
</DemoBlock>

`size` also accepts arbitrary CSS sizes: plain numbers are interpreted as `px`, values with units (`2rem` / `40px` / `10%`) and `calc()` are used as-is.

<DemoBlock title="Arbitrary sizes">
  <oas-space size="large" direction="vertical">
    <oas-space size="large">
      <oas-spin size="24"></oas-spin>
      <oas-spin size="36"></oas-spin>
      <oas-spin size="48px"></oas-spin>
      <oas-spin size="2rem"></oas-spin>
    </oas-space>
    <oas-spin size="calc(100% - 8px)" style="width: 220px" tip="calc fills the container"></oas-spin>
  </oas-space>
</DemoBlock>

## Variants

`variant` provides three forms: `ring` (default border ring) / `dot` (three pulsing dots) / `bars` (three stretching bars). The size system applies to all variants.

<DemoBlock title="ring / dot / bars">
  <oas-space size="large">
    <oas-spin size="large" variant="ring"></oas-spin>
    <oas-spin size="large" variant="dot"></oas-spin>
    <oas-spin size="large" variant="bars"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="Inline dot next to text">
  <oas-space size="small" align="center">
    <span>Loading more</span>
    <oas-spin size="xs" variant="dot"></oas-spin>
  </oas-space>
</DemoBlock>

## Tip text

Use the `tip` attribute for plain text or the named `tip` slot for rich content (the slot wins); `tip-position` controls placement (`above` / `below` default / `before` / `after`); `hide-icon` keeps only the text.

<DemoBlock title="Tip text and four positions">
  <oas-space size="large">
    <oas-spin tip="below (default)"></oas-spin>
    <oas-spin tip="above" tip-position="above"></oas-spin>
    <oas-spin tip="before" tip-position="before"></oas-spin>
    <oas-spin tip="after" tip-position="after"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="Rich tip slot and hide-icon">
  <oas-space size="large">
    <oas-spin size="large">
      <span slot="tip" style="color: var(--oas-preset-cyan-text)">Rich <b>tip slot</b></span>
    </oas-spin>
    <oas-spin tip="Text-only loading state" hide-icon></oas-spin>
  </oas-space>
</DemoBlock>

## Wrapping content

When wrapping content, the indicator and tip are centered with a translucent mask; `show-overlay="false"` disables the mask.

<DemoBlock title="Wrapping content">
  <oas-spin spinning tip="Loading data">
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      Content area while loading
    </div>
  </oas-spin>
</DemoBlock>

<DemoBlock title="Disable mask (show-overlay=&quot;false&quot;)">
  <oas-spin spinning show-overlay="false" tip="No mask">
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      Content stays fully visible
    </div>
  </oas-spin>
</DemoBlock>

## Delay anti-flicker

When a request finishes faster than the animation can be perceived, a flashing spinner is pure noise. `delay` (milliseconds) defers the indicator: if loading finishes within the window it never appears; `aria-busy` takes effect immediately regardless of the delay.

<DemoBlock title="Fast requests don't flicker">
  <oas-space direction="vertical">
    <oas-spin id="spin-delay-demo" delay="800" tip="Loading">
      <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
        200ms fast request → never appears; 2s slow request → appears after delay
      </div>
    </oas-spin>
    <oas-space>
      <oas-button size="small" onclick="spinFastRequest()">Fast request (200ms, no flicker)</oas-button>
      <oas-button size="small" onclick="spinSlowRequest()">Slow request (2s, delayed)</oas-button>
    </oas-space>
  </oas-space>
</DemoBlock>

## Custom indicator

The named `icon` slot replaces the default ring (size comes from the content itself); the `rotate` attribute spins the custom indicator — add `rotate` for regular SVG icons, omit it for GIFs / static SVGs.

<DemoBlock title="icon slot and rotate">
  <oas-space size="large">
    <oas-spin size="large">
      <svg slot="icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 9 9" stroke="var(--oas-color-primary)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </oas-spin>
    <oas-spin size="large" rotate>
      <svg slot="icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 9 9" stroke="var(--oas-preset-cyan-text)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </oas-spin>
    <oas-spin size="large" tip="Static icon, no spin">
      <span slot="icon" style="font-size: 30px; line-height: 1">◈</span>
    </oas-spin>
  </oas-space>
</DemoBlock>

## Progress mode

Use the default form for unknown durations; when progress is known, `percent` (0-100) switches to a determinate progress ring (`role="progressbar"` + the `aria-value` trio); `percent="auto"` advances a simulated progress while loading (capped at 90%, restarts after finishing). For deterministic progress the [Progress](/components/progress) circle form is an alternative.

<DemoBlock title="Determinate progress ring">
  <oas-space size="large">
    <oas-spin percent="0" size="large"></oas-spin>
    <oas-spin percent="35" size="large"></oas-spin>
    <oas-spin percent="70" size="large"></oas-spin>
    <oas-spin percent="100" size="large"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="Stepping progress and auto simulation">
  <oas-space size="large">
    <oas-spin id="spin-step-demo" percent="20" size="large" tip="Click the button to step"></oas-spin>
    <oas-spin percent="auto" spinning size="large" tip="auto simulation"></oas-spin>
    <oas-button size="small" onclick="spinStepPercent()">Progress +15</oas-button>
  </oas-space>
</DemoBlock>

## Paused

`paused` freezes looping animations (keeping the current frame) for screenshots / demos / frame inspection.

<DemoBlock title="Paused comparison">
  <oas-space size="large">
    <oas-spin size="large"></oas-spin>
    <oas-spin size="large" paused></oas-spin>
    <oas-spin size="large" variant="dot"></oas-spin>
    <oas-spin size="large" variant="dot" paused></oas-spin>
  </oas-space>
</DemoBlock>

## Visual customization

Component-level CSS variables: `--oas-spin-indicator-color` / `--oas-spin-track-color` / `--oas-spin-border-width` / `--oas-spin-duration` / `--oas-spin-mask-bg` / `--oas-spin-z-index`. `inherit-color` makes the indicator follow the host text color; `block` makes the host occupy a full line.

<DemoBlock title="CSS variable customization">
  <oas-space size="large">
    <div style="--oas-spin-indicator-color: var(--oas-preset-cyan-text); --oas-spin-track-color: var(--oas-preset-geekblue-text); --oas-spin-border-width: 6px; --oas-spin-duration: 2s;">
      <oas-spin size="large"></oas-spin>
    </div>
    <div style="--oas-spin-duration: 1.6s">
      <oas-spin size="large" variant="dot"></oas-spin>
    </div>
    <div style="--oas-spin-mask-bg: color-mix(in srgb, var(--oas-preset-cyan-text) 18%, transparent)">
      <oas-spin spinning size="large">
        <div style="width: 180px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
      </oas-spin>
    </div>
  </oas-space>
</DemoBlock>

<DemoBlock title="inherit-color follows text color">
  <oas-space size="large">
    <oas-space size="small" style="color: var(--oas-preset-magenta-text)">
      <span>Brand text</span>
      <oas-spin inherit-color></oas-spin>
    </oas-space>
    <oas-space size="small" style="color: var(--oas-preset-green-text)">
      <span>Success text</span>
      <oas-spin inherit-color variant="dot"></oas-spin>
    </oas-space>
  </oas-space>
</DemoBlock>

## Fullscreen

The `fullscreen` attribute enters a fullscreen centered mask; the imperative `OASSpin.fullscreen()` returns a `{ close }` handle for async flows (calls stack, each handle closes independently).

<DemoBlock title="Fullscreen loading (auto-closes after 2s)">
  <oas-space>
    <oas-button type="primary" onclick="spinFullscreenOnce()">Fullscreen 2s</oas-button>
    <oas-button onclick="spinFullscreenDelay()">Fullscreen with delay (3s)</oas-button>
  </oas-space>
</DemoBlock>

## Global default indicator

`OASSpin.setDefaultIndicator(html)` registers a branded loading animation: afterwards, **newly created** instances without an `icon` slot render the registered HTML instead of the built-in ring; pass `null` to restore. Priority: `icon` slot > global default > built-in ring.

<DemoBlock title="Register a global indicator and spawn an instance">
  <oas-space direction="vertical">
    <oas-space>
      <oas-button size="small" onclick="spinSetGlobalIndicator()">Register and spawn</oas-button>
      <oas-button size="small" onclick="spinResetGlobalIndicator()">Restore built-in and spawn</oas-button>
    </oas-space>
    <div id="spin-global-slot"></div>
  </oas-space>
</DemoBlock>

## Accessibility

- The indicator has `role="status"` with a visually hidden screen-reader label (locale default "Loading…", reads `tip` when set, host `aria-label` wins)
- Progress mode switches to `role="progressbar"` with `aria-valuemin/max/now`
- Host `aria-busy` syncs immediately with `spinning`; for region loading, also mark the content container with `aria-busy` and point `aria-describedby` at the spin:

```html
<section aria-busy="true" aria-describedby="page-spin">
  <oas-spin id="page-spin" spinning tip="Loading"></oas-spin>
  <!-- region content -->
</section>
```

- Animations degrade to a static indicator when the OS enables "reduce motion" (`prefers-reduced-motion`)

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { OASSpin } = await import('@oas-ui/ui')

  window.spinFastRequest = () => {
    const el = document.getElementById('spin-delay-demo')
    el.setAttribute('spinning', '')
    setTimeout(() => el.removeAttribute('spinning'), 200)
  }
  window.spinSlowRequest = () => {
    const el = document.getElementById('spin-delay-demo')
    el.setAttribute('spinning', '')
    setTimeout(() => el.removeAttribute('spinning'), 2000)
  }

  window.spinStepPercent = () => {
    const el = document.getElementById('spin-step-demo')
    const next = Math.min(100, Number(el.getAttribute('percent') || '0') + 15)
    el.setAttribute('percent', String(next))
  }

  window.spinFullscreenOnce = () => {
    const h = OASSpin.fullscreen({ tip: 'Fullscreen loading' })
    setTimeout(() => h.close(), 2000)
  }
  window.spinFullscreenDelay = () => {
    const h = OASSpin.fullscreen({ tip: 'Delayed fullscreen loading', delay: 800 })
    setTimeout(() => h.close(), 3000)
  }

  const spawnGlobal = () => {
    const host = document.getElementById('spin-global-slot')
    host.innerHTML = ''
    const el = document.createElement('oas-spin')
    el.setAttribute('size', 'large')
    el.setAttribute('tip', 'Global default indicator')
    host.appendChild(el)
  }
  window.spinSetGlobalIndicator = () => {
    OASSpin.setDefaultIndicator(
      '<span style="font-size: 30px; line-height: 1; color: var(--oas-color-primary)">◈</span>',
    )
    spawnGlobal()
  }
  window.spinResetGlobalIndicator = () => {
    OASSpin.setDefaultIndicator(null)
    spawnGlobal()
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | — | — | — |
| `block` | — | — | — |
| `delay` | — | `string` | — |
| `fullscreen` | — | — | — |
| `hide-icon` | — | `boolean` | — |
| `inherit-color` | — | — | — |
| `paused` | — | — | — |
| `percent` | — | `string` | — |
| `rotate` | — | `boolean` | — |
| `show-overlay` | — | `string` | `true` |
| `size` | Indicator size: `xs` / `small` / `medium` (default) / `large` / `xl`; legacy abbreviations `sm`/`md`/`lg` remain supported | `string` | `md` |
| `spinning` | Whether loading; when set, wraps content with an overlaid mask | `boolean` | — |
| `tip` | — | `string` | — |
| `tip-position` | — | `string` | `below` |
| `variant` | — | `string` | `ring` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `icon` | — |
| `tip` | — |

### CSS variables

| Variable | Description | Default |
| --- | --- | --- |
| `--oas-spin-indicator-color` | Indicator color | `var(--oas-color-primary)` |
| `--oas-spin-track-color` | Track color (ring base / progress track) | `var(--oas-color-bg-hover)` |
| `--oas-spin-border-width` | Stroke width (ring border / progress stroke) | `3px` (`2px` for xs/small) |
| `--oas-spin-duration` | Animation duration | `0.8s` |
| `--oas-spin-mask-bg` | Mask background | `color-mix(in srgb, var(--oas-color-bg) 70%, transparent)` |
| `--oas-spin-z-index` | Fullscreen z-index | `3500` |

### Static methods

| Method | Description |
| --- | --- |
| `OASSpin.fullscreen(options?)` | Imperative fullscreen loading, returns `{ close() }`; `options`: `{ tip?: string; delay?: number }` |
| `OASSpin.setDefaultIndicator(html \| null)` | Register a global default indicator (affects newly created instances); `null` restores the built-in ring |

The indicator uses `role="status"` (`role="progressbar"` + the `aria-value` trio in progress mode) with a built-in screen-reader label; host `aria-busy` syncs with `spinning`.
