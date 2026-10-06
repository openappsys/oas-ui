# Barcode 条码

基于**纯 TypeScript 零依赖编码器**（自研）的一维条码组件，第一期覆盖 6 码制（CODE128 / EAN-13 / EAN-8 / UPC-A / CODE39 / ITF-14），输出内联 SVG，可扫码、可下载。

## 基础用法

<DemoBlock title="基础条码">
  <oas-barcode value="OAS-UI-2026" aria-label="物流单号条码"></oas-barcode>
</DemoBlock>

`value` 支持任意文本（CODE128 auto 子集自动切换）；**整体宽度由内容决定**（位数 × 码制 × `bar-width` + 静区）——组件不设 `size`/`width` 属性，这是与二维码组件最大的 API 差异。

## 码制

<DemoBlock title="第一期 6 码制">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="LOG-2026-0042" format="code128" aria-label="CODE128 条码"></oas-barcode>
    <oas-barcode value="4006381333931" format="ean13" aria-label="EAN-13 商品条码"></oas-barcode>
    <oas-barcode value="96385074" format="ean8" aria-label="EAN-8 商品条码"></oas-barcode>
    <oas-barcode value="036000291452" format="upca" aria-label="UPC-A 商品条码"></oas-barcode>
    <oas-barcode value="ASSET-0093" format="code39" aria-label="CODE39 资产条码"></oas-barcode>
    <oas-barcode value="10614141000415" format="itf14" aria-label="ITF-14 箱码"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>format</code>：<code>code128</code>（默认，auto A/B/C）/ <code>ean13</code> / <code>ean8</code> / <code>upca</code> / <code>code39</code> / <code>itf14</code>，非法值回退 code128。EAN/UPC 系给 12/7/11/13 位数据时**自动补算校验位**，给全码则校验末位合法性；EAN-13 首位数字与 UPC-A 首末位按标准渲染在护条外侧，护条向下延伸。CODE39 自动大写化；ITF-14 为固定 13+1 位箱码。
  </p>
</DemoBlock>

## 条宽与高度

<DemoBlock title="bar-width / height">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" bar-width="1" height="80" aria-label="细条条码"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bar-width="2" aria-label="默认条码"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bar-width="3" height="120" aria-label="粗条条码"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>bar-width</code> 是可扫性的第一参数（X-dimension，默认 2，下限 1）；<code>height</code> 只控制条高（默认 100，不含文字区）。缩短条高会降低扫码枪首读率，打印标签建议保持默认。
  </p>
</DemoBlock>

## 人读文字（HRI）

<DemoBlock title="display-value / text-position / 字号与间距">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="4006381333931" format="ean13" aria-label="默认人读文字条码"></oas-barcode>
    <oas-barcode value="4006381333931" format="ean13" text-position="top" font-size="14" text-margin="6" aria-label="文字在顶部的条码"></oas-barcode>
    <oas-barcode value="PURE-GRAPHIC" display-value="false" height="64" aria-label="纯图形条码"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>display-value</code> 默认显示人读文字（显式 <code>display-value="false"</code> 关闭）；<code>text-position</code> 为 <code>bottom</code>（默认）/ <code>top</code>；<code>font-size</code>（默认 16）与 <code>text-margin</code>（默认 4）控制文字区几何。文字使用 generic sans——条码标准字体 OCR-B 无自由许可不内嵌，宿主可自行 <code>@font-face</code> 引入后经 <code>::part(text)</code> 覆盖。
  </p>
</DemoBlock>

## 颜色与暗色可扫性

<DemoBlock title="color / bg-color 定制">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" color="#146ae3" aria-label="蓝色条码"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" color="green" aria-label="预设色条码"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bg-color="#fff7e6" color="#ad4e00" margin="30" aria-label="暖底大静区条码"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    条色 <code>color</code> 缺省固定深色 <code>#18181b</code>，支持任意 CSS 色值或 11 个预设名；静区底色 <code>bg-color</code> 默认固定<b>纯白</b>——条码可扫性优先于主题一致性，dark 主题下同样可扫（也可用 <code>--oas-barcode-bg</code> 变量全局覆盖）。<b>对比度警示</b>：红外扫码枪对红色系条不可扫（红 = 白），自定义条色请保持「深条浅底」。
  </p>
</DemoBlock>

## 静区（可扫性硬约束）

<DemoBlock title="margin 静区">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" margin="20" aria-label="默认下限静区条码"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" margin="48" aria-label="加大静区条码"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>margin</code> 是左右静区（px，默认 10）。扫码枪要求条码两侧有足够空白，否则拒读——组件内建护栏：<b>显式值低于 <code>10 × bar-width</code> 时收敛到下限并 console.warn 一次</b>（默认值不参与收敛），宿主可加大、不可破坏。
  </p>
</DemoBlock>

## 非法输入反馈

