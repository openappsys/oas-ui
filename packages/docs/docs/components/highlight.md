# Highlight 文本高亮

文本命中高亮组件：`text`（原文）+ `highlight`（关键词，空格多词或 JSON 数组）计算命中片段，命中部分渲染为 `<mark>`（配色走主题 token，dark 自动适配）。支持大小写敏感、整词匹配、重音敏感三个开关（缺省均不敏感，重音折叠走 `String.normalize('NFD')` 去组合附加符）。内容重算后派发 `oas-count`（detail `{ count, matches }`）。

## 基础用法

<DemoBlock title="单关键词高亮">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight="quick" style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

## 多关键词

空格分隔多个关键词；或传 JSON 数组（如 `'["fox","dog"]'`）。命中区间重叠时自动合并，不产生嵌套 `<mark>`。

<DemoBlock title="空格分隔多词">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight="quick fox" style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

<DemoBlock title="JSON 数组">
  <oas-highlight text="The quick brown fox jumps over the lazy dog" highlight='["fox","dog"]' style="font-size: var(--oas-font-size-md)"></oas-highlight>
</DemoBlock>

## 大小写 / 整词 / 重音

三个开关缺省均关闭（不敏感）；布尔属性在场即生效。

<DemoBlock title="case-sensitive：大小写敏感">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="Hello world, hello OAS" highlight="hello"></oas-highlight>
    <oas-highlight text="Hello world, hello OAS" highlight="hello" case-sensitive></oas-highlight>
  </div>
</DemoBlock>

<DemoBlock title="whole-word：整词匹配">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="The category contains a cat" highlight="cat"></oas-highlight>
    <oas-highlight text="The category contains a cat" highlight="cat" whole-word></oas-highlight>
  </div>
</DemoBlock>

<DemoBlock title="accent-sensitive：重音敏感（缺省折叠 é ↔ e）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2); font-size: var(--oas-font-size-md)">
    <oas-highlight text="Un café au lait, s'il vous plaît" highlight="cafe plait"></oas-highlight>
    <oas-highlight text="Un café au lait, s'il vous plaît" highlight="cafe plait" accent-sensitive></oas-highlight>
  </div>
</DemoBlock>

`whole-word` 的词边界按 Unicode 字母/数字（含汉字）判定：相邻字符是词字符则不算整词，因此中文关键词被汉字包围时不命中（中文没有空格词边界，属保守正确行为）。

## 命中计数（oas-count）

属性变化触发内容重算后派发 `oas-count`，detail `{ count, matches }`：`count` 为渲染的 `<mark>` 片段数（含 0），`matches` 为实际命中的关键词去重列表。下方 demo 点击按钮切换关键词组，反馈文本实时更新（组件挂载首帧的首次派发早于手动 `addEventListener` 注册，与 DOM 原生事件同步派发语义一致；框架事件绑定不受影响）。

<DemoBlock title="oas-count 事件反馈">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-highlight id="highlight-count-demo" text="Web Components 让组件在框架间复用：组件即平台能力" highlight="组件 复用" style="font-size: var(--oas-font-size-md)"></oas-highlight>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="highlight-count-a" size="small">关键词：组件 复用</oas-button>
      <oas-button id="highlight-count-b" size="small">关键词：框架 平台</oas-button>
      <oas-button id="highlight-count-none" size="small">关键词：不存在</oas-button>
    </div>
    <span id="highlight-count-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## 空态与安全

- 无 `text`、无 `highlight` 或零命中时：原文原样渲染（或渲染空），零 `<mark>`；`oas-count` 仍派发 `count: 0`，宿主可据此展示「无结果」。
- `highlight` 以 `[` 开头时按 JSON 数组解析，解析失败或非数组回退按空白分隔拆词；空串与非字符串项被过滤。
- 原文与关键词一律按纯文本渲染（DOM textContent 通道），HTML 片段不会被解析执行。

## 字号与行内排布

宿主为行内盒（`display: inline`），可自然嵌入段落文本流；字号、行高继承外层排版上下文。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（property 赋值/方法调用必须晚于自定义元素定义）
  customElements.whenDefined('oas-highlight').then(() => {
    const el = document.getElementById('highlight-count-demo')
    const out = document.getElementById('highlight-count-output')
    const show = (count, matches) => {
      if (out) out.textContent = `oas-count → 命中 ${count} 处${matches.length ? `（关键词：${matches.join('、')}）` : ''}`
    }
    el?.addEventListener('oas-count', (e) => show(e.detail.count, e.detail.matches))
    // 切换关键词组：属性变化 → 内容重算 → 派发 oas-count → 反馈文本更新
    document.getElementById('highlight-count-a')?.addEventListener('click', () => el?.setAttribute('highlight', '组件 复用'))
    document.getElementById('highlight-count-b')?.addEventListener('click', () => el?.setAttribute('highlight', '框架 平台'))
    document.getElementById('highlight-count-none')?.addEventListener('click', () => el?.setAttribute('highlight', '不存在'))
  })
})
</script>

## API

### oas-highlight
