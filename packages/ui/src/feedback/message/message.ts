import { createOverlay, removeOverlay, destroyOverlay } from '../../overlay/index.js'
import type { MessageType } from './oas-message.js'

let stackEl: HTMLElement | null = null

function ensureStack(): HTMLElement {
  if (stackEl && document.body.contains(stackEl)) return stackEl
  stackEl = document.createElement('div')
  stackEl.style.cssText =
    'position: fixed; top: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: var(--oas-z-message, 1060);'
  document.body.appendChild(stackEl)
  return stackEl
}

export interface MessageHandle {
  close: () => void
}

function show(type: MessageType, content: string, duration = 3000): MessageHandle {
  const el = document.createElement('oas-message')
  el.setAttribute('type', type)
  el.setAttribute('duration', String(duration))
  el.textContent = content
  const stack = ensureStack()
  stack.appendChild(el)
  createOverlay(el, {})
  const close = (): void => {
    removeOverlay(el)
    el.remove()
  }
  return { close }
}

export const message = {
  info: (content: string, duration?: number): MessageHandle => show('info', content, duration),
  success: (content: string, duration?: number): MessageHandle => show('success', content, duration),
  warning: (content: string, duration?: number): MessageHandle => show('warning', content, duration),
  error: (content: string, duration?: number): MessageHandle => show('error', content, duration),
}

export function destroyAll(): void {
  if (stackEl) stackEl.innerHTML = ''
  stackEl = null
  destroyOverlay()
}