<DemoBlock title="oas-invalid 事件（错误占位 + 事件接管）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-input id="barcode-invalid-input" value="4006381333931" style="width: 220px" aria-label="商品条码输入"></oas-input>
    <oas-button id="barcode-invalid-btn" size="small">生成条码</oas-button>
    <oas-barcode id="barcode-invalid-demo" value="4006381333931" format="ean13" aria-label="待生成的商品条码"></oas-barcode>
  </div>
  <p id="barcode-invalid-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    改成非法内容（如字母、位数不足、校验位错）再点「生成条码」——组件渲染错误占位并派发 oas-invalid。
  </p>
</DemoBlock>

非法输入分三类，`oas-invalid` 事件的 `detail.reason` 逐一对应：<code>charset</code>（字符集不符，如 EAN 传字母）、<code>length</code>（位数不符）、<code>checksum</code>（校验位不符）。宿主可接管提示（demo 中显示原因），组件自身始终渲染错误占位兜底。

## 下载 PNG

<DemoBlock title="download() 离屏 rasterize 下载">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-barcode id="barcode-download" value="4006381333931" format="ean13" aria-label="可下载条码"></oas-barcode>
    <oas-button id="barcode-download-btn" size="small">下载 PNG</oas-button>
    <span id="barcode-download-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击按钮下载 4 倍清晰度 PNG（静区/颜色/文字与屏幕渲染一致）</span>
  </div>
</DemoBlock>

`download()` 把当前条码离屏栅格化为 PNG 触发下载——渲染层保持 SVG-only（矢量 + SSR 快照一致性），不引入常驻 canvas；非法或空值静默返回，不产出不可扫的图。

## 空态

<DemoBlock title="空 value">
  <oas-barcode aria-label="空内容条码"></oas-barcode>
</DemoBlock>

`value` 为空时显示「暂无内容」占位。

## 无障碍

<DemoBlock title="aria-label">
  <oas-barcode value="OAS-UI-2026" aria-label="货位 A-12 条码"></oas-barcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    图形元素 `role="img"`；`aria-label` 属性优先，缺省走 locale 默认文案（中文「条码」/ 英文「Barcode」），可被屏幕阅读器读出。组件无键盘交互（纯展示件，不入 tab 序）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-barcode').then(() => {
    const input = document.getElementById('barcode-invalid-input')
    const demo = document.getElementById('barcode-invalid-demo')
    const out = document.getElementById('barcode-invalid-out')
    const reasons = {
      charset: '字符集不符（EAN-13 只接受数字）',
      length: '位数不符（EAN-13 需要 12 或 13 位）',
      checksum: '校验位不符（末位与计算值不一致）',
    }
    document.getElementById('barcode-invalid-btn')?.addEventListener('click', () => {
      if (!input || !demo) return
      demo.setAttribute('value', input.value || '')
    })
    demo?.addEventListener('oas-invalid', (e) => {
      const reason = e.detail?.reason
      if (out) out.textContent = `oas-invalid 已派发：${reasons[reason] ?? reason}（组件已渲染错误占位）`
    })
    const dl = document.getElementById('barcode-download')
    const dlOut = document.getElementById('barcode-download-out')
    document.getElementById('barcode-download-btn')?.addEventListener('click', () => {
      dl?.download('oas-ui-barcode.png')
      if (dlOut) dlOut.textContent = '已触发下载：oas-ui-barcode.png'
    })
  })
})
</script>

## API

### oas-barcode

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 容器可访问名称，缺省走 i18n | — | — |
| `bar-width` | 条宽 X-dimension（px，默认 2，下限 clamp ≥1） | `string` | `2` |
| `bg-color` | 静区底色（默认白色——扫码器要求浅色静区，dark 主题下保持白底保证可扫；`--oas-barcode-bg` 变量可覆盖） | `string` | — |
| `color` | 条色（默认固定深色 `#18181b`——与固定白底配套保证 dark 可扫；`--oas-barcode-color` 变量或预设名/任意色值覆盖） | `string` | — |
| `display-value` | 人读文字显隐（默认显示；显式 `"false"` 关闭） | `string` | — |
| `font-size` | 人读文字字号（px，默认 16） | `string` | `16` |
| `format` | 码制：`code128`（默认，auto A/B/C 子集自动切换）/ `ean13` / `ean8` / `upca` / `code39` / `itf14`（非法值回退 code128） | `string` | `code128` |
| `height` | 条高（px，默认 100，不含文字区与护条延伸） | `string` | `100` |
| `margin` | 左右静区（px，默认 10）；显式值低于 `10 × bar-width` 时收敛到下限并 console.warn 一次（可扫性护栏） | — | — |
| `text-margin` | 文字与条间距（px，默认 4） | `string` | `4` |
| `text-position` | 人读文字位置：`bottom`（默认）/ `top` | `string` | `bottom` |
| `value` | 条码内容（空值走空态占位） | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-invalid` | 非法输入渲染错误占位时派发，detail { reason }：`charset`（字符集不符）/ `length`（位数不符）/ `checksum`（校验位不符）；同一非法输入只派发一次 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-barcode-bg` | `#ffffff` |
| `--oas-barcode-color` | `#18181b` |
