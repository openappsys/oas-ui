# ThemeEditor 主题编辑器

实时编辑 `--oas-*` 主题 token，编辑即时写入宿主 CSS 变量，子树实时继承预览。颜色 token 行为「色板 + 文本框」双通道（色板只承载 `#rrggbb`，文本框可编辑 `rgb()`/`oklch()`/`color-mix()` 等任意 CSS 颜色函数且不破坏原值）；数字 token 行为 range 滑块 + number 输入联动。面板顶部支持按 token 名搜索过滤，分组可折叠；内置 compact / comfortable 预设主题与导出 / 导入 / 重置工具。

## 默认 token 集

展示主题默认 token 全集（对应 `@oas-ui/theme` 的语义 token），变量不存在时自动跳过。

<DemoBlock title="默认 token 集">
  <oas-theme-editor id="te-default" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 颜色函数值编辑

颜色 token 行 = 色板 + 文本框双通道：

- 色板只承载可解析为 `#rrggbb` 的值——`rgb()`/`oklch()` 等颜色函数自动转为对应 hex 显示，不再回落黑色
- 文本框始终可编辑原始值（任意 CSS 颜色函数），编辑写回不破坏原值格式
- 无法解析的值（如含 `var()` 的 `color-mix()`）色板置灰禁用，仅文本框可编辑
- 文本框输入非法颜色不写回，并标红提示

<DemoBlock title="颜色函数值编辑">
  <oas-theme-editor id="te-fn"
    token='["--demo-color-rgb","--demo-color-oklch","--demo-color-mix"]'
    style="--demo-color-rgb: rgb(11, 108, 255); --demo-color-oklch: oklch(0.55 0.13 250); --demo-color-mix: color-mix(in srgb, var(--oas-color-primary) 85%, black); max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 与 ConfigProvider 打通

编辑器位于 `<oas-config-provider>` 内部时，写入目标切换为最近 provider 元素——整个子树（含 Shadow DOM）实时继承编辑后的 token。右侧按钮可切换 provider 深色主题，验证编辑值仍覆盖在主题之上。

<DemoBlock title="ConfigProvider 子树实时预览">
  <oas-config-provider id="te-cp" theme="" style="display: block; width: 100%">
    <oas-space style="margin-bottom: var(--oas-space-3)">
      <oas-button type="primary">主色按钮</oas-button>
      <oas-tag type="primary">主色标签</oas-tag>
      <oas-button type="primary" size="small" onclick="teSwitchTheme()">切换深色主题</oas-button>
    </oas-space>
    <oas-theme-editor id="te-in-cp" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
  </oas-config-provider>
</DemoBlock>

## 自定义 token 列表

`token` 属性传 JSON 字符串数组（CSS 变量名），只编辑指定 token；未在当前页面定义的变量自动跳过。

<DemoBlock title="自定义 token">
  <oas-theme-editor token='["--oas-color-primary","--oas-radius-md","--oas-font-size-lg","--oas-does-not-exist"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 数字 token 滑块联动

数字 token 行 = range 滑块 + number 输入框联动（min / max / step 复用 token 定义）：拖动滑块同步数字框并写回，反之亦然；滑块天然受 min/max 钳制。

<DemoBlock title="滑块联动">
  <oas-theme-editor id="te-slider" token='["--oas-control-height-sm","--oas-control-height-md","--oas-space-3","--oas-space-4"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 预设主题

`applyPreset(name)` / `preset` 属性应用内置预设主题，只调尺寸族 token（control-height / space），不动颜色：

- `compact` 紧凑：control-height 各档 -4px、space 各档按比例收缩
- `comfortable` 宽松：control-height 各档 +4px、space 各档按比例放大
- `default`：等价 `reset()`，清除已写入的内联变量

应用后记录进 writtenTokens，`reset()` 一并清除。

<DemoBlock title="预设主题切换">
  <oas-space style="margin-bottom: var(--oas-space-3)">
    <oas-button size="small" type="primary" onclick="tePreset('compact')">紧凑 compact</oas-button>
    <oas-button size="small" onclick="tePreset('comfortable')">宽松 comfortable</oas-button>
    <oas-button size="small" onclick="tePreset('default')">默认 default</oas-button>
    <span id="te-preset-status" style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">未应用</span>
  </oas-space>
  <oas-theme-editor id="te-preset" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 组折叠与搜索

分组用 details/summary 可折叠（默认展开）；面板顶部搜索框按 token 名子串过滤（大小写不敏感），过滤时组自动展开、无匹配组隐藏，清空后恢复。

