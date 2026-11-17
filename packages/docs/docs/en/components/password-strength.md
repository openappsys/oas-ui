# PasswordStrength

A standalone password-strength meter that **does not wrap the input**: associate it via `for` or auto-discover a password input inside the default slot — it composes with `oas-input` as well as native inputs. Built-in 0–4 scoring (length tiers + character-class diversity incl. CJK − common weak-password / repetition / sequential-run penalties); controlled `level`, `levels` label override, and a `scoreFn` custom scorer property; a 4-segment bar fully themed with tokens (dark mode automatic) with a default width of 12rem (`--oas-password-strength-width` overrides); the `part="bar"` segment bar carries the `role="meter"` accessibility semantics (the host stays generic so a slotted input is not flattened by the meter); level labels are localized in 16 languages.

## Basic Usage (for + oas-input)

<DemoBlock title="for association + show-label">
  <oas-input id="ps-demo-pwd" type="password" show-password placeholder="Type a password to see the meter" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-pwd" show-label></oas-password-strength>
</DemoBlock>

`for` points to the `id` of a password input (resolved within the same root node): the target can be `oas-input type="password"` or a native `<input type="password">`. The meter listens to the input's `input` event and re-scores in real time, lighting up segments and updating the level label.

Try `123456` (exact weak-list match, always the weakest level) or `password` (weak-list body → 0). `password1!` with extras is no longer zeroed — it scores by length/classes; `Abc!23456` (sequential-digit run penalty); `MyStr0ng!Pass` (long and diverse, full meter).

## Level Label (show-label)

<DemoBlock title="Default (hidden) vs show-label (visible)">
  <oas-password-strength for="ps-demo-nolabel"></oas-password-strength>
  <oas-password-strength for="ps-demo-nolabel" show-label></oas-password-strength>
</DemoBlock>

By default only the segment bar renders (pure visual feedback); with `show-label` the current level label shows at the end of the bar (defaults to the i18n labels, tinted by level).

## Controlled Level (level)

<DemoBlock title="level=0–4, host-owned (auto-scoring paused)">
  <oas-space size="small">
    <oas-button size="small" onclick="psLevel(0)">level=0</oas-button>
    <oas-button size="small" onclick="psLevel(1)">level=1</oas-button>
    <oas-button size="small" onclick="psLevel(2)">level=2</oas-button>
    <oas-button size="small" onclick="psLevel(3)">level=3</oas-button>
    <oas-button size="small" onclick="psLevel(4)">level=4</oas-button>
  </oas-space>
  <oas-password-strength id="ps-demo-ctrl" show-label level="2"></oas-password-strength>
</DemoBlock>

The `level` attribute (0–4) switches to **controlled mode**: the displayed value is entirely host-owned — the component stops auto-scoring, the associated input no longer affects the meter, and `oas-score-change` is not dispatched (no two-way binding loops). Out-of-range values clamp to 0–4; invalid values fall back to 0 with a one-time console.warn. Removing `level` resumes auto-scoring.

Use this mode to bind your own scoring system (e.g. a strength field returned by the server): the meter is a pure presentation layer.

## Custom Scoring (scoreFn)

<DemoBlock title="Length-only custom scorer">
  <oas-label>
    <input type="checkbox" id="ps-demo-fn-toggle" />
    Length only (≥12 chars = Very strong, 8–11 = Strong, otherwise Weak)
  </oas-label>
  <oas-input id="ps-demo-fn-pwd" type="password" placeholder="Type a password to see the custom score" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-fn-pwd" show-label id="ps-demo-fn-meter"></oas-password-strength>
</DemoBlock>

`scoreFn` is a **JS property** (bind with `:scoreFn` in Vue templates): it receives the password string and returns 0–4. While set it **fully replaces** the built-in scorer; set it to `null` to restore the built-in one. If the function throws, the meter falls back to the built-in score with a one-time console.warn. It is ignored while controlled `level` is present (host-owned value wins).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ctrl = document.getElementById('ps-demo-ctrl')
  window.psLevel = (n) => ctrl?.setAttribute('level', String(n))

  const toggle = document.getElementById('ps-demo-fn-toggle')
  const meter = document.getElementById('ps-demo-fn-meter')
  const lengthOnly = (password) => {
    const len = Array.from(password).length
    if (len >= 12) return 4
    if (len >= 8) return 3
    if (len === 0) return 0
    return 1
  }
  toggle?.addEventListener('change', () => {
    if (meter) meter.scoreFn = toggle.checked ? lengthOnly : null
  })
})
</script>

## Slot Auto-Discovery

<DemoBlock title="Native input inside the slot (no for)">
  <oas-password-strength show-label>
    <input type="password" aria-label="Native password input" placeholder="Native password input (in slot)" style="width: 260px; box-sizing: border-box; padding: var(--oas-space-1_5) var(--oas-space-2); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg); color: var(--oas-color-text-primary); font: inherit" />
  </oas-password-strength>
