# Collapse

Stows content in collapsible panels to keep the focus on key information.

## Basic Usage

<DemoBlock title="Multiple panels open at once">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="项目信息"><p>包括团队、里程碑与预算等基础信息。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="技术栈"><p>组件库基于 Web Components 标准构建。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="发布计划"><p>按版本迭代，每个版本发布前执行工程纪律清单。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`active` controls the set of expanded panels (`name` values comma-separated); by default multiple panels can be open at the same time.

## Accordion

<DemoBlock title="Accordion mode">
  <div style="width: 100%">
    <oas-collapse accordion active="a">
      <oas-collapse-item name="a" header="面板一"><p>同一时间仅展开一个面板。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>展开新的面板会自动收起上一个。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="面板三"><p>再次点击已展开面板可全部收起。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## All Collapsed

<DemoBlock title="All collapsed by default">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="面板一"><p>默认状态全部收起。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>点击标题展开。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Expansion state events">
  <div style="width: 100%">
    <oas-collapse accordion active="a" id="collapse-event">
      <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      当前展开：<span id="collapse-state">a</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#collapse-event')?.addEventListener('oas-change', (e) => {
    const active = e.detail.active
    document.querySelector('#collapse-state').textContent = active.length ? active.join('、') : '（无）'
  })
})
</script>

## API

| Component            | Attribute   | Description                         | Type    | Default |
| -------------------- | ----------- | ----------------------------------- | ------- | ------- |
| `oas-collapse`       | `active`    | Set of expanded panel `name` values (comma-separated) | string  | —       |
| `oas-collapse`       | `accordion` | Accordion mode; only one panel open at a time | boolean | `false` |
| `oas-collapse-item`  | `name`      | Unique identifier of the panel      | string  | —       |
| `oas-collapse-item`  | `header`    | Panel title                         | string  | —       |
| `oas-collapse-item`  | `open`      | Whether it is expanded (managed by the container) | boolean | `false` |

| Event         | Description                                        |
| ------------ | -------------------------------------------------- |
| `oas-change` | Expansion state change, `detail: { active: string[] }` |
