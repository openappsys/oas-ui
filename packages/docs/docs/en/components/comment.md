# Comment

A purely presentational comment block container that assembles the author avatar, name, time, content, and actions via slots; nested child comments are automatically indented. It ships a built-in input row (Enter submits / Shift+Enter for a newline) and a resolved state (muted + strikethrough); comment data is always owned by the host and written back to drive rendering.

## Basic Usage

<DemoBlock title="Single comment">
  <div style="width: 100%">
    <oas-comment inputtable="false">
      <oas-avatar slot="avatar" size="32">A</oas-avatar>
      <span slot="author">Alice</span>
      <span slot="time">3 minutes ago</span>
      <p slot="content" style="margin: 0">
        This component supports a purely presentational comment structure; interactions are provided by the host via the <code>actions</code> slot.
      </p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
        <oas-button size="small" type="text">Like</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

## Nested Child Comments

<DemoBlock title="Nested replies (auto-indent)">
  <div style="width: 100%">
    <oas-comment inputtable="false">
      <oas-avatar slot="avatar" size="32">B</oas-avatar>
      <span slot="author">Bob</span>
      <span slot="time">Yesterday 18:20</span>
      <p slot="content" style="margin: 0">Parent comment: I agree with this design; child comments are automatically indented with a guide line.</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
      </span>
      <oas-comment inputtable="false">
        <oas-avatar slot="avatar" size="32">C</oas-avatar>
        <span slot="author">Carol</span>
        <span slot="time">Yesterday 19:02</span>
        <p slot="content" style="margin: 0">Child comment: nest <code>oas-comment</code> via the default slot, with no depth limit.</p>
        <span slot="actions">
          <oas-button size="small" type="text">Reply</oas-button>
        </span>
      </oas-comment>
    </oas-comment>
  </div>
</DemoBlock>

## Empty State

<DemoBlock title="Empty comment (input row off)">
  <div style="width: 100%">
    <oas-comment inputtable="false"></oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    With no slot content at all, it renders as an empty container without errors; the sections of empty slots are hidden automatically. The built-in input row can be turned off with <code>inputtable="false"</code>, which is done here to avoid a lone composer.
  </p>
