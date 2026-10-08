# MessageRow

The conversation message row (composition row): the row-layout owner — avatar slot, direction, header/footer arrangement, and delivery status; the visible surface is provided by `oas-bubble` inside the default slot. Message actions (copy/retry etc.) live in the footer slot; the component owns no specific actions.

## Basic Usage

<DemoBlock title="Two-way conversation (avatar + header + bubble + footer)">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-message-row>
      <oas-avatar slot="avatar" size="32">S</oas-avatar>
      <span slot="header">Support · 10:01</span>
      <oas-bubble>Hello! How can I help you today?</oas-bubble>
      <span slot="footer">
        <oas-button size="small" type="text">Quote</oas-button>
        <oas-button size="small" type="text">Forward</oas-button>
      </span>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="32">M</oas-avatar>
      <span slot="header">Me · 10:02</span>
      <oas-bubble variant="secondary">I'd like to understand the slot structure.</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

Four slots: `avatar`, `header` (sender/time), default (place `oas-bubble`), `footer` (actions/extra metadata); empty slots collapse automatically. The avatar **bottom-aligns** (long messages hug the bottom — the common IM detail).

## Direction & logical properties (align)

<DemoBlock title="align=start / end (mirrored automatically in RTL)">
  <div dir="rtl" style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">M</oas-avatar>
      <oas-bubble variant="secondary">My message inside an RTL container — all-logical directions, mirrored automatically.</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">S</oas-avatar>
      <oas-bubble>Their message inside an RTL container.</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

`align="end"` flips the row (`flex-direction: row-reverse`) with logical text alignment — no physical-direction CSS.

## Delivery status (status)

<DemoBlock title="sending / sent / delivered / read / error">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-message-row align="end" status="sending"><oas-bubble variant="secondary">Sending (spinner).</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="sent"><oas-bubble variant="secondary">Sent (single check).</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="delivered"><oas-bubble variant="secondary">Delivered (double check).</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="read"><oas-bubble variant="secondary">Read (double check in primary).</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="error"><oas-bubble variant="secondary">Failed (circle-x + danger text).</oas-bubble></oas-message-row>
  </div>
</DemoBlock>

`status` is a convenience attribute rendering **visible text + decorative icons** (localized copy; meaning never rides on color alone; error adds danger token color as enhancement). Invalid/absent values render no status area. Retry and similar actions belong to the host in the footer slot.

## Grouping consecutive messages (grouped)

<DemoBlock title="Consecutive messages from the same sender">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-message-gap, var(--oas-space-4))">
    <oas-message-row>
      <oas-avatar slot="avatar" size="32">S</oas-avatar>
      <span slot="header">Support · 10:01</span>
      <oas-bubble>First: full spacing with avatar.</oas-bubble>
    </oas-message-row>
    <oas-message-row grouped>
      <oas-avatar slot="avatar" size="32">S</oas-avatar>
      <oas-bubble>Second (grouped): same sender, tightened spacing.</oas-bubble>
    </oas-message-row>
    <oas-message-row grouped>
      <oas-avatar slot="avatar" size="32">S</oas-avatar>
      <oas-bubble>Third (grouped): still grouped.</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

The host declares `grouped` (boolean present) when a row continues the same sender — row spacing tightens via the `--oas-message-gap` variable, visually clustering the group.

## API

### oas-message-row

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Direction: start (theirs, default) / end (mine) — logical properties (row-reverse + logical alignment), mirrored automatically in RTL | — | — |
| `grouped` | Boolean presence: consecutive message from the same sender (declared by the host), tightening row spacing via --oas-message-gap | — | — |
| `status` | Delivery status convenience attribute: sending / sent / delivered / read / error — renders visible text + decorative icons (localized copy; meaning never rides on color alone; error adds danger color as enhancement); invalid/absent values render no status area | `MessageRowStatus` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Message content (place oas-bubble) |
| `avatar` | Avatar slot (bottom-aligned; long messages hug the bottom) |
| `footer` | Footer slot (actions/extra metadata, aligned with direction) |
| `header` | Header slot (sender name/time) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-message-gap` | `var(--oas-space-4)` |

CSS variable: `--oas-message-gap` (row gap, default `var(--oas-space-4)`). Parts: `::part(row)` / `::part(avatar)` / `::part(main)` / `::part(header)` / `::part(content)` / `::part(footer)` / `::part(status)`. Events: none (message actions live in the footer slot).
