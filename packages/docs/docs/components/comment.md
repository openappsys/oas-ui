---
description: 纯展示的评论块容器，通过插槽组装作者头像、名称、时间、内容与操作区；支持嵌套子评论自动缩进。内置输入行（Enter 提交 / Shift+Enter 换行）与 resolve 态（已解决弱色划线），评论数据一律由宿主持有、写回驱动渲染。
---

# Comment 评论

纯展示的评论块容器，通过插槽组装作者头像、名称、时间、内容与操作区；支持嵌套子评论自动缩进。内置输入行（Enter 提交 / Shift+Enter 换行）与 resolve 态（已解决弱色划线），评论数据一律由宿主持有、写回驱动渲染。

## 基础用法

<DemoBlock title="单条评论">
  <div style="width: 100%">
    <oas-comment inputtable="false">
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
    <oas-comment inputtable="false">
      <oas-avatar slot="avatar" size="32">李</oas-avatar>
      <span slot="author">李四</span>
      <span slot="time">昨天 18:20</span>
      <p slot="content" style="margin: 0">父评论：赞同这个设计，子评论会自动缩进并带引导线。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
      </span>
      <oas-comment inputtable="false">
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

<DemoBlock title="空评论（输入行关闭）">
  <div style="width: 100%">
    <oas-comment inputtable="false"></oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    无任何插槽内容时渲染为空容器，不报错；空插槽对应的区块自动隐藏。内置输入行可用 <code>inputtable="false"</code> 关闭，此处已关闭以免出现孤立输入框。
  </p>
</DemoBlock>

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-comment-font` 显式定制（如 `18px`）。

## 对齐

<DemoBlock title="时间 / 操作区对齐（align）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment inputtable="false">
      <oas-avatar slot="avatar" size="32">张</oas-avatar>
      <span slot="author">张三</span>
      <span slot="time">3 分钟前</span>
      <p slot="content" style="margin: 0">默认对齐：时间与操作区靠左（align 缺省即 left）。</p>
      <span slot="actions">
        <oas-button size="small" type="text">回复</oas-button>
        <oas-button size="small" type="text">点赞</oas-button>
      </span>
    </oas-comment>
    <oas-comment align="right" inputtable="false">
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
    <oas-comment align="right" inputtable="false">
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
    <oas-comment id="comment-editor" inputtable="false">
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

  // ===== 内置输入行 demo：宿主监听 oas-submit 追加数据（数据驱动写回）=====
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
        <oas-avatar slot="avatar" size="32">我</oas-avatar>
        <span slot="author">我</span>
        <span slot="time">刚刚</span>
        <p slot="content" style="margin: 0"></p>
      `
      child.querySelector('p').textContent = text
      box.appendChild(child)
      message.success(`已提交：${text}`)
    })
  })
  // resolve 写回（提交回环容器 + 下方切换 demo 条目共用同一段宿主写回逻辑）
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

## 内置输入行

组件自带输入行（`textarea` + 提交按钮）：**Enter 提交、Shift+Enter 换行**，输入法组合中的 Enter 不触发提交；空文本静默不派发。提交派发 `oas-submit`（detail `{ text }`，bubbles + composed）。

**数据驱动写回范式**：组件不内部追加列表——宿主监听 `oas-submit`，把文本写进自己的数据源，再渲染出新条目（追加进默认插槽）。输入行可用 `inputtable="false"` 关闭（缺省显示）。

<DemoBlock title="提交回环（宿主追加数据）">
  <div style="width: 100%">
    <oas-comment id="comment-composer" resolvable comment-id="topic-1">
      <oas-avatar slot="avatar" size="32">组</oas-avatar>
      <span slot="author">讨论组</span>
      <span slot="time">今日话题</span>
      <p slot="content" style="margin: 0">在下方输入行写点什么都行：Enter 直接提交（数据由本 demo 写回默认插槽），提交出的子评论同样带 resolve 触发钮。</p>
    </oas-comment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    宿主监听 <code>oas-submit</code> 追加一条子评论并 toast 反馈；点击条目的 resolve 钮派发 <code>oas-resolve</code>（detail <code>{ id, resolved }</code>），由宿主写回 <code>resolved</code> 属性。
  </p>
