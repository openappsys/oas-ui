---
description: "领券中心配方：oas-coupon 批量券面展示 + oas-bottom-sheet 领取确认弹层 + 券包选择弹层（oas-select）的状态流转——已领取 / 已使用 / 已过期三种形态的宿主侧管理。"
---

# 领券中心（场景配方）

> 券面展示、领取确认、券包核销三个环节的组合示范——`oas-coupon`（券面卡片 + 内建选择弹层）+ `oas-bottom-sheet`（领取确认浮层）。不新增组件 API；「已领取」这类业务态由宿主持有，组件只承载「已使用 / 已过期 / 未达门槛」这些券面形态。

## 场景与分工

- **券面展示**：`oas-coupon` 卡片形态——`amount` / `threshold` / 有效期 / `status` 语义色全部内建。
- **领取确认**：`oas-bottom-sheet` 受控弹层——`open` + `oas-close` 协议；下滑把手 / 遮罩 / Esc 关闭由浮层件内建，领取业务归宿主。**动态创建 + 关闭即移除**：关闭态不留在 DOM，Tab 不会落进隐藏抽屉。
- **券包核销**：`oas-coupon` 列表形态——`list` 传入即得选择弹层，`oas-select` 回传所选券，选中即视为使用。

## 领取流程：券面 → 确认浮层 → 已领取

<DemoBlock title="批量券面 + bottom-sheet 领取确认（已领的按钮变禁用）">
  <div class="cc-grid">
    <div class="cc-cell">
      <oas-coupon amount="30" threshold="199" start="2026-01-01" end="2026-12-31"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button class="cc-claim" size="small" type="primary" data-amount="30" data-threshold="199" data-validity="2026-12-31 前有效">领取</oas-button>
        <span class="cc-state">可领取</span>
      </div>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="10" threshold="0" validity="长期有效"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button class="cc-claim" size="small" type="primary" data-amount="10" data-threshold="0" data-validity="长期有效">领取</oas-button>
        <span class="cc-state">可领取</span>
      </div>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="50" threshold="299" status="expired"></oas-coupon>
      <div class="cc-cell-foot">
        <oas-button size="small" disabled>已过期</oas-button>
        <span class="cc-state">不可领</span>
      </div>
    </div>
  </div>
  <p id="cc-out" class="cc-out" role="status">点「领取」→ 底部弹层确认 → 确认后该券位流转为「已领取」。</p>
</DemoBlock>

**模式要点**：

1. **领取浮层选 `oas-bottom-sheet`，动态创建 + 关闭即移除**：领券是移动端高频轻操作，底部升起符合拇指区。每次点「领取」时 `createElement` → 填入券面与按钮 → 设 `open` → `appendChild`；`oas-close`（`detail.reason` = `drag` / `backdrop` / `esc`）、取消、确认三条路径都 `remove()`。关闭态不在 DOM，Tab 穿不进隐藏抽屉——比组件页先例更进一步（先例关闭仅收起、下次打开前才删旧的）。已知边界：面板内 Tab 圈禁依赖**原生**可聚焦元素，本配方按钮是 `oas-button`（自定义元素），实测 Tab 会逃逸到页面——bottom-sheet 既有边界，组件级收敛另行安排；Esc / 遮罩 / 把手关闭协议不受影响。
2. **「已领取」不是组件状态**：确认领取后宿主把该券位的按钮置 `disabled` + 文案「已领取」，券面本身保持可读——业务态与展示态分开，不为业务态硬造组件属性。
3. **券面只承载券本身形态**：过期券用 `status="expired"`（灰化 + 已过期标识），按钮同步禁用；「未达门槛不可用」用 `status="unavailable"` + `reason` 文案。
4. **确认浮层里的券面是同一组件的复用**：宿主把所选券数据写进浮层内 `oas-coupon` 的属性即可，不需要第二套券面模板。

## 券包：选择弹层核销（已领 → 已使用）

