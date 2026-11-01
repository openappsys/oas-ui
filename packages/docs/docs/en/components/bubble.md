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

## Tail

<DemoBlock title="Last bubble of a group in a two-sided conversation">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">G</oas-avatar>
      <oas-bubble>Consecutive messages from the same sender: earlier ones carry no tail.</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">G</oas-avatar>
      <oas-bubble tail="auto">The last one sets tail, pointing at its sender next to the avatar.</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">Me</oas-avatar>
      <oas-bubble align="end" variant="secondary">My message has no tail by default.</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">Me</oas-avatar>
      <oas-bubble align="end" variant="secondary" tail="auto">tail="auto" follows align and points at the sender on the end side.</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

<DemoBlock title="Variant behavior: outline falls back to a corner, muted / ghost omit the tail">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-bubble tail="start" variant="outline">outline: no protruding tail; the bottom outer corner tightens so the border stays continuous.</oas-bubble>
    <oas-bubble tail="start" variant="muted">muted: no surface, so no tail.</oas-bubble>
    <oas-bubble tail="start" variant="ghost">ghost: no surface, so no tail.</oas-bubble>
  </div>
</DemoBlock>

`tail="none | auto | start | end"` (default `none`). `auto` follows `align`: the other party (start) gets a bottom-left tail, my own messages (end) get a bottom-right tail. Filled variants (default / secondary / destructive) draw a curved tail at the bottom outer corner, colored from the bubble surface; `outline` falls back to a tightened bottom outer corner (no broken border), while `muted` / `ghost` have no surface and draw nothing. **In grouped conversations, set `tail` only on the last message of a run from the same sender**, matching common chat UIs. The tail is a decorative pseudo-element (not in the DOM or accessibility tree); size, offset and corner radius are tunable via `--oas-bubble-tail-size` / `--oas-bubble-tail-offset` / `--oas-bubble-tail-corner-radius`.

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

`streaming` means "some content is already visible and more is arriving": content stays visible, the host reflects `aria-busy`, and the content region uses `aria-live="off"` to avoid per-token announcements. Remove it when the answer ends and let a host status region announce completion/stop/failure. `loading` and `streaming` are different states; do not use `loading` for streaming append.

<DemoBlock title="Streaming append (streaming)">
  <oas-bubble streaming>Part of the answer is visible and more content is still arriving.</oas-bubble>
</DemoBlock>

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
  const reactionsBubble = document.querySelector('#bubble-reactions-demo')
  const reactionsOut = document.querySelector('#bubble-reactions-out')
  reactionsBubble?.addEventListener('oas-reaction', (e) => {
    const d = e.detail
    if (reactionsOut) reactionsOut.textContent = `oas-reaction: ${d.emoji} (count=${d.count}, active=${d.active}, index=${d.index})`
  })
})
</script>

## Reactions (reactions)

<DemoBlock title="Emoji + count (side / align)">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-bubble id="bubble-reactions-demo" reactions='[{"emoji":"👍","count":3,"active":true},{"emoji":"🎉","count":1}]'>I support this plan; let's align on the details.</oas-bubble>
    <oas-bubble align="end" variant="secondary" reactions-side="top" reactions-align="end" reactions='[{"emoji":"❤️","count":2}]'>I've confirmed the plan above.</oas-bubble>
  </div>
  <p id="bubble-reactions-out" style="margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click a reaction button; the received oas-reaction shows here.</p>
</DemoBlock>

`reactions` is a JSON array (each item `{ emoji, count?, active?, label? }`, emoji required; an empty array/invalid JSON renders nothing). `reactions-side` controls top/bottom (default `bottom`; `top` places it above the bubble) and `reactions-align` overrides horizontal alignment (defaults to following the bubble `align`). Each reaction is a **real button** (keyboard reachable + focus ring + `aria-pressed` reflecting the active state): clicking it dispatches `oas-reaction` (detail `{ emoji, count, active, index }`) — reaction data stays owned by the host, the component only dispatches intent.

## Accessibility

- Direction is never conveyed by color/alignment alone: sender name and message text live in `oas-message-row`'s header/content, readable by screen readers.
- The `loading` dots carry `role="status"` with a localized accessible name ("Typing…"); the dots themselves are `aria-hidden`.
- Bubbles are purely presentational (no tab stop); rich content (links/buttons) goes into the default slot and keeps native reachability.

## API

### oas-bubble

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Direction: start (other party, default) / end (self) — logical-property alignment (align-self, RTL mirrored automatically); when set explicitly it wins over the inherited text-align reflection | — | — |
| `loading` | Typing state (boolean presence): content switches to a three-dot typing indicator and the host reflects aria-busy (the AI "typing" scenario) | `boolean` | — |
| `reactions` | Reaction bar as a JSON array; each item { emoji, count?, active?, label? } (emoji required). Empty array / invalid JSON renders nothing | — | — |
| `reactions-align` | Horizontal alignment of the reaction bar: start / end; defaults to following the bubble align | — | — |
| `reactions-side` | Vertical placement of the reaction bar: bottom (default, below the bubble) / top (above the bubble) | — | — |
| `streaming` | Streaming state (boolean presence): content stays visible and the host reflects aria-busy; the content region uses aria-live=off to avoid per-token announcements, while a host status region announces completion. | `boolean` | — |
| `tail` | Tail direction: none (default, no tail) \| auto (follow align: start or end side) \| start \| end — a small curved tail at the bottom outer corner pointing at the sender. Filled variants draw it, outline falls back to a tightened bottom outer corner, and muted / ghost omit it. In grouped conversations set it only on the last message of a run from the same sender. | `string` | `none` |

#### Events

| Event | Description |
| --- | --- |
| `oas-reaction` | Fired when a reaction is clicked; detail { emoji, count, active, index } (reaction data stays owned by the host) |

#### Slots

| Name | Description |
| --- | --- |
| default | Bubble content |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-bubble-max-width` | `80%` |
| `--oas-bubble-radius` | `var(--oas-radius-lg)` |
| `--oas-bubble-tail-corner-radius` | `var(--oas-radius-sm)` |
| `--oas-bubble-tail-offset` | `0` |
| `--oas-bubble-tail-size` | `16px` |

Parts: `::part(bubble)`, `::part(content)`, `::part(typing)`, `::part(reactions)` reaction strip / `::part(reaction)` a single reaction button. `align` (`start` default / `end`) and `variant` (`default` / `secondary` / `muted` / `outline` / `ghost` / `destructive`) are pure CSS channels.
