---
description: "秒杀 / 限时抢购配方：oas-countdown 倒计时 + oas-progress 抢购进度 + oas-submit-bar 抢购按钮的宿主侧组装——库存紧张联动、时间到与售罄的行为切换、禁用时机决策表。"
---

# 秒杀与限时抢购（场景配方）

> 倒计时、进度、抢购栏三个既有组件的**宿主侧组装**示范——本页不引入新组件、不扩展任何组件 API。抢购业务规则（谁禁用、何时切换行为）全部由宿主持有，组件只提供状态与事件。

## 场景与分工

| 角色 | 组件 | 组件承担 | 宿主承担 |
| --- | --- | --- | --- |
| 倒计时 | `oas-countdown` | 距结束显示 + `oas-finish` 到点信号 | 用 `endAt − Date.now()` 算出毫秒时长喂 `value` |
| 抢购进度 | `oas-progress` | 百分比条可视化（`percent` / 流动条纹 / `label` 可访问名） | 把「已抢 / 总量」换算成 0–100 |
| 抢购按钮 | `oas-submit-bar` | 合计金额 + 主按钮三态 + `oas-submit` 信号 | 提交排队、库存递减、禁用时机判定 |

倒计时的 `value` 是**毫秒时长**而不是绝对时间戳——宿主拿到活动结束时刻后自行做减法；后台标签页节流不漂移由组件内建（按时间戳记账，回前台首帧自动校正）。

## 完整秒杀闭环

<DemoBlock title="60 秒场：抢购 → 进度推进 → 售罄 / 到点自动切换（可重置）">
  <div class="fs-stage">
    <div class="fs-head">
      <div class="fs-head-main">
        <p class="fs-title">旗舰降噪耳机（闪亮白）</p>
        <oas-price value="199" original="399" size="lg"></oas-price>
      </div>
      <oas-tag id="fs-state" type="danger" variant="solid">秒杀中</oas-tag>
    </div>
    <oas-progress id="fs-progress" percent="0" striped-flow label="已抢 0%"></oas-progress>
    <p class="fs-stock">仅剩 <strong id="fs-stock-num">5</strong> 件 / 共 5 件 · 已抢 <span id="fs-sold-num">0</span> 件</p>
    <oas-countdown id="fs-countdown" value="60000" format="mm:ss" title="距本场结束" prefix-text="仅剩 "></oas-countdown>
    <oas-submit-bar id="fs-bar" total="199" label="秒杀价" action-text="立即抢购"></oas-submit-bar>
    <p id="fs-out" class="fs-out" role="status">点「立即抢购」体验闭环：成功一次推一格进度；售罄或到点，按钮自动切换。</p>
    <oas-button id="fs-reset" size="small">重置演示</oas-button>
  </div>
</DemoBlock>

**模式要点**：

1. **禁用时机是两条独立判定，先到先禁**：时间到（`oas-finish`）→ `disabled` + `action-text="活动已结束"`；库存归零（宿主账本）→ `disabled` + `action-text="已售罄"`。两个信号都只是宿主状态机的输入，组件不感知「活动」概念。
2. **提交在途天然防重**：宿主收到 `oas-submit` 后立刻置 `loading`——loading 期间组件禁点且不再派发事件（内建语义），宿主不必自己加防抖；异步回包后移除 `loading` 再推进库存与进度。
3. **进度联动只有一行换算**：`percent = 已抢 / 总量 × 100`；`label` 提供进度条可访问名，读屏用户同样能感知抢购热度。
4. **演示可重置**：`countdown.reset()` 回到初值重新计时（组件方法），宿主同步回滚库存 / 按钮 / 文案——这也是「恢复 / 补货」路径的真实写法。

## 禁用时机决策表

| 信号 | 来源 | 宿主动作 |
| --- | --- | --- |
| 时间到 | `oas-countdown` 的 `oas-finish` | `disabled` + `action-text="活动已结束"`，状态 tag 切「已结束」 |
| 售罄 | 宿主库存账本（`oas-submit` 成功回调递减） | `disabled` + `action-text="已售罄"`，状态 tag 切「已售罄」 |
| 提交在途 | 宿主点击后置 `loading` | 组件内建：loading 禁点、不派发 `oas-submit` |
| 恢复 / 补货 | 宿主写回状态 | 移除 `disabled`、写回 `action-text`、`countdown.reset()` 重开计时 |

## 三态对照：预热 / 进行中 / 已结束