<DemoBlock title="折叠与搜索过滤">
  <oas-theme-editor id="te-search" token='["--oas-color-primary","--oas-color-success","--oas-font-size-sm","--oas-font-size-lg","--oas-space-2","--oas-space-5","--oas-radius-md","--oas-control-height-md"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## 导出 / 导入 / 重置

- `exportJson()` 获取当前 token 集 JSON；`exportCss()` 获取 `:root { ... }` CSS 文本（同源）
- `importJson(json)` 应用 token 集到 themeRoot（非 `--` 开头键忽略 + 告警），就地同步面板不丢焦点
- `reset()` 清除编辑器写入的内联变量，恢复默认主题值

<DemoBlock title="导出 / 导入 / 重置">
  <oas-button size="small" type="primary" onclick="teExport()">导出 JSON</oas-button>
  <oas-button size="small" onclick="teExportCss()">导出 CSS</oas-button>
  <oas-button size="small" onclick="teImport()">导入示例 JSON</oas-button>
  <oas-button size="small" onclick="teReset()">重置编辑器</oas-button>
  <pre id="te-json" style="width: 100%; max-height: 320px; overflow: auto; margin: var(--oas-space-3) 0 0; padding: var(--oas-space-3); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); font-size: var(--oas-font-size-xs); line-height: 1.6">点击按钮查看结果</pre>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.teSwitchTheme = () => {
    const cp = document.getElementById('te-cp')
    if (cp?.getAttribute('theme')) cp.removeAttribute('theme')
    else cp?.setAttribute('theme', 'dark')
  }
  window.teExport = () => {
    const el = document.getElementById('te-default')
    const pre = document.getElementById('te-json')
    pre.textContent = JSON.stringify(el?.exportJson() ?? {}, null, 2)
  }
  window.teExportCss = () => {
    const el = document.getElementById('te-default')
    const pre = document.getElementById('te-json')
    pre.textContent = el?.exportCss() ?? ''
  }
  window.teImport = () => {
    const el = document.getElementById('te-default')
    const data = { '--oas-color-primary': '#7c3aed', '--oas-font-size-md': '15px' }
    el?.importJson(data)
    document.getElementById('te-json').textContent = `已导入：\n` + JSON.stringify(data, null, 2)
  }
  window.teReset = () => {
    document.getElementById('te-default')?.reset()
    document.getElementById('te-in-cp')?.reset()
    document.getElementById('te-preset')?.reset()
    document.getElementById('te-preset-status').textContent = '未应用'
  }
window.tePreset = (name) => {
document.getElementById('te-preset')?.setAttribute('preset', name)
document.getElementById('te-preset-status').textContent = name
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `preset` | 内置预设主题：`compact`（紧凑，control-height -4px、space 按比例收缩）/ `comfortable`（宽松，+4px、space 按比例放大）/ `default`（等价 reset，清除已写入内联变量）；非法值忽略并 dev 告警 | — | — |
| `token` | 自定义要编辑的 token 列表（CSS 变量名） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 编辑任一 token，`detail: { token, value }` |

| 方法             | 说明                                                         |
| ---------------- | ------------------------------------------------------------ |
| `exportJson()`   | 返回当前 token 集 `{ '--oas-*': value }`                     |
| `exportCss()`    | 返回 `:root { --oas-*: value; ... }` CSS 文本（与 exportJson 同源） |
| `importJson(json)` | 应用 token 集到 themeRoot：`{ '--oas-*': value }`，非 `--` 开头键忽略并 dev 告警（同值去重），写入后就地同步面板（不整棵重建、不丢焦点） |
| `applyPreset(name)` | 应用内置预设主题（`compact` / `comfortable` / `default`）；非法名忽略并 dev 告警（同值去重） |
| `reset()`        | 清除编辑器写入宿主的内联 CSS 变量，恢复默认主题值             |

行为：token 从宿主（或最近 `oas-config-provider`）computed style 读取；编辑即时 `style.setProperty` 写回宿主，子树实时继承；位于 config-provider 内部时写入最近 provider（整个子树继承）。颜色行 = 色板 + 文本框双通道：色板只承载可解析为 `#rrggbb` 的值（`rgb()`/`oklch()` 等颜色函数自动转 hex，含 `var()` 的 `color-mix()` 等不可解析值色板置灰禁用）；文本框始终可编辑原始值（任意 CSS 颜色函数），非法输入不写回并标红提示。数字行 = range 滑块 + number 输入联动（min/max/step 由 token 定义），写回保留原单位；空值/非法值不写入不派发。组用 details/summary 可折叠（默认展开），顶部搜索框按 token 名子串过滤。预设主题只调尺寸族 token（control-height / space），应用后记录进 writtenTokens，`reset()` 一并清除。
