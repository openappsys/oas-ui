# Comment

A purely presentational comment block container that assembles the author avatar, name, time, content, and actions via slots; nested child comments are automatically indented.

## Basic Usage

<DemoBlock title="Single comment">
  <div style="width: 100%">
    <oas-comment>
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
    <oas-comment>
      <oas-avatar slot="avatar" size="32">B</oas-avatar>
      <span slot="author">Bob</span>
      <span slot="time">Yesterday 18:20</span>
      <p slot="content" style="margin: 0">Parent comment: I agree with this design; child comments are automatically indented with a guide line.</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
      </span>
      <oas-comment>
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

<DemoBlock title="Empty comment">
  <div style="width: 100%">
    <oas-comment></oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    With no slot content at all, it renders as an empty container without errors; the sections of empty slots are hidden automatically.
  </p>
</DemoBlock>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-comment-font` (e.g. `18px`).

## Alignment

<DemoBlock title="Time / actions alignment (align)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment>
      <oas-avatar slot="avatar" size="32">A</oas-avatar>
      <span slot="author">Alice</span>
      <span slot="time">3 minutes ago</span>
      <p slot="content" style="margin: 0">Default alignment: time and actions are left-aligned (align defaults to left).</p>
      <span slot="actions">
        <oas-button size="small" type="text">Reply</oas-button>
        <oas-button size="small" type="text">Like</oas-button>
      </span>
    </oas-comment>
    <oas-comment align="right">
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
    <oas-comment align="right">
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
    <oas-comment id="comment-editor">
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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Time/actions alignment: `left` (default) / `right` (logical properties, flips in RTL) | — | — |

### Slots

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

Parts: `::part(comment)` root, `::part(main)` main body, `::part(avatar)` / `::part(author)` / `::part(time)` / `::part(content)` / `::part(actions)`, `::part(children)` child comment container.
