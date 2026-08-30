# PageHeader 页头

页面头部信息区，支持标题、副标题、返回按钮、面包屑、正文区与底部操作区，常用于详情页、编辑页顶部。

## 基础用法

<DemoBlock title="标题与副标题">
  <oas-page-header title="订单详情" subtitle="订单号 20260801001"></oas-page-header>
</DemoBlock>

## 带返回按钮

<DemoBlock title="返回按钮">
  <oas-page-header title="用户设置" subtitle="修改账号与安全信息" back></oas-page-header>
</DemoBlock>

## 头像

`avatar` 具名插槽渲染在返回按钮之后、标题块之前（「返回 + 头像 + 标题」通行布局），组合 `oas-avatar` 原组件使用；无内容时区块不渲染。

<DemoBlock title="avatar 插槽">
  <oas-page-header title="张三" subtitle="产品设计师 · 北京" back>
    <oas-avatar slot="avatar">张</oas-avatar>
  </oas-page-header>
</DemoBlock>

## 面包屑

面包屑通过 `slot="breadcrumb"` 放入头部独立行，组合 `oas-breadcrumb` 原组件使用。

<DemoBlock title="breadcrumb 插槽">
  <oas-page-header title="订单详情" subtitle="订单号 20260801001">
    <oas-breadcrumb slot="breadcrumb" separator="›" items='[{"label":"首页","href":"/"},{"label":"订单管理","href":"/orders"},{"label":"订单详情"}]'></oas-breadcrumb>
  </oas-page-header>
</DemoBlock>

## 标题与副标题插槽

标题 / 副标题可用属性提供纯文本，也可用 `slot="title"` / `slot="subtitle"` 承载富内容（图标、徽标、链接等）——插槽有内容时覆盖属性文案。

<DemoBlock title="title / subtitle 插槽">
  <oas-page-header>
    <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      项目概览 <oas-tag color="blue">进行中</oas-tag>
    </span>
    <span slot="subtitle">最后更新：2026-08-30 14:00</span>
  </oas-page-header>
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

## 主体内容区

正文通过默认插槽放入标题行下方；无内容时区块不渲染。

<DemoBlock title="content 默认插槽">
  <oas-page-header title="项目概览" subtitle="项目进度与关键指标">
    <div style="line-height: 1.8; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      项目进入冲刺阶段：前端进度 80%，接口联调中，预计本周五发布 beta 版本。
    </div>
  </oas-page-header>
</DemoBlock>

## 底部操作区

<DemoBlock title="footer 插槽">
  <oas-page-header title="用户设置" subtitle="修改账号与安全信息">
    <div slot="footer" style="display: flex; justify-content: flex-end">
      <oas-space size="small">
        <oas-button size="small">取消</oas-button>
        <oas-button size="small" type="primary">保存</oas-button>
      </oas-space>
    </div>
  </oas-page-header>
</DemoBlock>

## 自定义返回图标

<DemoBlock title="back-icon 插槽">
  <oas-page-header title="文章详情" subtitle="发布于 2026-08-28" back>
    <oas-icon slot="back-icon" name="arrow-left"></oas-icon>
  </oas-page-header>
</DemoBlock>

## 完整组合

面包屑 + 标题行 + 正文 + 底部操作全区块组合。

<DemoBlock title="全区块组合">
  <oas-page-header title="订单详情" subtitle="订单号 20260801001" back>
    <oas-breadcrumb slot="breadcrumb" separator="›" items='[{"label":"首页","href":"/"},{"label":"订单管理","href":"/orders"},{"label":"订单详情"}]'></oas-breadcrumb>
    <oas-space slot="extra" size="small">
      <oas-button size="small">打印</oas-button>
      <oas-button size="small" type="primary">审核通过</oas-button>
    </oas-space>
    <div style="line-height: 1.8; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      订单包含 3 件商品，合计 ¥1,299.00，预计 2026-09-02 送达。收货人：张三，138****5678。
    </div>
    <div slot="footer" style="display: flex; justify-content: flex-end">
      <oas-space size="small">
        <oas-button size="small">驳回</oas-button>
        <oas-button size="small" type="primary">发货</oas-button>
      </oas-space>
    </div>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `back` | 是否显示返回按钮 | `boolean` | — |
| `subtitle` | 副标题文案 | `string` | — |
| `title` | 标题文案 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-back` | 点击返回按钮 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 正文内容（标题行下方正文区，默认插槽；无内容时区块不渲染） |
| `avatar` | 头像（返回按钮之后、标题块之前；组合 oas-avatar 原组件，无内容时不渲染） |
| `back-icon` | 返回按钮图标插槽，有内容时替换内置 chevron（空注释节点按无内容处理） |
| `breadcrumb` | 面包屑（头部独立行，组合 oas-breadcrumb 原组件，无内容时不渲染） |
| `extra` | 右侧操作区 |
| `footer` | 底部操作区（无内容时不渲染） |
| `subtitle` | 副标题富内容插槽，有内容时覆盖 subtitle 属性文案 |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

插槽：正文走默认插槽；`breadcrumb` / `footer` / `content` 区块无内容时不渲染；`title` / `subtitle` / `back-icon` 插槽有内容时覆盖属性/内置图标。返回按钮渲染为原生 `<button aria-label="返回">`。
