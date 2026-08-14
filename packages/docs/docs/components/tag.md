# Tag 标签

用于标记和分类的小型标签。

## 类型

<DemoBlock title="标签类型">
  <oas-tag>默认</oas-tag>
  <oas-tag type="primary">主色</oas-tag>
  <oas-tag type="success">成功</oas-tag>
  <oas-tag type="warning">警告</oas-tag>
  <oas-tag type="danger">危险</oas-tag>
  <oas-tag type="info">信息</oas-tag>
</DemoBlock>

## 圆角与尺寸

<DemoBlock title="圆角与尺寸">
  <oas-tag round type="primary">胶囊标签</oas-tag>
  <oas-tag size="xs">超小</oas-tag>
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
  <oas-tag size="xl">超大</oas-tag>
</DemoBlock>

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；非法值回落 `medium` 并提示告警。

## 可关闭

点击 × 触发 `oas-close`（cancelable，preventDefault 可阻止移除）。

<DemoBlock title="可关闭标签">
  <oas-tag closable type="success">可关闭</oas-tag>
  <oas-tag closable type="info">点 × 关闭</oas-tag>
  <oas-tag closable type="danger">关闭后消失</oas-tag>
</DemoBlock>

## 胶囊与可点击

`chip`：胶囊圆角 + 紧凑 padding；`clickable`：整签可点，点击/Enter/Space 派发 `oas-click`。

<DemoBlock title="chip 胶囊">
  <oas-tag chip>默认 chip</oas-tag>
  <oas-tag chip type="primary">主色 chip</oas-tag>
  <oas-tag chip type="success">成功 chip</oas-tag>
  <oas-tag chip type="warning">警告 chip</oas-tag>
  <oas-tag chip closable type="info">可关闭 chip</oas-tag>
</DemoBlock>

<DemoBlock title="clickable 可点击">
  <oas-tag clickable chip type="primary">点我派发 oas-click</oas-tag>
  <oas-tag clickable chip type="success">可点 chip</oas-tag>
  <oas-tag clickable type="danger">普通可点标签</oas-tag>
  <oas-tag clickable chip disabled type="warning">禁用不可点</oas-tag>
</DemoBlock>

> chip 态下 `disabled` 不可点（不派发 `oas-click`）不可关（关闭按钮 disabled）。

