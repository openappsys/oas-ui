# Equation

A math formula component (self-developed simplified LaTeX subset, zero third-party formula engine) covering common high-school / university formulas: superscripts/subscripts, fractions, square roots, summation/integration (with limits), Greek letters, and common operators.

## Superscripts and Subscripts

<DemoBlock title="Superscript / subscript">
  <div style="width: 100%">
    <oas-equation code="x^2 + y_1 = z_{max}"></oas-equation>
  </div>
</DemoBlock>

`^` superscript, `_` subscript; both single characters `x^2` and braced forms `z_{max}` work.

## Fractions

<DemoBlock title="Fraction">
  <div style="width: 100%">
    <oas-equation code="\frac{a}{b} = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"></oas-equation>
  </div>
</DemoBlock>

`\frac{numerator}{denominator}` renders as a vertical fraction (numerator/denominator stacked with a horizontal line).

## Square Roots

<DemoBlock title="Square root">
  <div style="width: 100%">
    <oas-equation code="\sqrt{x + 1} + \sqrt[3]{y}"></oas-equation>
  </div>
</DemoBlock>

`\sqrt{radicand}`; an optional root index `\sqrt[3]{y}` is supported.

## Summation / Integration

<DemoBlock title="Summation / integration (with limits)">
  <div style="width: 100%">
    <oas-equation code="\sum_{i=1}^{n} i = \frac{n(n+1)}{2}"></oas-equation>
    <br /><br />
    <oas-equation code="\int_{0}^{1} x^2 \, dx = \frac{1}{3}"></oas-equation>
  </div>
</DemoBlock>

`\sum_{lower}^{upper}` / `\int_{lower}^{upper}` automatically typesets the limits.

## Greek Letters and Operators

<DemoBlock title="Greek letters + operators">
  <div style="width: 100%">
    <oas-equation code="\alpha \cdot \beta = \gamma \times \delta \div \epsilon \leq \pi \approx \infty"></oas-equation>
  </div>
</DemoBlock>

Greek letters like `\alpha` and common operators such as `\times` `\div` `\pm` `\cdot` `\leq` `\geq` `\neq` `\approx` `\infty` are mapped automatically.

## Unknown Commands

<DemoBlock title="Unknown commands shown literally">
  <div style="width: 100%">
    <oas-equation code="\unknowncmd{x} + y"></oas-equation>
  </div>
</DemoBlock>

Unknown commands are displayed literally without errors.

## API

### Attributes

| Attribute | Description              | Type     | Default |
| --------- | ------------------------ | -------- | ------- |
| `code`    | LaTeX subset source text | `string` | —       |

### ARIA

The container's `aria-label` equals the raw LaTeX source text, so screen readers read the formula source directly.

### Engine Choice (Architecture Decision)

**Self-developed simplified LaTeX subset, no third-party formula engine**:

1. **Zero-dependency core selling point**: zero third-party runtime dependencies; the in-house parser (tokenizer + recursive descent) introduces no dependencies.
2. **The subset covers common scenarios**: superscripts/subscripts, fractions, square roots (with root index), summation/integration/product (with limits), Greek letters, common operators — covering common high-school / university formulas; full LaTeX (matrices, large operators, multi-line alignment, etc.) is a future enhancement to be re-evaluated.
3. **Unknown command tolerance**: unknown commands are shown literally without errors, following the same strategy as "unknown language renders as plain text".
4. Rendered as HTML (stacked spans + CSS layout) using only library tokens, inheriting font size / theme.

### Boundaries

- All text is HTML-escaped to prevent injection
- Empty `code` renders an empty container without errors
