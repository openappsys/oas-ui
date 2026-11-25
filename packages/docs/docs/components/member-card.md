---
description: "会员卡：等级徽章（可见文本即等级标识）+ 权益插槽 + 有效期 + 操作区按钮插槽（续费/升级）；底色 solid / gradient 两档 token 化，暗色自动跟随；纯展示零事件。"
---

# MemberCard 会员卡

等级 / 权益卡：`grade`（等级名徽章——**可见文本即等级标识**，不只靠颜色）、权益插槽（`perks`）、有效期（`expire` 文本 + i18n 前缀）、操作区按钮插槽（`actions`——续费 / 升级按钮归宿主，可访问名由宿主按钮自带）；底色 `variant="solid"`（缺省）/ `gradient` 两档 **token 化**（出口 `--oas-member-card-bg` / `--oas-member-card-gradient` 可整卡接管，默认值全部引用主题 token，暗色自动跟随）。纯展示卡（零事件协议）。

## 基础会员卡（solid + 权益 + 有效期）

<DemoBlock title="黄金会员（solid 底 + 权益插槽 + 有效期）">
  <oas-member-card grade="黄金会员" expire="2027-11-25" style="width: 100%; max-width: 420px">
    <div slot="perks">每月 2 张免邮券</div>
    <div slot="perks">会员日 95 折</div>
    <div slot="perks">生日专属礼包</div>
  </oas-member-card>
</DemoBlock>

## 渐变底与操作区按钮插槽

`variant="gradient"` 渐变底（`linear-gradient(135deg, primary, primary-active)`，token 化暗色自动跟随）；`actions` 插槽放续费 / 升级按钮（行为与可访问名归宿主按钮）：

<DemoBlock title="黑金会员（gradient 底 + 续费/升级操作区）">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-member-card id="mc-actions" grade="黑金会员" variant="gradient" expire="2028-01-31" style="width: 100%; max-width: 420px">
      <div slot="perks">全店 88 折</div>
      <div slot="perks">专属客服与优先发货</div>
      <oas-button slot="actions" size="small" data-demo-action="续费">立即续费</oas-button>
      <oas-button slot="actions" size="small" type="primary" data-demo-action="升级">升级下一档</oas-button>
    </oas-member-card>
    <p id="mc-actions-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      点操作钮观察宿主侧动作反馈（组件零事件协议——行为归宿主）。
    </p>
  </div>
</DemoBlock>

## 等级档位对比

`grade` 缺省不渲染徽章；多等级并排时各卡可配不同 `variant` / 出口 token（宿主按 grade 定制底色）：

<DemoBlock title="多等级对比（普通 / 黄金 / 钻石）">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-member-card grade="普通会员" expire="2026-12-31" style="max-width: 420px; --oas-member-card-bg: var(--oas-color-primary-text)">
      <div slot="perks">注册即享新人券</div>
    </oas-member-card>
    <oas-member-card grade="黄金会员" style="max-width: 420px">
      <div slot="perks">每月 2 张免邮券</div>
    </oas-member-card>
    <oas-member-card grade="钻石会员" variant="gradient" style="max-width: 420px">
      <div slot="perks">全店 85 折</div>
      <div slot="perks">不限次免邮</div>
    </oas-member-card>
  </div>
</DemoBlock>

## 键盘与无障碍

- 卡片宿主 `role="group"` + `aria-label`（「会员卡：{grade}」，等级名进可访问名——读屏不进卡片也知道等级）。
- 等级徽章**可见文本即等级标识**（不只靠颜色——底色档位只是视觉强化），sr-only「会员等级」前缀增强读屏语义（先读语义再读等级名）。
- 有效期行带 i18n 前缀（「有效期：」语义可读）；操作钮可访问名由宿主按钮自带（组件不加包装层）。
- `perks` / `actions` 插槽无内容时各区整体隐藏（不出空区块）；RTL 与暗色走逻辑属性与 token 自动跟随。

## 自定义样式须知

`::part(card)` 为卡面容器（底色由 variant 决定，整卡接管改出口 token `--oas-member-card-bg` / `--oas-member-card-gradient` 即可，不必覆写 part）；`::part(grade)` 等级徽章（on-primary 描边胶囊——白字直接落在卡面底色上，对比度不因底色叠加稀释）；`::part(perks)` / `::part(expire)` / `::part(actions)` 三区。前景文字色 `--oas-color-text-on-primary`（跟随底色的可读文字 token）。`data-variant` 反射在宿主元素上，可用 `oas-member-card[data-variant='gradient']` 从外部定向。

<script setup lang="ts">
import { onMounted } from 'vue'

// demo 脚本约定（勿改位置）：① 必须是**页面级** script setup——写进 DemoBlock 内部时 VitePress 不会抽取，
// 会被原样输出成页面正文（Cannot use import statement / hydration mismatch，demo 全灭）；
// ② 放在 `## API` 之前：该章节是 api:gen 生成区，业务脚本不得落在生成区内。
onMounted(() => {
  const out = document.getElementById('mc-actions-out')
  const host = document.getElementById('mc-actions')
  if (!host || !out) return
  host.querySelectorAll('[data-demo-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      out.textContent = `宿主动作：${(btn as HTMLElement).dataset.demoAction}（续费/升级跳转由宿主接管，组件零事件协议）`
    })
  })
})
</script>

## API

### oas-member-card

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `expire` | 有效期文本（宿主给日期或文案，渲染 i18n 前缀行）；缺省不渲染有效期行 | — | — |
| `grade` | 等级名（如「黄金会员」）；缺省不渲染徽章；等级标识 = 徽章可见文本 + sr-only「会员等级」前缀（不只靠颜色） | — | — |
| `variant` | 底色档位：`solid`（缺省）/ `gradient`；非法值回落 solid 并告警一次；当前档反射 data-variant attribute | — | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 操作区（续费 / 升级按钮——行为与可访问名归宿主按钮自带；无内容时整体隐藏） |
| `perks` | 权益区（权益条目归宿主渲染；无内容时整体隐藏） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-member-card-bg` | `var(--oas-color-primary)` |
| `--oas-member-card-gradient` | `linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-primary-active))` |
