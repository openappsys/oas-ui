# Questionnaire 多步问答

步骤驱动的表单流程编排组件：步骤头 + 进度（「第 n / m 步」）+ 每步内容面板 + 单步校验门控。适合向导式表单 / 问卷 / 多步结算等场景。校验复用 `oas-form` 内核——**每步面板内放一个 `<oas-form>`**，下一步前对当前步校验、未过不放行；回退不校验、面板常驻不卸载（已填值保留）。

> 边界：线性门控 + 可选步跳过 + `oas-before-change` 宿主自定义跳转 + **条件分支走宿主组合通道**（`hidden` 数据位 + `oas-before-change` + `oas-values-change`，见下文）；谓词 / 表达式引擎不内置（宿主持有全量答案数据，分支决策留在宿主可 veto、可测试的应用层）。起始页/完成页暂不内置；草稿持久化请用 `current` + `getValues()` 自行实现。

## 基础用法

`steps` 传步骤数组（`{ key?, title, description?, optional?, hidden? }`），每步内容经命名插槽关联：有 `key` 用 `slot="step-<key>"`，无 `key` 用 `slot="step-<index>"`。末步主按钮自动变为「完成」，点击重校全部参与步后派发 `oas-submit`（`detail.values` 为跨步汇总值）。**取值与校验同口径**——只含「参与步」（非 `hidden` 且未被跳过的步）；需全量数据的宿主可读取各面板内的 `oas-form` 自行汇总。

<DemoBlock title="基础多步问答">
  <oas-questionnaire id="q-basic" style="width: 100%; max-width: 560px" steps='[{"key":"info","title":"收货信息","description":"填写收货人"},{"key":"pay","title":"支付方式","description":"选择支付渠道"},{"key":"done","title":"确认提交"}]'>
    <oas-form slot="step-info" rules='{"receiver":[{"required":true,"message":"请输入收货人"}]}'>
      <oas-input name="receiver" placeholder="收货人姓名（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-pay" initial-values='{"channel":"alipay"}'>
      <oas-radio-group name="channel">
        <oas-radio value="alipay">支付宝</oas-radio>
        <oas-radio value="wechat">微信支付</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">信息确认无误后，点击「完成」提交。</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 单步校验门控

下一步前对当前步 `oas-form` 校验（委托其 `validate()`），未过不放行并派发 `oas-step-validate`（`detail: { index, key?, valid, errors }`）；回退不校验（不会被错误困在当前步）。`validation="false"` 关闭门控（纯导航）。

<DemoBlock title="未填不放行">
  <oas-questionnaire id="q-gate" style="width: 100%; max-width: 480px" steps='[{"title":"联系方式"},{"title":"完成"}]'>
    <oas-form slot="step-0" rules='{"phone":[{"required":true,"message":"请输入手机号"},{"pattern":"^1\\d{10}$","message":"手机号格式不正确"}]}'>
      <oas-input name="phone" placeholder="手机号（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">校验通过后才能到达这一步。</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-gate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 可选步跳过

步骤声明 `optional: true` 后，导航区出现「跳过本步」按钮：跳过不触发校验、直接前进，派发 `oas-skip`（`detail: { index, key? }`）。被跳过的步**退出参与步集合**——其值不进 `getValues()` / `oas-submit`、也不再参与提交重校；重新回到该步（回退 / 头部点击 / `goto()`）即恢复参与，`reset()` 清全部跳过记录。

<DemoBlock title="可选步（Skip）">
  <oas-questionnaire id="q-skip" style="width: 100%; max-width: 480px" steps='[{"title":"基本信息"},{"key":"invite","title":"邀请码","optional":true,"description":"没有可跳过"},{"title":"完成"}]'>
    <oas-form slot="step-0" rules='{"nickname":[{"required":true,"message":"请输入昵称"}]}'>
      <oas-input name="nickname" placeholder="昵称（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-invite">
      <oas-input name="invite" placeholder="邀请码（可留空）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-2">
      <p style="color: var(--oas-color-text-secondary); margin: 0">最后一步。</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-skip-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 宿主拦截跳步（oas-before-change）

