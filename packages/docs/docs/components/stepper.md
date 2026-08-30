# Stepper 步骤面板

步骤驱动的分步内容面板一体机：头部步骤条（可点击跳步）+ 联动内容面板（仅当前步显示），适合向导 / 表单分步 / 结账流程等场景。双组件配套使用：`oas-stepper` 管步骤头、`oas-stepper-panel` 管内容、`value` 关联显示（同构 `oas-tabs` / `oas-tab-panel` 模式）。

## 基础用法

`steps` 传步骤数组（`{title, description?, icon?, disabled?, status?}`，语义对齐 `oas-steps`），内容面板按序号 `value` 关联，`current` 指定当前步。

<DemoBlock title="基础用法">
  <oas-stepper current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'>
    <oas-stepper-panel value="0">
      <p style="color: var(--oas-color-text-secondary)">第一步：填写收货地址与订单信息。</p>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <p style="color: var(--oas-color-text-secondary)">第二步：选择支付方式完成付款。</p>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <p style="color: var(--oas-color-text-secondary)">第三步：等待卖家发货并确认收货。</p>
    </oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 可点击跳步

`clickable` 默认开启：点击任意可点步骤即跳转（整步可点，键盘 Enter/Space 可达），点击派发 `oas-change`（detail 为 `{ index }`）并写回 `current`。

<DemoBlock title="点击步骤切换">
  <oas-stepper id="stepper-click" clickable current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'>
    <oas-stepper-panel value="0"><p>订单信息填写区</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>支付方式选择区</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>发货进度区</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 线性模式（禁跳步）

`linear` 开启后仅允许跳转 `index <= current` 的步骤：已过步骤可回跳、当前步可停留、未来步骤禁点（`aria-disabled` + 视觉弱化，点击/键盘静默）。

<DemoBlock title="linear 禁跳未完成步">
  <oas-stepper id="stepper-linear" linear current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"实名认证","description":"上传证件信息"},{"title":"开通完成","description":"等待审核"}]'>
    <oas-stepper-panel value="0"><p>资料填写表单</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>实名认证流程</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>开通成功提示</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 禁用步骤

每步的 `disabled` 字段禁用该步：不可点击、键盘跳过、视觉弱化；显式 `status` 仍正常显示。

<DemoBlock title="disabled 步骤">
  <oas-stepper id="stepper-disabled" current="1" steps='[{"title":"上传证件","description":"身份证正反面"},{"title":"人脸核验","description":"保持光线充足"},{"title":"审核通过","description":"等待管理员审核","disabled":true}]'>
    <oas-stepper-panel value="0"><p>证件上传区</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>人脸核验区</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>审核结果区（禁用中）</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 状态标记

每步的 `status` 字段显式指定状态：`finish` 完成（成功色 + ✓）/ `error` 错误（危险色 + ✕）；缺省按 `current` 推导（前序 finish / 当前 process / 后续 wait）。

<DemoBlock title="finish / process / error / wait">
  <oas-stepper current="1" steps='[{"title":"下载资源","description":"资源包","status":"finish"},{"title":"解析数据","description":"正在解析","status":"process"},{"title":"提交结果","description":"发生异常","status":"error"},{"title":"完成","description":"等待结果"}]'>
    <oas-stepper-panel value="0"><p>资源下载完成</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>数据解析中…</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>解析异常，请重试</p></oas-stepper-panel>
    <oas-stepper-panel value="3"><p>流程结束</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 竖向排列

`direction="vertical"` 将步骤头转为纵向排列（指示器在左、标题在右、连接线走左侧），内容面板仍位于下方。

<DemoBlock title="竖向步骤">
  <div style="width: 320px">
    <oas-stepper id="stepper-vertical" direction="vertical" current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"审核通过","description":"等待管理员审核"}]'>
      <oas-stepper-panel value="0"><p>资料表单</p></oas-stepper-panel>
      <oas-stepper-panel value="1"><p>证件上传</p></oas-stepper-panel>
      <oas-stepper-panel value="2"><p>审核结果</p></oas-stepper-panel>
    </oas-stepper>
  </div>
</DemoBlock>

## 面板联动（受控 current）

`current` 双向：点击跳步写回 `current`，外部设置 `current` 即时同步 `aria-selected` 与面板显隐。prev/next 按钮不内置，宿主用按钮设置 `current` 即可。

<DemoBlock title="外部按钮控制跳步">
  <oas-stepper id="stepper-ctrl" current="1" steps='[{"title":"购物车","description":"确认商品"},{"title":"填写地址","description":"收货信息"},{"title":"确认支付","description":"完成下单"}]'>
    <oas-stepper-panel value="0">
      <oas-space direction="vertical" size="small">
        <oas-tag type="primary">商品 A × 1</oas-tag>
        <oas-tag>商品 B × 2</oas-tag>
      </oas-space>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <oas-input placeholder="收货人姓名" style="width: 240px"></oas-input>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <oas-button type="primary">提交订单</oas-button>
    </oas-stepper-panel>
  </oas-stepper>
  <oas-space style="margin-top: 16px">
    <oas-button id="stepper-prev">上一步</oas-button>
    <oas-button id="stepper-next" type="primary">下一步</oas-button>
  </oas-space>
</DemoBlock>

## 自定义步骤内容

每步的 `icon` 字段（图标注册表键）在指示器位置渲染图标（显式 icon 优先于状态默认图标）；面板内容走默认插槽，可自由组合任意内容。

