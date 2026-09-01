# Alert 警告提示

内嵌式提示条，用于展示成功、信息、警告或错误信息，支持标题、描述、图标、操作区、关闭动画与多种变体。

## 基础用法

<DemoBlock title="四种类型">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="信息提示">这是一条普通信息</oas-alert>
    <oas-alert type="success" title="成功提示">操作已成功完成</oas-alert>
    <oas-alert type="warning" title="警告提示">请注意保存当前进度</oas-alert>
    <oas-alert type="error" title="错误提示">操作失败，请稍后重试</oas-alert>
  </oas-space>
</DemoBlock>

## 无标题

<DemoBlock title="无标题">
  <oas-alert type="info">仅包含正文内容、不带标题行的提示条。</oas-alert>
</DemoBlock>

## 图标

`icon` 显示 type 对应的默认图标；`slot="icon"` 可传入自定义图标覆盖；`prominent` 将图标放大一档（需与 `icon` 或 `banner` 联动）。

<DemoBlock title="图标（icon）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="信息提示" icon>这是一条带图标的信息提示</oas-alert>
    <oas-alert type="success" title="成功提示" icon>操作已成功完成</oas-alert>
    <oas-alert type="warning" title="警告提示" icon>请注意保存当前进度</oas-alert>
    <oas-alert type="error" title="错误提示" icon>操作失败，请稍后重试</oas-alert>
  </oas-space>
</DemoBlock>

<DemoBlock title="自定义图标（slot=icon）">
  <oas-alert type="info" icon>
    <span slot="icon">🚀</span>
    通过 <code>slot="icon"</code> 替换默认图标，可放任意图标或图片。
  </oas-alert>
</DemoBlock>

<DemoBlock title="大图标（prominent）">
  <oas-alert type="warning" title="磁盘空间不足" icon prominent>
    <span slot="icon">⚠️</span>
    <oas-button size="small" variant="outlined" slot="action" onclick="message.info('已前往清理')">立即清理</oas-button>
    当前可用空间仅剩 1.2GB，请及时清理缓存。
  </oas-alert>
</DemoBlock>

## 描述

`description` 属性或 `slot="description"` 渲染描述行，位于标题与正文之间，可与默认插槽正文并存。

<DemoBlock title="描述（description）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="系统维护通知" description="维护时间为今晚 22:00 - 24:00，期间部分服务可能短暂不可用。">
      请提前保存工作内容，维护完成后系统自动恢复。
    </oas-alert>
    <oas-alert type="warning" icon>
      <span slot="description">这是插槽描述，支持富内容。</span>
      仅使用插槽描述、不带标题的提示条。
    </oas-alert>
  </oas-space>
</DemoBlock>

## 操作区

`slot="action"` 渲染右侧操作区（如查看详情、撤销等按钮），与关闭按钮并存时位于其左侧。

<DemoBlock title="操作区（slot=action）">
  <oas-alert type="warning" title="版本更新可用" closeable>
    <oas-button size="small" type="primary" slot="action" onclick="message.info('开始更新')">立即更新</oas-button>
    <oas-button size="small" slot="action" onclick="message.info('稍后再说')">稍后再说</oas-button>
    检测到新版本 v2.4.0，包含多项性能优化与缺陷修复。
  </oas-alert>
</DemoBlock>

## 变体

`variant` 支持三种形态：`tint`（默认，浅底+描边）/ `filled`（type 色实心+对底文字）/ `outlined`（透明底+type 色描边）。

<DemoBlock title="变体（variant）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="tint 浅底" closeable>默认形态，浅色底 + 同色描边。</oas-alert>
    <oas-alert type="success" title="filled 实心" variant="filled" closeable>type 色实心底，文字自动切换为对底色。</oas-alert>
    <oas-alert type="success" title="outlined 描边" variant="outlined" closeable>透明底 + type 色描边。</oas-alert>
  </oas-space>
</DemoBlock>

## 横幅

`banner` 去掉边框圆角、通栏展示，并默认显示 type 图标（联动 `icon`）；常与 `center` 组合用于页面顶部居中横幅。

<DemoBlock title="横幅（banner + center）">
  <oas-alert type="warning" banner center>
    平台将于周六 00:00 - 06:00 进行系统升级，请提前规划操作时间。
  </oas-alert>
</DemoBlock>

<DemoBlock title="横幅可关闭">
  <oas-alert type="error" banner center closeable>
    检测到异常流量，部分请求已被拦截，请确认账户安全。
  </oas-alert>
</DemoBlock>

## 居中

`center` 让文本区水平居中（标题/描述/正文），常用于 banner 横幅与纯文本提示。

<DemoBlock title="居中（center）">
  <oas-alert type="info" title="温馨提示" center>内容区域水平居中对齐。</oas-alert>
</DemoBlock>

## 可关闭

<DemoBlock title="可关闭">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="可关闭提示" closeable>点击右侧 ✕ 可关闭此提示条</oas-alert>
    <oas-alert type="warning" closeable>未设置标题的关闭型提示</oas-alert>
  </oas-space>
</DemoBlock>

## 关闭动画与受控显隐

关闭时播放淡出过渡，过渡结束派发 `oas-after-close`；`open` 属性为受控显隐（默认开），关闭后组件移除 `open` 并派发 `oas-open-change`，宿主重设 `open` 可重新打开。`prefers-reduced-motion` 下自动跳过过渡直接隐藏。