</DemoBlock>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-comment-font` (e.g. `18px`).

## Alignment

<DemoBlock title="Time / actions alignment (align)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment inputtable="false">
      <oas-avatar slot="avatar" size="32">A</oas-avatar>
      <span slot="author">Alice</span>
      <span slot="time">3 minutes ago</span>
      <p slot="content" style="margin: 0">Default alignment: time and actions are left-aligned (align defaults to left).</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
        <oas-button size="small" type="text">Like</oas-button>
      </span>
    </oas-comment>
    <oas-comment align="right" inputtable="false">
      <oas-avatar slot="avatar" size="32">B</oas-avatar>
      <span slot="author">Bob</span>
      <span slot="time">10 minutes ago</span>
      <p slot="content" style="margin: 0">align="right": the time is pushed to the right and the whole action group is right-aligned.</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
        <oas-button size="small" type="text">Like</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

`align="left" | "right"` controls the alignment of the time and actions. It is pure CSS (logical properties, so it flips automatically in RTL).

## Quote and Reply Target

<DemoBlock title="quote / reply slots (reply-to scenario)">
  <div style="width: 100%">
    <oas-comment align="right" inputtable="false">
      <oas-avatar slot="avatar" size="32">C</oas-avatar>
      <span slot="author">Carol</span>
      <span slot="time">Yesterday 19:02</span>
      <span slot="reply">Reply to <b>@Bob</b></span>
      <blockquote slot="quote" style="margin: 0">"Can we revisit the wrapping strategy of this design on narrow screens?"</blockquote>
      <p slot="content" style="margin: 0">Agreed — one more scenario: the action area should keep a minimum gap when it wraps on narrow screens.</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
        <oas-button size="small" type="text">Like</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

`slot="reply"` shows the reply target (e.g. "Reply to @someone") and `slot="quote"` shows the quoted original text. Both use a restrained style (secondary text + a left color bar) and hide automatically when empty.

## Reply Interaction

<DemoBlock title="Editor composition (reply with an input)">
  <div style="width: 100%">
    <oas-comment id="comment-editor" inputtable="false">
      <oas-avatar slot="avatar" size="32">D</oas-avatar>
      <span slot="author">Dave</span>
      <span slot="time">1 hour ago</span>
      <p slot="content" style="margin: 0">The component itself does not handle editing: click "Reply" to expand an input, and the host inserts the child comment into the default slot on submit.</p>
      <span slot="actions">
        <oas-button size="small" type="text" id="comment-reply-btn">Reply</oas-button>
      </span>
    </oas-comment>
    <div id="comment-editor-form" hidden style="margin-inline-start: 40px; margin-block-start: var(--oas-space-3)">
      <oas-textarea id="comment-editor-input" placeholder="Write a reply…"></oas-textarea>
      <div style="display: flex; gap: var(--oas-space-2); margin-block-start: var(--oas-space-2); justify-content: flex-end">
        <oas-button size="small" id="comment-editor-cancel">Cancel</oas-button>
        <oas-button size="small" type="primary" id="comment-editor-submit">Submit</oas-button>
      </div>
    </div>
  </div>
</DemoBlock>

Demonstrates dynamic slot composition of `oas-comment` + `oas-textarea` + `oas-button`: the submitted `<oas-comment>` goes into the default slot and is automatically indented with a guide line.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // The import must stay inside onMounted: a top-level await import would be evaluated
  // during the vitepress build (SSR, no HTMLElement in Node) and leave the page empty
  const { message } = await import('@oas-ui/ui')
  const editor = document.querySelector('#comment-editor')
  const form = document.querySelector('#comment-editor-form')
  const input = document.querySelector('#comment-editor-input')

  // Property assignment / method calls must wait for the upgrade, otherwise the expando shadows the prototype member
  document.querySelector('#comment-reply-btn')?.addEventListener('click', () => {
    customElements.whenDefined('oas-textarea').then(() => {
      form.hidden = false
      input.value = ''
      input.focus()
    })
  })
  document.querySelector('#comment-editor-cancel')?.addEventListener('click', () => {
    form.hidden = true
  })
  document.querySelector('#comment-editor-submit')?.addEventListener('click', () => {
    customElements.whenDefined('oas-textarea').then(() => {
      const text = (input.value ?? '').trim()
      if (!text) {
        message.warning('Reply cannot be empty')
        return
      }
      customElements.whenDefined('oas-comment').then(() => {
        const child = document.createElement('oas-comment')
        child.innerHTML = `
          <oas-avatar slot="avatar" size="32">M</oas-avatar>
          <span slot="author">Me</span>
          <span slot="time">Just now</span>
          <p slot="content" style="margin: 0"></p>
        `
        child.querySelector('p').textContent = text
        editor.appendChild(child)
        form.hidden = true
        message.success('Reply posted')
      })
    })
  })

  // ===== Built-in input row demo: the host listens for oas-submit and appends data (data-driven write-back) =====
  const box = document.querySelector('#comment-composer')
  let seq = 0
  box?.addEventListener('oas-submit', (e) => {
    const text = e.detail.text
    seq += 1
    customElements.whenDefined('oas-comment').then(() => {
      const child = document.createElement('oas-comment')
      child.setAttribute('comment-id', `reply-${seq}`)
      child.setAttribute('resolvable', '')
      child.innerHTML = `
        <oas-avatar slot="avatar" size="32">M</oas-avatar>
        <span slot="author">Me</span>
        <span slot="time">Just now</span>
        <p slot="content" style="margin: 0"></p>
      `
      child.querySelector('p').textContent = text
      box.appendChild(child)
      message.success(`Submitted: ${text}`)
    })
  })
  // Resolve write-back (shared by the submit-loop container and the toggle demo items below)
  for (const id of ['comment-composer', 'comment-resolve-open', 'comment-resolve-done']) {
    document.querySelector(`#${id}`)?.addEventListener('oas-resolve', (e) => {
      const { resolved } = e.detail
      const item = e.target.closest('oas-comment')
      if (resolved) item.setAttribute('resolved', '')
      else item.removeAttribute('resolved')
    })
  }
})
</script>

## Built-in Input Row

The component ships with an input row (`textarea` + submit button): **Enter submits, Shift+Enter inserts a newline**; Enter during IME composition does not submit, and empty text is silently ignored. On submit it dispatches `oas-submit` (detail `{ text }`, bubbles + composed).

**Data-driven write-back**: the component never appends list items internally — the host listens for `oas-submit`, appends the text to its own data source, and renders the new entry (into the default slot). The input row can be turned off with `inputtable="false"` (shown by default).

