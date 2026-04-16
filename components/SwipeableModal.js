'use client'

import { useRef, useCallback, useEffect } from 'react'

export default function SwipeableModal({ children, contentClassName = '', onClose }) {
  const contentRef = useRef(null)
  const overlayRef = useRef(null)
  const handleRef = useRef(null)
  const dragRef = useRef({
    active: false,
    startY: 0,
    lastY: 0,
    startedAt: 0,
    locked: false,
    cancelled: false,
    startX: 0,
    pointerId: null,
  })

  const animateClose = useCallback(() => {
    const content = contentRef.current
    const overlay = overlayRef.current
    if (content) {
      content.style.transition = 'transform 250ms cubic-bezier(0.4, 0, 1, 1)'
      content.style.transform = 'translateY(100%)'
    }
    if (overlay) {
      overlay.style.transition = 'background 250ms ease-out'
      overlay.style.background = 'rgba(0, 0, 0, 0)'
    }
    setTimeout(() => onClose(), 240)
  }, [onClose])

  const resetSheetPosition = () => {
    const content = contentRef.current
    const overlay = overlayRef.current

    if (!content) return

    content.style.transition = 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    content.style.transform = ''

    if (overlay) {
      overlay.style.transition = 'background 300ms ease-out'
      overlay.style.background = ''
    }
  }

  // Check if the touch started at the top of the sheet or on the handle
  const canStartDrag = (event) => {
    const content = contentRef.current
    if (!content) return false

    // Always allow drag from the handle
    const handle = handleRef.current
    if (handle && handle.contains(event.target)) return true

    // Allow drag from the top of modal content if not scrolled
    const scrollable = content
    if (scrollable.scrollTop > 0) return false

    // Allow starting drag from anywhere when content is at scroll top
    return true
  }

  const handlePointerDown = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) return
    if (!canStartDrag(event)) return

    // Capture the pointer so we keep getting events even if finger moves outside
    if (event.target.setPointerCapture) {
      try {
        event.target.setPointerCapture(event.pointerId)
      } catch (_) { /* ignore */ }
    }

    dragRef.current = {
      active: true,
      startY: event.clientY,
      lastY: event.clientY,
      startedAt: performance.now(),
      locked: false,
      cancelled: false,
      startX: event.clientX,
      pointerId: event.pointerId,
    }

    if (contentRef.current) {
      contentRef.current.style.transition = 'none'
    }
  }, [])

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current
    if (!drag.active || drag.cancelled || !contentRef.current) return

    const deltaY = event.clientY - drag.startY
    const deltaX = event.clientX - drag.startX

    // If we haven't locked in a direction yet, decide
    if (!drag.locked) {
      const absDx = Math.abs(deltaX)
      const absDy = Math.abs(deltaY)

      // Need a minimum movement to decide
      if (absDx < 8 && absDy < 8) return

      // If horizontal movement dominates, cancel the drag entirely
      if (absDx > absDy) {
        drag.cancelled = true
        return
      }

      // If swiping upward, cancel (user is scrolling content)
      if (deltaY < 0) {
        drag.cancelled = true
        return
      }

      drag.locked = true

      // Once locked to vertical drag, prevent scrolling in the modal
      if (contentRef.current) {
        contentRef.current.style.overflowY = 'hidden'
      }
    }

    // Prevent default to stop browser scroll
    event.preventDefault()

    const offsetY = Math.max(0, event.clientY - drag.startY)
    drag.lastY = event.clientY

    contentRef.current.style.transform = `translateY(${offsetY}px)`

    if (overlayRef.current) {
      const nextAlpha = Math.max(0.18, 0.55 - offsetY / 600)
      overlayRef.current.style.background = `rgba(0, 0, 0, ${nextAlpha})`
    }
  }, [])

  const handlePointerEnd = useCallback((event) => {
    const drag = dragRef.current
    if (!drag.active) return

    drag.active = false

    // Restore overflow
    if (contentRef.current) {
      contentRef.current.style.overflowY = ''
    }

    // Release pointer
    if (event && event.target.releasePointerCapture && drag.pointerId != null) {
      try {
        event.target.releasePointerCapture(drag.pointerId)
      } catch (_) { /* ignore */ }
    }

    if (drag.cancelled || !drag.locked) {
      if (contentRef.current) {
        contentRef.current.style.transition = ''
        contentRef.current.style.transform = ''
      }
      return
    }

    const offsetY = Math.max(0, drag.lastY - drag.startY)
    const elapsed = Math.max(1, performance.now() - drag.startedAt)
    const velocity = offsetY / elapsed

    if (offsetY > 96 || (offsetY > 44 && velocity > 0.75)) {
      animateClose()
      return
    }

    resetSheetPosition()
  }, [animateClose])

  // Use touch events on the handle for reliable swipe-to-dismiss
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    let touchState = {
      active: false,
      startY: 0,
      startX: 0,
      lastY: 0,
      startedAt: 0,
      locked: false,
      cancelled: false,
    }

    const onTouchStart = (e) => {
      const touch = e.touches[0]
      touchState = {
        active: true,
        startY: touch.clientY,
        startX: touch.clientX,
        lastY: touch.clientY,
        startedAt: performance.now(),
        locked: false,
        cancelled: false,
      }
      if (contentRef.current) {
        contentRef.current.style.transition = 'none'
      }
    }

    const onTouchMove = (e) => {
      if (!touchState.active || touchState.cancelled || !contentRef.current) return

      const touch = e.touches[0]
      const deltaY = touch.clientY - touchState.startY
      const deltaX = touch.clientX - touchState.startX

      if (!touchState.locked) {
        const absDx = Math.abs(deltaX)
        const absDy = Math.abs(deltaY)
        if (absDx < 6 && absDy < 6) return
        if (absDx > absDy) { touchState.cancelled = true; return }
        if (deltaY < 0) { touchState.cancelled = true; return }
        touchState.locked = true
        contentRef.current.style.overflowY = 'hidden'
      }

      e.preventDefault()

      const offsetY = Math.max(0, deltaY)
      touchState.lastY = touch.clientY

      contentRef.current.style.transform = `translateY(${offsetY}px)`
      if (overlayRef.current) {
        const nextAlpha = Math.max(0.18, 0.55 - offsetY / 600)
        overlayRef.current.style.background = `rgba(0, 0, 0, ${nextAlpha})`
      }
    }

    const onTouchEnd = () => {
      if (!touchState.active) return
      touchState.active = false

      if (contentRef.current) {
        contentRef.current.style.overflowY = ''
      }

      if (touchState.cancelled || !touchState.locked) {
        if (contentRef.current) {
          contentRef.current.style.transition = ''
          contentRef.current.style.transform = ''
        }
        return
      }

      const offsetY = Math.max(0, touchState.lastY - touchState.startY)
      const elapsed = Math.max(1, performance.now() - touchState.startedAt)
      const velocity = offsetY / elapsed

      if (offsetY > 96 || (offsetY > 44 && velocity > 0.75)) {
        animateClose()
        return
      }

      resetSheetPosition()
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true })
    handle.addEventListener('touchmove', onTouchMove, { passive: false })
    handle.addEventListener('touchend', onTouchEnd, { passive: true })
    handle.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      handle.removeEventListener('touchstart', onTouchStart)
      handle.removeEventListener('touchmove', onTouchMove)
      handle.removeEventListener('touchend', onTouchEnd)
      handle.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [animateClose])

  // Also support touch-drag from anywhere on the modal content
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    let touchState = {
      active: false,
      startY: 0,
      startX: 0,
      lastY: 0,
      startedAt: 0,
      locked: false,
      cancelled: false,
    }

    const onTouchStart = (e) => {
      // Don't start drag if content is scrolled down
      if (content.scrollTop > 0) return

      // Don't start if the touch is on an interactive element that needs its own touch handling
      const target = e.target
      const interactive = target.closest('button, a, input, textarea, select, [data-no-swipe]')
      if (interactive) return

      const touch = e.touches[0]
      touchState = {
        active: true,
        startY: touch.clientY,
        startX: touch.clientX,
        lastY: touch.clientY,
        startedAt: performance.now(),
        locked: false,
        cancelled: false,
      }
    }

    const onTouchMove = (e) => {
      if (!touchState.active || touchState.cancelled) return

      const touch = e.touches[0]
      const deltaY = touch.clientY - touchState.startY
      const deltaX = touch.clientX - touchState.startX

      if (!touchState.locked) {
        const absDx = Math.abs(deltaX)
        const absDy = Math.abs(deltaY)
        if (absDx < 8 && absDy < 8) return
        if (absDx > absDy) { touchState.cancelled = true; return }
        if (deltaY < 0) { touchState.cancelled = true; return }
        touchState.locked = true
        content.style.transition = 'none'
        content.style.overflowY = 'hidden'
      }

      e.preventDefault()

      const offsetY = Math.max(0, deltaY)
      touchState.lastY = touch.clientY

      content.style.transform = `translateY(${offsetY}px)`
      if (overlayRef.current) {
        const nextAlpha = Math.max(0.18, 0.55 - offsetY / 600)
        overlayRef.current.style.background = `rgba(0, 0, 0, ${nextAlpha})`
      }
    }

    const onTouchEnd = () => {
      if (!touchState.active) return
      touchState.active = false

      content.style.overflowY = ''

      if (touchState.cancelled || !touchState.locked) {
        content.style.transition = ''
        content.style.transform = ''
        return
      }

      const offsetY = Math.max(0, touchState.lastY - touchState.startY)
      const elapsed = Math.max(1, performance.now() - touchState.startedAt)
      const velocity = offsetY / elapsed

      if (offsetY > 96 || (offsetY > 44 && velocity > 0.75)) {
        animateClose()
        return
      }

      resetSheetPosition()
    }

    content.addEventListener('touchstart', onTouchStart, { passive: true })
    content.addEventListener('touchmove', onTouchMove, { passive: false })
    content.addEventListener('touchend', onTouchEnd, { passive: true })
    content.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      content.removeEventListener('touchstart', onTouchStart)
      content.removeEventListener('touchmove', onTouchMove)
      content.removeEventListener('touchend', onTouchEnd)
      content.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [animateClose])

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={animateClose}>
      <div
        className={`modal-content ${contentClassName}`}
        ref={contentRef}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="modal-handle"
          ref={handleRef}
          role="button"
          tabIndex={0}
          aria-label="Popup nach unten wischen zum Schließen"
          style={{ touchAction: 'none' }}
        />
        {children}
      </div>
    </div>
  )
}
