# Marker

Conversation timestamp/system-event marker: inline micro-status, outlined pill row, or labeled separator line. IM time dividers ("Today 10:00"), join/leave system events, and AI "generating" statuses all belong here.

## Basic usage (three variants)

<DemoBlock title="default / border / separator">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-marker>System: conversation created</oas-marker>
    <oas-marker variant="border">New member joined</oas-marker>
    <oas-marker variant="separator">Today 10:00</oas-marker>
  </div>
</DemoBlock>

`variant="default"` (small secondary text, default) suits system notes; `border` is an outlined pill row for status badges; `separator` stretches lines on both sides of the text — the primary form for time dividers.

## Time divider (separator)

<DemoBlock title="Time dividers in a conversation flow">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-marker variant="separator">Yesterday</oas-marker>
    <oas-message-row>
      <oas-bubble>Last message from yesterday.</oas-bubble>
    </oas-message-row>
    <oas-marker variant="separator">Today 10:00</oas-marker>
    <oas-message-row align="end">
      <oas-bubble variant="secondary">First message from today.</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

Separator semantics discipline: a text-bearing separator must **not** get `role="separator"` — its accessible name would come from `aria-label` and the text would be treated as decoration, hiding "Yesterday/Today" from screen readers. This component adds no such role; the lines are purely visual.

## Icons & streaming status

<DemoBlock title="icon slot + role=status">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-marker variant="border" role="status">
      <oas-spin slot="icon" size="14"></oas-spin>
      Generating answer…
    </oas-marker>
    <oas-marker variant="default">
      <svg slot="icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--oas-color-text-secondary)" stroke-width="1.5"/><path d="M5.5 8.5 L7.5 10.5 L11 6.5" stroke="var(--oas-color-text-secondary)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      All synced
    </oas-marker>
  </div>
</DemoBlock>

`slot="icon"` holds decorative icons (wrapper is `aria-hidden`; content carries the semantics). Streaming/progress status is declared by the host via `role="status"` directly (native ARIA reflection announces changes) — the component does not duplicate it.

## Empty state

<DemoBlock title="Empty content">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-marker></oas-marker>
    <oas-marker variant="separator"></oas-marker>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The first row (default) hides entirely without content; the second (separator) keeps the line itself — the line is its reason to exist.
  </p>
</DemoBlock>

## API

### oas-marker

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `variant` | Variant: default (small secondary text), border (outlined pill row), separator (stretching lines both sides of the text — the primary time-divider form); empty content hides default/border entirely while separator keeps the line | — | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Text content |
| `icon` | Decorative icon slot (wrapper is aria-hidden; streaming/progress status is declared by the host via role=status, not duplicated by the component) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-marker-font` | `inherit` |

CSS variable: `--oas-marker-font` (font-size opening, default `inherit`). Parts: `::part(marker)` / `::part(icon)` / `::part(content)`. A11y discipline: a text-bearing separator must not get `role="separator"` (its accessible name would come from aria-label and the text would be treated as decoration).
