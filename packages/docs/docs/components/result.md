# Result 结果页

操作结果反馈页，支持成功、失败、警告、信息与 403/404/500 错误页状态，标题/描述双通道、内容区、自定义图标与尺寸档位。

## 基础用法

<DemoBlock title="基础用法">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付"></oas-result>
</DemoBlock>

## 四种状态

成功、失败、警告、信息四状态各配原创圆形底色 SVG 图标，状态色走语义 token（含暗色变体）。

<DemoBlock title="四种状态">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-result status="success" title="操作成功" description="处理已完成"></oas-result>
    <oas-result status="error" title="操作失败" description="处理过程中出现问题"></oas-result>
    <oas-result status="warning" title="存在警告" description="部分操作未能完成"></oas-result>
    <oas-result status="info" title="信息提示" description="这是一条说明信息"></oas-result>
  </oas-space>
</DemoBlock>

## HTTP 错误页（403 / 404 / 500）

`status` 支持 403 / 404 / 500 三种 HTTP 错误页场景，各配原创语义字形（挂锁 / 问号 / 服务器），状态色映射：403→warning、404→primary、500→danger。

<DemoBlock title="403 无权限">
  <oas-result status="403" title="403" description="抱歉，您没有权限访问该页面">
    <oas-button slot="extra" type="primary">返回首页</oas-button>
    <oas-button slot="extra">联系管理员</oas-button>
  </oas-result>
</DemoBlock>

<DemoBlock title="404 页面不存在">
  <oas-result status="404" title="404" description="抱歉，您访问的页面不存在或已被移除">
    <oas-button slot="extra" type="primary">返回首页</oas-button>
  </oas-result>
</DemoBlock>

<DemoBlock title="500 服务器错误">
  <oas-result status="500" title="500" description="服务器开小差了，请稍后重试">
    <oas-button slot="extra" type="primary">刷新重试</oas-button>
  </oas-result>
</DemoBlock>

## 描述富内容

`description` 属性外的富内容走 `slot="description"`，有内容时覆盖属性文案。

<DemoBlock title="描述富内容（slot=description）">
  <oas-result status="info" title="系统维护通知">
    <span slot="description">维护窗口：今晚 <oas-tag size="small">22:00 – 24:00</oas-tag>，期间部分服务可能短暂不可用。</span>
  </oas-result>
</DemoBlock>

## 内容区（错误详情清单）

默认插槽为内容区，置于描述与操作区之间，适合列出错误详情清单。

<DemoBlock title="内容区（错误详情清单）">
  <oas-result status="error" title="提交失败" description="请修正以下问题后重新提交">
    <ul>
      <li>收货人姓名不能为空</li>
      <li>手机号格式不正确</li>
      <li>发票抬头与税号不匹配</li>
    </ul>
    <oas-button slot="extra" type="primary">返回修改</oas-button>
  </oas-result>
</DemoBlock>

## 自定义图标

`slot="icon"` 传入自定义图标后进入中性态（去掉语义底色与状态色，图标完全自定），用于品牌化或特殊语义场景。

<DemoBlock title="自定义图标（slot=icon）">
  <oas-result title="已进入审核队列" description="我们将在 1 个工作日内完成审核">
    <svg slot="icon" viewBox="0 0 16 16" width="72" height="72" fill="none" stroke="var(--oas-color-primary)" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6.5 7.5 L7.8 8.8 L10 5.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <oas-button slot="extra" type="primary">查看审核进度</oas-button>
  </oas-result>
</DemoBlock>

## 尺寸档位

`size` 提供 small / medium / large 三档（默认 medium），联动图标直径与文字档位。

<DemoBlock title="尺寸档位">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-result status="success" size="small" title="紧凑"></oas-result>
    <oas-result status="success" size="medium" title="默认"></oas-result>
    <oas-result status="success" size="large" title="宽松"></oas-result>
  </oas-space>
</DemoBlock>

## 标题富内容

`slot="title"` 可传富内容（如大字状态码 + 说明的组合排版），覆盖 `title` 属性。

<DemoBlock title="标题富内容（slot=title）">
  <oas-result status="error" description="连接已断开">
    <span slot="title" style="font-size: 40px; line-height: 1.2">无法连接服务器</span>
  </oas-result>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `description` | 描述文案 | `string` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large`：联动图标直径与字号 | `string` | `medium` |
| `status` | 状态：`success` / `error` / `warning` / `info` / `403` / `404` / `500`（HTTP 错误页三态含专属图标）；非法值回落 info 并告警 | `string` | `success` |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 内容区（错误详情清单等），置于描述与 extra 操作区之间 |
| `description` | 描述富内容插槽，有内容时覆盖 description 属性文案 |
| `extra` | 操作区，置于描述下方 |
| `icon` | 自定义图标（覆盖内置状态图标；有内容时进中性态：去语义底色） |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |
