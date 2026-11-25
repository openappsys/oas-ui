---
description: "Membership card: grade badge (visible text as the tier identifier) + perks slot + validity period + action-button slot (renew / upgrade); solid / gradient token-based backgrounds that follow the dark theme; purely presentational with zero events."
---

# MemberCard

Membership tier / benefits card: `grade` (tier badge — **the visible text is the identifier**, not color-only), perks slot (`perks`), validity period (`expire` text + i18n prefix), action-button slot (`actions` — renew / upgrade buttons owned by the host, accessible names come from the host buttons); background `variant="solid"` (default) / `gradient`, both **token-based** (the exit tokens `--oas-member-card-bg` / `--oas-member-card-gradient` can take over the whole card; defaults reference theme tokens and follow dark automatically). Purely presentational (zero event protocol).

## Basic card (solid + perks + validity)

<DemoBlock title="Gold member (solid + perks slot + validity period)">
  <oas-member-card grade="Gold member" expire="2027-11-25" style="width: 100%; max-width: 420px">
    <div slot="perks">2 free-shipping coupons monthly</div>
    <div slot="perks">5% off on member days</div>
    <div slot="perks">Birthday gift pack</div>
  </oas-member-card>
</DemoBlock>

## Gradient background & action slot

`variant="gradient"` gives the gradient background (`linear-gradient(135deg, primary, primary-active)` — token-based, dark follows); the `actions` slot holds renew / upgrade buttons (behavior and accessible names owned by the host):

<DemoBlock title="Black-gold member (gradient + renew/upgrade actions)">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-member-card id="mc-actions" grade="Black-gold member" variant="gradient" expire="2028-01-31" style="width: 100%; max-width: 420px">
      <div slot="perks">12% off storewide</div>
      <div slot="perks">Priority support & shipping</div>
      <oas-button slot="actions" size="small" data-demo-action="Renew">Renew now</oas-button>
      <oas-button slot="actions" size="small" type="primary" data-demo-action="Upgrade">Upgrade tier</oas-button>
    </oas-member-card>
    <p id="mc-actions-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Click an action button to see the host-side feedback (zero event protocol — behavior owned by the host).
    </p>
  </div>
</DemoBlock>

## Tier comparison

`grade` omitted renders no badge; for side-by-side tiers give each card its own `variant` / exit tokens (the host customizes the background by grade):

<DemoBlock title="Tier comparison (standard / gold / diamond)">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-member-card grade="Standard member" expire="2026-12-31" style="max-width: 420px; --oas-member-card-bg: var(--oas-color-primary-text)">
      <div slot="perks">Newcomer coupon on signup</div>
    </oas-member-card>
    <oas-member-card grade="Gold member" style="max-width: 420px">
      <div slot="perks">2 free-shipping coupons monthly</div>
    </oas-member-card>
    <oas-member-card grade="Diamond member" variant="gradient" style="max-width: 420px">
      <div slot="perks">15% off storewide</div>
      <div slot="perks">Unlimited free shipping</div>
    </oas-member-card>
  </div>
</DemoBlock>

## Keyboard & accessibility

- Card host carries `role="group"` + `aria-label` (“Membership card: {grade}” — the tier name is in the accessible name, screen readers know the tier without entering the card).
- The grade badge's **visible text is the tier identifier** (not color-only — the background variant is just visual emphasis), with an sr-only “Membership tier” prefix for screen-reader semantics.
- The validity row carries the i18n prefix (“Valid until:”); action buttons take accessible names from the host buttons (no wrapper layer).
- `perks` / `actions` hide entirely when empty (no empty blocks); RTL and dark theme follow via logical properties and tokens.

## Custom styling notes

`::part(card)` is the card face (background driven by variant — take over via the exit tokens `--oas-member-card-bg` / `--oas-member-card-gradient` rather than overriding the part); `::part(grade)` is the tier badge (an on-primary outlined pill — white text sits directly on the card background, so contrast is never diluted by a tinted overlay); `::part(perks)` / `::part(expire)` / `::part(actions)` are the three regions. Foreground text uses `--oas-color-text-on-primary`. `data-variant` reflects onto the host element, so `oas-member-card[data-variant='gradient']` works from outside.

<script setup lang="ts">
import { onMounted } from 'vue'

// Demo script conventions (do not move): ① must be a page-level script setup — inside DemoBlock
// VitePress does not extract it and the raw text breaks the page (imports fail / hydration mismatch);
// ② placed before `## API`: that section is the api:gen generated region, business scripts must not live there.
onMounted(() => {
  const out = document.getElementById('mc-actions-out')
  const host = document.getElementById('mc-actions')
  if (!host || !out) return
  host.querySelectorAll('[data-demo-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      out.textContent = `Host action: ${(btn as HTMLElement).dataset.demoAction} (renew/upgrade navigation owned by the host, zero event protocol)`
    })
  })
})
</script>

## API

### oas-member-card

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `expire` | Validity text (the host supplies a date or copy, rendered with the i18n prefix); omitted renders no validity row | — | — |
| `grade` | Tier name (e.g. “Gold member”); omitted renders no badge; the identifier is the badge text + sr-only “Membership tier” prefix (not color-only) | — | — |
| `variant` | Background variant: `solid` (default) / `gradient`; invalid values fall back to solid with a one-time warning; the current variant reflects to the data-variant attribute | — | — |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Action row (renew / upgrade buttons — behavior and accessible names come from the host buttons; hides when empty) |
| `perks` | Benefits area (entries owned by the host; hides when empty) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-member-card-bg` | `var(--oas-color-primary)` |
| `--oas-member-card-gradient` | `linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-primary-active))` |