<script setup>
import { onMounted } from 'vue'
// 「查看代码」用的完整示例代码（script prop）：拖拽与关闭动画的逻辑让使用者一眼看到怎么写
const dragScript = `// 原生 HTML5 拖拽重排：dragstart 记索引 → drop 数组重排 → 重渲染
const wrap = document.getElementById('drag-tags')
let order = ['Vue', 'React', 'Svelte', 'Solid']
let from = -1
const render = () => {
  wrap.innerHTML = order.map((t) => \`<oas-tag closable draggable="true">\${t}</oas-tag>\`).join('')
}
wrap.addEventListener('dragstart', (e) => {
  from = [...wrap.children].indexOf(e.target.closest('oas-tag'))
})
wrap.addEventListener('dragover', (e) => e.preventDefault())
wrap.addEventListener('drop', (e) => {
  e.preventDefault()
  const to = [...wrap.children].indexOf(e.target.closest('oas-tag'))
  if (from >= 0 && to >= 0 && from !== to) {
    order.splice(to, 0, ...order.splice(from, 1))
    render()
  }
})
render()`
const closeAnimScript = `// oas-close 是 cancelable：preventDefault 拦住默认移除，先淡出再 remove
document.getElementById('close-anim').addEventListener('oas-close', (e) => {
  e.preventDefault()
  const tag = e.target
  tag.style.transition = 'opacity 240ms, transform 240ms'
  tag.style.opacity = '0'
  tag.style.transform = 'scale(0.92)'
  setTimeout(() => tag.remove(), 240)
})`
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-close', () => {
    window.message?.info('标签已关闭')
  })
  document.addEventListener('oas-click', (e) => {
    const text = (e.target?.textContent || '标签').trim()
    window.message?.info(`点击了「${text}」`)
  })

  // 拖拽排序 demo：原生 HTML5 drag&drop 重排 closable 签（数组重排后重渲染）
  const dragWrap = document.getElementById('drag-tags')
  if (dragWrap) {
    let dragTags = ['Vue', 'React', 'Svelte', 'Solid']
    const renderDragTags = () => {
      dragWrap.innerHTML = dragTags
        .map((t) => `<oas-tag closable draggable="true">${t}</oas-tag>`)
        .join('')
    }
    let dragIndex = -1
    dragWrap.addEventListener('dragstart', (e) => {
      const tag = e.target.closest('oas-tag')
      dragIndex = tag ? [...dragWrap.children].indexOf(tag) : -1
      if (tag) tag.style.opacity = '0.4'
    })
    dragWrap.addEventListener('dragover', (e) => e.preventDefault())
    dragWrap.addEventListener('drop', (e) => {
      e.preventDefault()
      const target = e.target.closest('oas-tag')
      const to = target ? [...dragWrap.children].indexOf(target) : -1
      if (dragIndex >= 0 && to >= 0 && dragIndex !== to) {
        const [moved] = dragTags.splice(dragIndex, 1)
        dragTags.splice(to, 0, moved)
        renderDragTags()
      }
    })
    dragWrap.addEventListener('dragend', () => {
      dragIndex = -1
      for (const t of dragWrap.children) t.style.opacity = ''
    })
    renderDragTags()
  }

  // 关闭动画 demo：preventDefault + opacity/transform 过渡淡出后移除
  const closeAnim = document.getElementById('close-anim')
  closeAnim?.addEventListener('oas-close', (e) => {
    e.preventDefault()
    const tag = e.target
    tag.style.transition = 'opacity 240ms, transform 240ms'
    tag.style.opacity = '0'
    tag.style.transform = 'scale(0.92)'
    setTimeout(() => tag.remove(), 240)
  })
})
</script>

## 图标标签

默认插槽可放图标——图标 + 文字组合成图标标签。

<DemoBlock title="图标标签">
  <oas-tag type="primary"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>精选</oas-tag>
  <oas-tag type="success"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M6.5 11.5L2.8 7.8l1.2-1.2 2.5 2.5 6-6 1.2 1.2z" fill="currentColor"/></svg>已完成</oas-tag>
  <oas-tag chip type="warning"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>关注</oas-tag>
  <oas-tag chip closable type="info"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>定时</oas-tag>
</DemoBlock>

## 可选中

`checkable` 开启可选中：点击 / Enter / Space 切换 `checked` 并派发 `oas-change`（`detail: { checked }`）；选中态为实心填充。`checkable` 与 `closable` 互斥（关闭按钮隐藏）。

<DemoBlock title="checkable 可选中">
  <oas-tag checkable onoas-change="message.info('「默认」' + (event.detail.checked ? '已选中' : '已取消'))">默认</oas-tag>
  <oas-tag checkable checked type="success" onoas-change="message.info('「成功」' + (event.detail.checked ? '已选中' : '已取消'))">成功</oas-tag>
  <oas-tag checkable chip type="primary" onoas-change="message.info('「胶囊」' + (event.detail.checked ? '已选中' : '已取消'))">胶囊</oas-tag>
  <oas-tag checkable disabled type="warning">禁用不可选</oas-tag>
</DemoBlock>

## 形态

`variant` 提供三种形态：`outlined`（描边）/ `filled`（浅底）/ `solid`（实心）；缺省保持原有类型渲染（`default` 白底灰框、有色 type 浅底、`primary` 实心）。

<DemoBlock title="outlined 描边">
  <oas-tag variant="outlined">默认</oas-tag>
  <oas-tag variant="outlined" type="primary">主色</oas-tag>
  <oas-tag variant="outlined" type="success">成功</oas-tag>
  <oas-tag variant="outlined" type="danger">危险</oas-tag>
</DemoBlock>

<DemoBlock title="filled 浅底">
  <oas-tag variant="filled">默认</oas-tag>
  <oas-tag variant="filled" type="primary">主色</oas-tag>
  <oas-tag variant="filled" type="success">成功</oas-tag>
  <oas-tag variant="filled" type="warning">警告</oas-tag>
