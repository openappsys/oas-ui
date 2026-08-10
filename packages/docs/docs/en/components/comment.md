# Comment

A purely presentational comment block container that assembles the author avatar, name, time, content, and actions via slots; nested child comments are automatically indented.

## Basic Usage

<DemoBlock title="Single comment">
  <div style="width: 100%">
    <oas-comment>
      <oas-avatar slot="avatar" size="32">张</oas-avatar>
      <span slot="author">张三</span>
      <span slot="time">3 分钟前</span>
      <p slot="content" style="margin: 0">
        这个组件支持纯展示的评论结构，交互操作由宿主通过 <code>actions</code> 插槽自行提供。
      </p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
        <oas-button size="small" type="text">点赞</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

## Nested Child Comments

<DemoBlock title="Nested replies (auto-indent)">
  <div style="width: 100%">
    <oas-comment>
      <oas-avatar slot="avatar" size="32">李</oas-avatar>
      <span slot="author">李四</span>
      <span slot="time">昨天 18:20</span>
      <p slot="content" style="margin: 0">父评论：赞同这个设计，子评论会自动缩进并带引导线。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
      </span>
      <oas-comment>
        <oas-avatar slot="avatar" size="32">王</oas-avatar>
        <span slot="author">王五</span>
        <span slot="time">昨天 19:02</span>
        <p slot="content" style="margin: 0">子评论：通过默认插槽嵌套 <code>oas-comment</code> 即可，层级不限。</p>
        <span slot="actions">
          <oas-button size="small" type="text">回复</oas-button>
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
    无任何插槽内容时渲染为空容器，不报错；空插槽对应的区块自动隐藏。
  </p>
</DemoBlock>

## API

| Slot        | Description                                              |
| ----------- | --------------------------------------------------------- |
| `avatar`    | Author avatar (can hold an `oas-avatar`)                  |
| `author`    | Author name                                               |
| `time`      | Time                                                      |
| `content`   | Comment content                                           |
| `actions`   | Action area (reply / like, etc., provided by the host)    |
| Default     | Nested `oas-comment` child comments, automatically indented |

Parts: `::part(comment)` root, `::part(main)` main body, `::part(avatar)` / `::part(author)` / `::part(time)` / `::part(content)` / `::part(actions)`, `::part(children)` child comment container.
