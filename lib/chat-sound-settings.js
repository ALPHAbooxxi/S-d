'use client'

export const CHAT_SOUNDS_STORAGE_KEY = 'svd_chat_sounds_enabled'
export const CHAT_SOUNDS_CHANGE_EVENT = 'svd-chat-sounds-change'

export function getChatSoundsEnabled() {
  if (typeof window === 'undefined') return true

  return window.localStorage.getItem(CHAT_SOUNDS_STORAGE_KEY) !== 'false'
}

export function saveChatSoundsEnabled(enabled) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(CHAT_SOUNDS_STORAGE_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent(CHAT_SOUNDS_CHANGE_EVENT, {
    detail: { enabled },
  }))
}