</DemoBlock>

Without `for`, the component auto-discovers the first `[type=password]` input inside the **default slot** (a native input, or a hosting component such as `oas-input` that declares `type="password"`), and binds the listener automatically. Slot content changes (`slotchange`) and removal of the associated target (a root-node childList observer) re-bind automatically: when the target is removed the score falls back to the empty state, with no dangling listeners and no errors.

When both `for` and a slot input are available, **the `for` association wins**.

## Built-in Scoring Rules

| Score | Segments lit | Visual level | Default label (en) |
| --- | --- | --- | --- |
| 0 | 0 | neutral (empty) | Very weak |
| 1 | 1 | danger | Weak |
| 2 | 2 | warning | Fair |
| 3 | 3 | success | Strong |
| 4 | 4 | success | Very strong |

Scoring (0–4, original implementation):

- **Length tiers** (effective length = 1 per ASCII char, 3 per CJK char): ≥8 → +1, ≥12 → +1, ≥20 → +1
- **Character-class diversity**: lowercase / uppercase / digits / symbols / CJK — ≥2 classes → +1, ≥3 classes → +1 more (positive score capped at 4)
- **Common weak-password penalty**: a built-in set of about 50 curated high-frequency weak passwords (123456 / password / qwerty / letmein …) — an exact lowercase match scores 0 (`password` → 0); **substring matches are NOT zeroed** — a strong password containing a weak word (`Str0ng!Passw0rd` contains `passw0rd`) keeps its entropy-derived score
- **Repetition penalty**: ≥5 identical characters (e.g. `aaaaaa`) → capped at 1
- **Sequential-run penalty**: a ≥5-char ascending/descending run (e.g. `12345` / `abcde`) → capped at 2

## Labels and Localization

Level labels default to i18n (`passwordStrength.0`–`passwordStrength.4`, all 16 languages) and follow `config-provider` locale switches. Pass a JSON array to `levels` (5 non-empty strings) to override the whole set: `levels='["Too weak","Weak","Fair","Strong","Very strong"]'`; invalid JSON or a length other than 5 falls back to the i18n defaults with a one-time console.warn.

<DemoBlock title="levels label override">
  <oas-input id="ps-demo-lv-pwd" type="password" placeholder="Type a password to see custom labels" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-lv-pwd" show-label levels='["Too weak","Weak","Fair","Strong","Very strong"]'></oas-password-strength>
</DemoBlock>

## Accessibility

- The segment bar (`part="bar"`) carries `role="meter"` + `aria-valuenow` / `aria-valuemin="0"` / `aria-valuemax="4"`, with the current level label in `aria-label` — screen readers perceive both the score and its meaning
- The host stays a plain container without an indicator role: a password input slotted inside is a flat-tree sibling of the bar, so it is not swallowed by the meter role's "children are presentational" semantics (the `nested-interactive` regression is pinned by the qa-regression spec); a pure indicator — no focus grab, not in the tab order
- Segments and label encode the level twice (color + text), so color-blind users can still tell levels apart; the label uses `-text` safe-contrast tokens (≥4.5:1 on light backgrounds) and the segment fills use solid tokens (≥3:1 for non-text graphics)

## API

### oas-password-strength

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `for` | ID of the password input to associate with (resolved within the same root node; can be a native input[type=password] or a component hosting one, e.g. oas-input); takes precedence over slot auto-discovery | `string` | — |
| `level` | Controlled score (0–4): stops auto-scoring while present and dispatches no events (the value is host-owned); removing it resumes auto mode; out-of-range values clamp to 0–4, invalid values fall back to 0 with a one-time warning | `string` | — |
| `levels` | Five-level label override: JSON array (5 non-empty strings, indexes 0–4); defaults to locale `passwordStrength.*`; invalid values fall back with a one-time warning | `string` | — |
| `show-label` | Show the current level label | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `scoreFn` | Custom scoring function `(password: string) => 0–4`: fully replaces the built-in scorer while set; set null to restore. Ignored while controlled `level` is present | `PasswordScoreFn \| null` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-score-change` | Fires when the score changes (auto/custom scoring modes only; not in controlled `level` mode), `detail: { score, label }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Auto-discovery area: the first `[type=password]` input (native input or hosting component) is discovered here and bound automatically |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-password-strength-width` | `12rem` |

Colors: the bar and label use only `--oas-color-*` tokens (`--oas-color-danger` / `--oas-color-warning` / `--oas-color-success` / `--oas-color-bg-hover` / `--oas-color-text-*`); dark and high-contrast themes work automatically. Style parts `part="bar"` / `part="segment"` / `part="label"` can be customized via host `::part()`.
