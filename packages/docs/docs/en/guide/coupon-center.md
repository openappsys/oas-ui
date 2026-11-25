---
description: "Coupon center recipe: oas-coupon batch display + oas-bottom-sheet claim dialog + built-in selection popup (oas-select) state flow — claimed / used / expired managed on the host side."
---

# Coupon center (scenario recipe)

> Three stages assembled from existing components — coupon display, claim confirmation, wallet redemption — using `oas-coupon` (coupon cards + built-in selection popup) and `oas-bottom-sheet` (claim dialog). No new component API; host-owned business states like "claimed" stay on the host, while the component carries coupon forms like "used / expired / threshold not met".

## Roles

- **Coupon display**: `oas-coupon` card mode — `amount` / `threshold` / validity / `status` semantic colors built in.
- **Claim confirmation**: `oas-bottom-sheet` controlled dialog — `open` + `oas-close` protocol; drag handle / backdrop / Esc closing are built into the sheet, claiming is host business. **Create dynamically, remove on close**: the closed sheet never stays in the DOM, Tab cannot fall into a hidden drawer.
- **Wallet redemption**: `oas-coupon` list mode — pass `list` and you get the selection popup; `oas-select` returns the chosen coupon; selecting means using it.

## Claim flow: coupon → dialog → claimed

<DemoBlock title="Batch coupons + bottom-sheet claim (claimed buttons become disabled)">
  <div class="cc-grid">
    <div class="cc-cell">
      <oas-coupon amount="30" threshold="199" start="2026-01-01" end="2026-12-31"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button class="cc-claim" size="small" type="primary" data-amount="30" data-threshold="199" data-validity="Valid until 2026-12-31">Claim</oas-button>
        <span class="cc-state">Available</span>
      </div>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="10" threshold="0" validity="Always valid"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button class="cc-claim" size="small" type="primary" data-amount="10" data-threshold="0" data-validity="Always valid">Claim</oas-button>
        <span class="cc-state">Available</span>
      </div>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="50" threshold="299" status="expired"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button size="small" disabled>Expired</oas-button>
        <span class="cc-state">Unavailable</span>
      </div>
    </div>
  </div>
  <p id="cc-out-en" class="cc-out" role="status">Press "Claim" → confirm in the bottom sheet → the slot flips to "Claimed".</p>
</DemoBlock>

**Key points**:

1. **Claim dialog uses `oas-bottom-sheet`, created dynamically and removed on close**: claiming is a high-frequency light action on mobile; rising from the bottom suits the thumb zone. On each "Claim": `createElement` → fill coupon face and buttons → set `open` → `appendChild`; all three close paths — `oas-close` (`detail.reason` = `drag` / `backdrop` / `esc`), cancel, confirm — end in `remove()`. The closed sheet is not in the DOM, so Tab cannot reach a hidden drawer — one step further than the component page's example (which only collapses on close and deletes the old one before the next open). Known edge: the in-panel Tab wrap relies on **native** focusable elements; this recipe's buttons are `oas-button` (custom elements) and Tab is observed to escape to the page — an existing bottom-sheet boundary to be consolidated at the component level; the Esc / backdrop / drag-handle close protocol is unaffected.
2. **"Claimed" is not a component state**: after confirmation the host disables the slot's button and sets the copy to "Claimed" while the coupon face stays readable — business state and display state are kept apart instead of inventing component attributes.
3. **The coupon face carries only the coupon's own form**: expired coupons use `status="expired"` (grayed + expired marker) with the button disabled in sync; "threshold not met" uses `status="unavailable"` + `reason`.
4. **The coupon inside the dialog reuses the same component**: write the chosen coupon's data into the inner `oas-coupon` attributes — no second coupon template needed.

## Wallet: redeem via the built-in selection popup (claimed → used)

<DemoBlock title="Built-in selection popup: selecting redeems (oas-select → status=used)">
  <div class="cc-pack-wrap">
    <oas-coupon
      id="cc-pack-en"
      trigger-text="Use a coupon"
      list='[{"code":"newbie","amount":15,"threshold":0,"validity":"Always valid"},{"code":"vip","amount":40,"threshold":199,"end":"2026-12-31"}]'
    ></oas-coupon>
    <p id="cc-pack-out-en" class="cc-out" role="status">Open the popup and pick a coupon — selecting redeems it; the face flips to "Used".</p>
  </div>
  <div class="cc-grid" style="margin-top: var(--oas-space-3)">
    <div class="cc-cell">
      <oas-coupon amount="20" threshold="99" status="used"></oas-coupon>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="50" threshold="299" status="unavailable" reason="Below the ¥299 threshold"></oas-coupon>
    </div>
  </div>
</DemoBlock>

**Key points**:

1. **The list popup is a built-in coupon capability** (`list` in, popup out): available / unavailable grouping, Esc on the shared overlay stack, auto close on selection and `oas-select` (detail `{ code, coupon }`) — no need to build another selection sheet.
2. **The empty exit is contractual**: the "use no coupon" button fires `oas-clear` followed by an empty `oas-select` (`coupon: null`) — the host falls back to the no-coupon checkout path; guard for null.
3. **Redemption writes back through the data channel**: the host sets `status="used"` on the chosen coupon and rewrites the whole `list`; popup and faces follow — one source of truth (host data).

## Key code

