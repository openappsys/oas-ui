# Bubble

The message bubble surface for conversations: owns only the bubble itself (background/border/radius/max width + content), while avatar, name, time, and delivery state belong to the `oas-message-row` composition row. For AI assistants, support chats, IM conversations, etc.

## Basic Usage

<DemoBlock title="Default bubble">
  <div style="width: 100%; max-width: 420px">
    <oas-bubble>Hi, give me an overview of the OAS-UI conversation components.</oas-bubble>
  </div>
</DemoBlock>

Content goes into the default slot; width fits content with an 80% container cap (override chain-wide via `--oas-bubble-max-width`).

## Alignment (align)

<DemoBlock title="Start / end sides">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-bubble align="start">Their message: aligned to start by default (logical properties, mirrored automatically in RTL).</oas-bubble>
    <oas-bubble align="end">My message: align="end" sticks to the end side, visually split from theirs.</oas-bubble>
  </div>
</DemoBlock>

`align="start" | "end"` is implemented with logical layout (`margin-inline-start: auto` + `text-align: end`) — no physical-direction CSS.

## Variants (variant)

<DemoBlock title="Six semantic variants">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-bubble variant="default">default: neutral soft surface (default).</oas-bubble>
    <oas-bubble variant="secondary">secondary: primary-tinted, typical for my own messages.</oas-bubble>
    <oas-bubble variant="muted">muted: no fill, secondary text color.</oas-bubble>
    <oas-bubble variant="outline">outline: filled surface with border.</oas-bubble>
    <oas-bubble variant="ghost">ghost: no fill, no border, width cap lifted.</oas-bubble>
    <oas-bubble variant="destructive">destructive: danger semantics (error echoes etc.).</oas-bubble>
  </div>
</DemoBlock>

The tinted surfaces of `secondary`/`destructive` mix theme semantic colors via `color-mix()` (theme-aware) and adapt automatically in dark mode; ghost lifts the 80% width cap for long streaming answers.

## Typing (loading)

<DemoBlock title="loading typing indicator">
  <div style="width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-bubble id="bubble-loading-demo">Summarize the key points of this document.</oas-bubble>
    <oas-button id="bubble-loading-btn" size="small" style="align-self: flex-start">Simulate replying…</oas-button>
  </div>
</DemoBlock>

With the boolean `loading` attribute present, content switches to a three-dot typing indicator (the AI "typing" scenario) and the host element reflects `aria-busy`; the animation respects `prefers-reduced-motion`.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const btn = document.querySelector('#bubble-loading-btn')
  const bubble = document.querySelector('#bubble-loading-demo')
  btn?.addEventListener('click', () => {
    if (bubble?.hasAttribute('loading')) return
    bubble?.setAttribute('loading', '')
    window.setTimeout(() => bubble?.removeAttribute('loading'), 2400)
  })
})
</script>

## Accessibility

- Direction is never conveyed by color/alignment alone: sender name and message text live in `oas-message-row`'s header/content, readable by screen readers.
- The `loading` dots carry `role="status"` with a localized accessible name ("Typing…"); the dots themselves are `aria-hidden`.
- Bubbles are purely presentational (no tab stop); rich content (links/buttons) goes into the default slot and keeps native reachability.

## API

### oas-bubble

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `loading` | Typing state (boolean presence): content switches to a three-dot typing indicator and the host reflects aria-busy (the AI "typing" scenario) | `boolean` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Bubble content |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-bubble-max-width` | `80%` |
| `--oas-bubble-radius` | `var(--oas-radius-lg)` |

Parts: `::part(bubble)`, `::part(content)`, `::part(typing)`. `align` (`start` default / `end`) and `variant` (`default` / `secondary` / `muted` / `outline` / `ghost` / `destructive`) are pure CSS channels.
