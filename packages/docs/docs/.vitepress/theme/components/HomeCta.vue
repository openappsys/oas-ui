<template>
  <section class="home-cta">
    <!-- 与其他屏的 .home-section::before 分隔光带同款同位（本节 ::before 被
         网格背景占用，两个伪元素均有职，故用显式元素承载分隔线） -->
    <div class="home-divider" aria-hidden="true"></div>
    <div class="hcta-wrap">
      <div class="hcta-card home-reveal">
      <div class="hcta-grid">
        <div class="hcta-left">
          <div class="hcta-eyebrow">GET STARTED</div>
          <h2 class="hcta-title">{{ isEn ? 'Three lines. Then ship.' : '三行代码，开始用' }}</h2>
          <p class="hcta-sub">
            {{
              isEn
                ? 'Install, import, build — then write your UI like plain HTML.'
                : '装包、引入主题、引入组件——然后像写 HTML 一样写你的界面。'
            }}
          </p>
          <div class="hcta-steps">
            <div class="hcta-step"><span class="hcta-no">01</span><div><b>{{ isEn ? 'Install' : '安装' }}</b><p>{{ isEn ? 'one pnpm command' : 'pnpm add 一行命令装齐' }}</p></div></div>
            <div class="hcta-step"><span class="hcta-no">02</span><div><b>{{ isEn ? 'Import' : '引入' }}</b><p>{{ isEn ? 'theme + ui entries' : 'theme + ui 两个入口' }}</p></div></div>
            <div class="hcta-step"><span class="hcta-no">03</span><div><b>{{ isEn ? 'Use' : '使用' }}</b><p>&lt;oas-button&gt; {{ isEn ? 'directly' : '直接用' }}</p></div></div>
          </div>
          <div class="hcta-btns">
            <oas-button type="primary" size="large" @oas-click="goGettingStarted">
              {{ isEn ? 'Get Started' : '快速开始' }}
            </oas-button>
            <oas-button size="large" @oas-click="goGithub">
              GitHub
            </oas-button>
          </div>
        </div>
        <div class="hcta-term">
          <div class="hcta-term-bar">
            <i class="r"></i><i class="y"></i><i class="g"></i>
            <span class="hcta-term-file">oas-ui@2.0.0</span>
          </div>
          <div class="hcta-term-body">
            <div><span class="pmt">~/demo</span> <span class="dlr">$</span> <span class="cmd">pnpm add @oas-ui/ui @oas-ui/theme</span></div>
            <div class="ok-line"><span class="ok">✓</span> added <b>2 packages</b> · 0 framework runtime deps</div>
            <div>&nbsp;</div>
            <div><span class="pmt">~/demo</span> <span class="dlr">$</span> <span class="cmd">touch main.ts</span></div>
            <div class="code-line"><span class="kw">import</span> <span class="st">'@oas-ui/theme'</span></div>
            <div class="code-line"><span class="kw">import</span> <span class="st">'@oas-ui/ui'</span></div>
            <div>&nbsp;</div>
            <div><span class="pmt">~/demo</span> <span class="dlr">$</span> <span class="cmd">npm run dev</span><span class="cur"></span></div>
            <div class="ok-line" style="color: var(--home-ok)">
              VITE ready in <b>22ms</b> · Local: http://localhost:5173
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

function goGettingStarted(): void {
  if (typeof window !== 'undefined') window.location.href = '/guide/getting-started'
}
function goGithub(): void {
  if (typeof window !== 'undefined') window.open('https://github.com/openappsys/oas-ui', '_blank', 'noopener')
}
</script>

<style scoped>
.home-cta {
  position: relative;
  padding: 96px 0 120px;
  overflow: hidden;
  background: var(--home-bg);
}
.home-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(11, 108, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 108, 255, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(70% 70% at 50% 50%, #000 20%, transparent 100%);
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 20%, transparent 100%);
}
.home-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(46% 60% at 50% 20%, var(--home-glow), transparent 65%);
}
.hcta-wrap {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px;
}
.hcta-card {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--oas-color-primary) 30%, var(--home-border));
  border-radius: 24px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--oas-color-primary) 8%, transparent), transparent 55%, var(--home-card-bg));
  padding: 56px 60px;
  box-shadow: 0 30px 80px -30px color-mix(in srgb, var(--oas-color-primary) 25%, transparent);
}
.hcta-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 56px;
  align-items: center;
}
.hcta-eyebrow {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--oas-color-primary);
  text-transform: uppercase;
}
.hcta-title {
  margin-top: 16px;
  font-size: clamp(28px, 3.6vw, 38px);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.2;
  background: var(--home-grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hcta-sub {
  margin-top: 14px;
  color: var(--oas-color-text-secondary);
  font-size: 15px;
  line-height: 1.8;
}
.hcta-steps {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hcta-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.hcta-no {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 11px;
  color: var(--oas-color-primary);
  border: 1px solid color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  border-radius: 6px;
  padding: 2px 8px;
  flex-shrink: 0;
  margin-top: 2px;
}
.hcta-step b {
  font-size: 14px;
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.hcta-step p {
  font-size: 12.5px;
  color: var(--oas-color-text-secondary);
  margin-top: 2px;
}
.hcta-btns {
  margin-top: 34px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.hcta-term {
  background: var(--home-code-bg);
  border: 1px solid var(--home-code-border);
  border-radius: var(--oas-radius-lg);
  overflow: hidden;
  box-shadow: 0 34px 80px -28px rgba(0, 0, 0, 0.75);
}
.hcta-term-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 13px 16px;
  background: #161b22;
}
.hcta-term-bar i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.hcta-term-bar .r {
  background: #ff5f57;
}
.hcta-term-bar .y {
  background: #febc2e;
}
.hcta-term-bar .g {
  background: #28c840;
}
.hcta-term-file {
  margin-left: 12px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  color: #8b949e;
}
.hcta-term-body {
  padding: 22px 24px 26px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 13px;
  line-height: 1.95;
  color: #c9d1d9;
}
.hcta-term-body .pmt {
  color: #7ee787;
}
.hcta-term-body .dlr {
  color: #8b949e;
}
.hcta-term-body .cmd {
  color: #e6edf3;
}
.hcta-term-body .ok {
  color: #7ee787;
}
.hcta-term-body b {
  color: #e6edf3;
  font-weight: 600;
}
.hcta-term-body .code-line {
  color: #e6edf3;
}
.hcta-term-body .kw {
  color: #ff7b72;
}
.hcta-term-body .st {
  color: #a5d6a7;
}
.hcta-term-body .ok-line {
  color: #8b949e;
}
.cur {
  display: inline-block;
  width: 8px;
  height: 14px;
  background: #c9d1d9;
  vertical-align: -2px;
  animation: blink 1.1s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 900px) {
  .hcta-grid {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .hcta-card {
    padding: 40px 28px;
  }
}
</style>
