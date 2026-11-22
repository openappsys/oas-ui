---
description: "E-card / stored-value card: card list selection, custom amount input, terms acceptance and confirmation."
---

# ECard

E-card / stored-value card purchase panel: card radio list, custom amount, terms acceptance and confirm. Card data and amount bounds are host-injected.

## Basic usage

`cards` injects card faces: `value` is the submitted amount (number), `faceValue` / `price` are display strings.

<DemoBlock title="Card selection">
  <oas-ecard
    cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100","price":"$95","description":"Valid everywhere"},{"id":"c500","name":"Stored-value card","value":500,"faceValue":"$500","price":"$480","description":"Stacks with member discounts"}]'
  ></oas-ecard>
</DemoBlock>

## Custom amount

Choosing “Custom amount” reveals the amount input; `min-amount` / `max-amount` bound integer values. Out-of-range submits emit `oas-invalid`.

<DemoBlock title="Custom amount">
  <oas-ecard
    selected-id="custom"
    amount="300"
    min-amount="10"
    max-amount="1000"
    currency="$"
    cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100"}]'
  ></oas-ecard>
</DemoBlock>

## Terms and submit

The confirm button is always clickable and validates card / amount / terms on click: failure emits `oas-invalid` (`detail { fields }`), success emits `oas-submit` (`detail { card, cardId, amount, custom, agreed }`). Override the terms copy with `slot="agreement"` (e.g. to add a link).

<DemoBlock title="Terms and submit">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-ecard
      id="ecard-submit-demo"
      currency="$"
      cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100","price":"$95"},{"id":"c500","name":"Stored-value card","value":500,"faceValue":"$500","price":"$480"}]'
    ></oas-ecard>
    <oas-tag type="primary" id="ecard-submit-info">Waiting for submit</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="Custom terms content">
  <oas-ecard
    cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100"}]'
  >
    <span slot="agreement">
      I have read and agree to the <a href="#terms" style="color: var(--oas-color-primary)">e-card terms</a>
    </span>
  </oas-ecard>
</DemoBlock>

## Data contract

- `cards`: `[{ "id": string, "name": string, "value": number, "faceValue": string, "price"?: string, "description"?: string, "disabled"?: boolean }]`
- `selected-id`: a card id or `custom`; absent picks the first enabled card, no enabled card falls back to `custom`
- `amount`: custom amount (string, converted to number on submit); `min-amount` defaults to `1`, `max-amount` to `10000`; `currency` sets the custom amount prefix (default `¥`)
- The same-named property channel works too: `cards` accepts an array directly (serialized and reflected into the JSON attribute; the getter returns the parsed form)

## Currency symbol

`currency` only changes the custom amount prefix (default `¥`); the submitted amount stays numeric, so cross-border flows just swap the symbol.

<DemoBlock title="Custom currency symbol">
  <oas-ecard
    selected-id="custom"
    currency="$"
    amount="120"
    min-amount="10"
    max-amount="2000"
    cards='[{"id":"c100","name":"Gift Card","value":100,"faceValue":"100 USD"}]'
  ></oas-ecard>
</DemoBlock>

## Accessibility

- Cards form a native radio group; each radio has an `aria-label` with the card name
- The custom amount block follows selection; amount errors use `aria-invalid`
- Terms is a native checkbox; `disabled` / `readonly` disables all interactions

<DemoBlock title="Disabled">
  <oas-ecard
    disabled
    cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100"}]'
  ></oas-ecard>
</DemoBlock>

<DemoBlock title="Read-only">
  <oas-ecard
    readonly
    cards='[{"id":"c100","name":"Gift card","value":100,"faceValue":"$100","price":"$95"}]'
  ></oas-ecard>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ecard-submit-demo')
  const info = document.getElementById('ecard-submit-info')
  el?.addEventListener('oas-invalid', (e) => {
    info.textContent = `Invalid: ${e.detail.fields.join(' / ')}`
  })
  el?.addEventListener('oas-submit', (e) => {
    info.textContent = `Submitted: ${e.detail.card?.name ?? 'custom'} / ${e.detail.amount}`
  })
})
</script>

## API

### oas-ecard

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `agreed` | Whether the terms are accepted (controlled boolean attribute; toggling writes it back and emits oas-change) | `boolean` | — |
| `amount` | Custom amount (string, converted to number on submit) | `string` | — |
| `cards` | Card data (host-injected): JSON array [{ id, name, value, faceValue, price?, description?, disabled? }]; value is the submitted amount, faceValue / price are display strings | `ECard[] \| string` | `[]` |
| `currency` | Currency symbol prefix for the custom amount input (default ¥; display only) | `string` | `¥` |
| `disabled` | Disables cards / amount / terms and the confirm button | `boolean` | — |
| `max-amount` | Custom amount upper bound (integer, default 10000) | `string` | `10000` |
| `min-amount` | Custom amount lower bound (integer, default 1) | `string` | `1` |
| `readonly` | Read-only: cannot select, type, check or submit | `boolean` | — |
| `selected-id` | Selected card id (controlled) or custom (custom amount); defaults to the first enabled card, falling back to custom | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted when a card is selected, a custom amount is typed or terms are toggled; detail { card, cardId, amount, custom, agreed } |
| `oas-invalid` | Emitted when submit validation fails; detail { fields } (card / amount / agreement) |
| `oas-submit` | Emitted when validation passes; detail { card, cardId, amount, custom, agreed } |

#### Slots

| Name | Description |
| --- | --- |
| `agreement` | Custom terms copy (replaces the default text; links allowed) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-ecard-width` | `100%` |
