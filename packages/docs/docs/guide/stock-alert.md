---
description: "库存紧张提示配方：oas-price + oas-tag 的阈值联动——现货 / 紧张 / 告急 / 售罄四档文案与语义色切换，纯宿主逻辑示范（组件无库存概念），附商品卡库存位组合。"
---

# 库存紧张提示（场景配方）

> 价格与库存提示位的**纯宿主逻辑**示范：`oas-price`（价格展示）+ `oas-tag`（语义色徽标）+ 一段阈值函数。库存组件并不存在——也没有必要存在：库存是一个数字，文案与语义色是宿主的展示策略。

## 阈值分档

| 档位 | 条件（件） | tag 形态 | 文案策略 |
| --- | --- | --- | --- |
| 现货 | `> 100` | `type="success"`「现货」 | 库存充足（N 件）——不制造稀缺感 |
| 紧张 | `20 < n ≤ 100` | `type="warning"`「仅剩 N 件」 | 库存紧张，仅剩 N 件 |
| 告急 | `0 < n ≤ 20` | `type="danger"`「仅剩 N 件」 | 仅剩 N 件，欲购从速 |
| 售罄 | `= 0` | `type="default"`「已售罄」 | 已售罄，看看相似商品 + 购买入口禁用 |

阈值本身是业务参数——上面的 100 / 20 只是示例，换成你自己的运营口径即可。

## 阈值联动演示

<DemoBlock title="改库存数看提示位联动（步进 / 快捷档 / 输入皆可）">
  <div class="sa-goods">
    <div class="sa-goods-head">
      <div class="sa-goods-main">
        <p class="sa-title">智能手表 Pro（45mm 铝金属）</p>
        <oas-price value="1299" original="1699" size="lg"></oas-price>
      </div>
      <oas-tag id="sa-tag" type="success" variant="solid">现货</oas-tag>
    </div>
    <p id="sa-text" class="sa-text" role="status">库存充足（528 件）</p>
  </div>
  <div class="sa-ctrl">
    <label class="sa-label" for="sa-stock">库存件数</label>
    <oas-input-number id="sa-stock" value="528" min="0" max="999" step="1" label="库存件数" style="width: 160px"></oas-input-number>
    <div class="sa-quick">
      <oas-button class="sa-quick-btn" size="small" data-stock="528">528（充足）</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="48">48（紧张）</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="3">3（告急）</oas-button>
      <oas-button class="sa-quick-btn" size="small" data-stock="0">0（售罄）</oas-button>
    </div>
  </div>
  <p id="sa-out" class="sa-out" role="status">改库存看联动：&gt;100 现货 / ≤100 紧张 / ≤20 告急 / 0 售罄。</p>
</DemoBlock>

**模式要点**：

1. **组件没有库存概念**：`oas-price` 管价格、`oas-tag` 管语义色徽标，分档函数是十几行宿主代码——不存在「库存组件」这种抽象，需要的是策略不是容器。
2. **语义色只换 `type`，不硬编码色值**：success / warning / danger / default 四档映射到主题 token（含暗色变体），主题切换自动成立。
3. **文案播报走 `role="status"`**：档位切换时读屏用户能听到「仅剩 3 件，欲购从速」——库存提示是无障碍信息，不只是视觉装饰。
4. **售罄是行为档不只是颜色档**：真实业务里售罄要同时禁用购买入口（submit-bar / goods-action 的按钮置 `disabled`），见下方商品卡示例。

## 商品卡上的库存位

<DemoBlock title="product-card tags 插槽组合：现货 / 仅剩 N 件 / 已售罄">
  <div class="sa-cards">
    <oas-product-card image="/assets/demo-square-2.svg" title="纯棉短袖T恤 男女同款" price="99" original-price="129">
      <oas-tag slot="tags" size="sm" type="success" variant="solid">现货</oas-tag>
      <oas-button slot="actions" size="small" type="primary" block>加入购物车</oas-button>
    </oas-product-card>
    <oas-product-card image="/assets/demo-square-3.svg" title="轻便帆布鞋 米白低帮" price="199">
      <oas-tag slot="tags" size="sm" type="danger" variant="solid">仅剩 3 件</oas-tag>
      <oas-button slot="actions" size="small" block>加入购物车</oas-button>
    </oas-product-card>
    <oas-product-card image="/assets/demo-square-4.svg" title="羊毛围巾 姜黄" price="59">
      <oas-tag slot="tags" size="sm" type="default">已售罄</oas-tag>
      <oas-button slot="actions" size="small" disabled block>已售罄</oas-button>
    </oas-product-card>
  </div>
</DemoBlock>

**模式要点**：

