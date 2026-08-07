# Pagination 分页

数据分页导航，支持页码省略、前后翻页与自定义相邻页码数。

## 基础用法

<DemoBlock title="基础用法">
  <oas-pagination total="100" page-size="10" current="1"></oas-pagination>
</DemoBlock>

## 页码省略

<DemoBlock title="多页省略">
  <oas-pagination total="500" page-size="10" current="25"></oas-pagination>
</DemoBlock>

## 相邻页码数

<DemoBlock title="siblings 控制">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">siblings="1"（默认）</oas-tag>
    <oas-pagination total="200" page-size="10" current="10"></oas-pagination>
    <oas-tag type="info">siblings="2"</oas-tag>
    <oas-pagination total="200" page-size="10" current="10" siblings="2"></oas-pagination>
  </oas-space>
</DemoBlock>

## 翻页事件

<DemoBlock title="oas-change 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-demo" total="85" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-info">当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

## 边界场景

<DemoBlock title="单页 / 首尾禁用">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">单页数据（翻页按钮均禁用）</oas-tag>
    <oas-pagination total="8" page-size="10"></oas-pagination>
    <oas-tag type="info">首页（‹ 禁用）</oas-tag>
    <oas-pagination total="50" page-size="10" current="1"></oas-pagination>
    <oas-tag type="info">末页（› 禁用）</oas-tag>
    <oas-pagination total="50" page-size="10" current="5"></oas-pagination>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pg = document.getElementById('pagination-demo')
  const info = document.getElementById('pagination-info')
  pg?.addEventListener('oas-change', (e) => {
    const { page } = e.detail
    info.textContent = `当前第 ${page} 页`
    info.setAttribute('type', 'primary')
  })
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `total` | 总条数 | `0` |
| `page-size` | 每页条数 | `10` |
| `current` | 当前页（受控，翻页会更新该属性） | `1` |
| `siblings` | 当前页前后各显示的页码数 | `1` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 翻页，`detail: { page }` |

页码超出范围时自动省略，首尾翻页按钮在边界自动禁用。