任何跳步（按钮 / 头部点击 / `next()` / `prev()` / `goto()` / 跳过）前派发可取消事件 `oas-before-change`（`detail: { index, key?, from }`），宿主 `preventDefault()` 可否决——也是自定义分支跳转的挂点。`linear="false"` 关闭线性禁跳后，头部任意步可点。

<DemoBlock title="preventDefault 否决跳步">
  <oas-questionnaire id="q-veto" linear="false" style="width: 100%; max-width: 520px" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"确认页"}]'>
    <oas-form slot="step-0"><p style="margin: 0">第一步内容</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">第二步内容</p></oas-form>
    <oas-form slot="step-2"><p style="margin: 0">确认页（演示中被宿主拦截，进不来）</p></oas-form>
  </oas-questionnaire>
  <span id="q-veto-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 条件分支（按答案跳步）

条件分支走**宿主组合通道**，不内置谓词引擎：宿主监听 `oas-values-change` 拿到答案，按业务规则改写 `steps` 翻转 `hidden` 位即生效——被隐藏步退出头部与进度、`next()` 自动跳过、其值退出取值与校验口径。若翻转的是用户所在步，组件自动把 `current` 对齐到最近可见步并派发 `oas-change`（宿主无需再手动跳转）。分支决策留宿主的好处：规则可单测、可在 `oas-before-change` 里再 veto、避免在组件内重造一套表达式语言。

<DemoBlock title="按答案隐藏/恢复步骤">
  <oas-questionnaire id="q-cond" style="width: 100%; max-width: 520px" steps='[{"key":"need","title":"是否开票"},{"key":"invoice","title":"发票信息"},{"key":"done","title":"确认提交"}]'>
    <oas-form slot="step-need" initial-values='{"need":"yes"}'>
      <oas-radio-group name="need">
        <oas-radio value="yes">需要开票</oas-radio>
        <oas-radio value="no">不需要</oas-radio>
      </oas-radio-group>
    </oas-form>
    <oas-form slot="step-invoice" rules='{"title":[{"required":true,"message":"请输入发票抬头"}]}'>
      <oas-input name="title" placeholder="发票抬头（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-done">
      <p style="color: var(--oas-color-text-secondary); margin: 0">最后一步。</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-cond-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 切换动画（animated）

`animated` 开启题目切换过渡：新面板按导航方向滑入 + 淡入（前进自行尾侧、后退自行首侧；只动 transform/opacity，合成器友好）；`prefers-reduced-motion: reduce` 用户自动降级为无动画。时长经 CSS 变量 `--oas-questionnaire-anim-duration` 覆盖（缺省 `--oas-transition-base`）；RTL 布局下滑入方向自动镜像。

<DemoBlock title="animated 切换过渡（点下一步/上一步观察滑入方向）">
  <oas-questionnaire id="q-anim" animated style="width: 100%; max-width: 520px" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"}]'>
    <oas-form slot="step-0"><p style="margin: 0">点「下一步」：本面板按导航方向滑入 + 淡入。</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">前进与后退的滑入方向相反；回到第一步用「上一步」观察。</p></oas-form>
    <oas-form slot="step-2"><p style="margin: 0">最后一步。</p></oas-form>
  </oas-questionnaire>
  <span style="display: flex; margin-top: 8px">
    <oas-button id="q-anim-reset">reset()</oas-button>
  </span>
</DemoBlock>

## 受控 current 与方法

`current` 双向：内部跳步写回属性，外部设置即时同步。命令式方法 `next()` / `prev()` / `goto(index)` / `validate()` / `submit()` / `getValues()` / `reset()` 覆盖全部导航与取值场景。

> 事件命名提示：步骤面板内字段自身的 `oas-change` / `oas-input` 等事件会冒泡穿出 questionnaire。字段 `oas-change` 与切步 `oas-change` **同名**——监听切步时请按 `detail.index` 过滤（字段事件不含 `index`）；字段值变化推荐监听 `oas-values-change`（`detail: { name, value, values }`）。

