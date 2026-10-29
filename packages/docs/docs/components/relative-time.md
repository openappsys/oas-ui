# RelativeTime 相对时间

把 epoch 毫秒 / ISO 8601 / `Date` 渲染为本地化相对时间，内层使用语义化 `<time datetime>`；可选 `auto-refresh` 自动刷新，页面隐藏时暂停。非法或缺失值渲染安全空态，不显示 `NaN` / `Invalid Date`。

## 基础用法

`value` 接受 epoch 毫秒数字串或 ISO 8601；property 通道额外接受 `number` / `Date`（Date 自动写回 ISO attribute）。

纯数字一律按 **epoch 毫秒**解析：`value="2026"` 是 1970-01-01T00:00:02.026Z，不是 2026 年；写年份请用 `2026-01-01` 这类 ISO 8601。

ISO 8601 请带 `Z` 或显式偏移（如 `2026-10-29T12:00:00+08:00`）：无偏移的 `2026-10-29T12:00:00` 按**运行环境本地时区**解析，date-only 的 `2026-10-29` 按 **UTC** 解析；内层 `<time datetime>` 的输出恒为 UTC ISO 8601。

<DemoBlock title="epoch / ISO / Date property">
  <oas-relative-time value="1700000000000" locale="zh-CN"></oas-relative-time>
  <oas-relative-time value="2026-01-01T00:00:00.000Z" locale="zh-CN" numeric="always"></oas-relative-time>
  <oas-relative-time id="relative-time-date" locale="zh-CN"></oas-relative-time>
</DemoBlock>

## 单位与方向

秒 / 分 / 时 / 天 / 月 / 年按固定因子四舍五入，触及下一单位上限即进位（59.5 秒 → 1 分钟、23.5 小时 → 1 天、12 个月 → 1 年）；未来为正、过去为负。

<DemoBlock title="过去与未来（脚本按当前时钟注入 value）">
  <oas-relative-time data-offset="-45" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-300" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-7200" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-259200" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-5184000" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-63072000" numeric="always" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="3600" numeric="always" locale="zh-CN"></oas-relative-time>
</DemoBlock>

## 语义化 `<time>`

有效值时内层 `<time part="time">` 的 `datetime` 与解析后的时刻同步（UTC ISO 8601），适合被爬虫、读屏或宿主脚本读取；`aria-live` 保持 `off`，避免自动刷新干扰读屏。

<DemoBlock title="读取 datetime">
  <oas-relative-time value="2026-10-29T12:00:00.000Z" locale="zh-CN"></oas-relative-time>
</DemoBlock>

## locale 与 numeric

`locale` 优先于最近的 `oas-config-provider`，再回落全局 i18n locale 与 `en-US`——`@oas-ui/i18n` 默认 locale 是 `zh-CN`，`en-US` 只是候选链全部失效时的函数兜底；非法标签（如 `zh_CN`）不抛错。property 与 attribute 同源：`el.locale = 'en-US'` 会写回 `locale` attribute，`null` 移除属性。`numeric="auto"`（默认）交由 `Intl.RelativeTimeFormat` 输出「刚刚 / 昨天」，`numeric="always"` 始终显示数字。

<DemoBlock title="zh-CN / en-US / 非法 locale 回落 / auto 与 always">
  <oas-relative-time data-offset="-300" locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-300" locale="en-US"></oas-relative-time>
  <oas-relative-time data-offset="-86400" locale="zh-CN" numeric="auto"></oas-relative-time>
  <oas-relative-time data-offset="-86400" locale="zh-CN" numeric="always"></oas-relative-time>
  <oas-relative-time data-offset="-300" locale="zh_CN"></oas-relative-time>
</DemoBlock>

## 自动刷新

`auto-refresh` 在场即开启（`"false"` 视为关闭）：秒级单位每秒刷新，其余单位 30 秒节流。页面隐藏时暂停、恢复可见立即重算；断开连接清理定时器与监听，重连恢复。

<DemoBlock title="2 秒钟前开始逐秒刷新 / 关闭自动刷新">
  <oas-relative-time id="relative-time-auto" auto-refresh locale="zh-CN"></oas-relative-time>
  <oas-relative-time data-offset="-30" auto-refresh="false" locale="zh-CN"></oas-relative-time>
</DemoBlock>

## 空态

`value` 缺失或非法时不渲染任何文本，也不输出 `datetime`，不会出现 raw key / `NaN` / `Invalid Date`。

<DemoBlock title="非法值与缺失值">
  <span>非法值：</span><oas-relative-time value="not-a-date"></oas-relative-time><span>｜缺失值：</span><oas-relative-time></oas-relative-time>
</DemoBlock>

## 样式

宿主颜色默认走 `--oas-color-text-secondary`，字号继承外层；可用 `::part(time)` 覆盖颜色与字重。

<style>
.relative-time-accent::part(time) {
  color: var(--oas-color-primary);
  font-weight: 600;
}
</style>

<DemoBlock title="::part(time) 自定义">
  <oas-relative-time class="relative-time-accent" data-offset="-300" numeric="always" locale="zh-CN"></oas-relative-time>
</DemoBlock>

## API

### oas-relative-time

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-refresh` | 按单位节流自动刷新（秒级 1s、其余 30s）；`"false"` 或缺失关闭；页面隐藏暂停、断开清理、重连恢复 | `string` | — |
| `locale` | 相对时间 locale（如 `zh-CN` / `en-US`）；非法或不支持时安全回落 provider → 全局 i18n → `en-US`（全局默认 `zh-CN`，`en-US` 仅为兜底） | `string` | — |
| `numeric` | Intl 数字模式：`auto`（默认，语义化「刚刚 / 昨天」）/ `always`（始终数字）；其他值按 auto | `string` | `auto` |
| `value` | 目标时刻：epoch 毫秒数字串或 ISO 8601（纯数字一律按 epoch 毫秒解析，写年份请用 `2026-01-01`）；无偏移的 ISO 按运行环境本地时区解析、date-only 按 UTC，`datetime` 输出恒为 UTC；property 另接受 `number` / `Date` | `string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `locale` | 相对时间 locale property 通道：写入回写 `locale` attribute、`null` 移除属性（回落 provider → 全局 i18n → `en-US`）；读取返回 attribute 原文（string） | `string \| null` | — |
| `value` | 目标时刻 property 通道：`number` 为 epoch 毫秒、`Date` 自动写回 ISO attribute、`null` 清空（走空态）；读取返回 value attribute 原文（string） | `string \| number \| Date \| null` | — |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 value setter
  customElements.whenDefined('oas-relative-time').then(() => {
    document.querySelectorAll('oas-relative-time[data-offset]').forEach((node) => {
      const offset = Number(node.getAttribute('data-offset')) || 0
      node.value = Date.now() + offset * 1000
    })
    const dateEl = document.getElementById('relative-time-date')
    if (dateEl) dateEl.value = new Date(Date.now() - 5 * 60 * 1000)
    const autoEl = document.getElementById('relative-time-auto')
    if (autoEl) autoEl.value = Date.now() - 2000
  })
})
</script>
