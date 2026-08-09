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

## API

### 属性

| 属性   | 说明                  | 类型     | 默认值 |
| ------ | --------------------- | -------- | ------ |
| `code` | LaTeX 子集源文本      | `string` | —      |

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
