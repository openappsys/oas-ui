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

## 可关闭

`closable`：每个标签右侧显示关闭 ×（span role=button）。点击 × 派发 `oas-close`，`detail: { key }`；组件不自动删除面板，交由宿主移除（移除后标签栏增量刷新）。

<DemoBlock title="可关闭标签">
  <oas-tabs id="tabs-closable" closable active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

> 关闭非激活标签：标签立即消失（可见反馈）。关闭激活标签：自动切到剩余第一个标签，并弹出消息提示。

## 徽标

`oas-tab-panel` 的 `badge` 属性在标签标题旁渲染徽标（数字或文本）。

<DemoBlock title="带徽标的标签">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a" badge="3"><p>内容一：徽标展示数量。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b" badge="新"><p>内容二：徽标也可以显示文本。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：无徽标。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 标签位置

`tab-position`：`top`（默认，标签横向一排、内容在下方）/ `left`（标签纵排左侧、内容在右）/ `right` / `bottom`。

<DemoBlock title="left 纵向标签">
  <oas-tabs tab-position="left" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在左侧，内容在右侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="right 纵向标签">
  <oas-tabs tab-position="right" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在右侧，内容在左侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="bottom 标签在下方">
  <oas-tabs tab-position="bottom" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签横向排列在下方，内容在上方。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  const tabs = document.getElementById('tabs-demo')
  const info = document.getElementById('tabs-info')
  tabs?.addEventListener('oas-change', (e) => {
    info.textContent = `当前激活：${e.detail.value}`
  })

  const closableTabs = document.getElementById('tabs-closable')
  closableTabs?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`关闭标签「${key}」`)
    const target = closableTabs.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = closableTabs.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = closableTabs.querySelector('oas-tab-panel')
      closableTabs.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })
})
</script>

## API

| 组件            | 属性           | 说明                                                              |
| --------------- | -------------- | ----------------------------------------------------------------- |
| `oas-tabs`      | `active`       | 激活标签的 `value`                                                |
| `oas-tabs`      | `type`         | 样式变体：`line`（下划线，默认）/ `card`（卡片式）                |
| `oas-tabs`      | `closable`     | 每个标签显示关闭 ×，点击派发 `oas-close`（组件不自动删除）        |
| `oas-tabs`      | `tab-position` | 标签栏位置：`top`（默认）/ `left` / `right` / `bottom`            |
| `oas-tab-panel` | `label`        | 标签文本                                                          |
| `oas-tab-panel` | `value`        | 标签值                                                            |
| `oas-tab-panel` | `badge`        | 标签标题旁的徽标（数字或文本）                                    |

| 事件         | 说明                         |
| ------------ | ---------------------------- |
| `oas-change` | 切换，`detail: { value }`    |
| `oas-close`  | 点击标签关闭 ×，`detail: { key }`（`key` 为该标签 `value`，组件不自动移除） |

键盘：聚焦标签列表后 ← / → / ↑ / ↓ 循环切换；关闭按钮聚焦后 Enter / Space 触发关闭。`oas-tab-panel` 声明 `hidden` 属性隐藏未激活面板（内容保留在 DOM）。