</DemoBlock>

<DemoBlock title="solid 实心">
  <oas-tag variant="solid">默认</oas-tag>
  <oas-tag variant="solid" type="primary">主色</oas-tag>
  <oas-tag variant="solid" type="success">成功</oas-tag>
  <oas-tag variant="solid" type="warning">警告</oas-tag>
  <oas-tag variant="solid" type="danger">危险</oas-tag>
</DemoBlock>

## 自定义颜色

`color` 接受任意 CSS 色值，覆盖 `type` 语义色；未指定 `variant` 时按 `filled` 渲染。

<DemoBlock title="color 自定义色">
  <oas-tag color="#7c3aed">紫色</oas-tag>
  <oas-tag color="#0ea5e9" variant="outlined">天蓝描边</oas-tag>
  <oas-tag color="#e11d48" variant="solid">玫红实心</oas-tag>
  <oas-tag color="#16a34a" variant="filled">绿色浅底</oas-tag>
</DemoBlock>

## 图标

`icon` 属性复用 oas-icon 图标集，图标渲染在文字前、尺寸跟随字号。

<DemoBlock title="icon 图标标签">
  <oas-tag icon="star" type="primary">精选</oas-tag>
  <oas-tag icon="check" type="success">已完成</oas-tag>
  <oas-tag icon="clock" chip type="warning">定时</oas-tag>
  <oas-tag icon="mail" chip closable type="info">邮件</oas-tag>
</DemoBlock>

## 链接

`href` 设置后内部渲染为原生链接 `<a>`，`target` 透传打开方式。

<DemoBlock title="href 链接标签">
  <oas-tag href="https://example.com" target="_blank" type="primary">新窗口打开</oas-tag>
  <oas-tag href="https://example.com" variant="outlined">描边链接</oas-tag>
</DemoBlock>

## 超长省略

`max-width` 限制标签内容宽度，超出部分以省略号截断。

<DemoBlock title="max-width 省略">
  <oas-tag max-width="120px" type="primary">这是一段超长的标签文本内容，超出最大宽度后将以省略号截断显示</oas-tag>
  <oas-tag max-width="80px" chip>短标签</oas-tag>
</DemoBlock>

## 预设颜色

`color` 支持按名引用 11 个预设色（`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`，映射 `--oas-preset-*` token，dark 主题自动调亮）；也支持任意 CSS 色值（见上方自定义颜色）。非法预设名按普通色值处理。

<DemoBlock title="预设色 filled">
  <oas-tag color="magenta">magenta</oas-tag>
  <oas-tag color="red">red</oas-tag>
  <oas-tag color="volcano">volcano</oas-tag>
  <oas-tag color="orange">orange</oas-tag>
  <oas-tag color="gold">gold</oas-tag>
  <oas-tag color="lime">lime</oas-tag>
  <oas-tag color="green">green</oas-tag>
  <oas-tag color="cyan">cyan</oas-tag>
  <oas-tag color="blue">blue</oas-tag>
  <oas-tag color="geekblue">geekblue</oas-tag>
  <oas-tag color="purple">purple</oas-tag>
</DemoBlock>

<DemoBlock title="预设色 solid">
  <oas-tag color="magenta" variant="solid">magenta</oas-tag>
  <oas-tag color="red" variant="solid">red</oas-tag>
  <oas-tag color="volcano" variant="solid">volcano</oas-tag>
  <oas-tag color="orange" variant="solid">orange</oas-tag>
  <oas-tag color="gold" variant="solid">gold</oas-tag>
  <oas-tag color="lime" variant="solid">lime</oas-tag>
  <oas-tag color="green" variant="solid">green</oas-tag>
  <oas-tag color="cyan" variant="solid">cyan</oas-tag>
  <oas-tag color="blue" variant="solid">blue</oas-tag>
  <oas-tag color="geekblue" variant="solid">geekblue</oas-tag>
  <oas-tag color="purple" variant="solid">purple</oas-tag>
