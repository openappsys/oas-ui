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

## 对齐

<DemoBlock title="时间 / 操作区对齐（align）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment>
      <oas-avatar slot="avatar" size="32">张</oas-avatar>
      <span slot="author">张三</span>
      <span slot="time">3 分钟前</span>
      <p slot="content" style="margin: 0">默认对齐：时间与操作区靠左（align 缺省即 left）。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
        <oas-button size="small" type="text">点赞</oas-button>
      </span>
    </oas-comment>
    <oas-comment align="right">
      <oas-avatar slot="avatar" size="32">李</oas-avatar>
      <span slot="author">李四</span>
      <span slot="time">10 分钟前</span>
      <p slot="content" style="margin: 0">align="right"：时间右挤、操作区整组靠右。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
        <oas-button size="small" type="text">点赞</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

`align="left" | "right"` 控制时间与操作区的对齐，纯 CSS 实现（逻辑属性，RTL 下自动翻转）。

## 引用与回复目标

<DemoBlock title="quote / reply 插槽（回复 @某人 场景）">
  <div style="width: 100%">
    <oas-comment align="right">
      <oas-avatar slot="avatar" size="32">王</oas-avatar>
      <span slot="author">王五</span>
      <span slot="time">昨天 19:02</span>
      <span slot="reply">回复 <b>@李四</b></span>
      <blockquote slot="quote" style="margin: 0">「这个设计在窄屏下的换行策略可以再讨论一下。」</blockquote>
      <p slot="content" style="margin: 0">同意，补充一个场景：操作区在窄屏换行时也应保持最小间距。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
        <oas-button size="small" type="text">点赞</oas-button>
      </span>
    </oas-comment>
  </div>
</DemoBlock>

`slot="reply"` 展示回复目标（如「回复 @某人」），`slot="quote"` 展示被引用的原文；两者均为次级文本 + 左侧色边的克制样式，空插槽自动隐藏。

## 回复交互

<DemoBlock title="编辑器组合（点回复出输入框）">
  <div style="width: 100%">
    <oas-comment id="comment-editor">
      <oas-avatar slot="avatar" size="32">赵</oas-avatar>
      <span slot="author">赵六</span>
      <span slot="time">1 小时前</span>
      <p slot="content" style="margin: 0">组件自身不管编辑：点「回复」展开输入框，提交后由宿主把子评论插进默认插槽。</p>
      <span slot="actions">
        <oas-button size="small" type="text" id="comment-reply-btn">回复</oas-button>
      </span>
    </oas-comment>
    <div id="comment-editor-form" hidden style="margin-inline-start: 40px; margin-block-start: var(--oas-space-3)">
      <oas-textarea id="comment-editor-input" placeholder="写下你的回复…"></oas-textarea>
      <div style="display: flex; gap: var(--oas-space-2); margin-block-start: var(--oas-space-2); justify-content: flex-end">
        <oas-button size="small" id="comment-editor-cancel">取消</oas-button>
        <oas-button size="small" type="primary" id="comment-editor-submit">提交</oas-button>
      </div>
    </div>
  </div>
</DemoBlock>

演示 `oas-comment` + `oas-textarea` + `oas-button` 的 slot 动态组装：提交后插入的 `<oas-comment>` 走默认插槽，自动缩进并带引导线。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import 须在 onMounted 内：顶层 await import 会在 vitepress 构建期 SSR 求值（Node 无 HTMLElement），页面变空壳
  const { message } = await import('@oas-ui/ui')
  const editor = document.querySelector('#comment-editor')
  const form = document.querySelector('#comment-editor-form')
  const input = document.querySelector('#comment-editor-input')

  // property 赋值/方法调用必须等 upgrade 完成，否则 expando 会遮蔽原型成员
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
        message.warning('回复内容不能为空')
        return
      }
      customElements.whenDefined('oas-comment').then(() => {
        const child = document.createElement('oas-comment')
        child.innerHTML = `
          <oas-avatar slot="avatar" size="32">我</oas-avatar>
          <span slot="author">我</span>
          <span slot="time">刚刚</span>
          <p slot="content" style="margin: 0"></p>
        `
        child.querySelector('p').textContent = text
        editor.appendChild(child)
        form.hidden = true
        message.success('回复已发布')
      })
    })
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 时间与操作区对齐：`left`（默认）/ `right`（逻辑属性实现，RTL 自动翻转） | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 嵌套的 `oas-comment` 子评论，自动缩进缩进 |
| `actions` | 操作区（回复/点赞等，由宿主提供） |
| `author` | 作者名 |
| `avatar` | 作者头像（可放 `oas-avatar`） |
| `content` | 评论内容 |
| `quote` | 引文区（正文前，次级文本色 + 左侧色边） |
| `reply` | 回复目标区（作者行下，「回复 @某人」场景） |
| `time` | 时间 |

部件：`::part(comment)` 根、`::part(main)` 主体、`::part(avatar)` / `::part(author)` / `::part(time)` / `::part(content)` / `::part(actions)`、`::part(children)` 子评论容器。
