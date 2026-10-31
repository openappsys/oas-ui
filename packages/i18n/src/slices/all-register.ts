/**
 * 全量注册 9 个家族默认文案切片 —— @oas-ui/i18n 主入口专用。
 *
 * 按需消费方不走这里：显式
 *   import { dataMessages } from '@oas-ui/i18n/slices/data'
 *   registerDefaultMessages(dataMessages)
 * （值导入 + 显式调用，不依赖模块副作用，任意 tree-shake 配置下都不会丢失。）
 * 新增家族切片时需同步维护本文件（家族清单见 scripts/i18n/gen-slices.mjs）。
 */
import { registerDefaultMessages } from '../registry.js'
import { basicMessages } from './basic.js'
import { conversationMessages } from './conversation.js'
import { dataMessages } from './data.js'
import { feedbackMessages } from './feedback.js'
import { formMessages } from './form.js'
import { frameworkMessages } from './framework.js'
import { layoutMessages } from './layout.js'
import { navigationMessages } from './navigation.js'
import { workbenchMessages } from './workbench.js'

registerDefaultMessages(basicMessages)
registerDefaultMessages(conversationMessages)
registerDefaultMessages(dataMessages)
registerDefaultMessages(feedbackMessages)
registerDefaultMessages(formMessages)
registerDefaultMessages(frameworkMessages)
registerDefaultMessages(layoutMessages)
registerDefaultMessages(navigationMessages)
registerDefaultMessages(workbenchMessages)
