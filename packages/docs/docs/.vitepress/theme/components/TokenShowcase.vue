<template>
  <div class="token-showcase">
    <section class="ts-block">
      <h3 class="ts-title">{{ isEn ? 'Semantic colors' : '语义色板' }}</h3>
      <p class="ts-desc">
        {{
          isEn
            ? 'Components reference semantic tokens only — light and dark values below.'
            : '组件只引用语义 token。下表为 light / dark 两套取值（随当前主题实时变化）。'
        }}
      </p>
      <div class="ts-grid">
        <div v-for="c in colorTokens" :key="c.var" class="ts-swatch">
          <div class="ts-swatch-bar" :style="{ background: `var(${c.var})` }"></div>
          <div class="ts-swatch-name">{{ c.label }}</div>
          <div class="ts-swatch-var">{{ c.var }}</div>
        </div>
      </div>
    </section>

    <section class="ts-block">
      <h3 class="ts-title">{{ isEn ? 'Type scale' : '字号阶梯' }}</h3>
      <div class="ts-type">
        <div
          v-for="t in typeTokens"
          :key="t.var"
          class="ts-type-row"
        >
          <span class="ts-type-label">{{ t.label }}</span>
          <span class="ts-type-sample" :style="{ fontSize: `var(${t.var})` }">{{ t.sample }}</span>
          <span class="ts-type-var">{{ t.var }}</span>
        </div>
      </div>
    </section>

    <section class="ts-block">
      <h3 class="ts-title">{{ isEn ? 'Spacing · radius · control height' : '间距 · 圆角 · 控件高度' }}</h3>
      <div class="ts-rows">
        <div class="ts-sub-label">{{ isEn ? 'Spacing (4px base)' : '间距（4px 基准）' }}</div>
        <div class="ts-space-row">
          <div
            v-for="(s, i) in spaceTokens"
            :key="s.var"
            class="ts-space-item"
          >
            <div class="ts-space-block" :style="{ width: `var(${s.var})`, height: `var(${s.var})` }"></div>
            <div class="ts-space-name">{{ s.label }}</div>
            <div class="ts-space-var">{{ s.var }}</div>
          </div>
        </div>
      </div>
      <div class="ts-rows">
        <div class="ts-sub-label">{{ isEn ? 'Radius' : '圆角' }}</div>
        <div class="ts-shape-row">
          <div v-for="r in radiusTokens" :key="r.var" class="ts-shape-item">
            <div class="ts-shape-block" :style="{ borderRadius: `var(${r.var})` }"></div>
            <div class="ts-shape-name">{{ r.label }}</div>
            <div class="ts-shape-var">{{ r.var }}</div>
          </div>
        </div>
      </div>
      <div class="ts-rows">
        <div class="ts-sub-label">{{ isEn ? 'Control height' : '控件高度' }}</div>
        <div class="ts-ctrl-row">
          <div v-for="h in controlTokens" :key="h.var" class="ts-ctrl-item">
            <div class="ts-ctrl-block" :style="{ height: `var(${h.var})` }"></div>
            <div class="ts-ctrl-name">{{ h.label }}</div>
            <div class="ts-ctrl-var">{{ h.var }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="ts-block">
      <h3 class="ts-title">{{ isEn ? 'Try it live' : '实时换肤' }}</h3>
      <p class="ts-desc">
        {{
          isEn
            ? 'Adjust the tokens below — each one maps to what the preview components actually consume. Every change applies to the host immediately.'
            : '下方编辑的 token 与预览组件实际消费的一一对应：主色（按钮/标签/复选框）、圆角 sm（标签）与 md（按钮/输入框）、字号 xs（标签）sm（进度条）md（按钮/输入框）。改即生效。'
        }}
      </p>
      <div class="ts-live">
        <div class="ts-live-grid">
          <div class="ts-live-editor">
            <div class="ts-preset">
              <span class="ts-preset-label">{{ isEn ? 'One-click themes' : '一键主题色' }}</span>
              <div class="ts-preset-row">
                <button
                  v-for="p in presets"
                  :key="p.name"
                  type="button"
                  class="ts-preset-swatch"
                  :title="p.name"
                  :style="{ background: p.value }"
                  @click="applyPreset(p)"
                ></button>
              </div>
              <p class="ts-preset-hint">
                {{
                  isEn
                    ? 'Click a color above to re-theme instantly, or adjust individual tokens below.'
                    : '点击上方色卡立即换肤；或调整下方 token 微调。'
                }}
              </p>
            </div>
            <div class="ts-editor-rows">
              <div
                v-for="tk in editableTokens"
                :key="tk.name"
                class="ts-editor-row"
              >
                <span class="ts-editor-name">{{ tk.name }}</span>
                <input
                  v-if="tk.type === 'color'"
                  type="color"
                  class="ts-editor-ctrl"
                  :value="currentValue(tk)"
                  @input="applyToken(tk, ($event.target as HTMLInputElement).value)"
                />
                <input
                  v-else
                  type="number"
                  class="ts-editor-ctrl"
                  :value="currentNumber(tk)"
                  @input="applyNumber(tk, ($event.target as HTMLInputElement).value)"
                />
                <span class="ts-editor-cur">{{ currentValue(tk) }}</span>
              </div>
            </div>
            <div class="ts-editor-reset">
              <button type="button" class="ts-editor-reset-btn" @click="resetTheme">
                {{ isEn ? 'Reset theme' : '重置主题' }}
              </button>
            </div>
          </div>
          <oas-config-provider ref="previewProvider" class="ts-live-preview">
            <oas-space direction="vertical" size="medium">
              <oas-button type="primary">{{ isEn ? 'Primary action' : '主行动' }}</oas-button>
              <oas-space size="small" wrap>
                <oas-tag type="primary">primary</oas-tag>
                <oas-tag type="success">success</oas-tag>
                <oas-tag type="warning">warning</oas-tag>
                <oas-tag type="danger">danger</oas-tag>
              </oas-space>
              <oas-input placeholder="type here / 输入内容" style="max-width: 280px"></oas-input>
              <oas-progress :percent="66" style="max-width: 280px"></oas-progress>
              <oas-checkbox>{{ isEn ? 'Agree to terms' : '同意条款' }}</oas-checkbox>
            </oas-space>
          </oas-config-provider>
        </div>
      </div>
    </section>

    <section class="ts-block">
      <h3 class="ts-title">{{ isEn ? 'Custom theme in code' : '代码自定义主题' }}</h3>
      <pre class="ts-code"><code>{{ codeSnippet }}</code></pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

// 预览区 provider：实时换肤只作用于它（左侧面板不受影响）
const previewProvider = ref<HTMLElement | null>(null)

// 可编辑 token：与右侧预览组件实际消费的 token 一一对应
// color: 主色（按钮/标签/复选框） | radius: sm(标签) md(按钮/输入框) | font: xs(标签) sm(进度条) md(按钮/输入框)
const editableTokens = computed(() => [
  { name: '--oas-color-primary', type: 'color' as const },
  { name: '--oas-radius-sm', type: 'number' as const },
  { name: '--oas-radius-md', type: 'number' as const },
  { name: '--oas-font-size-xs', type: 'number' as const },
  { name: '--oas-font-size-sm', type: 'number' as const },
  { name: '--oas-font-size-md', type: 'number' as const },
])

function providerEl(): HTMLElement | null {
  return previewProvider.value
}

function currentValue(tk: { name: string }): string {
  if (typeof window === 'undefined') return ''
  const el = providerEl()
  if (!el) return ''
  const v = getComputedStyle(el).getPropertyValue(tk.name).trim()
  return v
}

function currentNumber(tk: { name: string }): number | string {
  const v = currentValue(tk)
  const n = parseFloat(v)
  return Number.isNaN(n) ? '' : String(n)
}

function applyToken(tk: { name: string }, value: string): void {
  providerEl()?.style.setProperty(tk.name, value)
}

function applyNumber(tk: { name: string }, raw: string): void {
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return
  // 数字类 token 单位固定为 px
  providerEl()?.style.setProperty(tk.name, `${n}px`)
}

const colorTokens = computed(() =>
  isEn.value
    ? [
        { var: '--oas-color-primary', label: 'Primary' },
        { var: '--oas-color-success', label: 'Success' },
        { var: '--oas-color-warning', label: 'Warning' },
        { var: '--oas-color-danger', label: 'Danger' },
        { var: '--oas-color-text-primary', label: 'Text primary' },
        { var: '--oas-color-text-secondary', label: 'Text secondary' },
        { var: '--oas-color-border', label: 'Border' },
        { var: '--oas-color-bg', label: 'Background' },
        { var: '--oas-color-bg-hover', label: 'Background hover' },
        { var: '--oas-color-overlay', label: 'Overlay' },
      ]
    : [
        { var: '--oas-color-primary', label: '主色' },
        { var: '--oas-color-success', label: '成功' },
        { var: '--oas-color-warning', label: '警告' },
        { var: '--oas-color-danger', label: '危险' },
        { var: '--oas-color-text-primary', label: '主文本' },
        { var: '--oas-color-text-secondary', label: '次级文本' },
        { var: '--oas-color-border', label: '边框' },
        { var: '--oas-color-bg', label: '背景' },
        { var: '--oas-color-bg-hover', label: '背景 hover' },
        { var: '--oas-color-overlay', label: '遮罩' },
      ],
)

const typeTokens = computed(() => [
  { var: '--oas-font-size-xs', label: 'xs · 12px', sample: isEn.value ? 'Aa' : '示例' },
  { var: '--oas-font-size-sm', label: 'sm · 13px', sample: isEn.value ? 'Aa' : '示例' },
  { var: '--oas-font-size-md', label: 'md · 14px', sample: isEn.value ? 'Aa' : '示例' },
  { var: '--oas-font-size-lg', label: 'lg · 16px', sample: isEn.value ? 'Aa' : '示例' },
  { var: '--oas-font-size-xl', label: 'xl · 20px', sample: isEn.value ? 'Aa' : '示例' },
])

const spaceTokens = computed(() => [
  { var: '--oas-space-1', label: '1 · 4' },
  { var: '--oas-space-2', label: '2 · 8' },
  { var: '--oas-space-3', label: '3 · 12' },
  { var: '--oas-space-4', label: '4 · 16' },
  { var: '--oas-space-5', label: '5 · 24' },
  { var: '--oas-space-6', label: '6 · 32' },
])

const radiusTokens = computed(() => [
  { var: '--oas-radius-sm', label: 'sm' },
  { var: '--oas-radius-md', label: 'md' },
  { var: '--oas-radius-lg', label: 'lg' },
])

const controlTokens = computed(() => [
  { var: '--oas-control-height-sm', label: 'sm · 24' },
  { var: '--oas-control-height-md', label: 'md · 32' },
  { var: '--oas-control-height-lg', label: 'lg · 40' },
  { var: '--oas-control-height-xl', label: 'xl · 48' },
])

function resetTheme(): void {
  const el = providerEl()
  if (!el) return
  for (const tk of editableTokens.value) {
    el.style.removeProperty(tk.name)
  }
}

const presets = [
  { name: 'Blue', value: '#0b6cff' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Cyan', value: '#0891b2' },
]

function applyPreset(p: { value: string }): void {
  providerEl()?.style.setProperty('--oas-color-primary', p.value)
}

const codeSnippet = computed(() =>
  isEn.value
    ? `:root {\n  --oas-color-primary: #7c3aed;\n  --oas-radius-md: 8px;\n  --oas-control-height-md: 36px;\n}`
    : `:root {\n  --oas-color-primary: #7c3aed;\n  --oas-radius-md: 8px;\n  --oas-control-height-md: 36px;\n}`,
)
</script>

<style scoped>
.token-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-6);
}
.ts-block {
  padding: var(--oas-space-5);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.ts-title {
  margin: 0 0 var(--oas-space-2);
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.ts-desc {
  margin: 0 0 var(--oas-space-4);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.7;
  max-width: 640px;
}
.ts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--oas-space-3);
}
.ts-swatch-bar {
  height: 44px;
  border-radius: var(--oas-radius-md);
  border: 1px solid var(--oas-color-border);
  transition: background var(--oas-transition-base) var(--oas-ease-out);
}
.ts-swatch-name {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
}
.ts-swatch-var {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-type {
  display: flex;
  flex-direction: column;
}
.ts-type-row {
  display: flex;
  align-items: baseline;
  gap: var(--oas-space-4);
  padding: var(--oas-space-2) 0;
  border-bottom: 1px dashed var(--oas-color-border);
}
.ts-type-label {
  width: 96px;
  flex-shrink: 0;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-type-sample {
  flex: 1;
  color: var(--oas-color-text-primary);
}
.ts-type-var {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-rows {
  margin-top: var(--oas-space-4);
}
.ts-sub-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-3);
}
.ts-space-row {
  display: flex;
  gap: var(--oas-space-5);
  align-items: flex-end;
  flex-wrap: wrap;
}
.ts-space-item {
  text-align: center;
}
.ts-space-block {
  background: var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  margin: 0 auto;
  opacity: 0.85;
}
.ts-space-name {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.ts-space-var {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-shape-row {
  display: flex;
  gap: var(--oas-space-5);
  flex-wrap: wrap;
}
.ts-shape-item,
.ts-ctrl-item {
  text-align: center;
}
.ts-shape-block {
  width: 56px;
  height: 56px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  margin: 0 auto;
}
.ts-shape-name,
.ts-ctrl-name {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.ts-shape-var,
.ts-ctrl-var {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-ctrl-row {
  display: flex;
  gap: var(--oas-space-5);
  align-items: flex-end;
  flex-wrap: wrap;
}
.ts-ctrl-block {
  width: 56px;
  background: var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  margin: 0 auto;
  opacity: 0.85;
}
.ts-live {
  display: block;
}
.ts-live-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--oas-space-5);
  align-items: stretch;
}
.ts-live-grid > * {
  min-width: 0;
}
.ts-live-editor {
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg-hover);
}
.ts-preset {
  margin-bottom: var(--oas-space-4);
  padding-bottom: var(--oas-space-4);
  border-bottom: 1px dashed var(--oas-color-border);
}
.ts-preset-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.ts-preset-row {
  display: flex;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-2);
}
.ts-preset-swatch {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid var(--oas-color-bg);
  box-shadow: 0 0 0 1px var(--oas-color-border);
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s var(--oas-ease-out);
}
.ts-preset-swatch:hover {
  transform: scale(1.12);
}
.ts-preset-hint {
  margin: var(--oas-space-3) 0 0;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
.ts-editor-rows {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.ts-editor-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) 0;
}
.ts-editor-name {
  flex: 1;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ts-editor-ctrl {
  width: 72px;
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
}
.ts-editor-ctrl[type='color'] {
  width: 40px;
  padding: 0;
}
.ts-editor-cur {
  min-width: 56px;
  text-align: right;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.ts-editor-reset {
  margin-top: var(--oas-space-4);
  padding-top: var(--oas-space-3);
  border-top: 1px dashed var(--oas-color-border);
}
.ts-editor-reset-btn {
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  transition: border-color 0.15s var(--oas-ease-out), color 0.15s var(--oas-ease-out);
}
.ts-editor-reset-btn:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.ts-live-preview {
  display: block;
  min-width: 0;
  overflow: hidden;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
}
.ts-code {
  margin: 0;
  padding: var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--oas-font-size-sm);
  line-height: 1.7;
  color: var(--oas-color-text-primary);
  overflow-x: auto;
  white-space: pre;
}

@media (max-width: 900px) {
  .ts-live-grid {
    grid-template-columns: 1fr;
  }
}
</style>
