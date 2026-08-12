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

## API

### Slots

| Name      | Description                                                 |
| --------- | ----------------------------------------------------------- |
| default   | Nested `oas-comment` child comments, automatically indented |
| `actions` | Action area (reply / like, etc., provided by the host)      |
| `author`  | Author name                                                 |
| `avatar`  | Author avatar (can hold an `oas-avatar`)                    |
| `content` | Comment content                                             |
| `time`    | Time                                                        |

Parts: `::part(comment)` root, `::part(main)` main body, `::part(avatar)` / `::part(author)` / `::part(time)` / `::part(content)` / `::part(actions)`, `::part(children)` child comment container.