<DemoBlock title="外部控制与取值">
  <oas-questionnaire id="q-ctrl" style="width: 100%; max-width: 480px" steps='[{"key":"a","title":"甲步"},{"key":"b","title":"乙步"},{"key":"c","title":"丙步"}]'>
    <oas-form slot="step-a" rules='{"va":[{"required":true,"message":"请填写字段 A"}]}'>
      <oas-input name="va" placeholder="字段 A（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-b" rules='{"vb":[{"required":true,"message":"请填写字段 B"}]}'>
      <oas-input name="vb" placeholder="字段 B（必填）" style="width: 240px"></oas-input>
    </oas-form>
    <oas-form slot="step-c">
      <oas-input name="vc" placeholder="字段 C（选填）" style="width: 240px"></oas-input>
    </oas-form>
  </oas-questionnaire>
  <oas-space style="margin-top: 16px; display: flex; flex-wrap: wrap">
    <oas-button id="q-ctrl-prev">prev()</oas-button>
    <oas-button id="q-ctrl-next" type="primary">next()</oas-button>
    <oas-button id="q-ctrl-goto">goto(2)</oas-button>
    <oas-button id="q-ctrl-validate">validate()</oas-button>
    <oas-button id="q-ctrl-values">getValues()</oas-button>
    <oas-button id="q-ctrl-reset">reset()</oas-button>
  </oas-space>
  <span id="q-ctrl-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 进度形态

`progress-variant` 三档：`both`（默认，文本 + 进度条）/ `text`（只留「第 n / m 步」）/ `bar`（只留进度条）；`progress="false"` 整体隐藏。进度条走 `role="progressbar"` + `aria-valuenow/min/max`，读屏可朗读。

<DemoBlock title="progress-variant 三档 + 隐藏">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-questionnaire progress-variant="both" steps='[{"title":"甲"},{"title":"乙"},{"title":"丙"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">both（默认）</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">文本 + 进度条</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">丙</p></oas-form>
    </oas-questionnaire>
    <oas-questionnaire progress-variant="text" steps='[{"title":"甲"},{"title":"乙"},{"title":"丙"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">text</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">只留进度文本</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">丙</p></oas-form>
    </oas-questionnaire>
    <oas-questionnaire progress-variant="bar" steps='[{"title":"甲"},{"title":"乙"},{"title":"丙"}]' current="1">
      <oas-form slot="step-0"><p style="margin: 0">bar</p></oas-form>
      <oas-form slot="step-1"><p style="margin: 0">只留进度条</p></oas-form>
      <oas-form slot="step-2"><p style="margin: 0">丙</p></oas-form>
    </oas-questionnaire>
  </oas-space>
</DemoBlock>

## 回退值保留与重置

面板常驻不卸载（仅切 `hidden`）：前进再回退，已填值不丢。`reset()` 全部步骤回到初始值、清错误态、回第一步，不派发事件。

<DemoBlock title="回退不丢值 + reset()">
  <oas-questionnaire id="q-keep" style="width: 100%; max-width: 480px" steps='[{"title":"第一步"},{"title":"第二步"}]'>
    <oas-form slot="step-0" rules='{"ka":[{"required":true,"message":"请填写"}]}' initial-values='{"ka":"预填值"}'>
      <oas-input name="ka" placeholder="字段（initial-values 预填，改掉试试）" style="width: 280px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">点「上一步」回到第一步，已改的值还在。</p>
    </oas-form>
  </oas-questionnaire>
  <span style="display: flex; margin-top: 8px">
    <oas-button id="q-keep-reset">reset()</oas-button>
  </span>
  <span id="q-keep-output" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 自定义导航区（hide-header / hide-nav）

`hide-header` / `hide-nav` 隐藏内置步骤头 / 导航区，宿主可完全自组合（进度与面板仍由组件驱动）。

<DemoBlock title="hide-nav + 外部按钮驱动">
  <oas-questionnaire id="q-bare" hide-nav style="width: 100%; max-width: 480px" steps='[{"title":"甲"},{"title":"乙"}]'>
    <oas-form slot="step-0"><p style="margin: 0">内置导航已隐藏</p></oas-form>
    <oas-form slot="step-1"><p style="margin: 0">由外部按钮驱动</p></oas-form>
  </oas-questionnaire>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="q-bare-prev">上一步</oas-button>
    <oas-button id="q-bare-next" type="primary">下一步</oas-button>
  </oas-space>
  <span id="q-bare-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 纯导航模式（validation / progress / hide-header）

