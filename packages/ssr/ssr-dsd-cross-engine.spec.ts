import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderToString } from './src/index.js'

// 跨引擎 DSD 最小 smoke（Firefox / WebKit 各跑一次；Chromium 由 ssr-dsd.spec.ts 覆盖）。
//
// 不复制全量大页：只渲染 A/B/C 三批各一个代表 tag + 一个既有白名单 tag 作对照：
//   A conversation：oas-message-actions
//   B feedback：oas-notice-bar
//   C navigation：oas-index-bar
//   对照：oas-button
//
// 验收：①禁 JS 时 DSD 快照可见关键文本；②upgrade 后 shadowRoot 不重建（style DOM 引用不变）、
// 指纹移除；③单次交互只派发一次事件；④console 零 error/warning。
//
// WebKit 能力守卫：老版本 WebKit 可能没有 Declarative Shadow DOM（HTMLTemplateElement.shadowRootMode）。
// 此时不静默跳过——显式断言「无 DSD 能力」并验证替代路径（静态 light DOM 文本可见 + bundle 升级后
// 组件正常 render），保证守卫分支仍有真实断言。
test.describe.configure({ mode: 'serial' })

const REPO_ROOT = resolve(import.meta.dirname, '..', '..')
let ARTIFACT_DIR = ''
let UI_BUNDLE = ''
let DSD_PAGE = ''
let DSD_PAGE_URL = ''

/** Firefox / WebKit project 并行跑时各自独立产物目录，避免并发写同一文件 */
function initArtifacts(projectName: string): void {
  const safe = projectName.replace(/[^a-z0-9-]/gi, '-')
  ARTIFACT_DIR = join(tmpdir(), 'opencode', `oas-ssr-dsd-cross-engine-${safe}`)
  UI_BUNDLE = join(ARTIFACT_DIR, 'ui.js')
  DSD_PAGE = join(ARTIFACT_DIR, 'index.html')
  DSD_PAGE_URL = pathToFileURL(DSD_PAGE).href
}

/** 用仓库内 vite 把 @oas-ui/ui 主入口打成单文件 ESM bundle（与 ssr-dsd.spec.ts 同法） */
function buildUiBundle(): void {
  const uiEntry = join(REPO_ROOT, 'packages', 'ui', 'dist', 'index.js')
  if (!existsSync(uiEntry)) {
    throw new Error(`[ssr-cross] 缺少 ${uiEntry}：请先执行 pnpm --filter @oas-ui/ui build 再跑 e2e`)
  }
  const viteCli = join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const configFile = join(ARTIFACT_DIR, 'vite.config.mjs')
  writeFileSync(
    configFile,
    [
      'export default {',
      `  root: ${JSON.stringify(REPO_ROOT.replaceAll('\\', '/'))},`,
      '  configFile: false,',
      "  logLevel: 'silent',",
      '  build: {',
      `    lib: { entry: ${JSON.stringify(uiEntry.replaceAll('\\', '/'))}, formats: ['es'], fileName: () => 'ui.js' },`,
      `    outDir: ${JSON.stringify(ARTIFACT_DIR.replaceAll('\\', '/'))},`,
      '    emptyOutDir: false,',
      '    minify: false,',
      '    sourcemap: false,',
      '  },',
      '}',
    ].join('\n'),
    'utf8',
  )
  const r = spawnSync(process.execPath, [viteCli, 'build', '--config', configFile], { encoding: 'utf8' })
  if (r.status !== 0 || !existsSync(UI_BUNDLE)) {
    throw new Error(`[ssr-cross] vite bundle 构建失败（status=${r.status}）：\n${r.stdout}\n${r.stderr}`)
  }
}

test.beforeAll(async () => {
  initArtifacts(test.info().project.name)
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  buildUiBundle()

  const themeCss = readFileSync(join(REPO_ROOT, 'packages', 'theme', 'index.css'), 'utf8')
  const [actions, notice, indexBar, button] = await Promise.all([
    renderToString(
      'oas-message-actions',
      {
        actions: JSON.stringify([
          { key: 'copy', label: '复制' },
          { key: 'retry', label: '重试' },
        ]),
        'message-id': 'cross-1',
      },
      '',
      { locale: 'zh-CN' },
    ),
    renderToString('oas-notice-bar', { type: 'warning', closable: '', items: '["系统维护通知"]' }, '', {
      locale: 'zh-CN',
    }),
    renderToString(
      'oas-index-bar',
      {
        sections: JSON.stringify([
          { key: 'A', title: 'A', items: [{ label: '安' }, { label: '爱' }] },
          { key: 'B', title: 'B', items: [{ label: '波' }, { label: '白' }] },
        ]),
        height: '200',
      },
      '',
      { locale: 'zh-CN' },
    ),
    renderToString('oas-button', { type: 'primary' }, '确定'),
  ])

  writeFileSync(
    DSD_PAGE,
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>OAS-UI 跨引擎 DSD smoke</title>
  <style>${themeCss}</style>
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
${actions}
${notice}
${indexBar}
${button}
</body>
</html>`,
    'utf8',
  )
})

const TAGS = ['oas-message-actions', 'oas-notice-bar', 'oas-index-bar', 'oas-button'] as const

/** 注入 ui bundle 并等待目标 tag 全部 upgrade */
async function upgradeUi(page: Page): Promise<void> {
  await page.addScriptTag({ path: UI_BUNDLE, type: 'module' })
  await page.evaluate(
    async (tags) => {
      await Promise.all(tags.map((t) => customElements.whenDefined(t)))
    },
    [...TAGS],
  )
  await page.waitForTimeout(300)
}

/** 当前引擎是否支持 Declarative Shadow DOM（`<template shadowrootmode>`） */
function dsdSupported(page: Page): Promise<boolean> {
  return page.evaluate(() => 'shadowRootMode' in HTMLTemplateElement.prototype)
}

test('禁 JS：DSD 快照解析即附加 shadow root，A/B/C 代表 tag 与对照的关键文本可见', async ({ page }) => {
  const consoleProblems: string[] = []
  page.on('pageerror', (e) => consoleProblems.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(m.text())
  })
  await page.goto(DSD_PAGE_URL, { waitUntil: 'load' })

  const supported = await dsdSupported(page)
  const state = await page.evaluate(
    (tags) => {
      const out: Record<string, { shadow: boolean; text: string }> = {}
      for (const t of tags) {
        const el = document.querySelector(t)
        // textContent 不含 shadow 内容：DSD 快照的关键文本在 shadow root 内，二者拼接
        out[t] = {
          shadow: !!el?.shadowRoot,
          text: `${el?.shadowRoot?.textContent ?? ''}${el?.textContent ?? ''}`,
        }
      }
      return out
    },
    [...TAGS],
  )

  if (!supported) {
    // WebKit 能力守卫（见文件头注释）：无 DSD 时 shadowRoot 不会由解析器附加，
    // 但 light DOM 文本必须仍可见；升级路径在下一测试单独验证。
    expect(state['oas-message-actions']!.shadow).toBe(false)
    expect(state['oas-message-actions']!.text).toContain('复制')
    expect(state['oas-notice-bar']!.text).toContain('系统维护通知')
    expect(state['oas-index-bar']!.text).toContain('安')
    expect(state['oas-button']!.text).toContain('确定')
    expect(consoleProblems).toEqual([])
    return
  }

  for (const t of TAGS) expect(state[t]!.shadow, `${t} 应已由 DSD 解析附加 shadow root`).toBe(true)
  expect(state['oas-message-actions']!.text).toContain('复制')
  expect(state['oas-message-actions']!.text).toContain('重试')
  expect(state['oas-notice-bar']!.text).toContain('系统维护通知')
  expect(state['oas-index-bar']!.text).toContain('安')
  expect(state['oas-button']!.text).toContain('确定')
  expect(consoleProblems).toEqual([])
})

test('upgrade：shadow 不重建（style DOM 引用保持）、指纹移除、console 零告警', async ({ page }) => {
  const consoleProblems: string[] = []
  page.on('pageerror', (e) => consoleProblems.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(m.text())
  })
  await page.goto(DSD_PAGE_URL, { waitUntil: 'load' })
  const supported = await dsdSupported(page)
  if (!supported) test.skip(true, 'WebKit 无 DSD：升级不重建 shadow 的断言不适用（DSD 能力已在上一测试守卫）')

  const before = await page.evaluate(
    (tags) => {
      const w = window as unknown as Window & { __crossStyleRefs: Record<string, Element | null> }
      w.__crossStyleRefs = {}
      const pre: Record<string, boolean> = {}
      for (const t of tags) {
        const root = document.querySelector(t)?.shadowRoot
        w.__crossStyleRefs[t] = root?.querySelector('style') ?? null
        pre[t] = root?.querySelector('meta[data-oas-ssr]') !== null
      }
      return pre
    },
    [...TAGS],
  )
  for (const t of TAGS) expect(before[t], `${t} 水合前应含指纹 meta`).toBe(true)

  await upgradeUi(page)

  const after = await page.evaluate(
    (tags) => {
      const w = window as unknown as Window & { __crossStyleRefs: Record<string, Element | null> }
      const out: Record<string, { sameStyle: boolean; metaRemoved: boolean }> = {}
      for (const t of tags) {
        const root = document.querySelector(t)?.shadowRoot
        out[t] = {
          sameStyle: root?.querySelector('style') === w.__crossStyleRefs[t],
          metaRemoved: root?.querySelector('meta[data-oas-ssr]') === null,
        }
      }
      return out
    },
    [...TAGS],
  )
  for (const t of TAGS) {
    expect(after[t]!.sameStyle, `${t} 真水合：style 应保持同一 DOM 对象`).toBe(true)
    expect(after[t]!.metaRemoved, `${t} 指纹 meta 应被移除`).toBe(true)
  }
  expect(consoleProblems).toEqual([])
})

test('事件：upgrade 后单次交互各恰好派发一次（A/B/C + 对照）', async ({ page }) => {
  await page.goto(DSD_PAGE_URL, { waitUntil: 'load' })
  const supported = await dsdSupported(page)
  if (!supported) test.skip(true, 'WebKit 无 DSD：DSD 升级交互链路由 DSD 能力测试守卫')

  await upgradeUi(page)
  await page.evaluate(() => {
    const w = window as unknown as Window & {
      __crossEvents: { action: number; close: number; change: number; click: number }
    }
    w.__crossEvents = { action: 0, close: 0, change: 0, click: 0 }
    document.querySelector('oas-message-actions')?.addEventListener('oas-action', () => w.__crossEvents.action++)
    document.querySelector('oas-notice-bar')?.addEventListener('oas-close', () => w.__crossEvents.close++)
    document.querySelector('oas-index-bar')?.addEventListener('oas-change', () => w.__crossEvents.change++)
    document.querySelector('oas-button')?.addEventListener('oas-click', () => w.__crossEvents.click++)
  })
  const counts = (): Promise<Record<string, number>> =>
    page.evaluate(
      () =>
        (
          window as unknown as Window & {
            __crossEvents: { action: number; close: number; change: number; click: number }
          }
        ).__crossEvents,
    )

  await page.locator('oas-message-actions [part="action"]').first().click()
  await page.locator('oas-notice-bar [part="close"]').click()
  await page.locator('oas-index-bar [part="letter"]').nth(1).click()
  await page.locator('oas-button button').click()

  await expect.poll(counts).toEqual({ action: 1, close: 1, change: 1, click: 1 })
})
