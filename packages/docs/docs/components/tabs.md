# Tabs 标签页

标签式内容切换，支持键盘方向键导航；未激活面板通过 `hidden` 隐藏。`oas-tabs` + `oas-tab-panel` 配套使用。

## 基础用法

<DemoBlock title="基础用法">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：基础信息展示。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 默认选中

<DemoBlock title="active 指定">
  <oas-tabs active="c">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>默认选中内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 富内容面板

<DemoBlock title="富内容">
  <oas-tabs active="a">
    <oas-tab-panel label="表单" value="a">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-input placeholder="请输入姓名" style="width: 240px"></oas-input>
        <oas-space>
          <oas-button type="primary" size="small">提交</oas-button>
          <oas-button size="small">取消</oas-button>
        </oas-space>
      </oas-space>
    </oas-tab-panel>
    <oas-tab-panel label="列表" value="b">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-tag type="success">已启用</oas-tag>
        <oas-tag>待处理</oas-tag>
      </oas-space>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 卡片式

<DemoBlock title="卡片式标签">
  <oas-tabs type="card" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：卡片式标签带边框，激活标签与面板连通，四边有线。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

通过 `type="card"` 切换为卡片式：每个标签带独立边框，激活标签底边与面板背景同色（连通无断线），整体四边有线包裹。

## 切换事件

<DemoBlock title="oas-change 事件">
  <oas-tabs id="tabs-demo" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<oas-tag type="primary" id="tabs-info">当前激活：a</oas-tag>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tabs = document.getElementById('tabs-demo')
  const info = document.getElementById('tabs-info')
  tabs?.addEventListener('oas-change', (e) => {
    info.textContent = `当前激活：${e.detail.value}`
  })
})
</script>

## API

| 组件            | 属性     | 说明                                               |
| --------------- | -------- | -------------------------------------------------- |
| `oas-tabs`      | `active` | 激活标签的 `value`                                 |
| `oas-tabs`      | `type`   | 样式变体：`line`（下划线，默认）/ `card`（卡片式） |
| `oas-tab-panel` | `label`  | 标签文本                                           |
| `oas-tab-panel` | `value`  | 标签值                                             |

| 事件         | 说明                      |
| ------------ | ------------------------- |
| `oas-change` | 切换，`detail: { value }` |

键盘：聚焦标签列表后 ← / → / ↑ / ↓ 循环切换。`oas-tab-panel` 声明 `hidden` 属性隐藏未激活面板（内容保留在 DOM）。
