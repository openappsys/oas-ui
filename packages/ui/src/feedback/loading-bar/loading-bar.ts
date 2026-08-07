import { OASLoadingBar } from './oas-loading-bar.js'

let current: OASLoadingBar | null = null

function ensure(): OASLoadingBar {
  if (current && document.body.contains(current)) return current
  current = document.createElement('oas-loading-bar') as OASLoadingBar
  document.body.appendChild(current)
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
