# oas-member-card 设计前必答

1. **取消路径**：无浮层、无异步、无计时器、无事件协议（纯展示卡）——零交互状态机即零孤儿产物；插槽内容（权益 / 操作钮）是宿主 light DOM 节点，组件**不搬运、不包壳**，断连即无痕迹。
2. **属性默认值/空态**：`grade` 缺省 → 徽章不渲染（无可显示等级不出空徽章），卡片 `aria-label` 回落 i18n「会员卡」；`variant` 缺省 `solid`，非法值回落 solid 并告警一次；`expire` 缺省 → 有效期行不渲染；`perks` / `actions` 插槽无内容时各区整体隐藏（不出空区块）。
3. **多步交互失败点**：无多步交互（单帧渲染完成）；variant / grade / expire 变更走 attribute 通道增量同步（`data-variant` 反射到宿主元素——外部 CSS `:host([data-variant])` 可定向覆写）。
4. **破坏性选项**：无破坏性动作；操作区按钮的行为（续费 / 升级跳转等）与可访问名完全归宿主按钮自带。
5. **键盘/ARIA**：卡片宿主 `role="group"` + `aria-label`（「会员卡：{grade}」，等级名进可访问名——读屏不进卡片也知道等级）。**aria-label 所有权**（oas-compact 守卫先例的增强）：宿主显式写入的自定义名优先（组件不覆盖，grade 变化也不冲掉）；宿主删除后组件恢复接管并跟随 grade 派生；组件上次写的值会被跟随更新。已知固有限制（值型所有权）：宿主恰好写入与派生值相同的串会被视为组件接管（无法区分来源，语义等价故可接受）。等级徽章**可见文本即等级标识**（不只靠颜色——底色档位只是视觉强化），sr-only「会员等级」前缀增强读屏语义（先读语义再读等级名）；有效期前缀 i18n（「有效期：」语义可读）；操作钮可访问名由宿主按钮自带（组件不加 aria-hidden 包装层）。
6. **受控/非受控与宿主桥接**：三个属性全部走原生 attribute 通道（无 property 访问器——纯展示无数据契约，Vue/React 模板 attribute 写法零劫持风险：`grade` / `variant` / `expire` 均无 HTMLElement 原型成员冲突，无 `'x' in el` 命中面）；`data-variant` 是反射档位（宿主可读可定向样式）不是输入通道；插槽内容不搬运（事件与上下文保留在宿主树）。

## token 化底色（两档 + 自定义出口）

- `solid`（缺省）：`background: var(--oas-member-card-bg, var(--oas-color-primary))`。
- `gradient`：`background: var(--oas-member-card-gradient, linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-primary-active)))`。
- 两个组件出口 token 可整卡接管底色；默认值全部引用主题 token（暗色自动跟随，零硬编码色值——前景文字 `--oas-color-text-on-primary` 同样 token 化）。

## 预留能力面（包体分级：本体冻结在大众功能集）

- **等级进度条**（成长值 / 升级进度可视化）。
- **卡面二维码**（会员码展示与刷新）。
- **多等级主题档**（grade → 底色映射表，当前由宿主按 grade 自行传 variant / 覆写出口 token 实现）。

当前本体接口（attribute / slot / 出口 token）对上述能力保持开放。
