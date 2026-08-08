# Collapse 折叠面板

用于将内容收纳在可折叠的面板中，聚焦关键信息。

## 基础用法

<DemoBlock title="可同时展开多个">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="项目信息"><p>包括团队、里程碑与预算等基础信息。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="技术栈"><p>组件库基于 Web Components 标准构建。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="发布计划"><p>按版本迭代，每个版本发布前执行工程纪律清单。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

通过 `active` 控制展开的面板集合（`name` 逗号分隔），默认可同时展开多个。

## 手风琴

<DemoBlock title="手风琴模式">
  <div style="width: 100%">
    <oas-collapse accordion active="a">
      <oas-collapse-item name="a" header="面板一"><p>同一时间仅展开一个面板。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>展开新的面板会自动收起上一个。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="面板三"><p>再次点击已展开面板可全部收起。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 全部收起

<DemoBlock title="默认全部收起">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="面板一"><p>默认状态全部收起。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>点击标题展开。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="展开状态事件">
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

| 组件                | 属性        | 说明                           | 类型    | 默认值  |
| ------------------- | ----------- | ------------------------------ | ------- | ------- |
| `oas-collapse`      | `active`    | 展开项 `name` 集合（逗号分隔） | string  | —       |
| `oas-collapse`      | `accordion` | 手风琴模式，同时仅展开一项     | boolean | `false` |
| `oas-collapse-item` | `name`      | 面板唯一标识                   | string  | —       |
| `oas-collapse-item` | `header`    | 面板标题                       | string  | —       |
| `oas-collapse-item` | `open`      | 是否展开（由容器托管）         | boolean | `false` |

| 事件         | 说明                                         |
| ------------ | -------------------------------------------- |
| `oas-change` | 展开状态变化，`detail: { active: string[] }` |
