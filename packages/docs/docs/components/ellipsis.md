# Ellipsis 文本省略

用于长文本的自动省略，支持单行/多行截断，溢出时悬停展示全文 tooltip，也可展开/收起。

## 单行省略

<DemoBlock title="单行省略">
  <div style="width: 100%">
    <oas-ellipsis text="这是一段非常长的文本，用于演示单行省略的效果，超出容器宽度时以省略号截断，悬停文字可以查看完整内容。"></oas-ellipsis>
  </div>
</DemoBlock>

在容器上约束宽度即可触发省略；无溢出时渲染纯文本（不挂任何浮层）。

## 多行省略

<DemoBlock title="多行省略（rows）">
  <div style="width: 100%">
    <oas-ellipsis rows="2" text="这是一段用于演示多行省略的文本，最多显示两行，超出部分以省略号截断。悬停文字可以查看完整内容，调整 rows 可以改变显示行数。"></oas-ellipsis>
  </div>
</DemoBlock>

`rows="2"` 起走 `-webkit-line-clamp`，多行省略时 tooltip 展示全文。

## 展开 / 收起

<DemoBlock title="展开 / 收起（行内链接形态）">
  <div style="width: 100%">
    <oas-ellipsis rows="3" expandable text="这是一段支持展开与收起的文本，默认只显示三行，点击「展开」链接可以查看完整内容，再次点击「收起」恢复省略状态。展开链接与省略号同行尾随（截断点原位嵌入），文本实际溢出时才会出现。"></oas-ellipsis>
  </div>
</DemoBlock>

`expandable` 仅在文本实际溢出时显示「展开/收起」链接（行内形态，同行尾随）；展开后不再省略，`oas-expand` / `oas-collapse` 事件可追踪状态。

## 自定义展开 / 收起文案

<DemoBlock title="expand-text / collapse-text">
  <div style="width: 100%">
    <oas-ellipsis rows="2" expandable expand-text="更多" collapse-text="收起" text="这是一段使用自定义展开收起文案的长文本，移动端信息流场景常用「全文 / 收起」一类文案，通过 expand-text 与 collapse-text 两个属性即可覆盖 locale 缺省文案。"></oas-ellipsis>
  </div>
</DemoBlock>

`expand-text` / `collapse-text` 属性覆盖 locale 缺省的「展开 / 收起」文案。

## 受控展开（expanded）

<DemoBlock title="受控 expanded（属性驱动）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
    <oas-button id="ellipsis-controlled-btn" size="small">外部切换展开</oas-button>
    <oas-ellipsis id="ellipsis-controlled" style="flex: 1; min-width: 200px" rows="2" expandable text="这是一段受控展开的长文本：外部宿主通过增删 expanded 属性驱动开合，组件内部点击也会把状态反射回该属性（双通道同步），配合 oas-expand / oas-collapse 事件宿主可随时感知变化。"></oas-ellipsis>
  </div>
  <p id="ellipsis-controlled-out" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击按钮或文本内链接切换展开态。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-ellipsis').then(() => {
    const el = document.getElementById('ellipsis-controlled')
    const out = document.getElementById('ellipsis-controlled-out')
    document.getElementById('ellipsis-controlled-btn')?.addEventListener('click', () => {
      if (!el) return
      if (el.hasAttribute('expanded')) el.removeAttribute('expanded')
      else el.setAttribute('expanded', '')
      // 属性通道由宿主驱动时不派 oas-expand/oas-collapse（宿主已知），回读属性验证反射
      if (out) out.textContent = `expanded 属性：${el.hasAttribute('expanded')}`
    })
    // 文本内展开/收起链接（组件内部 toggle）才会派发 oas-expand / oas-collapse
    el?.addEventListener('oas-expand', () => {
      if (out) out.textContent = 'oas-expand：已展开（expanded 属性已反射）'
    })
    el?.addEventListener('oas-collapse', () => {
      if (out) out.textContent = 'oas-collapse：已收起（expanded 属性已移除）'
    })
  })
  document.getElementById('ellipsis-overflow')?.addEventListener('oas-overflow', (e) => {
    const out = document.getElementById('ellipsis-overflow-out')
    if (out) out.textContent = `oas-overflow：overflow = ${e.detail.overflow}`
  })
})
</script>

`expanded` 属性在场即展开（宿主强制），缺席则由内部状态驱动；内部切换会反射回属性，宿主增删属性同样驱动开合。

