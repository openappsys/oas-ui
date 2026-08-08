# ConfigProvider 全局配置

全局配置的注入入口，统一管理包裹子树的 `locale` / `size` / `theme`。组件读取顺序：自身属性 > config-provider > 全局默认。

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

包裹内组件的 `size` 未显式设置时走注入值；自身显式设置了 `size` 的组件仍以自身为准。

<DemoBlock title="Size 注入">
  <oas-space>
    <oas-button type="primary" onclick="setCpSize('small')">小号</oas-button>
    <oas-button onclick="setCpSize('medium')">中号</oas-button>
    <oas-button onclick="setCpSize('large')">大号</oas-button>
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
  window.setCpLocale = (locale) => document.getElementById('cp-locale')?.setAttribute('locale', locale)
  window.setCpSize = (size) => document.getElementById('cp-size')?.setAttribute('size', size)
  window.setCpTheme = (theme) => document.getElementById('cp-theme')?.setAttribute('theme', theme)
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `locale` | 包裹子树的内置文案语言（需已注册），就近优先于全局 `setLocale()` | `string` | 无（用全局） |
| `size` | 包裹组件的默认尺寸，组件自身未显式设置时生效 | `small` / `medium` / `large` | 无 |
| `theme` | 包裹子树的主题，写入 `data-theme` | `light` / `dark` / `high-contrast` | 无 |

- 组件读取顺序：自身属性 > config-provider > 全局默认。
- `locale` 需先 `registerLocale()` 注册语言包，未注册时回退全局 translator。