</DemoBlock>

## 状态点

`dot` 在文字前渲染小圆点（颜色跟随 `type` / `color`）；`processing` 圆点带脉冲动画（`prefers-reduced-motion` 下停用）并隐含 `dot`。

<DemoBlock title="dot 状态点">
  <oas-tag dot>默认</oas-tag>
  <oas-tag dot type="success">已发布</oas-tag>
  <oas-tag dot type="warning">审核中</oas-tag>
  <oas-tag dot color="magenta">自定义色点</oas-tag>
</DemoBlock>

<DemoBlock title="processing 脉冲">
  <oas-tag processing type="primary">处理中</oas-tag>
  <oas-tag processing type="warning">等待中</oas-tag>
  <oas-tag processing type="info" round>轮询中</oas-tag>
</DemoBlock>

## 描边加重与强调

`hit` 用不透明的语义色描边（有 `color` 时跟随自定义色）；`strong` 文字加粗（font-weight 600）。

<DemoBlock title="hit 描边加重">
  <oas-tag hit>默认</oas-tag>
  <oas-tag hit type="primary">主色描边</oas-tag>
  <oas-tag hit color="green">自定义色描边</oas-tag>
  <oas-tag hit variant="outlined">outlined 命中</oas-tag>
</DemoBlock>

<DemoBlock title="strong 加粗">
  <oas-tag strong type="danger">重要标签</oas-tag>
  <oas-tag strong chip type="primary">加粗 chip</oas-tag>
</DemoBlock>

## 多行

`multiline` 允许内容换行显示（高度自适应 + 上下 padding 补偿，移动端长内容场景）；与 `max-width` 同设时不省略，但 `max-width` 仍约束宽度——内容在约束内换行而非截断。

<DemoBlock title="multiline 多行">
  <oas-tag multiline max-width="220px" type="primary">这是一段较长的标签文本，在移动端或窄容器里会自然换行显示，而不是被截断省略</oas-tag>
  <oas-tag multiline max-width="220px" hit>第二段多行说明文字，展示 height auto 与上下 padding 补偿后的排版效果</oas-tag>
</DemoBlock>

## 头像标签

默认插槽放 `oas-avatar`（或 `<img>`）时自动适配：尺寸随 tag 档位、圆形、负 margin 贴左缘。

<DemoBlock title="头像标签">
  <oas-tag chip><oas-avatar>李</oas-avatar>李雷</oas-tag>
  <oas-tag type="primary"><oas-avatar>韩</oas-avatar>韩梅梅</oas-tag>
  <oas-tag size="large"><oas-avatar>王</oas-avatar>王小二</oas-tag>
  <oas-tag chip closable type="success"><oas-avatar>赵</oas-avatar>赵敏</oas-tag>
</DemoBlock>

## 拖拽排序

一组 `closable` 签支持原生 HTML5 拖拽重排（`dragstart` / `dragover` / `drop`，数组重排后重渲染；不依赖三方库）。

<DemoBlock title="拖拽排序" :script="dragScript">
  <div id="drag-tags" style="display: inline-flex; flex-wrap: wrap; gap: 8px;"></div>
</DemoBlock>

## 关闭动画

`oas-close` 是 cancelable 事件：`preventDefault` 后组件不自动移除，可自行做淡出过渡再移除。

<DemoBlock title="关闭动画" :script="closeAnimScript">
  <oas-space id="close-anim" size="small">
    <oas-tag closable type="success">淡出后移除</oas-tag>
    <oas-tag closable type="info">点 × 触发过渡</oas-tag>
    <oas-tag closable type="danger">动画关闭</oas-tag>
  </oas-space>
</DemoBlock>

## 标签组

`oas-tag-group` 把多个 `checkable` 签组合为选值组：单选（`value` 单值）与多选（`multiple` + 逗号分隔 `value`），点击签切换选中并派发 `oas-change`（单选 `detail: { value }` / 多选 `detail: { value: [] }`）；`disabled` 禁用整组。子签自身 `checked` 由组统一接管（受控）。

