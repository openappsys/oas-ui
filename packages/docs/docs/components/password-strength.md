# PasswordStrength 密码强度

密码强度独立指示条：**不包裹输入框**，`for` 精确关联或 slot 自动发现密码输入，与 `oas-input` / 原生 input 均可组合；内置 0–4 五档评分（长度基础分 + 字符类别多样性 + 长度加权 − 常见弱口令 / 重复 / 连续字符惩罚）；`level` 受控、`levels` 文案覆盖、`score-fn` 自定义评分 property；4 段分段条全 token 配色（暗色自动正确）；host 承载 `role="meter"` 无障碍语义；档位文案 i18n 16 语言。

## 基础用法（for 关联 oas-input）

<DemoBlock title="for 精确关联 + show-label">
  <oas-input id="ps-demo-pwd" type="password" show-password placeholder="输入密码，看强度变化" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-pwd" show-label></oas-password-strength>
</DemoBlock>

`for` 指向密码输入的 `id`（同根节点内查找）：输入目标可以是 `oas-input type="password"`，也可以是原生 `<input type="password">`。指示条监听输入的 `input` 事件实时评分，逐档点亮分段并更新档位文案。

试试输入 `123456`（弱口令表精确命中，恒为最弱档）、`password`（弱口令本体 → 0 分）；`password1!` 加尾巴后不再清零、按长度/类别给中档；`Abc!23456`（连续数字段压分）、`MyStr0ng!Pass`（长且多样，满档）。

## 显示档位文案（show-label）

<DemoBlock title="缺省（隐藏）与 show-label（显示）对照">
  <oas-password-strength for="ps-demo-nolabel"></oas-password-strength>
  <oas-password-strength for="ps-demo-nolabel" show-label></oas-password-strength>
</DemoBlock>

缺省只渲染分段条（纯视觉反馈）；加 `show-label` 在条尾实时显示当前档位文案（默认走 i18n 五档文案，文案颜色随档位同步分色）。

## 受控档位（level）

<DemoBlock title="level=0–4 宿主给值（停自动计算）">
  <oas-space size="small">
    <oas-button size="small" onclick="psLevel(0)">level=0</oas-button>
    <oas-button size="small" onclick="psLevel(1)">level=1</oas-button>
    <oas-button size="small" onclick="psLevel(2)">level=2</oas-button>
    <oas-button size="small" onclick="psLevel(3)">level=3</oas-button>
    <oas-button size="small" onclick="psLevel(4)">level=4</oas-button>
  </oas-space>
  <oas-password-strength id="ps-demo-ctrl" show-label level="2"></oas-password-strength>
</DemoBlock>

`level` 属性（0–4）进入**受控模式**：显示值完全由宿主给，组件停止自动计算、目标输入不再影响指示条、也不派发 `oas-score-change`（防双向绑定回环）。越界值钳制到 0–4；非法值按 0 处理并一次性 console.warn。移除 `level` 属性即恢复自动评分。

宿主可用该模式对接自有评分体系（如服务端返回的强度字段）：指示条只做呈现层。

## 自定义评分（score-fn）

<DemoBlock title="只按长度评分的自定义函数">
  <oas-label>
    <input type="checkbox" id="ps-demo-fn-toggle" />
    只按长度评分（≥12 位 = 很强，8–11 位 = 强，其余 = 弱）
  </oas-label>
  <oas-input id="ps-demo-fn-pwd" type="password" placeholder="输入密码，观察自定义评分" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-fn-pwd" show-label id="ps-demo-fn-meter"></oas-password-strength>
</DemoBlock>

`score-fn` 是 **JS property**（Vue 模板用 `:scoreFn` 绑定）：入参密码串，返回 0–4。设置后**完全接管**内置评分；置 `null` 恢复内置。函数抛错时回落内置评分并一次性 console.warn。受控 `level` 在场时 `score-fn` 不参与（宿主给值优先）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ctrl = document.getElementById('ps-demo-ctrl')
  window.psLevel = (n) => ctrl?.setAttribute('level', String(n))

  const toggle = document.getElementById('ps-demo-fn-toggle')
  const meter = document.getElementById('ps-demo-fn-meter')
  const lengthOnly = (password) => {
    const len = Array.from(password).length
    if (len >= 12) return 4
    if (len >= 8) return 3
    if (len === 0) return 0
    return 1
  }
  toggle?.addEventListener('change', () => {
    if (meter) meter.scoreFn = toggle.checked ? lengthOnly : null
  })
})
</script>

## slot 自动发现

<DemoBlock title="原生 input 内嵌（不写 for）">
  <oas-password-strength show-label>
    <input type="password" aria-label="原生密码输入框" placeholder="原生密码输入框（slot 内）" style="width: 260px; box-sizing: border-box; padding: var(--oas-space-1_5) var(--oas-space-2); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg); color: var(--oas-color-text-primary); font: inherit" />
  </oas-password-strength>