</DemoBlock>

## resolve 态

`resolvable`（布尔在场属性，默认关）显示 resolve / unresolve 触发钮；`resolved`（布尔在场属性）渲染已解决样式——正文划线 + 条目弱色（token 化，暗色自适应），并在作者行显示「已解决」标记。点击触发钮派发 `oas-resolve`（detail `{ id, resolved }`），**组件不内部翻转**：宿主写回数据后同步条目的 `resolved` 属性。

<DemoBlock title="已解决 / 未解决（点击切换，宿主写回）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-comment id="comment-resolve-open" resolvable comment-id="issue-42">
      <oas-avatar slot="avatar" size="32">王</oas-avatar>
      <span slot="author">王五</span>
      <span slot="time">10 分钟前</span>
      <p slot="content" style="margin: 0">未解决：点右侧「标记为已解决」，宿主把 resolved 写回该条目。</p>
    </oas-comment>
    <oas-comment id="comment-resolve-done" resolvable resolved comment-id="issue-41">
      <oas-avatar slot="avatar" size="32">赵</oas-avatar>
      <span slot="author">赵六</span>
      <span slot="time">昨天 18:02</span>
      <p slot="content" style="margin: 0">已解决：正文划线、条目弱色、作者行带「已解决」标记；点「取消解决」可切回。</p>
    </oas-comment>
  </div>
</DemoBlock>

## API

### oas-comment

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 时间与操作区对齐：`left`（默认）/ `right`（逻辑属性实现，RTL 自动翻转） | — | — |
| `comment-id` | 条目 id：随 `oas-resolve` 事件 detail 回传（与 DOM id 解耦，`message-id` 同款家族命名；缺省回传空串） | `string` | — |
| `inputtable` | 内置输入行开关（默认开）：显式 `inputtable="false"` 隐藏输入行。输入行 Enter 提交、Shift+Enter 换行；输入法组合中的 Enter 不提交；空文本静默不派发 | `string` | `true` |
| `resolvable` | resolve 触发钮开关（布尔在场属性，默认关——默认外观零变化）：开启后 actions 行出现 resolve/unresolve 触发钮；actions 插槽为空时该行也因内置钮而显示 | `boolean` | — |
| `resolved` | 已解决态（布尔在场属性）：正文划线 + 条目弱色 + 作者行「已解决」标记（token 化，暗色自适应）。数据驱动——宿主写回数据后同步本属性，组件不内部翻转 | `boolean` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `submit` | `submit(): boolean` | 提交输入行当前文本；空文本 / 输入行隐藏返回 false 且不派发 |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-resolve` | 点击 resolve/unresolve 触发钮后派发。detail { id, resolved }——id 为 `comment-id` 属性值（缺省空串），resolved 为目标解决态（true=标记解决 / false=取消解决）；组件不内部翻转 `resolved`，宿主写回数据后同步条目属性 |
| `oas-submit` | 内置输入行提交（Enter 或提交按钮）后派发。detail { text }——trim 后文本；空文本不派发；组件不内部追加列表，宿主写回数据驱动渲染（数据驱动写回范式） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 嵌套的 `oas-comment` 子评论，自动缩进 |
| `actions` | 操作区（回复/点赞等，由宿主提供） |
| `author` | 作者名 |
| `avatar` | 作者头像（可放 `oas-avatar`） |
| `content` | 评论内容 |
| `quote` | 引文区（正文前，次级文本色 + 左侧色边） |
| `reply` | 回复目标区（作者行下，「回复 @某人」场景） |
| `time` | 时间 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-comment-font` | `inherit` |

部件：`::part(comment)` 根、`::part(main)` 主体、`::part(avatar)`、`::part(body)` 内容列（内含 `::part(head)` 头部行）、`::part(author)` / `::part(time)` / `::part(reply)` / `::part(quote)` / `::part(content)` / `::part(actions)`、`::part(children)` 子评论容器。