<DemoBlock title="tag-group 单选">
  <oas-tag-group value="b" onoas-change="message.info('选中：' + event.detail.value)">
    <oas-tag checkable value="a">选项 A</oas-tag>
    <oas-tag checkable value="b">选项 B</oas-tag>
    <oas-tag checkable value="c">选项 C</oas-tag>
  </oas-tag-group>
</DemoBlock>

<DemoBlock title="tag-group 多选">
  <oas-tag-group multiple value="a,c" aria-label="多选标签组" onoas-change="message.info('已选：' + event.detail.value.join('、'))">
    <oas-tag checkable value="a">标签 A</oas-tag>
    <oas-tag checkable value="b">标签 B</oas-tag>
    <oas-tag checkable value="c">标签 C</oas-tag>
  </oas-tag-group>
</DemoBlock>

<DemoBlock title="tag-group disabled">
  <oas-tag-group disabled value="a" aria-label="禁用标签组">
    <oas-tag checkable value="a">禁用 A</oas-tag>
    <oas-tag checkable value="b">禁用 B</oas-tag>
    <oas-tag checkable value="c">禁用 C</oas-tag>
  </oas-tag-group>
</DemoBlock>

## API

### oas-tag

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `checkable` | 可选中：点击 / Enter / Space 切换 `checked` 并派发 `oas-change`；与 `closable` 互斥 | `boolean` | — |
| `checked` | 选中态（`checkable` 时生效） | `boolean` | — |
| `chip` | 胶囊 | `boolean` | — |
| `clickable` | 整签可点 | `boolean` | — |
| `closable` | 可关闭 | `boolean` | — |
| `color` | 自定义颜色：支持 11 个预设名（`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`，映射 `--oas-preset-*` token）或任意 CSS 色值，覆盖 `type` 语义色；未指定 `variant` 时按 `filled` 渲染 | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `dot` | 文字前渲染状态小圆点（8px，颜色跟随 `type` / `color`） | `boolean` | — |
| `hit` | 加重描边：语义色全不透明边框（有 `color` 时跟随自定义色） | `boolean` | — |
| `href` | 链接地址：设置后内部渲染为原生链接 `<a>` | `string` | — |
| `icon` | 图标名（复用 oas-icon 图标集），置于文字前，尺寸跟随字号 | `string` | — |
| `max-width` | 标签内容最大宽度（如 `120px`），超出省略显示；与 `multiline` 同设时不省略，仅约束宽度让内容换行 | `string` | — |
| `multiline` | 多行：内容允许换行（高度自适应 + 上下 padding 补偿）；与 `max-width` 同设时换行而非省略 | `boolean` | — |
| `processing` | 状态点脉冲动画（隐含 `dot`）；`prefers-reduced-motion` 下停用 | `boolean` | — |
| `round` | 圆角 | `boolean` | — |
| `size` | 尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；非法值回落 `medium` 并告警 | `TagSize` | `medium` |
| `strong` | 文字加粗（font-weight 600） | `boolean` | — |
| `target` | 链接打开方式（`_blank` / `_self` 等），配合 `href` | `string` | — |
| `type` | 类型 | `TagType` | `default` |
| `variant` | 形态（与 `type` 正交）：`outlined`（描边）/ `filled`（浅底）/ `solid`（实心）；缺省保持类型默认渲染 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | `checkable` 时选中态切换，`detail: { checked }` |
| `oas-click` | 整签点击（`clickable` 时），detail 含 originalEvent |
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |

| 名称 | 说明 |
| --- | --- |
| 默认 | 标签内容 |

### oas-tag-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 组容器可访问名称（默认走 i18n「标签组」） | — | — |
| `disabled` | 禁用整个组（子签不可切） | `boolean` | — |
| `multiple` | 多选模式（`value` 逗号分隔多个选中值） | `boolean` | — |
| `value` | 选中值：单选为单值，多选用逗号分隔 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中变化。单选 `detail: { value }`；多选 `detail: { value: [] }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | 多个 `<oas-tag checkable value="x">` 子签 |

> 标签组 API 表由生成器输出。