<DemoBlock title="同一套组件的三种活动状态（预热卡可订阅提醒）">
  <div class="fs-cols">
    <div class="fs-col">
      <oas-tag type="info">预热中</oas-tag>
      <oas-countdown value="94260000" format="D天HH:mm:ss" title="距开抢"></oas-countdown>
      <p class="fs-meta">今天 20:00 开抢 · 已订阅 8,241 人</p>
      <oas-submit-bar total="199" label="预售价" action-text="未开抢" disabled></oas-submit-bar>
      <oas-button id="fs-remind" size="small" block>订阅开抢提醒</oas-button>
    </div>
    <div class="fs-col">
      <oas-tag type="danger" variant="solid">进行中</oas-tag>
      <oas-countdown value="45000" format="mm:ss" title="距结束"></oas-countdown>
      <oas-progress percent="72" striped-flow label="已抢 72%"></oas-progress>
      <oas-submit-bar total="199" label="秒杀价" action-text="立即抢购"></oas-submit-bar>
    </div>
    <div class="fs-col">
      <oas-tag type="default">已结束</oas-tag>
      <oas-countdown value="0" title="本场已结束"></oas-countdown>
      <oas-progress percent="100" status="success" label="已抢 100%"></oas-progress>
      <oas-submit-bar total="199" action-text="活动已结束" disabled></oas-submit-bar>
    </div>
  </div>
  <p id="fs-remind-out" class="fs-out" role="status" style="margin-top: var(--oas-space-2)">预热卡：点「订阅开抢提醒」看宿主侧反馈。</p>
</DemoBlock>

**模式要点**：

1. 三态共用同一组组件，差别只在**属性取值**：预热 = 按钮禁用 + 倒计时朝开抢时间走；进行中 = 按钮可用 + 进度条流动；已结束 = 双禁用 + 进度满值转 `status="success"` 绿。
2. 预热态的「提醒我」是宿主业务——submit-bar 禁用守住购买入口，普通按钮承接提醒订阅，两者各司其职。
3. 已结束卡的 `value="0"` 让倒计时停在零点：零值立即到点，组件态与业务态天然一致。

## 关键代码

```ts
// 宿主状态机（伪代码，可整体拷贝）
let stock = TOTAL_STOCK
let ended = false

countdown.addEventListener('oas-finish', () => {
  ended = true
  sealBar('活动已结束', '已结束', 'default')
})

bar.addEventListener('oas-submit', () => {
  if (ended || stock <= 0) return // 双保险（disabled / loading 时不派发，这里兜底）
  bar.setAttribute('loading', '')
  queueSubmit().then(() => {
    bar.removeAttribute('loading')
    stock--
    renderProgress() // percent = 已抢 / 总量 × 100
    if (stock === 0) sealBar('已售罄', '已售罄', 'default')
  })
})

function sealBar(text: string, tag: string, type: string) {
  bar.setAttribute('disabled', '')
  bar.setAttribute('action-text', text)
  stateTag.setAttribute('type', type)
  // 到点 / 售罄是弱态：回落浅底（「秒杀中」实底只属进行中强态，与静态弱态一致）
  stateTag.removeAttribute('variant')
  stateTag.textContent = tag
}
```

## 注意事项

