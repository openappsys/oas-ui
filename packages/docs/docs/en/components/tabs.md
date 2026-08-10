# Tabs

Tab-based content switching with arrow-key navigation; inactive panels are hidden via the `hidden` attribute. Use `oas-tabs` together with `oas-tab-panel`.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：基础信息展示。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Default selection

<DemoBlock title="Specify active">
  <oas-tabs active="c">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>默认选中内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Rich content panels

<DemoBlock title="Rich content">
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

## Card style

<DemoBlock title="Card-style tabs">
  <oas-tabs type="card" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：卡片式标签带边框，激活标签与面板连通，四边有线。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

Switch to the card style with `type="card"`: every tab has its own border, the active tab's bottom edge shares the panel's background color (connected without a break), and the whole is wrapped by a continuous four-side border.

## Switch event

<DemoBlock title="oas-change event">
  <oas-tabs id="tabs-demo" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<oas-tag type="primary" id="tabs-info">当前激活：a</oas-tag>

## Closable

`closable`: each tab shows a close × on the right (`span[tabindex="-1"]`, named for screen readers via `aria-label`, triggered by Enter / Space). Clicking × fires `oas-close` with `detail: { key }`; the component does not remove the panel automatically — the host removes it (the tab bar then refreshes incrementally).

<DemoBlock title="Closable tabs">
  <oas-tabs id="tabs-closable" closable active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

> Closing an inactive tab: the tab disappears immediately (visible feedback). Closing the active tab: it automatically switches to the first remaining tab and shows a message.

## Badges

The `badge` attribute of `oas-tab-panel` renders a badge (number or text) next to the tab title.

<DemoBlock title="Tabs with badges">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a" badge="3"><p>内容一：徽标展示数量。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b" badge="新"><p>内容二：徽标也可以显示文本。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：无徽标。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Tab position

`tab-position`: `top` (default — tabs in a horizontal row above the content) / `left` (tabs stacked on the left, content on the right) / `right` / `bottom`.

<DemoBlock title="left vertical tabs">
  <oas-tabs tab-position="left" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在左侧，内容在右侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="right vertical tabs">
  <oas-tabs tab-position="right" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在右侧，内容在左侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="bottom tabs">
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

| Component       | Property       | Description                                                        |
| --------------- | -------------- | ------------------------------------------------------------------ |
| `oas-tabs`      | `active`       | The `value` of the active tab                                      |
| `oas-tabs`      | `type`         | Style variant: `line` (underline, default) / `card`                |
| `oas-tabs`      | `closable`     | Shows a close × on every tab; clicking fires `oas-close` (the component does not remove the panel) |
| `oas-tabs`      | `tab-position` | Tab bar position: `top` (default) / `left` / `right` / `bottom`    |
| `oas-tab-panel` | `label`        | Tab text                                                           |
| `oas-tab-panel` | `value`        | Tab value                                                          |
| `oas-tab-panel` | `badge`        | Badge next to the tab title (number or text)                       |

| Event        | Description                                        |
| ------------ | -------------------------------------------------- |
| `oas-change` | Switched, `detail: { value }`                      |
| `oas-close`  | A tab's close × was clicked, `detail: { key }` (`key` is that tab's `value`; the component does not remove the panel) |

Keyboard: after focusing the tab list, `←` / `→` / `↑` / `↓` cycle through tabs; with a close button focused, Enter / Space triggers close. `oas-tab-panel` declares the `hidden` attribute to hide inactive panels (content stays in the DOM).
