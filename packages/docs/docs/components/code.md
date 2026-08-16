# Code 代码块

代码块组件（自研正则 token 高亮，零第三方高亮引擎），支持常见语言基础着色、行号与复制按钮。

## JavaScript

<DemoBlock title="JavaScript 高亮">
  <div style="width: 100%">
    <oas-code language="js" code='const add = (a, b) => {
  return a + b // 求和
}
console.log(add(1, 2))'></oas-code>
  </div>
</DemoBlock>

关键字 / 字符串 / 注释 / 数字 / 函数 / 运算符基础着色。

## TypeScript

<DemoBlock title="TypeScript 高亮">
  <div style="width: 100%">
    <oas-code language="ts" code='interface User {
  id: number
  name: string
}
const user: User = { id: 1, name: "张三" }'></oas-code>
  </div>
</DemoBlock>

## HTML

<DemoBlock title="HTML 高亮">
  <div style="width: 100%">
    <oas-code language="html" code='<div class="card">
  <!-- 卡片标题 -->
  <h2>Hello</h2>
</div>'></oas-code>
  </div>
</DemoBlock>

标签名与属性名分别着色。

## CSS

<DemoBlock title="CSS 高亮">
  <div style="width: 100%">
    <oas-code language="css" code='.card {
  /* 圆角卡片 */
  border-radius: 8px;
  background: #fff;
}'></oas-code>
  </div>
</DemoBlock>

## JSON

<DemoBlock title="JSON 高亮">
  <div style="width: 100%">
    <oas-code language="json" code='{
  "name": "oas-ui",
  "version": 1.6,
  "zeroDep": true
}'></oas-code>
  </div>
</DemoBlock>

## 行号 + 复制

<DemoBlock title="显示行号">
  <div style="width: 100%">
    <oas-code language="js" show-line-number code='function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}'></oas-code>
  </div>
</DemoBlock>

`show-line-number` 显示行号栏；右上角复制按钮（`copyable="false"` 可关闭），点击复制源码并派发 `oas-copy` 事件。

## 复制按钮开关

<DemoBlock title="copyable 复制按钮">
  <div style="width: 100%">
    <oas-code language="js" code='console.log("默认显示复制按钮")'></oas-code>
    <oas-code language="js" copyable="false" code='console.log("copyable=false 隐藏复制按钮")' style="margin-top: var(--oas-space-3)"></oas-code>
  </div>
</DemoBlock>

`copyable` 控制右上角复制按钮（默认 `true`）：设为 `false` 隐藏按钮；点击按钮将源码写入剪贴板并短暂显示「已复制」。

## 未知语言

<DemoBlock title="未知语言按纯文本渲染">
  <div style="width: 100%">
    <oas-code language="unknown-lang" code='这是一段纯文本，不进行任何高亮。'></oas-code>
  </div>
</DemoBlock>

语言未知时按纯文本渲染（已转义），不报错。

## 字号定制

字号默认为外层字号的 0.875 倍（`0.875em`），可用 CSS 变量 `--oas-code-font` 显式定制。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `code` | 源代码原文 | `string` | — |
| `copyable` | 显示复制按钮 | `string` | `true` |
| `language` | 语言：`js`/`ts`/`html`/`css`/`json`，未知按纯文本 | `string` | — |
| `show-line-number` | 显示行号栏 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

### 引擎选型（架构决策）

**自研正则 token 高亮，不引入第三方高亮库**：

1. **零依赖核心卖点**：运行时零第三方依赖；自研正则高亮不引入任何依赖。
2. **覆盖主流语言基础着色**：js/ts/html/css/json 的关键字/字符串/注释/数字/函数/标签/属性着色覆盖大多数文档场景；精确的语法级高亮（多行状态机、上下文感知）属后续增强，届时再评估。
3. **安全**：先转义 HTML 再着色，杜绝注入；未知语言纯文本渲染不报错。
4. 实现为单遍组合正则（互斥捕获组），一次 replace 完成，无二次处理破坏转义实体的问题。
