<template>
  <section class="home-hero">
    <div class="hh-grid"></div>
    <div class="hh-breathe"></div>
    <div class="hh-inner">
      <div class="hh-eyebrow">
        <span>OAS-UI</span>
        <span class="hh-eyebrow-dot">·</span>
        <span>Web Components</span>
      </div>
      <h1 class="hh-title">
        {{ isEn ? 'A framework-agnostic' : '框架无关的' }}
        <br />
        <span class="hh-glow">{{ isEn ? 'Web Components UI library' : 'Web Components UI 组件库' }}</span>
      </h1>
      <p class="hh-sub">
        {{
          isEn
            ? 'One set of components, running everywhere. Zero framework dependency — works with plain HTML, React, Vue and more.'
            : '一套组件，到处运行，无框架依赖，适配原生 HTML / React / Vue / 等。'
        }}
      </p>
      <div class="hh-cta">
        <oas-button type="primary" size="large" @oas-click="goGettingStarted">
          {{ isEn ? 'Get Started' : '快速开始' }}
        </oas-button>
        <oas-button size="large" @oas-click="goGithub">
          GitHub
        </oas-button>
      </div>
      <div class="hh-pills">
        <span class="hh-pill"><i></i>{{ isEn ? 'Full TypeScript types' : 'TypeScript 全量类型' }}</span>
        <span class="hh-pill"><i></i>tree-shakable</span>
        <span class="hh-pill"><i></i>{{ isEn ? 'light/dark themes' : 'light/dark 双主题' }}</span>
        <span class="hh-pill"><i></i>SSR + DSD</span>
        <span class="hh-pill"><i></i>{{ isEn ? 'framework-agnostic i18n' : '框架无关 i18n' }}</span>
        <span class="hh-pill"><i></i>{{ isEn ? 'MIT OR Apache-2.0' : 'MIT OR Apache-2.0' }}</span>
      </div>
      <div class="hh-stats">
        <div class="hh-stat"><div class="hh-num">{{ stats.components }}</div><div class="hh-lbl">{{ isEn ? 'Components' : '组件总数' }}</div></div>
        <div class="hh-sep"></div>
        <div class="hh-stat"><div class="hh-num">{{ stats.cdnGzipKB }}<small> KB</small></div><div class="hh-lbl">CDN gzip</div></div>
        <div class="hh-sep"></div>
        <div class="hh-stat"><div class="hh-num">{{ stats.locales }}</div><div class="hh-lbl">{{ isEn ? 'Locales' : '内置语言包' }}</div></div>
        <div class="hh-sep"></div>
        <div class="hh-stat"><div class="hh-num">{{ stats.tests.toLocaleString() }}</div><div class="hh-lbl">{{ isEn ? 'Tests' : '自动化测试' }}</div></div>
        <div class="hh-sep"></div>
        <div class="hh-stat"><div class="hh-num">v{{ stats.version }}</div><div class="hh-lbl">{{ isEn ? 'Latest' : '最新版本' }}</div></div>
      </div>
      <div class="hh-scroll"><span>SCROLL</span><span class="hh-scroll-line"></span></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import stats from '../../generated/stats.json'

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
.home-hero {
  position: relative;
  padding: 96px 0 72px;
  overflow: hidden;
  background: var(--home-bg);
}
.hh-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--home-grid-line, rgba(11, 108, 255, 0.05)) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-grid-line, rgba(11, 108, 255, 0.05)) 1px, transparent 1px);
  background-size: 46px 46px;
  -webkit-mask-image: radial-gradient(70% 70% at 50% 40%, #000 30%, transparent 100%);
  mask-image: radial-gradient(70% 70% at 50% 40%, #000 30%, transparent 100%);
}
.home-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(52% 46% at 32% 24%, var(--home-hero-glow), transparent 62%),
    radial-gradient(44% 42% at 72% 32%, var(--home-glow-soft), transparent 62%);
}
/* 第三颗光晕（底部中央，scroll 提示附近）单独呼吸，其余两颗静止 */
.hh-breathe {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(40% 40% at 55% 82%, var(--home-hero-glow), transparent 60%);
  animation: home-breathe 7s ease-in-out infinite;
}
.hh-inner {
  position: relative;
  text-align: center;
  max-width: 820px;
  margin: 0 auto;
}
.hh-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12.5px;
  letter-spacing: 3px;
  color: var(--oas-color-primary);
  text-transform: uppercase;
}
.hh-eyebrow-dot {
  opacity: 0.45;
}
.hh-title {
  margin-top: 22px;
  font-size: clamp(40px, 6vw, 62px);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.12;
  color: var(--oas-color-text-primary);
}
.hh-glow {
  background: var(--home-grad-strong);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hh-sub {
  margin: 22px auto 0;
  max-width: 620px;
  font-size: 17px;
  line-height: 1.8;
  color: var(--oas-color-text-secondary);
}
.hh-cta {
  margin-top: 40px;
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.hh-pills {
  margin-top: 42px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.hh-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  padding: 5px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--oas-color-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  transition: border-color 0.18s var(--oas-ease-out), color 0.18s var(--oas-ease-out);
}
.hh-pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--oas-color-primary);
}
.hh-pill:hover {
  border-color: color-mix(in srgb, var(--oas-color-primary) 50%, transparent);
  color: var(--oas-color-text-primary);
}
.hh-stats {
  margin: 54px auto 0;
  max-width: 760px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 20px 8px;
  border-top: 1px solid var(--home-border);
  border-bottom: 1px solid var(--home-border);
}
.hh-stat {
  text-align: center;
  padding: 0 18px;
}
.hh-num {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
.hh-num small {
  font-size: 12px;
  color: var(--oas-color-text-secondary);
  font-weight: 500;
}
.hh-lbl {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--oas-color-text-secondary);
  letter-spacing: 0.5px;
}
.hh-sep {
  width: 1px;
  height: 30px;
  background: linear-gradient(180deg, transparent, var(--oas-color-border-strong), transparent);
}
.hh-scroll {
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--oas-color-text-secondary);
  letter-spacing: 2px;
}
.hh-scroll-line {
  width: 1px;
  height: 34px;
  background: linear-gradient(var(--oas-color-text-secondary), transparent);
}

@media (max-width: 900px) {
  .home-hero {
    padding: 72px 0 56px;
  }
  .hh-stats {
    gap: 8px;
  }
  .hh-stat {
    padding: 0 12px;
  }
  .hh-num {
    font-size: 24px;
  }
}
</style>
