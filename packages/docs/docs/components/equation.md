# Equation 数学公式

数学公式组件（自研简化 LaTeX 子集，零第三方公式引擎），覆盖高中/大学常用公式：上下标、分数、根号、求和/积分（带上下限）、希腊字母与常用运算符。

## 上下标

<DemoBlock title="上标 / 下标">
  <div style="width: 100%">
    <oas-equation code="x^2 + y_1 = z_{max}"></oas-equation>
  </div>
</DemoBlock>

`^` 上标、`_` 下标，单字符 `x^2` 或花括号 `z_{max}` 均可。

## 分数

<DemoBlock title="分数">
  <div style="width: 100%">
    <oas-equation code="\frac{a}{b} = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"></oas-equation>
  </div>
</DemoBlock>

`\frac{分子}{分母}` 渲染为竖式分数（分子/分母上下堆叠 + 横线）。

## 根号

<DemoBlock title="根号">
  <div style="width: 100%">
    <oas-equation code="\sqrt{x + 1} + \sqrt[3]{y}"></oas-equation>
  </div>
</DemoBlock>

`\sqrt{被开方数}`；可选根指数 `\sqrt[3]{y}`。

## 求和 / 积分

<DemoBlock title="求和 / 积分（带上下限）">
  <div style="width: 100%">
    <oas-equation code="\sum_{i=1}^{n} i = \frac{n(n+1)}{2}"></oas-equation>
    <br /><br />
    <oas-equation code="\int_{0}^{1} x^2 \, dx = \frac{1}{3}"></oas-equation>
  </div>
</DemoBlock>

`\sum_{下限}^{上限}` / `\int_{下限}^{上限}` 自动排版上下限。

## 希腊字母与运算符

<DemoBlock title="希腊字母 + 运算符">
  <div style="width: 100%">
    <oas-equation code="\alpha \cdot \beta = \gamma \times \delta \div \epsilon \leq \pi \approx \infty"></oas-equation>
  </div>
</DemoBlock>

`\alpha` 等希腊字母与 `\times` `\div` `\pm` `\cdot` `\leq` `\geq` `\neq` `\approx` `\infty` 等常用运算符自动映射。

## 未知命令

<DemoBlock title="未知命令按字面显示">
  <div style="width: 100%">
    <oas-equation code="\unknowncmd{x} + y"></oas-equation>
  </div>
</DemoBlock>

未知命令按字面显示，不报错。

## 块级公式

<DemoBlock title="display=block（独立居中行）">
  <div style="width: 100%">
    <oas-equation code="\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}" display="block"></oas-equation>
  </div>
</DemoBlock>

行间公式（独立居中、上下留白）用 <code>display="block"</code>；字号不放大，跟随外层。

## 注入渲染引擎

<DemoBlock title="engine 注入（薄壳委托）">
  <div style="width: 100%">
    <oas-equation id="eq-engine" code="\oint_C x\,dx + y\,dy"></oas-equation>
    <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      注入兼容 TeX 渲染引擎对象（<code>engine</code> property，<code>renderToString</code> 协议）后组件转为薄壳委托渲染——本 demo 用 mock 引擎演示协议（虚线框即引擎产物）。零依赖场景不注入即走自研子集。
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-equation').then(() => {
    const eq = document.querySelector('#eq-engine')
    if (!eq) return
    // mock 引擎：演示 renderToString(code, options) 注入协议（真实场景可换完整 TeX 引擎）
    eq.engine = {
      renderToString: (code) =>
        `<span style="border: 1px dashed var(--oas-color-primary); border-radius: var(--oas-radius-sm); padding: 2px 8px; font-family: serif">⟦ ${code.replace(/</g, '&lt;')} ⟧</span>`,
    }
  })
})
</script>

引擎路径与自研路径的边界：

- **DOM**：引擎产物以 innerHTML 直出（引擎自带类名/字体在其内部生效）；自研路径为 span 堆叠 + CSS 排版。两条路径 aria-label 均为原始 LaTeX。
- **错误态**：均为静默降级——自研未知命令按字面显示；引擎渲染抛错自动回退自研子集渲染，不空白。
- **SSR**：快照只走属性通道（attribute），`engine` 是 property——SSR 输出恒为自研子集渲染；需要引擎 SSR 时宿主在服务端注入同一引擎对象。

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-equation-font` 显式定制（如 `18px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `code` | LaTeX 子集源文本 | `string` | — |
| `display` | 显示模式：`inline`（默认，随文）/ `block`（独立居中块，margin-block 间距） | `string` | — |

### ARIA

容器 `aria-label` = 原始 LaTeX 源文本，屏幕阅读器直接朗读公式源。

### 引擎选型（架构决策）

**自研简化 LaTeX 子集，不引入第三方公式引擎**：

1. **零依赖核心卖点**：运行时零第三方依赖；自研解析器（tokenizer + 递归下降）不引入任何依赖。
2. **子集覆盖常见场景**：上标/下标、分数、根号（含根指数）、求和/积分/连乘（带上下限）、希腊字母、常用运算符，覆盖高中/大学常用公式；完整 LaTeX（矩阵、大型算子、跨行对齐等）属后续增强，届时再评估引入引擎的取舍。
3. **未知命令容错**：未知命令按字面显示不报错，与「未知语言按纯文本」同策略。
4. 渲染为 HTML（span 堆叠 + CSS 排版），样式只用组件库 token，可继承字号/主题。

### 边界

- 文本全部 HTML 转义，杜绝注入
- 空 `code` 渲染空容器，不报错
