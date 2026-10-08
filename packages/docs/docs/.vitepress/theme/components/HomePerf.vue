<template>
  <section class="home-section home-perf">
    <div class="hp-wrap">
      <header class="hp-head home-reveal">
        <div class="hp-kicker">NUMBERS, NOT SLOGANS</div>
        <h2 class="hp-title">{{ isEn ? 'Performance at a glance' : '性能速览' }}</h2>
        <p class="hp-intro">
          {{
            isEn
              ? 'Public baseline, reproducible — full methodology and per-component numbers in the docs.'
              : '公开基准，可复现——完整方法论与各组件链数据见文档。'
          }}
        </p>
      </header>
      <div class="hp-vol home-reveal">
        <div class="hp-legend">
          <span class="hp-legend-item"><i class="sw" style="width:22px"></i>{{ isEn ? 'Button chain' : '按钮链' }} <b>{{ stats.perf.buttonChainKB }}</b> KB</span>
          <span class="hp-legend-item"><i class="sw" :style="{ width: pct(stats.perf.cdnGzipKB) }"></i>CDN gzip <b>{{ stats.perf.cdnGzipKB }}</b> KB</span>
          <span class="hp-legend-item"><i class="sw" style="width:100%"></i>{{ isEn ? 'Full entry' : '全量入口' }} <b>{{ stats.perf.fullEntryKB }}</b> KB</span>
        </div>
        <div class="hp-scale">
          <div class="hp-seg seg-btn" :style="{ width: pct(stats.perf.buttonChainKB) }"><span class="hp-val">{{ stats.perf.buttonChainKB }}</span><span class="hp-unit">KB</span></div>
          <div class="hp-seg seg-cdn" :style="{ width: pct(stats.perf.cdnGzipKB) }"><span class="hp-val">{{ stats.perf.cdnGzipKB }}</span><span class="hp-unit">KB</span></div>
          <div class="hp-seg seg-full" style="width:100%"><span class="hp-val">{{ stats.perf.fullEntryKB }}</span><span class="hp-unit">KB</span></div>
          <div class="hp-mark" :style="{ left: pct(stats.perf.buttonChainKB) }">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-13h-7l0-7z"/></svg>
            {{ isEn ? 'On-demand, save ' : '按需引入，省下 ' }}<b>{{ savePct }}%</b>
          </div>
        </div>
        <p class="hp-foot">
          tree-shakable · {{ isEn ? 'import one component, bundle only its own chain' : '按需引入一个组件，只打包它自己的链路' }}
        </p>
        <p class="hp-foot hp-foot-sub">
          {{
            isEn
              ? 'Full entry is a convenience/upper-bound figure (per-file sum), not the cost of a single consumption.'
              : '全量为便利路径 / 上界估计（逐文件求和），不代表单次消费的产品大小。'
          }}
        </p>
      </div>
      <p class="hp-note home-reveal">
        <a href="/guide/ssr">{{ isEn ? 'Full baseline →' : '查看完整基准 →' }}</a>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import stats from '../../generated/stats.json'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

// 条宽与「省下 x%」均由 stats.json 推导（禁止硬编码——数据变即跟随）
const perf = stats.perf
const pct = (kb: number): string => `${((kb / perf.fullEntryKB) * 100).toFixed(2)}%`
const savePct = computed(() => Math.round((1 - perf.buttonChainKB / perf.fullEntryKB) * 100))
</script>

<style scoped>
.home-perf {
  position: relative;
  padding: 96px 0;
  background: var(--home-bg);
}
.home-perf::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(36% 36% at 15% 100%, var(--home-glow-soft), transparent 65%);
}
.hp-wrap {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px;
}
.hp-head {
  position: relative;
  text-align: center;
  margin-bottom: 52px;
}
.hp-kicker {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--oas-color-primary);
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.hp-kicker::before,
.hp-kicker::after {
  content: '';
  width: 30px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--oas-color-primary));
}
.hp-kicker::after {
  background: linear-gradient(90deg, var(--oas-color-primary), transparent);
}
.hp-title {
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
.hp-intro {
  margin: 14px auto 0;
  max-width: 640px;
  font-size: 15px;
  color: var(--oas-color-text-secondary);
}
.hp-vol {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  border: 1px solid var(--home-border);
  border-radius: var(--oas-radius-lg);
  background: var(--home-card-bg);
  padding: 32px 36px 28px;
}
.hp-legend {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.hp-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
.hp-legend-item b {
  color: var(--oas-color-text-primary);
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-weight: 700;
}
.hp-legend-item .sw {
  width: 22px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}
.hp-legend-item:nth-child(2) .sw {
  background: linear-gradient(90deg, #2f6fe0, #7aa2ff);
}
.hp-legend-item:nth-child(3) .sw {
  background: linear-gradient(90deg, #1d4fd8, #4d9fff);
}
.hp-scale {
  position: relative;
  margin-top: 28px;
  height: 64px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  border-radius: var(--oas-radius-md);
}
.hp-seg {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 8px;
  transition: filter 0.25s var(--oas-ease-out);
  cursor: default;
}
.hp-seg:hover {
  filter: brightness(1.15);
}
.hp-seg .hp-val {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}
.hp-seg .hp-unit {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 10px;
  color: #a1a1aa;
}
.seg-btn,
.seg-cdn,
.seg-full {
  height: 100%;
  border-radius: 6px 6px 0 0;
}
.seg-btn {
  background: linear-gradient(180deg, #60a5fa, #3b82f6);
}
.seg-cdn {
  background: linear-gradient(180deg, #7aa2ff, #2f6fe0);
}
.seg-full {
  background: linear-gradient(180deg, #4d9fff, #1d4fd8);
}
.hp-mark {
  position: absolute;
  top: -6px;
  transform: translateX(6px);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--home-ok);
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  background: var(--home-card-bg);
  border: 1px solid color-mix(in srgb, var(--home-ok) 35%, var(--home-border));
  border-radius: 6px;
  padding: 3px 9px;
  white-space: nowrap;
}
.hp-mark svg {
  color: var(--home-ok);
}
.hp-mark b {
  color: var(--oas-color-text-primary);
}
.hp-foot {
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--oas-color-text-secondary);
  text-align: center;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
}
.hp-note {
  position: relative;
  text-align: center;
  margin-top: 32px;
  font-size: 13px;
}
.hp-note a {
  color: var(--oas-color-primary);
}
.hp-note a:hover {
  text-decoration: underline;
}
</style>
