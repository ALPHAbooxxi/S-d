'use client'

import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, CollectionIcon } from '@/components/AppIcons'
import { ALBUM_CONFIG, useStickers } from '@/lib/stickers-context'
import styles from './AlbumOverview.module.css'

const GROUPS = [
  { id: 'fussball', label: 'Fussball' },
  { id: 'handball', label: 'Handball' },
  { id: 'weitere', label: 'Weitere Sportarten & Organisation' },
]

function getNumbersForRange([start, end]) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function ProgressDonut({ progress }) {
  return (
    <div
      className={styles.progressDonut}
      style={{ '--progress': `${progress}%` }}
      aria-hidden="true"
    >
      <div className={styles.progressDonutInner}>
        <strong>{Math.round(progress)}%</strong>
      </div>
    </div>
  )
}

export default function AlbumOverview() {
  const { stickers } = useStickers()
  const [openGroups, setOpenGroups] = useState({
    fussball: true,
    handball: false,
    weitere: false,
  })

  const groupedOverview = useMemo(() => {
    return GROUPS.map((group) => {
      const categories = ALBUM_CONFIG.categories
        .filter((category) => category.group === group.id)
        .map((category) => {
          const numbers = getNumbersForRange(category.range)
          const ownedCount = numbers.filter((number) => (stickers[number] || 0) > 0).length
          const missingNumbers = numbers.filter((number) => (stickers[number] || 0) === 0)
          const duplicateCount = numbers.reduce(
            (sum, number) => sum + Math.max(0, (stickers[number] || 0) - 1),
            0
          )

          return {
            ...category,
            total: numbers.length,
            ownedCount,
            missingCount: missingNumbers.length,
            missingNumbers,
            duplicateCount,
            progress: numbers.length > 0 ? (ownedCount / numbers.length) * 100 : 0,
          }
        })

      return {
        ...group,
        categories,
        total: categories.reduce((sum, category) => sum + category.total, 0),
        ownedCount: categories.reduce((sum, category) => sum + category.ownedCount, 0),
        missingCount: categories.reduce((sum, category) => sum + category.missingCount, 0),
        duplicateCount: categories.reduce((sum, category) => sum + category.duplicateCount, 0),
        progress:
          categories.reduce((sum, category) => sum + category.ownedCount, 0) /
          Math.max(1, categories.reduce((sum, category) => sum + category.total, 0)) *
          100,
      }
    })
  }, [stickers])

  const toggleGroup = (groupId) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }))
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Albumstatus</span>
          <h2 className={styles.title}>Wo dir noch Sticker fehlen</h2>
        </div>
        <div className={styles.headerBadge}>
          <CollectionIcon size={18} strokeWidth={1.8} />
          <span>{ALBUM_CONFIG.totalStickers} gesamt</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        {groupedOverview.map((group) => (
          <button
            key={`${group.id}-summary`}
            type="button"
            className={`${styles.summaryCard} ${openGroups[group.id] ? styles.summaryCardActive : ''}`}
            onClick={() => toggleGroup(group.id)}
          >
            <ProgressDonut progress={group.progress} />

            <div className={styles.summaryContent}>
              <div className={styles.summaryTop}>
                <strong className={styles.summaryTitle}>{group.label}</strong>
                <span className={styles.summaryPercent}>{Math.round(group.progress)}%</span>
              </div>

              <div className={styles.summaryBar} aria-hidden="true">
                <span
                  className={styles.summaryBarFill}
                  style={{ width: `${group.progress}%` }}
                />
              </div>

              <div className={styles.summaryMeta}>
                <span>{group.ownedCount} gesammelt</span>
                <span>{group.missingCount} offen</span>
                <span>{group.duplicateCount} doppelt</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.groupList}>
        {groupedOverview.map((group) => {
          const isOpen = openGroups[group.id]

          return (
            <div key={group.id} className={styles.groupCard}>
              <button
                type="button"
                className={styles.groupButton}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
              >
                <div className={styles.groupMain}>
                  <strong className={styles.groupTitle}>{group.label}</strong>
                  <span className={styles.groupMeta}>
                    {group.ownedCount} / {group.total} gesammelt · {Math.round(group.progress)}%
                  </span>
                </div>

                <div className={styles.groupSide}>
                  <span className={styles.groupMissing}>
                    {group.missingCount} fehlen
                  </span>
                  {group.duplicateCount > 0 && (
                    <span className={styles.groupDuplicate}>
                      {group.duplicateCount} doppelt
                    </span>
                  )}
                  {isOpen ? (
                    <ArrowUpIcon size={18} strokeWidth={2} />
                  ) : (
                    <ArrowDownIcon size={18} strokeWidth={2} />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className={styles.groupContent}>
                  {group.categories.map((category) => (
                    <article key={category.id} className={styles.categoryCard}>
                      <div className={styles.categoryTop}>
                        <div>
                          <h3 className={styles.categoryTitle}>{category.name}</h3>
                          <p className={styles.categoryRange}>
                            #{category.range[0]}
                            {category.range[0] !== category.range[1] ? `-${category.range[1]}` : ''}
                          </p>
                        </div>

                        <div className={styles.categoryStats}>
                          <strong>
                            {category.ownedCount} / {category.total}
                          </strong>
                          <span>{Math.round(category.progress)}%</span>
                          <span>{category.missingCount} fehlen</span>
                        </div>
                      </div>

                      <div className={styles.progressTrack} aria-hidden="true">
                        <div
                          className={styles.progressFill}
                          style={{ width: `${category.progress}%` }}
                        />
                      </div>

                      <div className={styles.categoryFooter}>
                        {category.duplicateCount > 0 && (
                          <span className={styles.duplicateBadge}>
                            {category.duplicateCount} doppelt
                          </span>
                        )}

                        {category.missingCount === 0 ? (
                          <span className={styles.completeBadge}>Komplett</span>
                        ) : (
                          <div className={styles.missingBlock}>
                            <span className={styles.missingLabel}>Fehlende Nummern</span>
                            <div className={styles.missingNumbers}>
                              {category.missingNumbers.map((number) => (
                                <span key={number} className={styles.numberChip}>
                                  #{number}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
