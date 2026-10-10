# TitleBar 标题栏

窗口标题栏（应用外壳 chrome）：拖动区 + 居中标题/文档井 + 内建窗口操作 + compact/large 两档。语义在「窗口」，服务 Electron/Tauri 宿主；纯 Web 下拖动属性为无害空操作，组件退化为应用外壳语义（与 `oas-app-bar` 的页面级 `role="banner"` 分工）。

## 基础用法

`title` / `subtitle` 设置居中标题与副标题（文档状态等）；`window-actions` 以逗号分隔声明内建窗口操作钮（`minimize,maximize,close` 子集），点击派发 `oas-window-action`（组件只发事件，宿主接 Electron/Tauri API）。

<DemoBlock title="标题 + 副标题 + 窗口操作">
  <div style="width: 100%">
    <oas-titlebar id="tb-basic" title="项目工作台" subtitle="已保存 · 刚刚" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
  <p id="tb-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点右上窗口操作钮，观察事件反馈（组件不执行窗口操作）。</p>
</DemoBlock>

## 拖动契约（drag）

`drag` 布尔属性把整栏设为窗口拖动区（写 `-webkit-app-region: drag` + `data-tauri-drag-region`，Electron/Tauri 宿主生效）；**枚举式自动 no-drag 常用交互子件**——原生交互元素、内置交互组件（button/input/segmented/toolbar/scope-bar/knob 等）与 `[data-no-drag]` 标记元素都可正常点击，不会被拖动区吞掉；**未枚举的宿主 `oas-*` 子件请自行加 `[data-no-drag]`**（`[data-drag]` 可强制改回拖动）。纯 Web 下为无害空操作。

<DemoBlock title="拖动区内按钮可点（no-drag 自动生效）">
  <div style="width: 100%">
    <oas-titlebar drag title="拖动区演示" window-actions="minimize,maximize,close">
      <oas-button size="small" slot="leading" onclick="message.info('拖动区内按钮点击正常')">点我</oas-button>
      <oas-button size="small" slot="trailing" onclick="message.info('trailing 按钮点击正常')">操作</oas-button>
    </oas-titlebar>
  </div>
</DemoBlock>

## 文档井（editable）

`editable` 布尔属性把标题变成可编辑输入（Enter 或失焦提交，Esc 取消回滚）；提交派发 `oas-title-change`，title 由组件吸收缓存（`title` 是原生全局属性，渲染进标题区后即从宿主移除，防原生 tooltip 重复干扰），宿主经事件同步。编辑中外部重写 `title` 会终止编辑（外部状态优先）。

<DemoBlock title="可编辑文档标题">
  <div style="width: 100%">
    <oas-titlebar id="tb-doc" title="未命名设计稿" subtitle="双击标题改名，Enter 提交" editable></oas-titlebar>
  </div>
  <p id="tb-doc-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">编辑标题后 Enter 提交，观察 oas-title-change 与 title 属性回写。</p>
</DemoBlock>

## 尺寸两档（size）

`size="compact"`（默认，34px）/ `size="large"`（68px）两档栏高；large 下控件保持紧凑（只动栏高）。

<DemoBlock title="compact / large 对照">
  <div style="width: 100%">
    <oas-titlebar title="compact 默认（34px）" window-actions="minimize,maximize,close" style="margin-block-end: var(--oas-space-3)"></oas-titlebar>
    <oas-titlebar title="large（68px，控件保持紧凑）" size="large" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
</DemoBlock>

## 安全区（原生窗口控件防压）

Windows window controls overlay（WCO）等宿主的原生窗口控件可能占据栏体两端：用 `leading-inset` / `trailing-inset` 属性让出对应区段（等价于覆写 `--oas-titlebar-leading-inset` / `--oas-titlebar-trailing-inset` 变量，缺省两侧各 `space-2`（8px），内容不顶边）。WCO 场景可直接消费 `env(titlebar-area-*)` 环境变量（非 WCO 环境回落 `space-2` 无影响）：

```css
oas-titlebar {
  --oas-titlebar-leading-inset: env(titlebar-area-x, 0px);
  --oas-titlebar-trailing-inset: calc(100% - env(titlebar-area-width, 100%) - env(titlebar-area-x, 0px));
}
```

## 插槽

`slot="leading"`（品牌/交通灯）、`slot="center"`（交互内容，覆盖标题/文档井）、`slot="title"`（富标题）、`slot="trailing"`（窗口操作之外的末端内容）。

<DemoBlock title="插槽组合">
  <div style="width: 100%">
    <oas-titlebar window-actions="minimize,maximize,close">
      <span slot="leading" style="display: inline-flex; align-items: center; gap: var(--oas-space-1_5); font-size: var(--oas-font-size-sm); font-weight: 600">OAS Studio</span>
      <div slot="center" style="display: flex; align-items: center; justify-content: center; gap: var(--oas-space-2)">
        <oas-tag>scene-04.oas</oas-tag>
        <oas-tag>已同步</oas-tag>
      </div>
      <oas-button size="small" round icon="gear" aria-label="设置" slot="trailing"></oas-button>
    </oas-titlebar>
  </div>
</DemoBlock>

## RTL

容器 `dir="rtl"` 下组件自动镜像：`data-rtl` 钩子 + 全逻辑属性布局。

