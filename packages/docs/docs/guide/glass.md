# 液态玻璃画廊

> 半透明 surface + backdrop 模糊 + 高光折光边的材质层。机制与边界见[主题与自定义](/guide/theming#液态玻璃-glass-css)。

<script setup>
import { ref, onMounted } from 'vue'
const theme = ref('light')
const open = ref(false)
const msg = ref(null)
onMounted(async () => {
  document.documentElement.setAttribute('data-glass', '')
  const { message } = await import('@oas-ui/ui')
  msg.value = message
})
</script>

<div class="gg-backdrop" aria-hidden="true"></div>
<div class="gg-stage" :data-theme="theme">
  <div class="gg-toolbar">
    <button class="sg-btn" :class="{ 'sg-active': theme === 'light' }" @click="theme = 'light'">light</button>
    <button class="sg-btn" :class="{ 'sg-active': theme === 'dark' }" @click="theme = 'dark'">dark</button>
    <oas-button type="primary" @click="open = true">打开对话框</oas-button>
    <oas-button @click="msg?.success('玻璃材质消息：背景透出磨砂质感')">弹出消息</oas-button>
  </div>
  <div class="gg-cards">
    <div class="gg-card">
      <strong>卡片 surface</strong>
      <p>半透明底 + backdrop-filter 模糊 + 折光边。背景渐变更丰富时材质感更强。</p>
      <oas-tag type="primary">标签</oas-tag>
    </div>
    <div class="gg-card">
      <strong>文字可读性</strong>
      <p style="color: var(--oas-color-text-secondary)">次要文字走 token 安全档，busy 背景上仍保持可读。</p>
      <oas-input placeholder="输入框（实心控件）" style="width: 220px"></oas-input>
    </div>
  </div>
  <oas-modal v-if="open" visible no-mask title="液态玻璃对话框" @oas-close="open = false">
    <p>面板背景透出背后的渐变与按钮——blur + 高光边共同构成玻璃材质。</p>
  </oas-modal>
</div>

<style>
/* 弹窗专用亮背板：modal 固定于视口 (x≈330-850, y≈100-314)，亮板精确垫在其下——
   不依赖舞台几何（此前多轮调 radial 位置都对不准弹窗落区的根因解法） */
.gg-backdrop {
  position: fixed;
  left: 300px;
  top: 70px;
  width: 580px;
  height: 300px;
  z-index: 0;
  pointer-events: none;
  border-radius: 32px;
  background:
    radial-gradient(300px 180px at 30% 30%, rgba(120, 200, 255, 0.95), transparent 70%),
    radial-gradient(320px 200px at 72% 62%, rgba(255, 130, 190, 0.95), transparent 70%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.4) 0 14px, transparent 14px 28px),
    repeating-linear-gradient(-45deg, rgba(60, 80, 200, 0.25) 0 10px, transparent 10px 22px),
    linear-gradient(135deg, rgba(255, 200, 120, 0.95), rgba(255, 160, 150, 0.9));
}
.gg-stage {

  margin: 0 0 var(--oas-space-4);
  padding: var(--oas-space-6);
  border-radius: var(--oas-radius-lg);
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.06) 0 12px, transparent 12px 26px),
    radial-gradient(900px 520px at 46% 12%, rgba(255, 200, 120, 0.95), transparent 62%),
    radial-gradient(600px 360px at 18% 8%, rgba(120, 200, 255, 0.9), transparent 58%),
    radial-gradient(600px 360px at 78% 4%, rgba(255, 130, 190, 0.85), transparent 58%),
    radial-gradient(1200px 500px at 15% 0%, rgba(64, 120, 255, 0.55), transparent 60%),
    radial-gradient(900px 480px at 85% 20%, rgba(255, 120, 180, 0.5), transparent 60%),
    radial-gradient(1000px 600px at 50% 100%, rgba(80, 220, 170, 0.45), transparent 60%),
    linear-gradient(160deg, #2a3550, #4a2a50 55%, #1f4a44);
  /* modal 按视口居中——舞台须占满大部分视口高，弹窗才落在渐变之上（否则弹在深色页面上看不出玻璃感） */
  min-height: 72vh;
}
.gg-stage[data-theme="dark"] {
  /* 弹窗透度微调（modal 消费 --oas-color-bg；变量可继承进 shadow——零库影响） */
  --oas-color-bg: rgba(24, 24, 27, 0.5);
}
.gg-toolbar { display: flex; gap: var(--oas-space-3); align-items: center; margin-bottom: var(--oas-space-5) }
.gg-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--oas-space-4) }
.gg-card {
  background: var(--oas-color-bg-elevated);
  backdrop-filter: var(--oas-glass-blur, none);
  -webkit-backdrop-filter: var(--oas-glass-blur, none);
  outline: 1px solid var(--oas-glass-ring, transparent);
  outline-offset: -1px;
  border-radius: var(--oas-radius-lg);
  box-shadow: var(--oas-shadow-md);
  padding: var(--oas-space-4);
  color: var(--oas-color-text-primary);
}
.sg-btn {
  padding: var(--oas-space-1) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
.sg-btn.sg-active { border-color: var(--oas-color-primary); color: var(--oas-color-primary) }
</style>

## 用法

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<html data-glass>
```

- `data-glass` 叠加在 `data-theme` / `data-skin` 之上，三者自由组合；
- 材质依赖背景反差——给页面一个有色彩层次的背景（渐变/图片）时质感最强，纯色同色相背景上减弱（文字仍可读）；
- 局部降级：任意容器覆盖 `--oas-glass-blur: none; --oas-glass-ring: transparent`；
- `high-contrast` 主题下不启用（实心可访问性档优先）。
