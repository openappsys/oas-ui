# Highlight

Text match highlighting component: computes matched segments from `text` (the source string) plus `highlight` (keywords — space-separated words or a JSON array) and renders each hit as a `<mark>` (colors come from theme tokens, adapting to dark mode automatically). Three toggles are supported — case sensitivity, whole-word matching, and accent sensitivity (all off by default; accent folding strips combining marks via `String.normalize('NFD')`). After each content recomputation it dispatches `oas-count` (detail `{ count, matches }`).

## Basic Usage

<DemoBlock title="Single keyword highlight">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight="quick" style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

## Multiple Keywords

Separate keywords with spaces, or pass a JSON array (e.g. `'["fox","dog"]'`). Overlapping hit ranges are merged automatically — no nested `<mark>` is ever produced.

<DemoBlock title="Space-separated words">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight="quick fox" style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

<DemoBlock title="JSON array">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight='["fox","dog"]' style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

## Case / Whole-Word / Accent

All three toggles default to off (insensitive); boolean attributes apply when present.

<DemoBlock title="case-sensitive">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="Hello world, hello OAS" highlight="hello"></oas-highlight>
    <oas-highlight text="Hello world, hello OAS" highlight="hello" case-sensitive></oas-highlight>
  </div>
</DemoBlock>

<DemoBlock title="whole-word">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="The category contains a cat" highlight="cat"></oas-highlight>
    <oas-highlight text="The category contains a cat" highlight="cat" whole-word></oas-highlight>
  </div>
</DemoBlock>

<DemoBlock title="accent-sensitive (é ↔ e folding by default)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="Un café au lait, s'il vous plaît" highlight="cafe plait"></oas-highlight>
    <oas-highlight text="Un café au lait, s'il vous plaît" highlight="cafe plait" accent-sensitive></oas-highlight>
  </div>
</DemoBlock>

`whole-word` boundaries are decided by Unicode letters/digits (han characters included): a hit adjacent to a word character is not a whole word, so a Chinese keyword surrounded by han characters does not match (Chinese has no space-based word boundaries — a conservative, correct default).

## Match Count (oas-count)

Dispatched after each content recomputation triggered by attribute changes, with detail `{ count, matches }`: `count` is the number of rendered `<mark>` segments (including 0), and `matches` is the deduplicated list of keywords that actually hit. The demo below switches keyword sets via buttons and the feedback text updates live (the first dispatch during the mount frame happens before a manual `addEventListener` can register — the same synchronous-dispatch semantics as native DOM events; framework event bindings are unaffected).

<DemoBlock title="oas-count event feedback">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-highlight id="highlight-count-demo" text="Web Components let components be reused across frameworks" highlight="components reused" style="font-size: var(--oas-font-size-md)"></oas-highlight>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="highlight-count-a" size="small">Keywords: components reused</oas-button>
      <oas-button id="highlight-count-b" size="small">Keywords: frameworks platform</oas-button>
      <oas-button id="highlight-count-none" size="small">Keywords: none</oas-button>
    </div>
    <span id="highlight-count-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## Empty State & Safety

- With no `text`, no `highlight`, or zero hits: the source text renders as-is (or nothing renders) with zero `<mark>`; `oas-count` still dispatches `count: 0` so hosts can show a "no results" state.
- When `highlight` starts with `[` it is parsed as a JSON array; on parse failure or a non-array value it falls back to whitespace-separated words; empty strings and non-string entries are filtered out.
- Source text and keywords always render as plain text (DOM textContent channel); HTML fragments are never parsed or executed.

## Font Size & Inline Flow

The host is an inline box (`display: inline`) and flows naturally inside paragraph text; font size and line height inherit from the surrounding typography context.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guards against expando shadowing before the custom element upgrades
  customElements.whenDefined('oas-highlight').then(() => {
    const el = document.getElementById('highlight-count-demo')
    const out = document.getElementById('highlight-count-output')
    const show = (count, matches) => {
      if (out) out.textContent = `oas-count → ${count} match(es)${matches.length ? ` (keywords: ${matches.join(', ')})` : ''}`
    }
    el?.addEventListener('oas-count', (e) => show(e.detail.count, e.detail.matches))
    // Switch keyword sets: attribute change → recompute → dispatch oas-count → feedback text updates
    document.getElementById('highlight-count-a')?.addEventListener('click', () => el?.setAttribute('highlight', 'components reused'))
    document.getElementById('highlight-count-b')?.addEventListener('click', () => el?.setAttribute('highlight', 'frameworks platform'))
    document.getElementById('highlight-count-none')?.addEventListener('click', () => el?.setAttribute('highlight', 'nothing'))
  })
})
</script>

## API

### oas-highlight

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accent-sensitive` | Accent sensitive (accents NFD-folded by default) | `boolean` | — |
| `case-sensitive` | Case sensitive (insensitive by default) | `boolean` | — |
| `highlight` | Keywords: space-separated words or JSON array; whitespace fallback on parse failure | — | — |
| `text` | Source text | — | — |
| `whole-word` | Whole-word matching (off by default; Unicode letter/digit boundaries) | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-count` | Dispatched after each recompute, `detail: { count, matches }` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-highlight-bg` | `color-mix(in srgb, var(--oas-preset-gold) 22%, transparent)` |
| `--oas-highlight-color` | `var(--oas-color-text-primary)` |

#### Parts

| Part | Description |
| --- | --- |
| `highlight` | Hit segment (mark) |
| `root` | Content container |