<DemoBlock title="RTL 镜像">
  <div dir="rtl" style="width: 100%">
    <oas-titlebar title="لوحة المشروع" subtitle="تم الحفظ" window-actions="minimize,maximize,close"></oas-titlebar>
  </div>
</DemoBlock>

## macOS 交通灯

在 `slot="leading"` 放内建 `oas-traffic-lights`（关闭 / 最小化 / 最大化 三圆点，悬停显符号），配合居中标题即得 macOS 形态；点击派发 `oas-window-action`（与内建 `window-actions` 同一契约）。

<DemoBlock title="macOS 交通灯 + 居中标题">
  <div style="width: 100%">
    <oas-titlebar id="tb-macos" title="Hilton Rome Airport — Photo Studio" drag>
      <oas-traffic-lights slot="leading"></oas-traffic-lights>
    </oas-titlebar>
    <span id="tb-macos-out" style="display: block; margin-top: var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点交通灯查看 oas-window-action 反馈</span>
    <oas-titlebar title="禁用态交通灯" style="margin-top: var(--oas-space-3)">
      <oas-traffic-lights slot="leading" disabled></oas-traffic-lights>
    </oas-titlebar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('tb-basic')
  const basicOut = document.getElementById('tb-basic-out')
  basic?.addEventListener('oas-window-action', (e) => {
    basicOut.textContent = `oas-window-action 已派发：action=${e.detail.action}（组件只发事件，宿主接 Electron/Tauri API）`
  })
  const doc = document.getElementById('tb-doc')
  const docOut = document.getElementById('tb-doc-out')
  doc?.addEventListener('oas-title-change', (e) => {
    docOut.textContent = `oas-title-change 已派发：title=${e.detail.title}（title 已吸收进组件缓存，宿主经事件同步）`
  })
  const macos = document.getElementById('tb-macos')
  const macosOut = document.getElementById('tb-macos-out')
  macos?.addEventListener('oas-window-action', (e) => {
    macosOut.textContent = `oas-window-action 已派发：action=${e.detail.action}（交通灯与 window-actions 同一契约）`
  })
})
</script>

## API

### oas-titlebar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `drag` | 整栏设为窗口拖动区（写 -webkit-app-region: drag + data-tauri-drag-region，Electron/Tauri 宿主生效；纯 Web 下无害空操作）；枚举式自动 no-drag 常用交互子件，未枚举的宿主子件用 [data-no-drag] 显式退出，[data-drag] 可强制改回 | `boolean` | — |
| `editable` | 文档井标题可编辑：Enter 或失焦提交（派发 oas-title-change 并更新吸收缓存），Esc 取消回滚；编辑中外部重写 title 即终止编辑 | `boolean` | — |
| `leading-inset` | 安全区：leading 端原生控件防压（CSS 长度；亦可直接覆写 --oas-titlebar-leading-inset） | — | — |
| `size` | 高度档：compact（默认，34px）/ large（68px，控件保持紧凑）；非法值回落 compact 并告警一次（同值去重） | `string` | `compact` |
| `subtitle` | 副标题 / 文档状态（已编辑时间等） | `string` | — |
| `title` | 居中标题文本（slot="title" 有内容时覆盖）。原生全局属性同名——渲染进标题区后即从宿主吸收移除（防原生 tooltip 重复干扰），渲染由组件内缓存驱动；清空/重设请显式写 title 属性 | `string` | — |
| `trailing-inset` | 安全区：trailing 端原生控件防压（CSS 长度；亦可直接覆写 --oas-titlebar-trailing-inset） | — | — |
| `window-actions` | 内建窗口操作钮子集（逗号分隔：minimize,maximize,close）；点击派发 oas-window-action，组件不执行窗口操作 | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-title-change` | 文档井提交（Enter/失焦）且值有变化时派发；detail { title }，吸收缓存同步更新（title 属性不常驻宿主） |
| `oas-window-action` | 点击内建窗口操作钮时派发；detail { action }（minimize/maximize/close）；组件只发事件，宿主接 Electron/Tauri API |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `center` | 中央交互内容通道（有内容时覆盖标题/文档井，如文档标签组合） |
| `leading` | 标题前置自定义区（品牌 / macOS 交通灯由宿主传入） |
| `title` | 标题富内容通道（覆盖 title 属性文本） |
| `trailing` | 末端自定义区（窗口操作钮之外） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-titlebar-bg` | `color-mix(in srgb, var(--oas-color-text-primary) 5%, var(--oas-color-bg))` |
| `--oas-titlebar-height` | `var(--oas-titlebar-compact-height, 34px)` |
| `--oas-titlebar-leading-inset` | `var(--oas-space-2)` |
| `--oas-titlebar-trailing-inset` | `var(--oas-space-2)` |

### oas-traffic-lights

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 全禁：三点均不可点（原生 disabled + 半透明） | `boolean` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-window-action` | 点击交通灯时派发；detail { action }（minimize/maximize/close）；组件只发事件，宿主接 Electron/Tauri API |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-traffic-lights-close` | `#ff5f57` |
| `--oas-traffic-lights-gap` | `8px` |
| `--oas-traffic-lights-maximize` | `#28c840` |
| `--oas-traffic-lights-minimize` | `#febc2e` |
| `--oas-traffic-lights-size` | `12px` |
| `--oas-traffic-lights-symbol` | `rgba(0, 0, 0, 0.55)` |

<style>
.vp-doc .demo-block oas-titlebar {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
</style>