<DemoBlock title="内建选择弹层：选中即核销（oas-select → status=used）">
  <div class="cc-pack-wrap">
    <oas-coupon
      id="cc-pack"
      trigger-text="使用优惠券"
      list='[{"code":"newbie","amount":15,"threshold":0,"validity":"长期有效"},{"code":"vip","amount":40,"threshold":199,"end":"2026-12-31"}]'
    ></oas-coupon>
    <p id="cc-pack-out" class="cc-out" role="status">打开弹层选一张券——选中即视为核销，券面流转为「已使用」。</p>
  </div>
  <div class="cc-grid" style="margin-top: var(--oas-space-3)">
    <div class="cc-cell">
      <oas-coupon amount="20" threshold="99" status="used"></oas-coupon>
    </div>
    <div class="cc-cell">
      <oas-coupon amount="50" threshold="299" status="unavailable" reason="未达 299 元门槛"></oas-coupon>
    </div>
  </div>
</DemoBlock>

**模式要点**：

1. **列表弹层是 coupon 内建能力**（`list` 传入即得）：可用 / 不可用分组渲染、Esc 走共享浮层层栈、选中自动关闭并派 `oas-select`（detail `{ code, coupon }`）——领券中心不必自己再拼一个选择浮层。
2. **空选出口有契约**：「不使用优惠券」按钮派 `oas-clear`，紧随其后是一次空选 `oas-select`（`coupon: null`）——宿主据此回退到不用券的结算路径，记得判空。
3. **核销写回走数据通道**：宿主把所选券在数据里置 `status="used"` 后整体重写 `list`，弹层与券面同步流转——状态只有一个真源（宿主数据）。

## 关键代码

```ts
// 领取浮层：动态创建 + 关闭即移除（动态创建是 bottom-sheet 组件页先例；
// 关闭即 remove 比先例更进一步——先例关闭仅收起，下次打开前才删旧的）
claimBtns.forEach((btn) =>
  btn.addEventListener('oas-click', () => openSheet(btn)),
)

function openSheet(btn) {
  const sheet = document.createElement('oas-bottom-sheet')
  sheet.setAttribute('max-height', '340px')
  sheet.innerHTML = '…券面（oas-coupon）+「再想想 / 确认领取」按钮…'
  sheet.addEventListener('oas-close', () => sheet.remove()) // 下滑 / 遮罩 / Esc 三条关闭路径
  sheet.querySelector('.cc-cancel').addEventListener('oas-click', () => sheet.remove())
  sheet.querySelector('.cc-confirm').addEventListener('oas-click', () => {
    sheet.remove()
    claimApiCall().then(() => {
      btn.setAttribute('disabled', '')
      btn.textContent = '已领取' // 业务态：宿主持有
    })
  })
  sheet.setAttribute('open', '')
  document.body.appendChild(sheet) // 组件已注册时 append 即升级，属性回放后立即可用
}

// 券包核销（coupon 内建选择弹层）
pack.addEventListener('oas-select', (e) => {
  const { code, coupon } = e.detail
  if (!coupon) return // 「不使用优惠券」空选出口
  const list = JSON.parse(pack.getAttribute('list')).map((c) =>
    c.code === code ? { ...c, status: 'used' } : c,
  )
  pack.setAttribute('list', JSON.stringify(list))
})
```

## 注意事项

