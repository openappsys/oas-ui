# Pagination 分页

数据分页导航，支持页码省略、前后翻页、自定义相邻页码数、总数展示、每页条数切换与快速跳转。

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

## 总条数

<DemoBlock title="show-total 显示总条数">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">show-total 显示「共 X 条」</oas-tag>
    <oas-pagination total="150" page-size="10" show-total></oas-pagination>
    <oas-tag type="info">不设置则隐藏</oas-tag>
    <oas-pagination total="150" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## 每页条数切换

<DemoBlock title="page-sizes 每页条数下拉">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-sizes" total="150" page-size="10" current="1" page-sizes='[10,20,50]'></oas-pagination>
    <oas-tag type="primary" id="pagination-sizes-info">每页 10 条，当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

切换每页条数后回到第 1 页并派发 `oas-change`，`detail: { page: 1, pageSize }`。

## 快速跳转

<DemoBlock title="show-jumper 跳至指定页">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-jumper" total="150" page-size="10" current="3" show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-jumper-info">当前第 3 页</oas-tag>
  </oas-space>
</DemoBlock>

输入页码后回车跳转（越界自动夹取到合法范围），派发 `oas-change`，`detail: { page, pageSize }`。

## 组合用法

<DemoBlock title="总数 + 每页条数 + 快速跳转">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-full" total="520" page-size="20" current="1" show-total page-sizes='[10,20,50,100]' show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-full-info">每页 20 条，当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

## 翻页事件

<DemoBlock title="oas-change 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-demo" total="85" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-demo-info">当前第 1 页</oas-tag>
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
  const bind = (id, render) => {
    const el = document.getElementById(id)
    const info = document.getElementById(`${id}-info`)
    el?.addEventListener('oas-change', (e) => {
      const { page, pageSize } = e.detail
      render(info, page, pageSize)
      info?.setAttribute('type', 'primary')
    })
  }
  bind('pagination-demo', (info, page) => (info.textContent = `当前第 ${page} 页`))
  bind('pagination-sizes', (info, page, pageSize) => (info.textContent = `每页 ${pageSize} 条，当前第 ${page} 页`))
  bind('pagination-jumper', (info, page, pageSize) => (info.textContent = `当前第 ${page} 页`))
  bind('pagination-full', (info, page, pageSize) => (info.textContent = `每页 ${pageSize} 条，当前第 ${page} 页`))
})
</script>

## API

| 属性          | 说明                                                       | 默认值   |
| ------------- | ---------------------------------------------------------- | -------- |
| `total`       | 总条数                                                     | `0`      |
| `page-size`   | 每页条数                                                   | `10`     |
| `current`     | 当前页（受控，翻页会更新该属性）                           | `1`      |
| `siblings`    | 当前页前后各显示的页码数                                   | `1`      |
| `show-total`  | 显示总条数文案「共 X 条」                                  | 不显示   |
| `page-sizes`  | 每页条数下拉选项（JSON 数组），如 `[10,20,50]`；切换后回到第 1 页 | 不显示下拉 |
| `show-jumper` | 显示「跳至 __ 页」快速跳转输入框（回车跳转，越界夹取）     | 不显示   |

| 事件         | 说明                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| `oas-change` | 翻页 `{ page }`；切换每页条数 `{ page: 1, pageSize }`；快速跳转 `{ page, pageSize }` |

页码超出范围时自动省略，首尾翻页按钮在边界自动禁用。
