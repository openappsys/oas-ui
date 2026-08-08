import { OASLoadingBar } from './oas-loading-bar.js'
import { resolveMessageHost } from '../../floating/app/app-host.js'

let current: OASLoadingBar | null = null

function ensure(): OASLoadingBar {
  const target = resolveMessageHost()
  if (current && target.contains(current)) return current
  current = document.createElement('oas-loading-bar') as OASLoadingBar
  target.appendChild(current)
  return current
}

export const loadingBar = {
  start(): void {
    ensure().advance()
  },
  finish(): void {
    if (current) current.done('success')
  },
  error(): void {
    if (current) current.done('error')
  },
}

export function destroyAll(): void {
  current?.remove()
  current = null
}