```ts
// Claim dialog: create dynamically, remove on close (dynamic creation follows the
// bottom-sheet component page example; removing on close goes one step further —
// the example only collapses on close and deletes the old sheet before the next open)
claimBtns.forEach((btn) =>
  btn.addEventListener('oas-click', () => openSheet(btn)),
)

function openSheet(btn) {
  const sheet = document.createElement('oas-bottom-sheet')
  sheet.setAttribute('max-height', '340px')
  sheet.innerHTML = '…coupon face (oas-coupon) + "Not now / Confirm claim" buttons…'
  sheet.addEventListener('oas-close', () => sheet.remove()) // drag / backdrop / Esc
  sheet.querySelector('.cc-cancel').addEventListener('oas-click', () => sheet.remove())
  sheet.querySelector('.cc-confirm').addEventListener('oas-click', () => {
    sheet.remove()
    claimApiCall().then(() => {
      btn.setAttribute('disabled', '')
      btn.textContent = 'Claimed' // business state: host-owned
    })
  })
  sheet.setAttribute('open', '')
  document.body.appendChild(sheet) // with the component already registered, append upgrades it and replays attributes
}

// Wallet redemption (coupon built-in selection popup)
pack.addEventListener('oas-select', (e) => {
  const { code, coupon } = e.detail
  if (!coupon) return // "use no coupon" empty exit
  const list = JSON.parse(pack.getAttribute('list')).map((c) =>
    c.code === code ? { ...c, status: 'used' } : c,
  )
  pack.setAttribute('list', JSON.stringify(list))
})
```

## Notes

1. **Overlays share the Esc stack**: with the wallet popup and the claim sheet both open, Esc closes the topmost one; both are "request to close" protocols — the host `remove()`s the sheet on `oas-close` and syncs its open state on the coupon's `oas-open-change`.
2. **Coupon cards have no click event**: the claim entry is the host's own button — the face is a pure display piece; interaction semantics belong to the host composition.
3. **No manual z-index work**: the bottom-sheet and the coupon popup share the same stacking ladder (`--oas-z-modal` tier) by default, also when mixed with modal / drawer.
4. **Rollback on claim failure**: close the sheet first, then call the API; on failure roll the slot back (button clickable again) and surface feedback — this demo sets state synchronously for simplicity; real business follows the API result.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Components register late (theme dynamic import): wire everything after customElements.whenDefined (first-frame race discipline)
  Promise.all(['oas-coupon', 'oas-bottom-sheet', 'oas-button'].map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    const out = el('cc-out-en')
    if (out) {
      let pending = null // the "Claim" button pending confirmation
      // Claim dialog: create dynamically, remove on close (closed sheet never stays in the DOM)
      const openSheet = (btn) => {
        pending = btn
        const sheet = document.createElement('oas-bottom-sheet')
        sheet.setAttribute('max-height', '340px')
        sheet.innerHTML =
          '<div class="cc-sheet">' +
          '<p class="cc-sheet-title">Confirm claim</p>' +
          '<oas-coupon amount="' + btn.dataset.amount + '" threshold="' + btn.dataset.threshold + '" validity="' + btn.dataset.validity + '"></oas-coupon>' +
          '<p class="cc-meta">One per customer; validity and rules follow the coupon face.</p>' +
          '<div class="cc-sheet-actions">' +
          '<oas-button class="cc-cancel" style="flex: 1" block>Not now</oas-button>' +
          '<oas-button class="cc-confirm" type="primary" style="flex: 1" block>Confirm claim</oas-button>' +
          '</div></div>'
        sheet.addEventListener('oas-close', () => sheet.remove())
        sheet.querySelector('.cc-cancel').addEventListener('oas-click', () => sheet.remove())
        sheet.querySelector('.cc-confirm').addEventListener('oas-click', () => {
          sheet.remove()
          if (!pending) return
          pending.setAttribute('disabled', '')
          pending.textContent = 'Claimed'
          const cell = pending.closest('.cc-cell')
          const state = cell && cell.querySelector('.cc-state')
          if (state) state.textContent = 'Claimed'
          out.textContent = 'Claimed: a ¥' + pending.dataset.amount + ' coupon (business state is host-owned).'
          pending = null
        })
        sheet.setAttribute('open', '')
        document.body.appendChild(sheet) // with the component already registered, append upgrades it and replays attributes
      }
      document.querySelectorAll('.cc-claim').forEach((btn) => btn.addEventListener('oas-click', () => openSheet(btn)))
    }
    // —— Wallet redemption: set used on select (source of truth = the list attribute itself) ——
    const pack = el('cc-pack-en')
    const packOut = el('cc-pack-out-en')
    if (pack && packOut) {
      pack.addEventListener('oas-select', (e) => {
        const coupon = e.detail.coupon
        if (!coupon) {
          packOut.textContent = 'Empty exit: use no coupon (oas-clear followed by an empty oas-select with null coupon).'
          return
        }
        const list = JSON.parse(pack.getAttribute('list')).map((c) =>
          c.code === e.detail.code ? { ...c, status: 'used' } : c,
        )
        pack.setAttribute('list', JSON.stringify(list))
        packOut.textContent = 'Redeemed coupon ' + e.detail.code + ': data set to status=used → face flips to "Used".'
      })
    }
  })
})
</script>

<style>
.cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--oas-space-3);
  width: 100%;
}
.cc-cell {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  min-width: 0;
}
.cc-cell-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.cc-state {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-pack-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
}
.cc-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.cc-sheet-title {
  margin: 0;
  font-weight: 600;
}
.cc-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-sheet-actions {
  display: flex;
  gap: var(--oas-space-2);
}
</style>