1. **多层浮层共享 Esc 层栈**：券包选择弹层与领取 bottom-sheet 同开时，Esc 只关最上层；两者都是「请求关闭」协议——bottom-sheet 收 `oas-close` 即 `remove()`、coupon 收 `oas-open-change` 同步开合状态，宿主在各自事件里收尾。
2. **coupon 卡片无点击事件**：领取入口是宿主自己的按钮——券面是纯展示件，交互语义留给宿主组合。
3. **层级不用手工对齐**：bottom-sheet 与 coupon 弹层缺省走同一套层叠阶梯（`--oas-z-modal` 档），与 modal / drawer 混用亦然。
4. **领取接口失败的回滚**：确认后先关浮层再异步调接口，失败时把券位状态回滚（按钮恢复可点）并给出反馈——本页 demo 用同步置态简化，真实业务以接口结果为准。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 组件经主题动态 import 晚注册：全部接线推迟到 customElements.whenDefined 之后（首帧竞态纪律）
  Promise.all(['oas-coupon', 'oas-bottom-sheet', 'oas-button'].map((t) => customElements.whenDefined(t))).then(() => {
    const el = (id) => document.getElementById(id)
    const out = el('cc-out')
    if (out) {
      let pending = null // 本次待领取的「领取」按钮
      // 领取浮层：动态创建 + 关闭即移除（关闭态不留在 DOM，Tab 穿不进隐藏抽屉）
      const openSheet = (btn) => {
        pending = btn
        const sheet = document.createElement('oas-bottom-sheet')
        sheet.setAttribute('max-height', '340px')
        sheet.innerHTML =
          '<div class="cc-sheet">' +
          '<p class="cc-sheet-title">确认领取</p>' +
          '<oas-coupon amount="' + btn.dataset.amount + '" threshold="' + btn.dataset.threshold + '" validity="' + btn.dataset.validity + '"></oas-coupon>' +
          '<p class="cc-meta">每人限领 1 张；有效期与使用规则以券面为准。</p>' +
          '<div class="cc-sheet-actions">' +
          '<oas-button class="cc-cancel" style="flex: 1" block>再想想</oas-button>' +
          '<oas-button class="cc-confirm" type="primary" style="flex: 1" block>确认领取</oas-button>' +
          '</div></div>'
        sheet.addEventListener('oas-close', () => sheet.remove())
        sheet.querySelector('.cc-cancel').addEventListener('oas-click', () => sheet.remove())
        sheet.querySelector('.cc-confirm').addEventListener('oas-click', () => {
          sheet.remove()
          if (!pending) return
          pending.setAttribute('disabled', '')
          pending.textContent = '已领取'
          const cell = pending.closest('.cc-cell')
          const state = cell && cell.querySelector('.cc-state')
          if (state) state.textContent = '已领取'
          out.textContent = '已领取：面额 ' + pending.dataset.amount + ' 元的优惠券（业务态由宿主持有）。'
          pending = null
        })
        sheet.setAttribute('open', '')
        document.body.appendChild(sheet) // 组件已注册时 append 即升级，属性回放后立即可用
      }
      document.querySelectorAll('.cc-claim').forEach((btn) => btn.addEventListener('oas-click', () => openSheet(btn)))
    }
    // —— 券包核销：选中即置 used（数据真源 = list 属性本身）——
    const pack = el('cc-pack')
    const packOut = el('cc-pack-out')
    if (pack && packOut) {
      pack.addEventListener('oas-select', (e) => {
        const coupon = e.detail.coupon
        if (!coupon) {
          packOut.textContent = '空选出口：不使用优惠券（oas-clear 后的空 oas-select，coupon 为 null）。'
          return
        }
        const list = JSON.parse(pack.getAttribute('list')).map((c) =>
          c.code === e.detail.code ? { ...c, status: 'used' } : c,
        )
        pack.setAttribute('list', JSON.stringify(list))
        packOut.textContent = '已核销券 ' + e.detail.code + '：数据置 status=used → 券面流转「已使用」。'
      })
    }
  })
})
</script>

<style>
.cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--oas-space-3);
  width: 100%;
}
.cc-cell {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  min-width: 0;
}
.cc-cell-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.cc-state {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-pack-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
}
.cc-out {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.cc-sheet-title {
  margin: 0;
  font-weight: 600;
}
.cc-meta {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.cc-sheet-actions {
  display: flex;
  gap: var(--oas-space-2);
}
</style>
