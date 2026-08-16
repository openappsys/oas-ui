# Comment 评论

纯展示的评论块容器，通过插槽组装作者头像、名称、时间、内容与操作区；支持嵌套子评论自动缩进。

## 基础用法

<DemoBlock title="单条评论">
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

## 嵌套子评论

<DemoBlock title="嵌套回复（自动缩进）">
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

## 空态

<DemoBlock title="空评论">
  <div style="width: 100%">
    <oas-comment></oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    无任何插槽内容时渲染为空容器，不报错；空插槽对应的区块自动隐藏。
  </p>
</DemoBlock>

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-comment-font` 显式定制（如 `18px`）。

## API

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 嵌套的 `oas-comment` 子评论，自动缩进缩进 |
| `actions` | 操作区（回复/点赞等，由宿主提供） |
| `author` | 作者名 |
| `avatar` | 作者头像（可放 `oas-avatar`） |
| `content` | 评论内容 |
| `time` | 时间 |

部件：`::part(comment)` 根、`::part(main)` 主体、`::part(avatar)` / `::part(author)` / `::part(time)` / `::part(content)` / `::part(actions)`、`::part(children)` 子评论容器。