1. **`value` 喂毫秒时长**，不要喂未来时间戳：`countdown.value = String(endAt - Date.now())`；跨天活动用 `format="D天HH:mm:ss"`。
2. **`oas-finish` 只派发一次**，重开活动调 `reset()`；断开重连不残留计时器（组件 `onCleanup` 内建）。
3. **submit-bar 缺省 `position: sticky`**，文档流内自带占位；宿主改 `fixed` 时占位自己承担（见 submit-bar 组件页「底部安全区与占位」配方）。
4. **高并发抢购的库存真值在后端**：前端进度与禁用只是体验层，`oas-submit` 成功与否以服务端回包为准——本页 demo 用延时模拟回包。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 组件经主题动态 import 晚注册：全部接线推迟到 customElements.whenDefined 之后（首帧竞态纪律）
  const tags = ['oas-price', 'oas-progress', 'oas-countdown', 'oas-submit-bar', 'oas-tag', 'oas-button']
  Promise.all(tags.map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    // —— 完整秒杀闭环 ——
    const bar = el('fs-bar')
    const countdown = el('fs-countdown')
    const progress = el('fs-progress')
    const stateTag = el('fs-state')
    const out = el('fs-out')
    if (bar && countdown && progress && stateTag && out) {
      const TOTAL = 5
      let stock = TOTAL
      let ended = false
      const pct = () => Math.round(((TOTAL - stock) / TOTAL) * 100)
      const seal = (text, tag, type) => {
        bar.setAttribute('disabled', '')
        bar.setAttribute('action-text', text)
        stateTag.setAttribute('type', type)
        // 到点 / 售罄是弱态：回落浅底（初始「秒杀中」实底只属进行中强态，与同页静态弱态一致）
        stateTag.removeAttribute('variant')
        stateTag.textContent = tag
      }
      const render = () => {
        progress.setAttribute('percent', String(pct()))
        progress.setAttribute('label', '已抢 ' + pct() + '%')
        el('fs-stock-num').textContent = String(stock)
        el('fs-sold-num').textContent = String(TOTAL - stock)
        if (stock === 0 && !ended) {
          seal('已售罄', '已售罄', 'default')
          out.textContent = '本场已售罄：库存账本归零 → submit-bar 禁用 + 文案切换。'
        }
      }
      bar.addEventListener('oas-submit', () => {
        if (ended || stock <= 0) return
        bar.setAttribute('loading', '')
        out.textContent = '排队校验中…（loading 期间按钮禁点、不派发 oas-submit）'
        setTimeout(() => {
          bar.removeAttribute('loading')
          stock--
          render()
          if (stock > 0) out.textContent = '抢购成功！仅剩 ' + stock + ' 件。'
        }, 600)
      })
      countdown.addEventListener('oas-finish', () => {
        ended = true
        bar.removeAttribute('loading')
        seal('活动已结束', '已结束', 'default')
        out.textContent = 'oas-finish 已派发：时间到 → 抢购通道关闭（决策表第一行）。'
      })
      el('fs-reset').addEventListener('oas-click', () => {
        stock = TOTAL
        ended = false
        bar.removeAttribute('disabled')
        bar.removeAttribute('loading')
        bar.setAttribute('action-text', '立即抢购')
        stateTag.setAttribute('type', 'danger')
        stateTag.setAttribute('variant', 'solid') // 回到进行中强态：恢复实底
        stateTag.textContent = '秒杀中'
        countdown.reset()
        render()
        if (stock > 0) out.textContent = '已重置：库存 / 进度 / 倒计时全部回到初值。'
      })
      render()
    }
    // —— 三态对照：预热提醒 ——
    const remind = el('fs-remind')
    const remindOut = el('fs-remind-out')
    if (remind && remindOut) {
      remind.addEventListener('oas-click', () => {
        remind.setAttribute('loading', '')
        setTimeout(() => {
          remind.removeAttribute('loading')
          remind.setAttribute('disabled', '')
          remind.textContent = '已订阅提醒'
          remindOut.textContent = '已订阅：开抢前 5 分钟推送（订阅关系由宿主持久化）。'
        }, 500)
      })
    }
  })
})
</script>

<style>
.fs-stage {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  width: 100%;
  max-width: 460px;
}
.fs-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--oas-space-3);
}
.fs-head-main {
  min-width: 0;
}
.fs-title {
  margin: 0 0 var(--oas-space-1);
  font-weight: 600;
}
.fs-stock {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fs-out {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fs-stage > oas-button {
  /* flex-column 默认 stretch 会把 oas-button host 拉到容器宽，而内层实体按钮只有内容宽
     ——host 拉宽区点击无响应（oas-button 只有 block 属性才让内层按钮填满）。
     收窄 host 到内容宽，视觉与可点区一致。 */
  align-self: flex-start;
}
.fs-cols {
  /* 纵向堆叠：三态卡内 submit-bar（合计 + 主按钮）min-content 宽度大于三列列宽，
     横排会内部挤压溢出（实测 en 需 ~356px）——单列全宽稳态 */
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  width: 100%;
  max-width: 460px;
}
.fs-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  container-type: inline-size;
}
/* 窄容器（手机宽）：submit-bar 主行换行——合计一行、按钮占满下行
   （::part 穿透 + 容器查询 = 配方页窄屏适配的正当手段；宽容器不受影响） */
@container (max-width: 400px) {
  .fs-col oas-submit-bar::part(row) {
    flex-wrap: wrap;
    row-gap: var(--oas-space-2);
  }
  .fs-col oas-submit-bar::part(action) {
    flex: 1 1 100%;
  }
}
.fs-col > oas-tag {
  align-self: flex-start;
}
.fs-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
</style>