</DemoBlock>

不写 `for` 时，组件在 **default slot** 内自动发现第一个 `[type=password]` 输入（原生 input，或 `oas-input` 等以 `type` 属性声明 password 的承载组件），自动绑定监听。slot 内容动态增删（`slotchange`）与关联目标被移除（根节点 childList 监听）都会自动换绑：目标移除后分数回落空档，不残留监听、不报错。

`for` 与 slot 同时可用时 **`for` 精确关联优先**。

## 评分规则（内置）

| 分数 | 分段点亮 | 视觉档 | 默认文案（zh-CN） |
| --- | --- | --- | --- |
| 0 | 0 段 | neutral（空档） | 很弱 |
| 1 | 1 段 | danger | 弱 |
| 2 | 2 段 | warning | 一般 |
| 3 | 3 段 | success | 强 |
| 4 | 4 段 | success | 很强 |

计分口径（0–4，原创实现）：

- **长度基础分**：≥8 位 +1
- **字符类别多样性**：小写 / 大写 / 数字 / 符号四类——≥2 类 +1，≥3 类再 +1
- **长度加权**：≥12 位且 ≥3 类再 +1（正分封顶 4）
- **常见弱口令惩罚**：内置约 50 条原创整理的高频弱口令集合（123456 / password / qwerty / letmein 等）——小写归一**精确命中** → 0 分（`password` → 0）；**不认子串**：强口令内含弱词片段（`Str0ng!Passw0rd` 含 `passw0rd`）不清零，熵由长度/类别分自然刻画
- **重复字符惩罚**：≥5 位全同字符（如 `aaaaaa`）→ 上限 1
- **连续字符惩罚**：含 ≥5 位连续升/降序段（如 `12345` / `abcde`）→ 上限 2

## 文案与多语言

档位文案默认走 i18n（`passwordStrength.0`–`passwordStrength.4`，16 语言全量），`config-provider` 切语言自动跟随。`levels` 属性传 JSON 数组（5 个非空字符串）可整组覆盖：`levels='["太弱","较弱","中等","较强","很强"]'`；非法 JSON 或长度不为 5 时回落 i18n 默认并一次性 console.warn。

<DemoBlock title="levels 五档文案覆盖">
  <oas-input id="ps-demo-lv-pwd" type="password" placeholder="输入密码，看自定义文案" style="width: 280px"></oas-input>
  <oas-password-strength for="ps-demo-lv-pwd" show-label levels='["太弱","较弱","中等","较强","很强"]'></oas-password-strength>
</DemoBlock>

## 无障碍

- 分段条（`part="bar"`）承载 `role="meter"` + `aria-valuenow` / `aria-valuemin="0"` / `aria-valuemax="4"`，当前档位文案进 `aria-label`——读屏可感知强度与档位含义
- host 保持普通容器、不挂指示角色：slot 内嵌的密码输入与分段条是 flat tree 兄弟节点，不会被 meter 角色的「子内容展平」吞掉（`nested-interactive` 回归固化于 qa-regression 定点 spec）；纯指示组件不抢焦点、不进 tab 序
- 分段点亮与档位文案双重编码（颜色 + 文字），色弱用户可从文案区分档位；档位文案用 `-text` 文字安全 token（浅底对比度 ≥4.5:1），分段填充用实色 token（非文字图形 ≥3:1）

## API

### oas-password-strength

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `for` | 精确关联的密码输入 id（同根节点内查找；可为原生 input[type=password] 或 oas-input 等承载 password 输入的组件）；设置后优先于 slot 自动发现 | `string` | — |
| `level` | 受控分数（0–4）：在场时停止自动计算、不派发事件（值由宿主给）；移除恢复自动；越界钳制 0–4，非法值按 0 并一次性告警 | `string` | — |
| `levels` | 五档文案覆盖：JSON 数组（5 个非空字符串，索引 0–4 对应档位）；缺省走 locale `passwordStrength.*`；非法回落并一次性告警 | `string` | — |
| `show-label` | 显示当前档位文案 | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `scoreFn` | 自定义评分函数 `(password: string) => 0–4`：设置后完全接管内置评分；置 null 恢复。受控 `level` 在场时不参与 | `PasswordScoreFn \| null` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-score-change` | 分数变化时派发（仅自动/自定义评分模式；受控 `level` 不派发），`detail: { score, label }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 自动发现区：缺省在此查找第一个 `[type=password]` 输入（原生 input 或承载组件）并自动绑定 |

颜色：分段条与文案全部走 `--oas-color-*` token（`--oas-color-danger` / `--oas-color-warning` / `--oas-color-success` / `--oas-color-bg-hover` / `--oas-color-text-*`），暗色与高对比主题自动正确；样式部件 `part="bar"` / `part="segment"` / `part="label"` 可被宿主 `::part()` 定制。
