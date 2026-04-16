'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { CheckIcon } from '@/components/AppIcons'
import SwipeableModal from '@/components/SwipeableModal'
import { ALBUM_CONFIG, getCategoryForSticker, useStickers } from '@/lib/stickers-context'
import styles from './StickerGrid.module.css'

export default function StickerGrid() {
  const {
    stickers,
    incrementSticker,
    decrementSticker,
    bulkAdd,
    bulkRemove,
    setQuantity,
    undoAction,
    undoLastStickerChange,
  } = useStickers()
  const [activeCategory, setActiveCategory] = useState('all')
  const [quickInput, setQuickInput] = useState('')
  const [showQuickInput, setShowQuickInput] = useState(false)
  const [mode, setMode] = useState('add') // 'add' or 'remove'
  const [selectedSticker, setSelectedSticker] = useState(null)
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  const categories = [
    { id: 'all', name: 'Gesamtalbum', shortName: 'Alle', range: [1, ALBUM_CONFIG.totalStickers] },
    ...ALBUM_CONFIG.categories,
  ]

  const categorySummaries = useMemo(() => {
    return ALBUM_CONFIG.categories.map((category) => {
      const numbers = Array.from(
        { length: category.range[1] - category.range[0] + 1 },
        (_, index) => category.range[0] + index
      )
      const ownedCount = numbers.filter((number) => (stickers[number] || 0) > 0).length
      const duplicateCount = numbers.reduce(
        (sum, number) => sum + Math.max(0, (stickers[number] || 0) - 1),
        0
      )

      return {
        ...category,
        total: numbers.length,
        ownedCount,
        duplicateCount,
      }
    })
  }, [stickers])

  const getVisibleStickers = () => {
    if (activeCategory === 'all') {
      return Array.from({ length: ALBUM_CONFIG.totalStickers }, (_, i) => i + 1)
    }
    const cat = ALBUM_CONFIG.categories.find(c => c.id === activeCategory)
    if (!cat) return []
    return Array.from({ length: cat.range[1] - cat.range[0] + 1 }, (_, i) => cat.range[0] + i)
  }

  const handleQuickInputSubmit = useCallback(() => {
    if (!quickInput.trim()) return
    const numbers = []
    const parts = quickInput.split(',').map(s => s.trim()).filter(Boolean)
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number)
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= ALBUM_CONFIG.totalStickers) numbers.push(i)
          }
        }
      } else {
        const n = parseInt(part)
        if (!isNaN(n) && n >= 1 && n <= ALBUM_CONFIG.totalStickers) numbers.push(n)
      }
    })
    if (numbers.length > 0) {
      const label = mode === 'remove'
        ? `${numbers.length} Sticker entfernt`
        : `${numbers.length} Sticker hinzugefügt`

      if (mode === 'remove') {
        bulkRemove(numbers, label)
      } else {
        bulkAdd(numbers, label)
      }
      setQuickInput('')
    }
  }, [bulkAdd, bulkRemove, mode, quickInput])

  // Tap handler — depends on mode
  const handleTap = (num) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    const qty = stickers[num] || 0

    if (mode === 'add') {
      incrementSticker(num)
    } else {
      // Remove mode
      if (qty > 0) {
        decrementSticker(num)
      }
    }
  }

  // Long press → open detail popup (works on mobile!)
  const handleTouchStart = (num) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setSelectedSticker(num)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const visibleStickers = getVisibleStickers()
  const activeCategoryData = activeCategory === 'all'
    ? {
        id: 'all',
        name: 'Gesamtalbum',
        range: [1, ALBUM_CONFIG.totalStickers],
        total: ALBUM_CONFIG.totalStickers,
        ownedCount: Object.keys(stickers).length,
        duplicateCount: Object.values(stickers).reduce(
          (sum, quantity) => sum + Math.max(0, quantity - 1),
          0
        ),
      }
    : categorySummaries.find((category) => category.id === activeCategory)

  const selectedCategory = selectedSticker ? getCategoryForSticker(selectedSticker) : null

  const renderStickerButton = (num) => {
    const qty = stickers[num] || 0
    const isDuplicate = qty > 1
    const isOwned = qty >= 1

    return (
      <button
        key={num}
        className={`${styles.sticker} ${isOwned ? styles.owned : ''} ${isDuplicate ? styles.duplicate : ''} ${mode === 'remove' ? styles.removeMode : ''}`}
        onClick={() => handleTap(num)}
        onTouchStart={() => handleTouchStart(num)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={() => handleTouchStart(num)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        id={`sticker-${num}`}
      >
        <span className={styles.stickerNumber}>{num}</span>
        {isDuplicate && (
          <span className={styles.duplicateBadge}>
            {qty}x
          </span>
        )}
        {isOwned && !isDuplicate && (
          <span className={styles.checkmark}><CheckIcon size={12} strokeWidth={2.6} /></span>
        )}
      </button>
    )
  }

  return (
    <div className={styles.container}>
      {/* Mode Switcher */}
      <div className={styles.modeSwitch}>
        <button
          className={`${styles.modeBtn} ${mode === 'add' ? styles.modeBtnActive : ''}`}
          onClick={() => setMode('add')}
          id="mode-add"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Hinzufügen
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'remove' ? styles.modeBtnActive : ''} ${mode === 'remove' ? styles.modeBtnRemove : ''}`}
          onClick={() => setMode('remove')}
          id="mode-remove"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Entfernen
        </button>
      </div>

      {/* Quick Input Toggle */}
      <button
        className={`${styles.quickInputToggle} ${showQuickInput ? styles.active : ''}`}
        onClick={() => setShowQuickInput(!showQuickInput)}
        id="quick-input-toggle"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Schnelleingabe
      </button>

      {/* Quick Input */}
      {showQuickInput && (
        <div className={styles.quickInput}>
          <div className={styles.quickInputHelp}>
            Nummern eingeben: z.B. <strong>1, 5, 12, 45-60</strong>
          </div>
          <div className={styles.quickInputRow}>
            <input
              type="text"
              className="input"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="z.B. 1, 5, 12, 45-60"
              onKeyDown={(e) => e.key === 'Enter' && handleQuickInputSubmit()}
              id="quick-input-field"
            />
            <button className="btn btn-primary" onClick={handleQuickInputSubmit} id="quick-input-submit">
              {mode === 'remove' ? 'Entfernen' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className={styles.categoryScroll}>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.categoryChip} ${activeCategory === cat.id ? styles.activeChip : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.shortName || cat.name}
            {cat.range ? <span className={styles.categoryRange}>#{cat.range[0]}-{cat.range[1]}</span> : null}
          </button>
        ))}
      </div>

      {activeCategoryData && (
        <div className={styles.activeSummary}>
        <div>
            <strong>{activeCategoryData.shortName || activeCategoryData.name}</strong>
            <span>#{activeCategoryData.range[0]}-{activeCategoryData.range[1]}</span>
          </div>
          <div className={styles.activeSummaryMeta}>
            <span>{activeCategoryData.ownedCount}/{activeCategoryData.total} eingetragen</span>
            <span>{activeCategoryData.duplicateCount} doppelt</span>
          </div>
        </div>
      )}

      {/* Sticker Grid */}
      {activeCategory === 'all' ? (
        <div className={styles.albumSections}>
          {categorySummaries.map((category) => {
            const sectionNumbers = Array.from(
              { length: category.range[1] - category.range[0] + 1 },
              (_, index) => category.range[0] + index
            )

            return (
              <section key={category.id} className={styles.albumSection}>
                <div className={styles.albumSectionHeader}>
                  <div>
                    <strong className={styles.albumSectionTitle}>{category.name}</strong>
                    <span className={styles.albumSectionRange}>
                      #{category.range[0]}-{category.range[1]}
                    </span>
                  </div>
                  <div className={styles.albumSectionMeta}>
                    <span>{category.ownedCount}/{category.total}</span>
                    <span>{category.duplicateCount} doppelt</span>
                  </div>
                </div>

                <div className={styles.grid}>
                  {sectionNumbers.map(renderStickerButton)}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleStickers.map(renderStickerButton)}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendMissing}`} />
          <span>Fehlt</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendOwned}`} />
          <span>1× vorhanden</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDuplicate}`} />
          <span>Doppelt +</span>
        </div>
        <div className={styles.legendTip}>
          Tippen = {mode === 'add' ? 'hinzufügen (+1)' : 'entfernen (−1)'} · Gedrückt halten = Details
        </div>
      </div>

      {/* Toast */}
      {undoAction ? (
        <div className={styles.toast}>
          <span>{undoAction.label}</span>
          <button type="button" onClick={undoLastStickerChange}>
            Rückgängig
          </button>
        </div>
      ) : null}

      {/* Sticker Detail Popup (long press) */}
      {selectedSticker !== null && (
        <SwipeableModal onClose={() => setSelectedSticker(null)} contentClassName={styles.popupCard}>
            <div className={styles.popupHeader}>
              <span className={styles.popupNumber}>#{selectedSticker}</span>
              <span className={styles.popupCategory}>
                {selectedCategory ? `Bereich #${selectedCategory.range[0]}-${selectedCategory.range[1]}` : ''}
              </span>
            </div>

            <div className={styles.popupQuantity}>
              <span className={styles.popupQtyLabel}>Anzahl:</span>
              <div className={styles.popupQtyControls}>
                <button
                  className={styles.popupQtyBtn}
                  onClick={() => {
                    const qty = stickers[selectedSticker] || 0
                    if (qty > 0) decrementSticker(selectedSticker)
                  }}
                  disabled={!(stickers[selectedSticker] > 0)}
                >
                  −
                </button>
                <span className={styles.popupQtyValue}>
                  {stickers[selectedSticker] || 0}
                </span>
                <button
                  className={styles.popupQtyBtn}
                  onClick={() => incrementSticker(selectedSticker)}
                >
                  +
                </button>
              </div>
            </div>

            <div className={styles.popupActions}>
              {(stickers[selectedSticker] || 0) > 0 && (
                <button
                  className={`${styles.popupActionBtn} ${styles.popupRemove}`}
                  onClick={() => {
                    setQuantity(selectedSticker, 0, `Sticker #${selectedSticker} komplett entfernt`)
                    setSelectedSticker(null)
                  }}
                >
                  Komplett entfernen
                </button>
              )}
              <button
                className={styles.popupActionBtn}
                onClick={() => setSelectedSticker(null)}
              >
                Fertig
              </button>
            </div>
        </SwipeableModal>
      )}
    </div>
  )
}
