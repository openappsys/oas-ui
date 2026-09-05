# Skeleton 骨架屏

加载时的占位骨架：整组段落组合（头像/标题/行）与单形状占位块（`oas-skeleton-item`）两种用法，支持受控加载切换、三档动效、列表份数、逐行宽度与防闪烁延迟。

## 基础用法

<DemoBlock title="基础用法">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton active avatar title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## 组合

<DemoBlock title="组合">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton avatar title rows="2"></oas-skeleton>
      <oas-skeleton rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## 动效 effect

`effect` 三档：`sheen`（流光扫过）/ `pulse`（呼吸明暗）/ `none`（静态，缺省）。`active` 是流光的布尔快捷开关（兼容保留），`effect` 优先级高于 `active`——显式 `effect="none"` 可以压过 `active`，非法值回落 `active` 判定。

<DemoBlock title="动效三档">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton effect="sheen" title rows="2"></oas-skeleton>
      <oas-skeleton effect="pulse" title rows="2"></oas-skeleton>
      <oas-skeleton effect="none" title rows="2"></oas-skeleton>
      <oas-skeleton active title rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

动画时长与骨架底色/流光高光色可经 CSS 变量穿透定制：`--oas-skeleton-duration`（动画时长）、`--oas-skeleton-color`（底色）、`--oas-skeleton-sheen`（流光高光色）。

## 加载态切换 loading

`loading` 受控切换骨架与真实内容：`loading="true"`（或缺省）渲染骨架，`loading="false"` 渲染默认 slot 里的真实内容。骨架容器内部 `aria-hidden="true"`（纯装饰，读屏静默）；建议宿主在加载区域容器上挂 `aria-busy="true"` 并在完成后移除，为读屏器提供加载状态。

<DemoBlock title="加载态切换">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-switch id="sk-load-switch" checked></oas-switch>
      <div aria-busy="true" role="region" aria-label="详情加载区" style="width: 100%">
        <oas-skeleton id="sk-load" avatar title rows="2" effect="sheen">
          <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
            <div style="font-weight: 600">项目标题</div>
            <div>描述文本：数据加载完成后，默认 slot 里的真实内容替换骨架展示。</div>
          </div>
        </oas-skeleton>
      </div>
    </oas-space>
  </div>
</DemoBlock>

## 防闪烁延迟 delay

`delay`（毫秒）：`loading` 变为 `true` 后延迟展示骨架，延迟窗口内骨架与内容都不渲染——请求在窗口内完成时骨架完全不出现（快速请求不闪骨架）。

<DemoBlock title="防闪烁延迟（delay=500ms）">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-space>
        <oas-button id="sk-delay-fast" size="small">快速请求（150ms）</oas-button>
        <oas-button id="sk-delay-slow" size="small">慢速请求（1.2s）</oas-button>
      </oas-space>
      <div id="sk-delay-out" aria-live="polite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-height: 20px">点击按钮模拟请求</div>
      <oas-skeleton id="sk-delay" avatar title rows="2" delay="500" effect="sheen" loading="false">
        <div style="padding: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">真实内容</div>
      </oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## 列表份数 count

`count` 将整组骨架（头像/标题/行）重复 N 份，适合列表加载占位。

<DemoBlock title="count=3">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton avatar title rows="2" count="3" effect="sheen"></oas-skeleton>
  </div>
</DemoBlock>

## 逐行宽度 widths

`widths` 逗号分隔，按序覆盖每行宽度；未覆盖的行走奇偶交替默认宽（92% / 76%），条目多于行数时多余项忽略。

<DemoBlock title="widths=100%,80%,45%">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton title rows="3" widths="100%,80%,45%" effect="sheen"></oas-skeleton>
  </div>
</DemoBlock>

## 单形状占位 oas-skeleton-item

`oas-skeleton-item` 渲染单个形状占位块，与整组组合用法互补：多块自由组合出卡片、表格、表单等任意布局。`type` 七档：`text`（文本行，缺省）/ `title`（标题）/ `avatar`（圆形头像）/ `button`（按钮同形）/ `input`（输入框同形）/ `image`（图片块）/ `rect`（通用矩形）。

<DemoBlock title="七种类型">
  <div style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="avatar" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="title" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="button" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="image" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="rect" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

`width` / `height` 为自由 CSS 值，内联覆盖各 `type` 的默认尺寸；`effect` 与 `oas-skeleton` 语义一致（独立使用时自控，缺省 `none`）。

<DemoBlock title="自定义尺寸">
  <div style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="image" width="240px" height="120px" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="rect" width="120px" height="12px" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" width="45%" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

