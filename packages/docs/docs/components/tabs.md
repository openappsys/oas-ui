# Tabs 标签页

## 基础用法

<div class="demo">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</div>

## API

| 组件 | 属性 | 说明 |
|---|---|---|
| `oas-tabs` | `active` | 激活标签 value |
| `oas-tab-panel` | `label` / `value` | 标签文本 / 值 |

| 事件 | 说明 |
|---|---|
| `oas-change` | 切换，`detail: { value }` |

键盘：左右/上下方向键切换，懒渲染未激活面板。