`validation="false"` 关闭单步门控（纯导航，未填也放行）；`progress="false"` 隐藏进度区；`hide-header` 隐藏内置步骤头。三者可独立开启，也可组合成极简流程（只剩面板与导航按钮）。

<DemoBlock title="纯导航：无门控 / 无进度 / 无头部">
  <oas-questionnaire id="q-bare-nav" hide-header progress="false" validation="false" style="width: 100%; max-width: 480px" steps='[{"title":"甲步"},{"title":"乙步"}]'>
    <oas-form slot="step-0" rules='{"bv":[{"required":true,"message":"纯导航模式不拦截必填"}]}'>
      <oas-input name="bv" placeholder="必填字段（纯导航不拦截）" style="width: 260px"></oas-input>
    </oas-form>
    <oas-form slot="step-1">
      <p style="color: var(--oas-color-text-secondary); margin: 0">未填也能到达本步（门控已关闭）。</p>
    </oas-form>
  </oas-questionnaire>
  <span id="q-bare-nav-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 基础用法：提交汇总回显
  const basicOut = document.getElementById('q-basic-output')
  document.getElementById('q-basic')?.addEventListener('oas-submit', (e) => {
    basicOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  document.getElementById('q-basic')?.addEventListener('oas-change', (e) => {
    // 内层字段的 oas-change 会冒泡穿出且与切步事件同名：只处理带 index 的切步事件
    if (typeof e.detail?.index !== 'number') return
    message.info(`已到第 ${e.detail.index + 1} 步`)
  })

  // 门控：拦截反馈
  const gateOut = document.getElementById('q-gate-output')
  document.getElementById('q-gate')?.addEventListener('oas-step-validate', (e) => {
    const { valid, errors } = e.detail
    gateOut.textContent = valid
      ? '校验通过，已放行'
      : `门控拦截：${Object.values(errors).join('；')}`
  })

  // 跳过：oas-skip 反馈
  const skipOut = document.getElementById('q-skip-output')
  let skipJustNow = false
  document.getElementById('q-skip')?.addEventListener('oas-skip', (e) => {
    skipJustNow = true
    skipOut.textContent = `已跳过第 ${e.detail.index + 1} 步（未触发校验）`
  })
  document.getElementById('q-skip')?.addEventListener('oas-change', (e) => {
    // 内层字段 oas-change 同名冒泡：只处理带 index 的切步事件
    if (typeof e.detail?.index !== 'number') return
    // 跳过引起的切步保留「已跳过」反馈（change 紧随 skip 同步到达，不覆盖）
    if (skipJustNow) {
      skipJustNow = false
      return
    }
    skipOut.textContent = '已进入下一步'
  })

  // before-change：否决进入确认页
  const vetoOut = document.getElementById('q-veto-output')
  document.getElementById('q-veto')?.addEventListener('oas-before-change', (e) => {
    if (e.detail.index === 2) {
      e.preventDefault()
      vetoOut.textContent = '宿主已否决：确认页请走完整流程（或在此实现自定义分支跳转）'
    }
  })

  // 切换动画：reset 提供重复观看入口
  document.getElementById('q-anim-reset')?.addEventListener('click', () => {
    document.getElementById('q-anim')?.reset()
  })

  // 条件分支：按答案翻转 hidden（宿主组合通道，无内建谓词引擎）
  const cond = document.getElementById('q-cond')
  const condOut = document.getElementById('q-cond-output')
  const condSteps = (invoiceHidden) =>
    JSON.stringify([
      { key: 'need', title: '是否开票' },
      { key: 'invoice', title: '发票信息', hidden: invoiceHidden },
      { key: 'done', title: '确认提交' },
    ])
  cond?.addEventListener('oas-values-change', (e) => {
    const need = e.detail?.values?.need
    if (need !== 'yes' && need !== 'no') return
    const hide = need === 'no'
    cond.setAttribute('steps', condSteps(hide))
    condOut.textContent = hide
      ? '已隐藏「发票信息」步：点「下一步」将自动跳过；选回「需要开票」即恢复'
      : '「发票信息」步已恢复显示'
  })

  // 受控与方法
  const ctrl = document.getElementById('q-ctrl')
  const ctrlOut = document.getElementById('q-ctrl-output')
  document.getElementById('q-ctrl-prev')?.addEventListener('click', () => {
    ctrlOut.textContent = `prev() → ${ctrl.prev() ? `第 ${Number(ctrl.getAttribute('current')) + 1} 步` : '无法再退'}`
  })
  document.getElementById('q-ctrl-next')?.addEventListener('click', () => {
    ctrl.next().then((ok) => {
      ctrlOut.textContent = ok ? `next() → 第 ${Number(ctrl.getAttribute('current')) + 1} 步` : '门控未过，留在本步'
    })
  })
  document.getElementById('q-ctrl-goto')?.addEventListener('click', () => {
    ctrlOut.textContent = `goto(2) → ${ctrl.goto(2) ? '已跳到丙步（直跳不校验）' : '无法跳转'}`
  })
  document.getElementById('q-ctrl-validate')?.addEventListener('click', () => {
    ctrl.validate().then((ok) => {
      ctrlOut.textContent = ok ? 'validate()：全部步通过' : 'validate()：存在未过步骤（看红字）'
    })
  })
  document.getElementById('q-ctrl-values')?.addEventListener('click', () => {
    ctrlOut.textContent = `getValues(): ${JSON.stringify(ctrl.getValues())}`
  })
  document.getElementById('q-ctrl-reset')?.addEventListener('click', () => {
    ctrl.reset()
    ctrlOut.textContent = 'reset()：已回第一步并清空（不派发事件）'
  })

  // 回退值保留 + reset
  const keep = document.getElementById('q-keep')
  const keepOut = document.getElementById('q-keep-output')
  keep?.addEventListener('oas-change', (e) => {
    // 内层字段 oas-change 同名冒泡：只处理带 index 的切步事件
    if (typeof e.detail?.index !== 'number') return
    keepOut.textContent = `当前第 ${e.detail.index + 1} 步`
  })
  document.getElementById('q-keep-reset')?.addEventListener('click', () => {
    keep.reset()
    keepOut.textContent = 'reset()：回到 initial-values 预填值'
  })

  // hide-nav 外部驱动
  const bare = document.getElementById('q-bare')
  const bareOut = document.getElementById('q-bare-output')
  const syncBare = () => {
    bareOut.textContent = `当前第 ${Number(bare.getAttribute('current')) + 1} / 2 步`
  }
  document.getElementById('q-bare-prev')?.addEventListener('click', () => {
    bare.prev()
    syncBare()
  })
  document.getElementById('q-bare-next')?.addEventListener('click', () => {
    bare.next().then(syncBare)
  })
  syncBare()

  // 纯导航模式：切步反馈（无门控，必填留空也放行）
  const bareNavOut = document.getElementById('q-bare-nav-output')
  document.getElementById('q-bare-nav')?.addEventListener('oas-change', (e) => {
    if (typeof e.detail?.index !== 'number') return
    bareNavOut.textContent = `纯导航前进到第 ${e.detail.index + 1} 步`
  })
})
</script>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `next()` | 下一步：先对当前步 `oas-form` 校验（`validation="false"` 时跳过），通过才前进；异步校验在途时重入直接拒绝。返回 `Promise<boolean>` |
| `prev()` | 上一步：不校验（回退不被错误困住）。返回 `boolean` |
| `goto(index)` | 直跳任意步：不走单步门控；越界夹取，落在 hidden 步时向后解析。返回 `boolean` |
| `validate()` | 校验全部参与步（非 `hidden` 且未跳过；顺序执行，逐步派发 `oas-step-validate`），返回 `Promise<boolean>` |
| `submit()` | 提交：重校全部参与步（含早期步），全过才派发 `oas-submit`（`detail.values` 为跨步汇总值，仅参与步——`hidden` / 已跳过步不计入）。返回 `Promise<boolean>` |
| `getValues()` | 跨步值汇总（参与步口径，与校验同集合）：各参与步 `oas-form` 当前值按步序深合并（与单表 `submit()` 的 `detail.values` 同口径，零交互的 `value` 属性预填同样计入）；需全量数据可读各面板内的 `oas-form`。返回 `Record<string, unknown>` |
| `reset()` | 全部步骤 form 重置回初始值、清错误态、`current` 回 0；不派发任何事件 |

