<template>
  <section class="home-cases">
    <div class="hc-wrap">
      <header class="hc-head home-reveal">
        <div class="hc-kicker">USE CASES</div>
        <h2 class="hc-title">{{ isEn ? 'Use cases' : '使用场景' }}</h2>
        <p class="hc-intro">
          {{
            isEn
              ? 'Why Web Components? — built once, runs everywhere. These are the situations where it wins.'
              : '为什么选 Web Components？——一次构建、处处运行，这些正是它被挑中的情境。'
          }}
        </p>
      </header>
      <div class="hc-cases">
        <div
          v-for="(c, i) in cases"
          :key="c.icon + i"
          class="hc-case home-reveal"
          :class="{ 'hc-case--bolt': c.bolt }"
          :style="{ '--d': `${i * 0.1}s` }"
        >
          <span class="hc-ic" v-html="c.icon"></span>
          <h3 class="hc-case-title">{{ c.title }}</h3>
          <p class="hc-case-desc">{{ c.desc }}</p>
        </div>
      </div>
      <div class="hc-who home-reveal" :style="{ '--d': '0.2s' }">
        <span class="hc-who-label">{{ isEn ? 'MADE FOR' : '为谁而生' }}</span>
        <div class="hc-who-pills">
          <span v-for="w in who" :key="w" class="hc-who-pill">{{ w }}</span>
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

// 图标为原创线性 stroke（换框架 / 微前端格 / 演进循环 / 闪电）
const cases = computed(() => [
  {
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
    title: isEn.value ? 'Mixed-stack team, one library' : '跨栈团队，一套组件',
    desc: isEn.value
      ? 'One codebase for your React, Vue and Svelte projects — consistent behavior and styling, no duplication.'
      : '团队同时维护 React / Vue / Svelte 项目？只写一份组件，行为与样式完全一致，不复制、不重写。',
  },
  {
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    title: isEn.value ? 'Micro-frontends, unified UX' : '微前端，体验统一',
    desc: isEn.value
      ? 'Each sub-app keeps its own stack, but the UI language stays consistent — OAS-UI does not dictate a framework.'
      : '各子应用技术栈可以不同，但 UI 语言必须一致——OAS-UI 不要求统一的框架。',
  },
  {
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>`,
    title: isEn.value ? 'Long-lived apps, no rewrites' : '长期演进，不重写',
    desc: isEn.value
      ? 'Frameworks come and go; your component assets stay. Bound to the browser standard, not to one generation.'
      : '框架十年四换，组件资产不必跟着重写——绑定的是浏览器标准，不是某一代框架。',
  },
  {
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-13h-7l0-7z"/></svg>`,
    bolt: true,
    title: isEn.value ? 'Zero build, instant use' : '零构建，立刻用',
    desc: isEn.value
      ? 'One CDN script and <oas-button> just works — no node, no bundler required.'
      : '一行 CDN script 引入，&lt;oas-button&gt; 直接可用——不需要 node、不需要打包器。',
  },
])

const who = computed(() =>
  isEn.value
    ? ['Mixed-stack teams', 'Frontend platform teams', 'Independent developers', 'SSR application teams']
    : ['跨框架团队', '前端基础设施组', '独立开发者', 'SSR 应用团队'],
)
</script>

<style scoped>
.home-cases {
  position: relative;
  padding: 96px 0;
  border-top: 1px solid var(--home-border);
  background: var(--home-bg);
}
.home-cases::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(40% 40% at 20% 0%, var(--home-glow-soft), transparent 65%),
    radial-gradient(36% 36% at 85% 100%, var(--home-glow-soft), transparent 65%);
}
.hc-wrap {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px;
}
.hc-head {
  position: relative;
  text-align: center;
  margin-bottom: 52px;
}
.hc-kicker {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--oas-color-primary);
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.hc-kicker::before,
.hc-kicker::after {
  content: '';
  width: 30px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--oas-color-primary));
}
.hc-kicker::after {
  background: linear-gradient(90deg, var(--oas-color-primary), transparent);
}
.hc-title {
  margin-top: 14px;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.2;
  background: var(--home-grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hc-intro {
  margin: 14px auto 0;
  max-width: 640px;
  font-size: 15px;
  color: var(--oas-color-text-secondary);
}
.hc-cases {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.hc-case {
  position: relative;
  padding: var(--oas-space-5);
  background: var(--home-card-bg);
  border: 1px solid var(--home-border);
  border-radius: var(--oas-radius-lg);
  transition: transform 0.22s var(--oas-ease-out), border-color 0.22s var(--oas-ease-out);
}
.hc-case::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(80% 60% at 50% -10%, var(--home-glow), transparent 60%);
  opacity: 0;
  transition: opacity 0.22s var(--oas-ease-out);
  pointer-events: none;
}
.hc-case::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--oas-color-primary), transparent);
  opacity: 0;
  transition: opacity 0.22s var(--oas-ease-out);
}
.hc-case:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--oas-color-primary) 35%, transparent);
}
.hc-case:hover::before,
.hc-case:hover::after {
  opacity: 1;
}
.hc-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  margin-bottom: 18px;
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--oas-color-primary) 30%, transparent);
  color: var(--oas-color-primary);
}
/* 零构建卡：仅闪电图标金色（原创线性 bolt 图标），圆角方块保持默认容器样式 */
.hc-case--bolt .hc-ic {
  color: #f59e0b;
}
.hc-case-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--oas-color-text-primary);
}
.hc-case-desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--oas-color-text-secondary);
}
.hc-who {
  position: relative;
  margin-top: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
}
.hc-who-label {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  letter-spacing: 3px;
  color: var(--oas-color-text-secondary);
}
.hc-who-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.hc-who-pill {
  font-size: 13px;
  color: var(--oas-color-text-secondary);
  border: 1px solid var(--home-border);
  border-radius: 999px;
  padding: 7px 16px;
  background: var(--home-card-bg);
  transition: border-color 0.18s var(--oas-ease-out), color 0.18s var(--oas-ease-out);
}
.hc-who-pill:hover {
  border-color: color-mix(in srgb, var(--oas-color-primary) 50%, transparent);
  color: var(--oas-color-text-primary);
}

@media (max-width: 900px) {
  .hc-cases {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 560px) {
  .hc-cases {
    grid-template-columns: 1fr;
  }
}
</style>