## 溢出状态事件（oas-overflow）

<DemoBlock title="oas-overflow 监听溢出变化">
  <div style="width: 100%">
    <oas-ellipsis id="ellipsis-overflow" text="这是一段用于演示溢出事件的长文本，当容器宽度变化导致溢出状态翻转时，组件会派发 oas-overflow 事件，detail 携带 { overflow }，宿主可据此驱动业务逻辑（如标记未读全称）。"></oas-ellipsis>
  </div>
  <p id="ellipsis-overflow-out" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前未派发事件（初始无溢出）</p>
</DemoBlock>

`oas-overflow` 在溢出状态翻转时派发（`detail: { overflow }`），同值不重复派发；ResizeObserver 重测后的状态翻转同样会触发。

## 省略方向（direction）

<DemoBlock title="start：省略头部，保留尾部">
  <div style="width: 100%">
    <oas-ellipsis direction="start" text="/usr/local/lib/node_modules/@oas-ui/ui/dist/index.js"></oas-ellipsis>
  </div>
  长路径/文件名场景：头部被省略号截断，末尾文件名完整保留（`direction: rtl` + `unicode-bidi: plaintext` 纯 CSS 实现）。
</DemoBlock>

<DemoBlock title="middle：保留首尾，中部省略">
  <div style="width: 100%">
    <oas-ellipsis direction="middle" text="a9f3c2b7d4e8f1a6c3b9d2e7f4a8c1b6d3e9f2a7c4b1d8e6f3a9c2b7d4e1f8a6c3b9d2e7f4a8c1b6d3e9f2"></oas-ellipsis>
  </div>
  哈希/交易 ID 场景：首尾保留可辨认，中部以省略号压缩；悬停可查看完整内容。
</DemoBlock>

`direction` 取值：`tail`（默认，尾部省略）/ `start`（头部省略）/ `middle`（中部省略，仅单行生效，`rows`≥2 时忽略）。

## tooltip 位置（tooltip-placement）

<DemoBlock title="tooltip-placement 透传">
  <div style="width: 100%; display: flex; gap: var(--oas-space-6); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=top（缺省）</p>
      <oas-ellipsis text="这是一段溢出时悬停提示出现在上方（缺省 top）的长文本，宽度受限自动省略。"></oas-ellipsis>
    </div>
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=bottom</p>
      <oas-ellipsis tooltip-placement="bottom" text="这是一段溢出时悬停提示出现在下方（bottom）的长文本，宽度受限自动省略。"></oas-ellipsis>
    </div>
  </div>
</DemoBlock>

`tooltip-placement` 属性把位置透传给内部 `oas-tooltip`（top / bottom / left / right，缺省 top），悬停全文提示按指定方位弹出。

## 关闭 tooltip

<DemoBlock title="关闭 tooltip">
  <div style="width: 100%">
    <oas-ellipsis tooltip="false" text="这是一段关闭了悬停提示的省略文本，超出宽度时只显示省略号，不提供 tooltip。"></oas-ellipsis>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapse-text` | 收起链接文案（行内形态，配合 expandable） | — | — |
| `direction` | 省略方向：`end`（默认尾部）/ `start`（头部）/ `middle`（中部保留首尾，长路径/哈希场景） | `string` | `tail` |
| `expand-text` | 展开链接文案（行内形态，配合 expandable） | — | — |
| `expandable` | 溢出时显示「展开/收起」按钮 | `boolean` | — |
| `expanded` | 受控展开态（属性在场受控；内部切换会反射回该属性） | `boolean` | — |
| `rows` | 显示行数（1 为单行省略，≥2 多行 `-webkit-line-clamp`） | `string` | `1` |
| `text` | 文本内容 | `string` | — |
| `tooltip` | 溢出时悬停展示全文 tooltip | `string` | `true` |
| `tooltip-placement` | 省略提示浮层位置（透传定位引擎，默认 `top`） | `string` | `top` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-collapse` | 收起，`detail: { expanded: false }` |
| `oas-expand` | 展开，`detail: { expanded: true }` |
| `oas-overflow` | 省略状态变化时派发，`detail: { overflow }`（同值不重复派发） |

仅文本**实际溢出**时才会挂载 tooltip / 展开按钮；无溢出时纯文本，断开连接即销毁，零孤儿浮层。