<DemoBlock title="Submit loop (host appends data)">
  <div style="width: 100%">
    <oas-comment id="comment-composer" resolvable comment-id="topic-1">
      <oas-avatar slot="avatar" size="32">G</oas-avatar>
      <span slot="author">Discussion</span>
      <span slot="time">Today's topic</span>
      <p slot="content" style="margin: 0">Type anything in the composer below and press Enter — the demo writes the submission back into the default slot; appended child comments also carry a resolve trigger.</p>
    </oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The host listens for <code>oas-submit</code> to append a child comment and show a toast; clicking a resolve trigger dispatches <code>oas-resolve</code> (detail <code>{ id, resolved }</code>), written back by the host to the <code>resolved</code> attribute.
  </p>
</DemoBlock>

## Resolved State

`resolvable` (boolean presence attribute, off by default) shows a resolve / unresolve trigger; `resolved` (boolean presence attribute) renders the resolved style — strikethrough on the content, muted text for the entry (token-based, adapts to dark mode), plus a "Resolved" badge on the author row. Clicking the trigger dispatches `oas-resolve` (detail `{ id, resolved }`); **the component never flips the state itself** — the host writes the data back and syncs the item's `resolved` attribute.

<DemoBlock title="Resolved / open (click to toggle, host writes back)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment id="comment-resolve-open" resolvable comment-id="issue-42">
      <oas-avatar slot="avatar" size="32">E</oas-avatar>
      <span slot="author">Eve</span>
      <span slot="time">10 minutes ago</span>
      <p slot="content" style="margin: 0">Open: click "Mark as resolved" and the host writes `resolved` back onto this entry.</p>
    </oas-comment>
    <oas-comment id="comment-resolve-done" resolvable resolved comment-id="issue-41">
      <oas-avatar slot="avatar" size="32">F</oas-avatar>
      <span slot="author">Frank</span>
      <span slot="time">Yesterday 18:02</span>
      <p slot="content" style="margin: 0">Resolved: strikethrough content, muted entry, and a "Resolved" badge on the author row; click "Unmark resolution" to switch back.</p>
    </oas-comment>
  </div>
</DemoBlock>

## API

### oas-comment

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Time/actions alignment: `left` (default) / `right` (logical properties, flips in RTL) | — | — |
| `comment-id` | Entry id: passed back in the `oas-resolve` event detail (decoupled from the DOM id, same family naming as `message-id`; falls back to an empty string) | `string` | — |
| `inputtable` | Built-in input row switch (on by default): set `inputtable="false"` explicitly to hide it. Enter submits, Shift+Enter inserts a newline; Enter during IME composition does not submit; empty text is silently ignored | `string` | `true` |
| `resolvable` | Resolve trigger switch (boolean presence attribute, off by default — zero visual change): when present, a resolve/unresolve trigger appears in the actions row; the row also shows when the actions slot is empty because of the built-in trigger | `boolean` | — |
| `resolved` | Resolved state (boolean presence attribute): strikethrough on the content, muted entry text, and a "Resolved" badge on the author row (token-based, adapts to dark mode). Data-driven — the host writes data back and syncs this attribute; the component never flips it internally | `boolean` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `submit` | `submit(): boolean` | Submits the current composer text; returns false and dispatches nothing when the text is empty or the composer is hidden |

#### Events

| Event | Description |
| --- | --- |
| `oas-resolve` | Dispatched when a resolve/unresolve trigger is clicked. detail { id, resolved } — id is the `comment-id` attribute value (empty string by default), resolved is the target resolution state (true = mark resolved / false = unmark); the component never flips `resolved` internally — the host writes data back and syncs the item attribute |
| `oas-submit` | Dispatched when the built-in input row is submitted (Enter or the submit button). detail { text } — the trimmed text; empty text is not dispatched; the component never appends list items internally — the host writes data back to drive rendering (data-driven write-back) |

#### Slots

| Name | Description |
| --- | --- |
| default | Nested `oas-comment` child comments, automatically indented |
| `actions` | Action area (reply / like, etc., provided by the host) |
| `author` | Author name |
| `avatar` | Author avatar (can hold an `oas-avatar`) |
| `content` | Comment content |
| `quote` | Quote area (before content, secondary text + left accent border) |
| `reply` | Reply target area (under the author line, for "reply to @someone") |
| `time` | Time |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-comment-font` | `inherit` |

Parts: `::part(comment)` root, `::part(main)` main body, `::part(avatar)`, `::part(body)` content column (containing the `::part(head)` header row), `::part(author)` / `::part(time)` / `::part(reply)` / `::part(quote)` / `::part(content)` / `::part(actions)`, `::part(children)` child comment container.