1. `tags` 插槽是自由槽——放分档函数产出的 `oas-tag` 即得库存位；同一份阈值逻辑同时服务详情页与卡片墙。
2. 售罄卡片的按钮走 `disabled`：视觉可读（保留灰态）但不可触发，与「下单入口关闭」的业务语义一致。

## 关键代码

```ts
// stockTag / stockText / buyBar 为上方 demo 元素引用（getElementById 取自本页 demo）
// 阈值分档（宿主策略，可整体拷贝；100 / 20 换成你的运营口径）
function stockTier(n: number) {
  if (n <= 0) return { tag: '已售罄', type: 'default', text: '已售罄，看看相似商品', buyable: false }
  if (n <= 20) return { tag: `仅剩 ${n} 件`, type: 'danger', text: `仅剩 ${n} 件，欲购从速`, buyable: true }
  if (n <= 100) return { tag: `仅剩 ${n} 件`, type: 'warning', text: `库存紧张，仅剩 ${n} 件`, buyable: true }
  return { tag: '现货', type: 'success', text: `库存充足（${n.toLocaleString()} 件）`, buyable: true }
}

function renderStock(n: number) {
  const t = stockTier(n)
  stockTag.setAttribute('type', t.type)
  // 强态（success / warning / danger）实底醒目；售罄弱态回落浅底，与下方商品卡静态「已售罄」一致
  if (t.type === 'default') stockTag.removeAttribute('variant')
  else stockTag.setAttribute('variant', 'solid')
  stockTag.textContent = t.tag
  stockText.textContent = t.text
  buyBar.toggleAttribute('disabled', !t.buyable) // 售罄禁用购买入口（presence 属性用 toggleAttribute，别写 setAttribute 三元）
}
```

## 注意事项

1. **阈值切换是宿主逻辑**：库存变化来自轮询 / 推送 / 用户操作回包，宿主拿到新数字后调一次 `renderStock(n)` 即可，组件无感。
2. **`toLocaleString` 做千分位**：库存数与价格格式化口径保持一致（价格由 `oas-price` 内建千分位）。
3. **避免闪烁抖动**：阈值边界附近（如 100 ↔ 101）反复横跳时，文案与颜色频繁切换——必要时在宿主侧加迟滞（如紧张档进入后低于 90 才回到现货）。
4. **暗色与高对比主题**：四档语义色全部走 token，暗色下自动换档；不要用预设外的自定义色覆盖 `type` 语义色，除非你复查过对比度。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 组件经主题动态 import 晚注册：全部接线推迟到 customElements.whenDefined 之后（首帧竞态纪律）
  Promise.all(['oas-price', 'oas-tag', 'oas-input-number', 'oas-button'].map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    const tag = el('sa-tag')
    const text = el('sa-text')
    const stock = el('sa-stock')
    const out = el('sa-out')
    if (tag && text && stock && out) {
      const tier = (n) => {
        if (n <= 0) return { tag: '已售罄', type: 'default', text: '已售罄，看看相似商品（购买入口已禁用）' }
        if (n <= 20) return { tag: '仅剩 ' + n + ' 件', type: 'danger', text: '仅剩 ' + n + ' 件，欲购从速' }
        if (n <= 100) return { tag: '仅剩 ' + n + ' 件', type: 'warning', text: '库存紧张，仅剩 ' + n + ' 件' }
        return { tag: '现货', type: 'success', text: '库存充足（' + n.toLocaleString() + ' 件）' }
      }
      const render = (n) => {
        const t = tier(n)
        tag.setAttribute('type', t.type)
        // 强态（success / warning / danger）实底醒目；售罄弱态回落浅底，与下方商品卡静态「已售罄」一致
        if (t.type === 'default') tag.removeAttribute('variant')
        else tag.setAttribute('variant', 'solid')
        tag.textContent = t.tag
        text.textContent = t.text
        out.textContent = '当前 ' + n + ' 件 → tag=' + t.type + '「' + t.tag + '」。'
      }
      stock.addEventListener('oas-change', (e) => {
        render(Math.max(0, Number(e.detail.value) || 0))
      })
      document.querySelectorAll('.sa-quick-btn').forEach((btn) => {
        btn.addEventListener('oas-click', () => {
          const n = Number(btn.dataset.stock)
          stock.setAttribute('value', String(n)) // 数据真源在输入框，快捷档只是写值
          render(n)
        })
      })
    }
  })
})
</script>

<style>
.sa-goods {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
}
.sa-goods-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--oas-space-3);
}
.sa-goods-main {
  min-width: 0;
}
.sa-title {
  margin: 0 0 var(--oas-space-1);
  font-weight: 600;
}
.sa-text {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-ctrl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-3);
  margin-top: var(--oas-space-3);
}
.sa-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.sa-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.sa-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--oas-space-3);
  width: 100%;
}
</style>
