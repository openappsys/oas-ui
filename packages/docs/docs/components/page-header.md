# PageHeader 页头

页面头部信息区，支持标题、副标题、返回按钮与右侧操作区，常用于详情页、编辑页顶部。

## 基础用法

<DemoBlock title="标题与副标题">
  <oas-page-header title="订单详情" subtitle="订单号 20260801001"></oas-page-header>
</DemoBlock>

## 带返回按钮

<DemoBlock title="返回按钮">
  <oas-page-header title="用户设置" subtitle="修改账号与安全信息" back></oas-page-header>
</DemoBlock>

## 右侧操作区

<DemoBlock title="extra 插槽">
  <oas-page-header title="项目管理" subtitle="共 12 个项目">
    <oas-space slot="extra" size="small">
      <oas-button size="small">导出</oas-button>
      <oas-button size="small" type="primary">新建项目</oas-button>
    </oas-space>
  </oas-page-header>
</DemoBlock>

## 事件反馈

<DemoBlock title="返回事件">
  <oas-page-header title="文章详情" back onoas-back="message.info('点击了返回')"></oas-page-header>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

| 属性 | 说明 | 类型 |
|---|---|---|
| `title` | 标题文案 | string |
| `subtitle` | 副标题文案 | string |
| `back` | 是否显示返回按钮 | boolean |

| 事件 | 说明 |
|---|---|
| `oas-back` | 点击返回按钮 |

插槽：`extra`（右侧操作区，默认空）。返回按钮渲染为原生 `<button aria-label="返回">`。