<DemoBlock title="图标步骤 + 富内容面板">
  <oas-stepper current="1" steps='[{"title":"选择方案","description":"套餐配置","icon":"edit"},{"title":"确认信息","description":"核对明细","icon":"check-circle"},{"title":"完成开通","description":"立即生效","icon":"download"}]'>
    <oas-stepper-panel value="0">
      <oas-radio>基础版</oas-radio>
      <oas-radio>专业版</oas-radio>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <oas-descriptions :column="2" title="套餐明细">
        <oas-descriptions-item label="套餐">专业版</oas-descriptions-item>
        <oas-descriptions-item label="价格">¥ 199/年</oas-descriptions-item>
      </oas-descriptions>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <oas-alert type="success" title="开通成功">专业版已生效，立即开始使用。</oas-alert>
    </oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 键盘与无障碍

步骤头为 `role="tablist"` + 每步 `role="tab"`（`aria-selected` / `aria-disabled` 同步），面板为 `role="tabpanel"` + `aria-labelledby` 关联。roving tabindex：Tab 进入落在当前步，方向键在步骤间移动焦点（横向 ←/→、纵向 ↑/↓，禁步跳过）、Home/End 跳首末，Enter/Space 激活跳步。

<DemoBlock title="键盘导航">
  <oas-stepper id="stepper-keyboard" current="0" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"},{"title":"第四步"}]'>
    <oas-stepper-panel value="0"><p>焦点落在第一步，按 → 或 Enter 体验键盘导航。</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>第二步内容</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>第三步内容</p></oas-stepper-panel>
    <oas-stepper-panel value="3"><p>第四步内容</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## 尺寸档位

`size` 五档（`xs` / `small` / `medium` / `large` / `xl`）调节标题字号密度；非法值回落 `medium` 并在 dev 下告警。

<DemoBlock title="size 五档">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-stepper size="xs" current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-stepper>
    <oas-stepper size="small" current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-stepper>
    <oas-stepper current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-stepper>
    <oas-stepper size="large" current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-stepper>
    <oas-stepper size="xl" current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-stepper>
  </oas-space>
</DemoBlock>

## API

### oas-stepper

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clickable` | 步骤可点击跳步（默认 true；`clickable="false"` 关闭：点击/键盘静默，键盘仍可移动焦点） | `string` | `true` |
| `current` | 当前步骤索引（0 起，双向：点击跳步写回、外部设置即时同步 aria-selected 与面板显隐）；非法值回落 0，越界夹取 | `string` | `0` |
| `direction` | 方向：`horizontal`（默认，横向排列）/ `vertical`（纵向排列，指示器左/标题右） | `string` | `horizontal` |
| `linear` | 线性模式：仅允许跳转 `index <= current` 的步骤（未来步 `aria-disabled` + 视觉弱化，点击/键盘静默） | `boolean` | — |
| `size` | 尺寸档位：`xs`/`small`/`medium`/`large`/`xl`（标题字号密度；非法值回落 medium + dev 告警，同值去重） | `string` | `medium` |
| `steps` | 步骤数据 JSON `[{ title, description?, icon?, disabled?, status? }]`（语义对齐 oas-steps 的 StepItem 减去面板无关项）；非法/空回落 `[]` | `StepperStep[] \| string` | `[]` |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 可点击跳步时触发（点击步骤 / 键盘 Enter/Space）；`detail: { index }`（0 起，bubbles + composed，写回 current） |

| 名称 | 说明 |
| --- | --- |
| 默认 | 内容面板投影区（`<oas-stepper-panel>` 直接子元素）；面板按 value 关联步骤序号，仅 current 匹配者可见 |

### oas-stepper-panel

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 关联步骤序号字符串（如 `value="0"`）；仅 `current` 匹配的面板可见（hidden 由 oas-stepper 驱动） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 面板内容（默认插槽） |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 可点击跳步：oas-change 反馈
  document.getElementById('stepper-click')?.addEventListener('oas-change', (e) => {
    message.info(`已切换到第 ${e.detail.index + 1} 步`)
  })
  // linear 禁跳：oas-change 只对回跳/当前步触发
  document.getElementById('stepper-linear')?.addEventListener('oas-change', (e) => {
    message.info(`已切换到第 ${e.detail.index + 1} 步`)
  })
  // disabled 步骤演示
  document.getElementById('stepper-disabled')?.addEventListener('oas-change', (e) => {
    message.info(`已切换到第 ${e.detail.index + 1} 步`)
  })
  // 受控：外部按钮设置 current
  const ctrl = document.getElementById('stepper-ctrl')
  const prevBtn = document.getElementById('stepper-prev')
  const nextBtn = document.getElementById('stepper-next')
  const sync = () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    prevBtn?.setAttribute('disabled', cur <= 0 ? '' : '')
    nextBtn?.setAttribute('disabled', cur >= 2 ? '' : '')
  }
  prevBtn?.addEventListener('click', () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    ctrl?.setAttribute('current', String(Math.max(0, cur - 1)))
    sync()
  })
  nextBtn?.addEventListener('click', () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    ctrl?.setAttribute('current', String(Math.min(2, cur + 1)))
    sync()
  })
  sync()
  // 竖向演示：跳步反馈
  document.getElementById('stepper-vertical')?.addEventListener('oas-change', (e) => {
    message.info(`已切换到第 ${e.detail.index + 1} 步`)
  })
})
</script>