<DemoBlock title="关闭动画（open 受控重开）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-button id="alert-reopen-btn" type="primary" onclick="document.querySelector('#alert-reopen').setAttribute('open','')">重新打开提示</oas-button>
    <oas-alert id="alert-reopen" type="info" title="可重开的提示" closeable onoas-after-close="message.info('退场动画已结束')">点击右侧 ✕ 关闭，动画结束后可用上方按钮重新打开。</oas-alert>
  </oas-space>
</DemoBlock>

<DemoBlock title="受控显隐（open）">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#alert-ctrl').setAttribute('open','')">打开（设置 open）</oas-button>
    <oas-button onclick="document.querySelector('#alert-ctrl').removeAttribute('open')">关闭（移除 open）</oas-button>
  </oas-space>
  <oas-alert id="alert-ctrl" type="success" title="受控提示" icon>外部按钮直接设置 / 移除 <code>open</code> 控制显隐，同样带退场过渡。</oas-alert>
</DemoBlock>

## 关闭自定义

`close-text` 替换 ✕ 文案（并同步为按钮可访问名称）；`slot="close"` 提供富自定义关闭内容。

<DemoBlock title="关闭自定义（close-text）">
  <oas-alert type="warning" title="自定义关闭文案" closeable close-text="知道了">点击右侧「知道了」关闭。</oas-alert>
</DemoBlock>

<DemoBlock title="关闭自定义（slot=close）">
  <oas-alert type="info" title="富自定义关闭" closeable>
    <oas-icon slot="close" name="close-circle"></oas-icon>
    用图标替换默认 ✕，点击关闭。
  </oas-alert>
</DemoBlock>

## 折叠

`max-line` 数字属性用 CSS line-clamp 截断正文，并提供展开 / 收起按钮切换。

<DemoBlock title="折叠（max-line）">
  <oas-alert type="info" title="更新日志" max-line="2">
    本次更新带来多项改进：全新的主题定制面板、更快的列表渲染、可配置的快捷键系统、以及大量无障碍体验优化。同时修复了若干个已知问题，包括表格在窄屏下的溢出、弹窗在低分辨率下的错位等。更多细节请查看完整更新日志。
  </oas-alert>
</DemoBlock>

## 色条

`border` 属性在对应侧渲染 type 色强调条，取值以空格分隔：`top` / `end` / `bottom` / `start`。

<DemoBlock title="色条（border）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="顶部色条" border="top">强调条渲染在顶部。</oas-alert>
    <oas-alert type="error" title="左侧 + 底部色条" border="start bottom">可同时指定多侧。</oas-alert>
  </oas-space>
</DemoBlock>

## 尺寸

`size` 三档：`small` / `medium`（默认）/ `large`，字号与内边距随之缩放。

<DemoBlock title="尺寸（size）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" size="small" title="小尺寸" icon>紧凑场景使用。</oas-alert>
    <oas-alert type="success" size="medium" title="中尺寸（默认）" icon>常规场景。</oas-alert>
    <oas-alert type="success" size="large" title="大尺寸" icon prominent>重点展示场景。</oas-alert>
  </oas-space>
</DemoBlock>

## 事件反馈

<DemoBlock title="事件反馈">
  <oas-alert type="warning" title="带事件反馈" closeable onoas-close="message.info('已关闭提示')" onoas-open-change="message.info('open=' + $event.detail.open)">关闭时触发 oas-close，显隐切换触发 oas-open-change。</oas-alert>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `banner` | 横幅模式：去边框圆角、通栏展示；联动默认显示图标 | `boolean` | — |
| `border` | 侧边色条：空格分隔多值 top/end/bottom/start（逻辑方向，RTL 自适应），对应侧渲染 type 色强调条 | `string` | — |
| `center` | 文本区水平居中（标题/描述/正文）；常与 banner 组合用于页面顶部公告 | `boolean` | — |
| `close-text` | 关闭按钮文案（替换默认 ✕，如「知道了」）；富自定义用 slot="close" | `string` | — |
| `closeable` | 是否显示关闭按钮 | `boolean` | — |
| `description` | 描述文案（标题下二级文字）；富内容用 slot="description" | `string` | — |
| `icon` | 显示 type 默认图标（信息/成功/警告/错误对应）；slot="icon" 可覆盖 | `boolean` | — |
| `max-line` | 正文最大行数：超出用 CSS line-clamp 截断并显示展开/收起按钮；缺省不折叠 | `string` | `0` |
| `open` | 受控显隐（默认 true）：关闭后组件回写 false 并派发 oas-open-change；宿主重设 true 可重新打开 | `boolean` | — |
| `prominent` | 大图标：图标尺寸放大一档（与 icon 联动） | `boolean` | — |
| `size` | 尺寸档：small/medium/large（默认 medium），字号与内边距随之缩放 | `string` | `medium` |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `type` | 提示类型 | `string` | `info` |
| `variant` | 视觉形态：tint（默认，浅底+同色描边）/ filled（type 色实心+对底文字）/ outlined（透明底+type 色描边） | `string` | `tint` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-after-close` | 关闭退场过渡结束后派发（prefers-reduced-motion 下跳过过渡直接隐藏，仍派发） |
| `oas-close` | 点击关闭按钮后触发，随后组件隐藏 |
| `oas-open-change` | 显隐状态变化时派发，detail { open } |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 正文内容插槽 |
| `action` | 右侧操作区插槽（如「查看详情」「撤销」按钮），与关闭按钮并存时位于其左侧 |
| `close` | 关闭元素富自定义，覆盖 ✕ 与 close-text；aria-label 仍取 close-text/locale |
| `description` | 描述富内容插槽，有内容时覆盖 description 属性文案 |
| `icon` | 图标插槽，覆盖 type 默认图标 |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |
