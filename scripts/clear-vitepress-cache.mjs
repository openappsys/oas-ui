// 清理 Vitepress dev 的模块缓存（.vitepress/cache）。
//
// 背景（Windows symlink 已知缺陷）：predev 每次启动都会全量重写 packages 下各包的 dist，
// pnpm workspace symlink 场景下 Vite 的内存模块图 / 预构建缓存对「symlink 目标被整目录
// 替换」不敏感——vitepress 起来后组件 import 解析失败（Failed to resolve module
// specifier '@oas-ui/ui'），页面组件全部不注册且 console 无报错。
//
// 本脚本挂在 predev 尾部：dist 重写完成 → 缓存清空 → vitepress 冷启动直接读新 dist，
// 启动状态必定一致。代价是每次启动清掉缓存（Vite 冷启动稍慢、首次浏览各页有转换延迟），
// 换取确定性；日常「改源码 → watch 更新 → dev 自动 reload」链路不受影响。
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const cacheDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../packages/docs/docs/.vitepress/cache')

try {
  rmSync(cacheDir, { recursive: true, force: true })
  console.log('[clear-vitepress-cache] 已清理 .vitepress/cache（避免 symlink 产物重写后的陈旧解析）')
} catch (error) {
  // 清理失败不阻塞 dev 启动（如 cache 被残留进程占用）——Vite 会自行按需重建
  console.warn(`[clear-vitepress-cache] 清理失败（不阻塞启动）: ${String(error).slice(0, 160)}`)
}
