---
description: "A step-driven form flow orchestrator: step header + progress (\"Step {current} of {total}\") + per-step content panels + per-step validation gating. Ideal for wizards, surveys, and multi-step checkout."
---

# Questionnaire Multi-step Form

A step-driven form flow orchestrator: step header + progress ("Step {current} of {total}") + per-step content panels + per-step validation gating. Ideal for wizards, surveys, and multi-step checkout. Validation reuses the `oas-form` kernel — **place one `<oas-form>` inside each step panel**; moving forward validates the current step and blocks on failure, while going back never validates and panels stay mounted (filled values are preserved).

> Scope: linear gating + optional-step skip + host-defined jumps via `oas-before-change` + two conditional-branching channels (**declarative** `steps[].when` / `goto`, evaluated by the same restricted expression engine as `oas-schema-form`; **host composition** `hidden` bit + `oas-values-change`). The channels are orthogonal — an explicit host `hidden` always wins. Start/complete pages are not built in; implement draft persistence yourself via `current` + `getValues()`.

## Basic usage

Pass a `steps` array (`{ key?, title, description?, optional?, hidden? }`) and attach per-step content via named slots: `slot="step-<key>"` for keyed steps, `slot="step-<index>"` otherwise. The primary button becomes "Submit" on the last step; clicking it re-validates every **participating step**, then emits `oas-submit` (`detail.values` merged across steps). **Values and validation share one scope** — only participating steps (not `hidden`, not skipped) count; hosts needing the full data can read the inner `oas-form` of each panel directly.

<DemoBlock title="Basic multi-step questionnaire">
  <oas-questionnaire id="q-basic" style="width: 100%; max-width: 560px" steps='[{"key":"info","title":"Shipping","description":"Recipient info"},{"key":"pay","title":"Payment","description":"Pick a channel"},{"key":"done","title":"Confirm"}]'>
    <oas-form slot="step-info" rules='{"receiver":[{"required":true,"message":"Recipient is required"}]}'>
      <oas-input name="receiver" placeholder="Recipient name (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-pay" initial-values='{"channel":"alipay"}'>
      <oas-radio-group name="channel">
        <oas-radio value="alipay">Alipay</oas-radio>
        <oas-radio value="wechat">WeChat Pay</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Click "Submit" when everything looks good.</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Per-step validation gating

Before advancing, the current step's `oas-form` is validated (via its `validate()`); failure blocks navigation and emits `oas-step-validate` (`detail: { index, key?, valid, errors }`). Going back never validates. Set `validation="false"` for pure navigation.