### 组合配方

卡片占位（头像 + 标题 + 两行文本）：

<DemoBlock title="卡片">
  <div aria-busy="true" role="region" aria-label="卡片加载中" style="width: 100%; max-width: 360px; display: flex; gap: var(--oas-space-3); align-items: flex-start">
    <oas-skeleton-item type="avatar" effect="sheen" style="width: auto; flex: none"></oas-skeleton-item>
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--oas-space-2)">
      <oas-skeleton-item type="title" width="70%" effect="sheen"></oas-skeleton-item>
      <oas-skeleton-item type="text" effect="sheen"></oas-skeleton-item>
      <oas-skeleton-item type="text" width="55%" effect="sheen"></oas-skeleton-item>
    </div>
  </div>
</DemoBlock>

表格占位（行 × 列网格）：

<DemoBlock title="表格行">
  <div aria-busy="true" role="region" aria-label="表格加载中" style="width: 100%; max-width: 480px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--oas-space-2)">
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
    <oas-skeleton-item type="text" effect="pulse"></oas-skeleton-item>
  </div>
</DemoBlock>

表单占位（输入框 ×3 + 提交按钮）：

<DemoBlock title="表单">
  <div aria-busy="true" role="region" aria-label="表单加载中" style="width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="input" width="60%" effect="sheen"></oas-skeleton-item>
    <oas-skeleton-item type="button" effect="sheen"></oas-skeleton-item>
  </div>
</DemoBlock>

## 无障碍

骨架与 `oas-skeleton-item` 均为纯装饰占位：内部元素 `aria-hidden="true"`，不向读屏器暴露内容。宿主侧建议：加载区域容器挂 `aria-busy="true"`（数据就绪后移除）并提供可读名称（如 `role="region"` + `aria-label`），让读屏器感知「区域正在更新」而不是逐块播报骨架。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 加载态切换：oas-switch 受控驱动 loading 属性
  const sw = document.getElementById('sk-load-switch')
  const sk = document.getElementById('sk-load')
  const region = document.getElementById('sk-load')?.closest('[aria-busy]')
  sw?.addEventListener('oas-change', (e) => {
    if (!sk) return
    const loading = e.detail.checked
    if (loading) sk.setAttribute('loading', '')
    else sk.setAttribute('loading', 'false')
    if (region) region.setAttribute('aria-busy', String(loading))
  })
  // 防闪烁：快请求（150ms < delay 500ms）骨架不出现；慢请求骨架出现后切回内容
  const fast = document.getElementById('sk-delay-fast')
  const slow = document.getElementById('sk-delay-slow')
  const delaySk = document.getElementById('sk-delay')
  const out = document.getElementById('sk-delay-out')
  let token = 0
  const request = (ms, label) => {
    const cur = ++token
    delaySk?.setAttribute('loading', '')
    if (out) out.textContent = `${label}请求中…`
    setTimeout(() => {
      if (cur !== token) return
      delaySk?.setAttribute('loading', 'false')
      if (out) out.textContent = ms <= 500 ? `${label}完成：骨架未出现（防闪烁生效）` : `${label}完成`
    }, ms)
  }
  fast?.addEventListener('oas-click', () => request(150, '快速'))
  slow?.addEventListener('oas-click', () => request(1200, '慢速'))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 是否启用流光动画 | `boolean` | — |
| `avatar` | 是否显示头像占位 | `boolean` | — |
| `count` | 整组骨架重复份数（列表场景），缺省 1 | `string` | `1` |
| `delay` | 防闪烁延迟（毫秒）：loading 变 true 后延迟展示骨架；窗口内加载完成则骨架不出现；窗口内骨架与内容都不渲染 | `string` | — |
| `effect` | 动效：`sheen`（流光）/ `pulse`（呼吸）/ `none`（静态，缺省）；优先级高于 active（active 保留为 sheen 快捷开关） | `string` | — |
| `loading` | 受控开关：`true`（缺省）渲染骨架，`"false"` 渲染默认插槽的真实内容 | `string` | `true` |
| `rows` | 段落行数 | `string` | `3` |
| `title` | 是否显示标题占位（title 为存在性开关，值本身不渲染；读取后即从宿主移除，不残留原生悬浮提示） | `string` | — |
| `widths` | 逗号分隔的逐行宽度（如 `100%,80%,45%`），内联覆盖 text 行默认宽 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 真实内容出口：loading="false" 时渲染（骨架与内容常驻 shadow DOM，按 loading 切换 hidden） |
