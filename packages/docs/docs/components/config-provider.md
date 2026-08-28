# ConfigProvider 全局配置

全局配置的注入入口，统一管理包裹子树的 `locale` / `size` / `theme` / `config` / `direction` / `z-index`。组件读取顺序：自身属性 > config-provider > 全局默认。

## Locale 注入

config-provider 的 `locale` 就近优先于全局 `setLocale()`：包裹内的组件用注入的 locale 翻译内置文案。

<DemoBlock title="Locale 切换">
  <oas-space>
    <oas-button type="primary" onclick="setCpLocale('zh-CN')">中文</oas-button>
    <oas-button onclick="setCpLocale('en')">English</oas-button>
  </oas-space>
  <oas-config-provider id="cp-locale" locale="zh-CN">
    <oas-space style="margin-top: 16px">
      <oas-empty></oas-empty>
      <oas-tag closable>可关闭标签</oas-tag>
      <oas-alert>这是一条警告提示</oas-alert>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Size 注入

包裹内组件的 `size` 未显式设置时走注入值；自身显式设置了 `size` 的组件仍以自身为准。`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档。

<DemoBlock title="Size 注入">
  <oas-space>
    <oas-button type="primary" onclick="setCpSize('xs')">超小</oas-button>
    <oas-button type="primary" onclick="setCpSize('small')">小号</oas-button>
    <oas-button onclick="setCpSize('medium')">中号</oas-button>
    <oas-button onclick="setCpSize('large')">大号</oas-button>
    <oas-button onclick="setCpSize('xl')">超大</oas-button>
  </oas-space>
  <oas-config-provider id="cp-size" size="medium" style="margin-top: 16px; display: block">
    <oas-space>
      <oas-button>注入按钮</oas-button>
      <oas-button size="small">自身小号</oas-button>
      <oas-tag>注入标签</oas-tag>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Theme 注入

config-provider 的 `theme` 会写入 `data-theme` 到自身，包裹的子树（含 Shadow DOM）继承对应主题 token。

<DemoBlock title="Theme 注入">
  <oas-space>
    <oas-button type="primary" onclick="setCpTheme('')">浅色</oas-button>
    <oas-button onclick="setCpTheme('dark')">深色</oas-button>
  </oas-space>
  <oas-config-provider id="cp-theme" theme="" style="margin-top: 16px; display: block; padding: 16px; border-radius: 8px; background: var(--oas-color-bg)">
    <oas-space>
      <oas-button type="primary">主题按钮</oas-button>
      <oas-tag>跟随主题</oas-tag>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Config JSON 组件级默认配置

`config` 是组件级默认配置的通用通道：以 JSON 声明任意组件的默认属性（如 `{"oas-button":{"variant":"outlined"}}`），组件自身未显式设置时读取注入值。键格式为组件 tag + 属性名，就近读取、自身显式属性优先。

<DemoBlock title="Config JSON 注入 button variant">
  <oas-space>
    <oas-button type="primary" onclick="setCpConfig('outlined')">outlined 注入</oas-button>
    <oas-button type="primary" onclick="setCpConfig('filled')">filled 注入</oas-button>
    <oas-button onclick="setCpConfig('')">清除</oas-button>
  </oas-space>
  <oas-config-provider id="cp-config" style="margin-top: 16px; display: block">
    <oas-space>
      <oas-button type="primary">注入形态</oas-button>
      <oas-button>注入形态</oas-button>
      <oas-button variant="dashed">显式覆盖</oas-button>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Direction 全局方向

`direction` 设置时写入宿主 `dir` 属性：CSS `direction` 沿继承穿透 light/shadow 子树，组件（如 scroll-area 的 RTL 横向滚动转译）经注入值消费。

<DemoBlock title="Direction 全局方向">
  <oas-space>
    <oas-button type="primary" onclick="setCpDirection('rtl')">RTL</oas-button>
    <oas-button onclick="setCpDirection('ltr')">LTR</oas-button>
  </oas-space>
  <oas-config-provider id="cp-direction" direction="ltr" style="margin-top: 16px; display: block; padding: 16px; border-radius: 8px; background: var(--oas-color-bg)">
    <oas-space>
      <oas-tag>方向跟随注入</oas-tag>
      <oas-button>按钮</oas-button>
    </oas-space>
    <oas-scroll-area height="120" style="margin-top: 16px; display: block; width: 260px; border: 1px solid var(--oas-color-border); border-radius: 8px">
      <div style="width: 400px; padding: 8px">横向可滚内容区：RTL 下滚轮方向反转、横向滚动条位置镜像（scrollLeft 负值区间）。</div>
    </oas-scroll-area>
  </oas-config-provider>
</DemoBlock>

## z-index 浮层起始值

`z-index` 在宿主写入 `--oas-z-index-base`：子树内所有浮层（消息 / 通知 / 下拉 / 弹层等）在该起始值上按各自层级偏移叠加（`calc(var(--oas-z-index-base, 0) + var(--oas-z-X, <层默认值>))`）——整体抬升的同时保持层间顺序（tooltip 仍在 modal 之上）。

<DemoBlock title="z-index 浮层起始值">
  <oas-space style="margin-bottom: 12px">
    <oas-button type="primary" onclick="setCpZ(5000)">起始值 5000</oas-button>
    <oas-button onclick="setCpZ('')">重置默认</oas-button>
  </oas-space>
  <oas-config-provider id="cp-z" style="display: block">
    <oas-app>
      <oas-space>
        <oas-button type="primary" onclick="zMsg()">消息</oas-button>
        <oas-tooltip content="浮层起始值生效">悬停提示</oas-tooltip>
      </oas-space>
    </oas-app>
  </oas-config-provider>
</DemoBlock>

## 就近优先

内层 config-provider 覆盖外层：内层包裹的组件用内层配置，外层（未再嵌套）的组件用外层配置。

<DemoBlock title="就近优先">
  <oas-config-provider locale="en">
    <oas-space style="margin-bottom: 8px"><oas-tag>外层 en</oas-tag></oas-space>
    <oas-config-provider locale="zh-CN">
      <oas-space><oas-tag>内层 zh-CN</oas-tag></oas-space>
    </oas-config-provider>
  </oas-config-provider>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { registerLocale } = await import('@oas-ui/i18n')
  const en = (await import('@oas-ui/i18n/en')).default
  registerLocale(en)
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.setCpLocale = (locale) => document.getElementById('cp-locale')?.setAttribute('locale', locale)
  window.setCpSize = (size) => document.getElementById('cp-size')?.setAttribute('size', size)
  window.setCpTheme = (theme) => document.getElementById('cp-theme')?.setAttribute('theme', theme)
  window.setCpConfig = (variant) => {
    const cp = document.getElementById('cp-config')
    if (variant) cp?.setAttribute('config', JSON.stringify({ 'oas-button': { variant } }))
    else cp?.removeAttribute('config')
  }
  window.setCpDirection = (direction) => document.getElementById('cp-direction')?.setAttribute('direction', direction)
  window.setCpZ = (z) => {
    const cp = document.getElementById('cp-z')
    if (z) cp?.setAttribute('z-index', String(z))
    else cp?.removeAttribute('z-index')
  }
  window.zMsg = () => message.success('浮层起始值生效')
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `config` | 组件级默认配置 JSON（如 `{"oas-button":{"variant":"outlined"}}`）；组件经就近读取 `[tag][key]`，自身显式属性优先；非法 JSON 忽略 + dev 告警 | `string` | — |
| `direction` | 全局方向注入（`ltr`/`rtl`），设置时写入宿主 `dir` 属性（CSS direction 继承穿透 light/shadow 子树）；组件可经 `injectValue('direction')` 消费；非法值回落 `ltr` + dev 告警 | `string` | — |
| `locale` | 包裹子树的内置文案语言（需已注册），就近优先于全局 `setLocale()` | — | — |
| `size` | 包裹组件的默认尺寸，组件自身未显式设置时生效 | — | — |
| `theme` | 包裹子树的主题，写入 `data-theme` | — | — |
| `z-index` | 浮层全局起始值（正整数）；写入宿主 `--oas-z-index-base`，子树内浮层 z-index 统一抬升；非法值忽略 + dev 告警 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 组件读取顺序：自身属性 > config-provider > 全局默认。
- `locale` 需先 `registerLocale()` 注册语言包，未注册时回退全局 translator。