> Step content only needs an element that implements the `getValues()` / `validate()` contract (duck-typed) — not necessarily `oas-form`. Any compound form exposing the same contract works, such as `oas-schema-form`, so the whole questionnaire can be JSON-driven. See [SchemaForm · Composing with Questionnaire](./schema-form.md#composing-with-questionnaire).

<DemoBlock title="Blocked until valid">
  <oas-questionnaire id="q-gate" style="width: 100%; max-width: 480px" steps='[{"title":"Contact"},{"title":"Done"}]'>
    <oas-form slot="step-0" rules='{"phone":[{"required":true,"message":"Phone is required"},{"pattern":"^1\\d{10}$","message":"Invalid phone number"}]}'>
      <oas-input name="phone" placeholder="Phone (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">You can only reach this step after validation passes.</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-gate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Optional steps (skip)

A step with `optional: true` shows a "Skip this step" button: skipping bypasses validation and advances directly, emitting `oas-skip` (`detail: { index, key? }`). A skipped step **leaves the participating set** — its values drop out of `getValues()` / `oas-submit` and it no longer takes part in submit re-validation; revisiting the step (back / header click / `goto()`) restores participation, and `reset()` clears all skip records.

<DemoBlock title="Optional step (Skip)">
  <oas-questionnaire id="q-skip" style="width: 100%; max-width: 480px" steps='[{"title":"Profile"},{"key":"invite","title":"Invite code","optional":true,"description":"Skip if you have none"},{"title":"Done"}]'>
    <oas-form slot="step-0" rules='{"nickname":[{"required":true,"message":"Nickname is required"}]}'>
      <oas-input name="nickname" placeholder="Nickname (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-invite">
      <oas-input name="invite" placeholder="Invite code (optional)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-2">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Final step.</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-skip-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Host interception (oas-before-change)

Before any jump (buttons / header clicks / `next()` / `prev()` / `goto()` / skip) a cancelable `oas-before-change` fires (`detail: { index, key?, from }`); calling `preventDefault()` vetoes the jump — also the hook for custom branch navigation. With `linear="false"`, every header step becomes clickable.

<DemoBlock title="preventDefault veto">
  <oas-questionnaire id="q-veto" linear="false" style="width: 100%; max-width: 520px" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Confirm"}]'>
    <oas-form slot="step-0"><p style="margin: 0">Step 1 content</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">Step 2 content</p></oas-form>
    <oas-form slot="step-2"><p style="margin: 0">Confirm page (blocked by the host in this demo)</p></oas-form>
  </oas-questionnaire>
  <span id="q-veto-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Conditional branching (skip by answer)

Conditional branching has two orthogonal channels:

1. **Declarative** (recommended): put a `when` expression on a `steps` entry — a failing condition hides the step automatically (see "Declarative conditions & jumps" below).
2. **Host composition**: listen for `oas-values-change` to read the answer, then rewrite `steps` to flip the `hidden` bit. Hidden steps leave the header and progress, `next()` skips them automatically, and their values drop out of the values/validation scope. If the flipped step is the one the user is on, the component aligns `current` to the nearest visible step and emits `oas-change` (no manual jump needed). Use this channel when branch rules are very complex or decided by another system: rules stay testable and can be vetoed in `oas-before-change`.

The two channels are **orthogonal**: `hidden: true` always hides (host wins), and conditions only decide steps the host has not explicitly hidden.

<DemoBlock title="Hide/restore steps by answer (host composition)">
  <oas-questionnaire id="q-cond" style="width: 100%; max-width: 520px" steps='[{"key":"need","title":"Invoicing"},{"key":"invoice","title":"Invoice details"},{"key":"done","title":"Confirm"}]'>
    <oas-form slot="step-need" initial-values='{"need":"yes"}'>
      <oas-radio-group name="need">
        <oas-radio value="yes">Invoice needed</oas-radio>
        <oas-radio value="no">No invoice</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-invoice" rules='{"title":[{"required":true,"message":"Invoice title is required"}]}'>
      <oas-input name="title" placeholder="Invoice title (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Final step.</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-cond-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Declarative conditions & jumps (when / goto)

A `steps` entry can carry a condition expression, evaluated by the restricted expression engine shared with `oas-schema-form` (same frozen grammar: `{field.path}` values, `== != > >= < <=`, `&& || !`, `in` / `contains()` plus the text and math function set; zero third-party dependencies):

- `when`: a failing condition hides the step (header item, progress total, navigation, values and validation all follow the hidden scope, and `next()` skips it). Expressions read the **cross-step merged answers** (including hidden steps — panels stay mounted and keep their values); answer changes recompute only the conditions whose dependency paths are hit, so unrelated fields do not trigger a full re-render.
- `goto`: jump on advance — `{ when, target }` where `target` is a 0-based index or a step `key`, or the bare `target` shorthand (condition always true). A hit emits `oas-goto` (`detail: { index, key?, from, target }`) and then moves; the jump still runs per-step validation and `oas-before-change` (vetoable). If the target is hidden by its own condition, the jump lands on the nearest visible step after it.
- `conditions="false"`: disables the engine — `when` / `goto` stop working and only the host `hidden` bit counts.
- Orthogonality: `hidden: true` always hides (host wins); `hidden: false` / omitted lets `when` decide.
- Fault tolerance: syntax errors / unknown functions produce one `devWarn` and downgrade that single clause (`when` no longer applies = step stays visible, `goto` does not jump); other steps are unaffected. If the host rewrites `current` / answers inside `oas-change` and forms a synchronous loop, the cascade is cut off after 8 rounds with a warning (no infinite loop).

> Values coming from an embedded `oas-schema-form` drive `when` too — step content only needs the duck-typed contract (`getValues()` / `validate()` + `oas-values-change`).

<DemoBlock title="when + goto (switch the answer and watch step count and jump)">
  <oas-questionnaire
    id="q-when"
    style="width: 100%; max-width: 560px"
    steps='[{"key":"extend","title":"Warranty","goto":{"when":"{extend} == \"no\"","target":"done"}},{"key":"warranty","title":"Warranty plan","when":"{extend} == \"yes\""},{"key":"invoice","title":"Invoice"},{"key":"done","title":"Done"}]'
  >
    <oas-form slot="step-extend" initial-values='{"extend":"yes"}'>
      <oas-radio-group name="extend">
        <oas-radio value="yes">Add warranty</oas-radio>
        <oas-radio value="no">No warranty (Next jumps to Done)</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-warranty" rules='{"years":[{"required":true,"message":"Pick a warranty term"}]}'>
      <oas-select name="years" placeholder="Term" style="width: 200px">
        <oas-option value="1">1 year</oas-option>
        <oas-option value="2">2 years</oas-option>
        <oas-option value="3">3 years</oas-option>
      </oas-select>
    </oas-form>
    <oas-form slot="step-invoice">
      <oas-input name="title" placeholder="Invoice title (optional)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Done.</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-when-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Score aggregation (score-rules)

`score-rules` takes a **rule list** `[{ when, score }]`: whenever a condition holds, its score is added to the total. This is the only shape — a "field → per-option score" map is equivalent to several `{ when: "{field} == \"option\"", score: n }` rules, so no second syntax exists.

- **Read-only property `score`**: reading it sums the current cross-step answers (hidden steps included — panels stay mounted and keep their values); it is always up to date.
- **Event `oas-score`**: emitted after answers change (`detail: { score }`), debounced by 80 ms so a burst of answers coalesces into one event; no event when the total did not change; changing `score-rules` stays silent (read the property yourself after rewriting rules).
- **The engine only computes, never renders**: score display and question composition (`oas-rate` / `oas-slider` / option groups, etc.) stay in the host; no question type is built in.
- Invalid rules (non-object / non-string `when` / non-numeric `score` / syntax errors) are skipped one by one with one `devWarn` each and never invalidate the other rules; an expression that throws (host function) counts as a non-matching rule.

<DemoBlock title="Score aggregation (answer, then read the total and oas-score)">
  <oas-questionnaire
    id="q-score"
    style="width: 100%; max-width: 560px"
    score-rules='[{"when":"{satisfaction} == \"5\"","score":5},{"when":"{satisfaction} == \"4\"","score":3},{"when":"{recommend} == \"yes\"","score":2}]'
    steps='[{"key":"s","title":"Satisfaction"},{"key":"r","title":"Recommend"},{"key":"done","title":"Done"}]'
  >
    <oas-form slot="step-s">
      <oas-radio-group name="satisfaction">
        <oas-radio value="5">Very satisfied</oas-radio>
        <oas-radio value="4">Satisfied</oas-radio>
        <oas-radio value="1">Not satisfied</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-r">
      <oas-radio-group name="recommend">
        <oas-radio value="yes">Would recommend</oas-radio>
        <oas-radio value="no">Not now</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Click "Done" to see the aggregated score.</p>
    </oas-form>
  </oas-questionnaire>
  <div style="display: flex; align-items: center; gap: 12px; margin-top: 12px">
    <oas-button id="q-score-read">Read score</oas-button>
    <span id="q-score-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## Step transition (animated)

`animated` enables the step transition: the incoming panel slides in along the navigation direction (forward from the inline-end side, backward from the inline-start side) while fading in — transform/opacity only, compositor-friendly; users with `prefers-reduced-motion: reduce` automatically get no animation. Override the duration via the CSS variable `--oas-questionnaire-anim-duration` (defaults to `--oas-transition-base`); the slide direction mirrors automatically in RTL layouts.

<DemoBlock title="animated transition (click Next/Previous to watch the slide direction)">
  <oas-questionnaire id="q-anim" animated style="width: 100%; max-width: 520px" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Step 3"}]'>
    <oas-form slot="step-0"><p style="margin: 0">Click "Next": this panel slides in along the navigation direction.</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">Forward and backward slide from opposite sides; use "Previous" to watch the return.</p></oas-form>
    <oas-form slot="step-2"><p style="margin: 0">Final step.</p></oas-form>
  </oas-questionnaire>
  <span style="display: flex; margin-top: 8px">
    <oas-button id="q-anim-reset">reset()</oas-button>
  </span>
</DemoBlock>

## Keyboard shortcuts

`shortcuts` enables keyboard step navigation: **Alt+←/→** works anywhere inside the component (including inside inputs) and swallows the default action (preventing browser history navigation); **bare ←/→** (no modifiers) only switches steps when focus is not inside an input/textarea/editable region (never hijacks the caret or control-specific keyboard handling) — clicking panel whitespace focuses the component container, where bare arrows also work. Triggers reuse the same gating chain as the buttons (a failing current step blocks advance); physical mapping (→ forward / ← back), not mirrored in RTL, matching the browser history-key convention.

<DemoBlock title="shortcuts (click into the component, then try Alt+←/→)">
  <oas-questionnaire id="q-kbd" shortcuts style="width: 100%; max-width: 520px" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Step 3"}]'>
    <oas-form slot="step-0"><oas-input name="k1" placeholder="Alt+→ works inside inputs too" style="width: 260px"></oas-input></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">With focus on panel whitespace, bare ←/→ also switch steps.</p></oas-form>
    <oas-form slot="step-2"><p style="margin: 0">Final step.</p></oas-form>
  </oas-questionnaire>
  <span id="q-kbd-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Controlled current & methods

`current` is two-way: internal jumps write it back, external updates sync instantly. Imperative methods `next()` / `prev()` / `goto(index)` / `validate()` / `submit()` / `getValues()` / `reset()` cover all navigation and value scenarios.

> Event naming note: events from fields inside step panels (`oas-change` / `oas-input`, etc.) bubble out through the questionnaire. A field's `oas-change` **shares the name** with the step-change `oas-change` — when listening for step changes, filter by `detail.index` (field events carry no `index`); for field value changes prefer `oas-values-change` (`detail: { name, value, values }`).

<DemoBlock title="External control & values">
  <oas-questionnaire id="q-ctrl" style="width: 100%; max-width: 480px" steps='[{"key":"a","title":"Step A"},{"key":"b","title":"Step B"},{"key":"c","title":"Step C"}]'>
    <oas-form slot="step-a" rules='{"va":[{"required":true,"message":"Field A is required"}]}'>
      <oas-input name="va" placeholder="Field A (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-b" rules='{"vb":[{"required":true,"message":"Field B is required"}]}'>
      <oas-input name="vb" placeholder="Field B (required)" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-c">
      <oas-input name="vc" placeholder="Field C (optional)" style="width: 240px"></oas-input>
    </oas-form>
  </oas-questionnaire>
  <oas-space style="margin-top: 16px; display: flex; flex-wrap: wrap">
    <oas-button id="q-ctrl-prev">prev()</oas-button>
    <oas-button id="q-ctrl-next" type="primary">next()</oas-button>
    <oas-button id="q-ctrl-goto">goto(2)</oas-button>
    <oas-button id="q-ctrl-validate">validate()</oas-button>
    <oas-button id="q-ctrl-values">getValues()</oas-button>
    <oas-button id="q-ctrl-reset">reset()</oas-button>
  </oas-space>
  <span id="q-ctrl-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Progress variants

`progress-variant`: `both` (default, text + bar) / `text` / `bar`; `progress="false"` hides the region. The bar uses `role="progressbar"` + `aria-valuenow/min/max` for screen readers.

<DemoBlock title="progress-variant & hidden">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-questionnaire progress-variant="both" steps='[{"title":"A"},{"title":"B"},{"title":"C"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">both (default)</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">Text + bar</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">C</p></oas-form>
    </oas-questionnaire>
    <oas-questionnaire progress-variant="text" steps='[{"title":"A"},{"title":"B"},{"title":"C"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">text</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">Progress text only</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">C</p></oas-form>
    </oas-questionnaire>
    <oas-questionnaire progress-variant="bar" steps='[{"title":"A"},{"title":"B"},{"title":"C"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">bar</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">Progress bar only</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">C</p></oas-form>
    </oas-questionnaire>
  </oas-space>
</DemoBlock>

## Value retention & reset

Panels stay mounted (only `hidden` toggles): going forward then back keeps filled values. `reset()` restores every step to its initial values, clears errors, returns to step 0, and dispatches no events.

<DemoBlock title="Values kept on back + reset()">
  <oas-questionnaire id="q-keep" style="width: 100%; max-width: 480px" steps='[{"title":"Step 1"},{"title":"Step 2"}]'>
    <oas-form slot="step-0" rules='{"ka":[{"required":true,"message":"Required"}]}' initial-values='{"ka":"Prefilled"}'>
      <oas-input name="ka" placeholder="Field (prefilled via initial-values)" style="width: 280px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">Click "Previous" — your edit is still there.</p>
    </oas-form>
  </oas-questionnaire>
  <span style="display: flex; margin-top: 8px">
    <oas-button id="q-keep-reset">reset()</oas-button>
  </span>
  <span id="q-keep-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Custom navigation (hide-header / hide-nav)

`hide-header` / `hide-nav` hide the built-in step header / nav region so the host can fully compose its own (progress and panels are still driven by the component).

<DemoBlock title="hide-nav + external buttons">
  <oas-questionnaire id="q-bare" hide-nav style="width: 100%; max-width: 480px" steps='[{"title":"A"},{"title":"B"}]'>
    <oas-form slot="step-0"><p style="margin: 0">Built-in nav hidden</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">Driven by external buttons</p></oas-form>
  </oas-questionnaire>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="q-bare-prev">Previous</oas-button>
    <oas-button id="q-bare-next" type="primary">Next</oas-button>
  </oas-space>
  <span id="q-bare-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Pure navigation (validation / progress / hide-header)

`validation="false"` disables per-step gating (pure navigation — empty required fields still pass); `progress="false"` hides the progress region; `hide-header` hides the built-in step header. Each is independent, and they can be combined into a minimal flow (only panels and nav buttons remain).

<DemoBlock title="Pure navigation: no gating / no progress / no header">
  <oas-questionnaire id="q-bare-nav" hide-header progress="false" validation="false" style="width: 100%; max-width: 480px" steps='[{"title":"Step A"},{"title":"Step B"}]'>
    <oas-form slot="step-0" rules='{"bv":[{"required":true,"message":"Pure navigation does not block required fields"}]}'>
      <oas-input name="bv" placeholder="Required field (not blocked in pure navigation)" style="width: 260px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">You reach this step even with the field empty (gating is off).</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-bare-nav-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Basic: submit payload echo
  const basicOut = document.getElementById('q-basic-output')
  document.getElementById('q-basic')?.addEventListener('oas-submit', (e) => {
    basicOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  document.getElementById('q-basic')?.addEventListener('oas-change', (e) => {
    // A field's own oas-change bubbles out and shares the event name: only handle step changes (with index)
    if (typeof e.detail?.index !== 'number') return
    message.info(`Moved to step ${e.detail.index + 1}`)
  })

  // Gating feedback
  const gateOut = document.getElementById('q-gate-output')
  document.getElementById('q-gate')?.addEventListener('oas-step-validate', (e) => {
    const { valid, errors } = e.detail
    gateOut.textContent = valid
      ? 'Validation passed, advanced'
      : `Blocked: ${Object.values(errors).join('; ')}`
  })

  // Skip feedback
  const skipOut = document.getElementById('q-skip-output')
  let skipJustNow = false
  document.getElementById('q-skip')?.addEventListener('oas-skip', (e) => {
    skipJustNow = true
    skipOut.textContent = `Skipped step ${e.detail.index + 1} (no validation)`
  })
  document.getElementById('q-skip')?.addEventListener('oas-change', (e) => {
    // A field's own oas-change bubbles out and shares the event name: only handle step changes (with index)
    if (typeof e.detail?.index !== 'number') return
    // Keep the "Skipped" feedback for skip-triggered changes (change follows skip synchronously)
    if (skipJustNow) {
      skipJustNow = false
      return
    }
    skipOut.textContent = 'Moved to the next step'
  })

  // before-change veto
  const vetoOut = document.getElementById('q-veto-output')
  document.getElementById('q-veto')?.addEventListener('oas-before-change', (e) => {
    if (e.detail.index === 2) {
      e.preventDefault()
      vetoOut.textContent = 'Host vetoed: reach the confirm page through the full flow (or branch here)'
    }
  })

  // Animated transition: reset as a replay entry point
  document.getElementById('q-anim-reset')?.addEventListener('click', () => {
    document.getElementById('q-anim')?.reset()
  })

  // Conditional branching: flip hidden by answer (host composition channel, no built-in predicate engine)
  const cond = document.getElementById('q-cond')
  const condOut = document.getElementById('q-cond-output')
  const condSteps = (invoiceHidden) =>
    JSON.stringify([
      { key: 'need', title: 'Invoicing' },
      { key: 'invoice', title: 'Invoice details', hidden: invoiceHidden },
      { key: 'done', title: 'Confirm' },
    ])
  cond?.addEventListener('oas-values-change', (e) => {
    const need = e.detail?.values?.need
    if (need !== 'yes' && need !== 'no') return
    const hide = need === 'no'
    cond.setAttribute('steps', condSteps(hide))
    condOut.textContent = hide
      ? 'The "Invoice details" step is hidden: "Next" will skip it; switch back to "Invoice needed" to restore'
      : 'The "Invoice details" step is visible again'
  })

  // Declarative conditions & jumps: step feedback + goto hit feedback
  const whenOut = document.getElementById('q-when-output')
  let gotoJustNow = false
  document.getElementById('q-when')?.addEventListener('oas-goto', (e) => {
    gotoJustNow = true
    whenOut.textContent = `goto hit: step ${e.detail.from + 1} → step ${e.detail.index + 1} (skipped the visible steps in between)`
  })
  document.getElementById('q-when')?.addEventListener('oas-change', (e) => {
    // Inner fields emit oas-change too: only handle step changes (they carry index)
    if (typeof e.detail?.index !== 'number') return
    if (gotoJustNow) {
      gotoJustNow = false
      return
    }
    whenOut.textContent = `Now at step ${e.detail.index + 1} (conditional steps show/hide by answer)`
  })

  // Score aggregation: oas-score event + read-only property
  const scoreOut = document.getElementById('q-score-output')
  const scoreEl = document.getElementById('q-score')
  scoreEl?.addEventListener('oas-score', (e) => {
    scoreOut.textContent = `oas-score: ${e.detail.score} points (debounced 80ms after answers change)`
  })
  document.getElementById('q-score-read')?.addEventListener('click', () => {
    scoreOut.textContent = `score property: ${scoreEl.score} points`
  })

  // Keyboard shortcuts: step feedback
  document.getElementById('q-kbd')?.addEventListener('oas-change', (e) => {
    // A field's own oas-change bubbles out and shares the event name: only handle step changes (with index)
    if (typeof e.detail?.index !== 'number') return
    const out = document.getElementById('q-kbd-output')
    if (out) out.textContent = `Keyboard step → step ${e.detail.index + 1}`
  })

  // Controlled & methods
  const ctrl = document.getElementById('q-ctrl')
  const ctrlOut = document.getElementById('q-ctrl-output')
  document.getElementById('q-ctrl-prev')?.addEventListener('click', () => {
    ctrlOut.textContent = `prev() → ${ctrl.prev() ? `step ${Number(ctrl.getAttribute('current')) + 1}` : 'cannot go back'}`
  })
  document.getElementById('q-ctrl-next')?.addEventListener('click', () => {
    ctrl.next().then((ok) => {
      ctrlOut.textContent = ok ? `next() → step ${Number(ctrl.getAttribute('current')) + 1}` : 'Gate blocked, stayed on this step'
    })
  })
  document.getElementById('q-ctrl-goto')?.addEventListener('click', () => {
    ctrlOut.textContent = `goto(2) → ${ctrl.goto(2) ? 'jumped to Step C (no gating)' : 'cannot jump'}`
  })
  document.getElementById('q-ctrl-validate')?.addEventListener('click', () => {
    ctrl.validate().then((ok) => {
      ctrlOut.textContent = ok ? 'validate(): all steps pass' : 'validate(): some steps fail (see inline errors)'
    })
  })
  document.getElementById('q-ctrl-values')?.addEventListener('click', () => {
    ctrlOut.textContent = `getValues(): ${JSON.stringify(ctrl.getValues())}`
  })
  document.getElementById('q-ctrl-reset')?.addEventListener('click', () => {
    ctrl.reset()
    ctrlOut.textContent = 'reset(): back to step 0, values cleared (no events)'
  })

  // Value retention + reset
  const keep = document.getElementById('q-keep')
  const keepOut = document.getElementById('q-keep-output')
  keep?.addEventListener('oas-change', (e) => {
    // A field's own oas-change bubbles out and shares the event name: only handle step changes (with index)
    if (typeof e.detail?.index !== 'number') return
    keepOut.textContent = `Step ${e.detail.index + 1}`
  })
  document.getElementById('q-keep-reset')?.addEventListener('click', () => {
    keep.reset()
    keepOut.textContent = 'reset(): restored to the initial-values prefilled value'
  })

  // hide-nav external driving
  const bare = document.getElementById('q-bare')
  const bareOut = document.getElementById('q-bare-output')
  const syncBare = () => {
    bareOut.textContent = `Step ${Number(bare.getAttribute('current')) + 1} / 2`
  }
  document.getElementById('q-bare-prev')?.addEventListener('click', () => {
    bare.prev()
    syncBare()
  })
  document.getElementById('q-bare-next')?.addEventListener('click', () => {
    bare.next().then(syncBare)
  })
  syncBare()

  // Pure navigation: step feedback (no gating, empty required fields pass)
  const bareNavOut = document.getElementById('q-bare-nav-output')
  document.getElementById('q-bare-nav')?.addEventListener('oas-change', (e) => {
    if (typeof e.detail?.index !== 'number') return
    bareNavOut.textContent = `Pure navigation advanced to step ${e.detail.index + 1}`
  })
})
</script>

## API

### oas-questionnaire

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `animated` | Step transition (opt-in, on when present and not `"false"`): the incoming panel slides in along the navigation direction while fading in (transform/opacity only); automatically disabled for `prefers-reduced-motion: reduce`; slide direction mirrors in RTL | `boolean` | — |
| `current` | Current step index (0-based, two-way: internal jumps write back, external updates sync instantly); invalid values fall back to 0, out-of-range clamped | `string` | `0` |
| `finish-text` | Last-step primary button label (overrides the locale default "Submit") | — | — |
| `hide-header` | Hide the built-in step header (host composition) | `boolean` | — |
| `hide-nav` | Hide the built-in nav region (host composition) | `boolean` | — |
| `linear` | Linear mode (on by default, `linear="false"` disables): future steps are not clickable in the header; when disabled, any step is clickable (still intercepted by oas-before-change) | `string` | `true` |
| `next-text` | "Next" button label (overrides the locale default) | — | — |
| `prev-text` | "Previous" button label (overrides the locale default) | — | — |
| `progress` | Progress region visibility (`progress="false"` hides it) | `string` | `true` |
| `progress-variant` | Progress variant: `both` (default, text + bar) / `text` / `bar`; invalid values fall back to `both` | `string` | `both` |
| `shortcuts` | Keyboard step navigation (opt-in, on when present and not `"false"`): `Alt+←/→` switches steps anywhere inside the component (swallows the default to prevent browser history navigation); bare `←/→` only when focus is outside inputs/editable controls (never hijacks the caret) | `boolean` | — |
| `size` | Size tier: `xs`/`small`/`medium`/`large`/`xl` (title font density; invalid values fall back to medium with a one-time warning (deduped by identical value)) | `string` | `medium` |
| `skip-text` | "Skip this step" button label (overrides the locale default) | — | — |
| `steps` | Step data JSON `[{ key?, title, description?, optional?, hidden? }]`; invalid/empty falls back to `[]` | `QuestionnaireStep[] \| string` | `[]` |
| `validation` | Per-step validation gating (on by default, `validation="false"` for pure navigation; `submit()` always re-validates regardless) | `string` | `true` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `next` | `next(): Promise<boolean>` | Next step: gated by single-step validation (blocked while the current step's oas-form has not passed; allowed with no form / validation="false") |
| `prev` | `prev(): boolean` | Previous step: no validation (following the convention that going back is never blocked by validation) |
| `goto` | `goto(index: number): boolean` | Jump directly to any step: skips single-step gating (separate from next() semantics); out-of-range values are clamped and hidden steps are resolved backwards |
| `skipStep` | `skipStep(): boolean` | Skip the current optional step: advances without validation (before-change can still intercept) |
| `validate` | `validate(): Promise<boolean>` | Validate all participating steps (not hidden and not skipped; does not submit): dispatches oas-step-validate per step and returns whether all passed |
| `submit` | `submit(): Promise<boolean>` | Submit: re-validates all participating steps (including earlier ones) and dispatches oas-submit{values} only when everything passes (cross-step aggregation, participating steps only) |
| `getValues` | `getValues(): Record<string, unknown>` | Cross-step value aggregation (participating steps only, same criteria as validateAll): the values of each participating step (not hidden and not skipped) |
| `reset` | `reset(): void` | Reset: every step's form resets to its initial values (clearing error state), value tracking and skip records are cleared, and current returns to 0 |

#### Events

| Event | Description |
| --- | --- |
| `oas-before-change` | Fires before any jump (buttons / header clicks / next / prev / goto / skip), cancelable; `detail: { index, key?, from }` — `preventDefault()` vetoes the jump |
| `oas-change` | After a successful step switch; `detail: { index, key? }` |
| `oas-skip` | When an optional step is skipped; `detail: { index, key? }` (skipping never validates; the skipped step leaves the values/validation scope until revisited) |
| `oas-step-validate` | After a per-step validation; `detail: { index, key?, valid, errors }` |
| `oas-submit` | Finished on the last step (all participating steps validated); `detail: { values }` (merged across participating steps only — hidden / skipped steps excluded) |
| `oas-values-change` | Natural bubble-through of the inner oas-form value changes (`detail: { name, value, values }`, values is that step's snapshot); use getValues() for the merged view |

#### Slots

| Name | Description |
| --- | --- |
| `step-<index>` | Step content panel (unkeyed steps associate by array index) |
| `step-<key>` | Step content panel (keyed steps); place one `<oas-form>` inside to carry the step's fields and rules |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-questionnaire-anim-duration` | Step transition duration (applies when animated is on) | `var(--oas-transition-base, 180ms)` |
| `--oas-questionnaire-nav-gap` | Nav region button gap | `var(--oas-space-2)` |
| `--oas-questionnaire-progress-bar-bg` | Progress fill color | `var(--oas-color-primary)` |
| `--oas-questionnaire-progress-bg` | Progress track background | `var(--oas-color-bg-hover)` |
