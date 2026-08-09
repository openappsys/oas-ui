# ThemeEditor 主题编辑器

实时编辑 `--oas-*` 主题 token：颜色 token 用颜色选择器、数字 token 用数字输入框（去单位显示、写回带原单位），编辑即时写入宿主 CSS 变量，子树实时继承预览。默认按颜色 / 字号 / 间距 / 圆角 / 控件高度分组展示。

## 默认 token 集

展示主题默认 token 全集（对应 `@oas-ui/theme` 的语义 token），变量不存在时自动跳过。

<DemoBlock title="默认 token 集">
  <oas-theme-editor id="te-default" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
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

## 导出与重置

调用 `exportJson()` 获取当前 token 集 JSON；`reset()` 清除编辑器写入的内联变量，恢复默认主题值。

<DemoBlock title="导出主题 JSON / 重置">
  <oas-button size="small" type="primary" onclick="teExport()">导出主题 JSON</oas-button>
  <oas-button size="small" onclick="teReset()">重置编辑器</oas-button>
  <pre id="te-json" style="width: 100%; max-height: 320px; overflow: auto; margin: var(--oas-space-3) 0 0; padding: var(--oas-space-3); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); font-size: var(--oas-font-size-xs); line-height: 1.6">点击「导出主题 JSON」查看结果</pre>
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
  window.teReset = () => {
    document.getElementById('te-default')?.reset()
    document.getElementById('te-in-cp')?.reset()
  }
})
</script>

## API

| 属性    | 说明                                   | 类型       | 默认值     |
| ------- | -------------------------------------- | ---------- | ---------- |
| `token` | 自定义要编辑的 token 列表（CSS 变量名） | `string[]` | 默认全集   |

| 事件       | 说明                                          |
| ---------- | --------------------------------------------- |
| `oas-change` | 编辑任一 token，`detail: { token, value }`      |

| 方法          | 说明                                                       |
| ------------- | ---------------------------------------------------------- |
| `exportJson()` | 返回当前 token 集 `{ '--oas-*': value }`                   |
| `reset()`     | 清除编辑器写入宿主的内联 CSS 变量，恢复默认主题值           |

行为：token 从宿主（或最近 `oas-config-provider`）computed style 读取；编辑即时 `style.setProperty` 写回宿主，子树实时继承；位于 config-provider 内部时写入最近 provider（整个子树继承）。颜色输入只接受十六进制 `#rrggbb`，非十六进制当前值仅展示不进入取色器；数字输入空值/非法值不写入不派发。