### oas-questionnaire

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `animated` | 题目切换过渡（opt-in，存在且非 `"false"` 时开启）：新面板按导航方向滑入 + 淡入（只动 transform/opacity）；`prefers-reduced-motion: reduce` 自动降级为无动画；RTL 滑入方向自动镜像 | `boolean` | — |
| `current` | 当前步索引（0 起，受控双向：内部跳步写回、外部设置即时同步）；非法值回落 0，越界夹取 | `string` | `0` |
| `finish-text` | 末步主按钮文案（覆盖 locale 缺省「完成」） | — | — |
| `hide-header` | 隐藏内置步骤头（宿主自组合） | `boolean` | — |
| `hide-nav` | 隐藏内置导航区（宿主自组合） | `boolean` | — |
| `linear` | 线性模式（默认开，`linear="false"` 关闭）：未来步头部禁点；关闭后任意步可点（仍走 oas-before-change 拦截） | `string` | `true` |
| `next-text` | 「下一步」按钮文案（覆盖 locale 缺省） | — | — |
| `prev-text` | 「上一步」按钮文案（覆盖 locale 缺省） | — | — |
| `progress` | 进度区显隐（`progress="false"` 隐藏） | `string` | `true` |
| `progress-variant` | 进度形态：`both`（默认，文本+进度条）/ `text` / `bar`；非法值回落 `both` | `string` | `both` |
| `size` | 尺寸档位：`xs`/`small`/`medium`/`large`/`xl`（标题字号密度；非法值回落 medium + dev 告警） | `string` | `medium` |
| `skip-text` | 「跳过本步」按钮文案（覆盖 locale 缺省） | — | — |
| `steps` | 步骤数据 JSON `[{ key?, title, description?, optional?, hidden? }]`；非法/空回落 `[]` | `QuestionnaireStep[] \| string` | `[]` |
| `validation` | 单步校验门控（默认开，`validation="false"` 纯导航；`submit()` 不受此开关影响、始终重校） | `string` | `true` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-change` | 跳步前（按钮 / 头部点击 / next / prev / goto / 跳过）可取消；`detail: { index, key?, from }`，`preventDefault()` 否决本次跳转 |
| `oas-change` | 切步成功后；`detail: { index, key? }` |
| `oas-skip` | 跳过可选步时；`detail: { index, key? }`（跳过不触发校验；被跳过的步退出取值/校验口径，重新进入恢复） |
| `oas-step-validate` | 单步校验结束时；`detail: { index, key?, valid, errors }` |
| `oas-submit` | 末步完成（全部参与步校验通过）；`detail: { values }`（跨步汇总值，仅参与步——hidden / 已跳过步不计入） |
| `oas-values-change` | 内层 oas-form 值变化事件自然冒泡转发（`detail: { name, value, values }`，values 为该步快照）；跨步汇总视图用 getValues() |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `step-<index>` | 步骤内容面板（无 key 的步骤按数组下标关联） |
| `step-<key>` | 步骤内容面板（有 key 的步骤）；面板内建议放一个 `<oas-form>` 承载该步字段与校验规则 |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-questionnaire-anim-duration` | 切步动画时长（animated 开启时生效） | `var(--oas-transition-base, 180ms)` |
| `--oas-questionnaire-nav-gap` | 导航区按钮间距 | `var(--oas-space-2)` |
| `--oas-questionnaire-progress-bar-bg` | 进度条填充色 | `var(--oas-color-primary)` |
| `--oas-questionnaire-progress-bg` | 进度条轨道底色 | `var(--oas-color-bg-hover)` |
