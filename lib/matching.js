import { ALBUM_CONFIG } from './stickers-context'

function parseStoredStickers(userId) {
  try {
    return JSON.parse(localStorage.getItem(`svd_stickers_${userId}`) || '{}')
  } catch (error) {
    return {}
  }
}

function getStickerInsights(stickers) {
  const total = ALBUM_CONFIG.totalStickers
  const owned = new Set(Object.keys(stickers).map(Number))
  const missing = new Set()
  const duplicates = new Set()

  for (let i = 1; i <= total; i++) {
    if (!owned.has(i)) missing.add(i)
  }

  Object.entries(stickers).forEach(([number, quantity]) => {
    if (quantity > 1) duplicates.add(Number(number))
  })

  return {
    owned,
    missing,
    duplicates,
  }
}

export function loadUserDirectory(currentUserId) {
  const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')

  return allUsers
    .filter((user) => user.id !== currentUserId)
    .map((user) => {
      const stickers = parseStoredStickers(user.id)
      const ownedCount = Object.keys(stickers).length
      const duplicateCount = Object.values(stickers).reduce(
        (sum, quantity) => sum + Math.max(0, quantity - 1),
        0
      )

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        stickers,
        ownedCount,
        duplicateCount,
      }
    })
    .sort((a, b) =>
      (a.username || '').localeCompare(b.username || '', 'de', { sensitivity: 'base' })
    )
}

export function loadUserProfile(userId) {
  if (!userId) return null

  const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
  const found = allUsers.find((user) => user.id === userId)

  if (!found) return null

  const stickers = parseStoredStickers(found.id)

  return {
    userId: found.id,
    username: found.username,
    displayName: found.displayName,
    email: found.email,
    stickers,
    ownedCount: Object.keys(stickers).length,
    duplicateCount: Object.values(stickers).reduce(
      (sum, quantity) => sum + Math.max(0, quantity - 1),
      0
    ),
  }
}

export function searchUsersByUsername(query, userDirectory) {
  const normalized = query.trim().replace(/^@/, '').toLowerCase()
  if (!normalized) return []

  return userDirectory.filter((entry) => {
    const username = (entry.username || '').toLowerCase()
    const displayName = (entry.displayName || '').toLowerCase()

    return username.includes(normalized) || displayName.includes(normalized)
  })
}

/**
 * Find matching trade partners for a user.
 * A match exists when:
 *   - The other user has duplicates that I'm missing (they can give)
 *   - I have duplicates that the other user is missing (I can give)
 * Best matches have both directions.
 */
export function findMatches(myStickers, allUsersStickers) {
  const { missing: myMissing, duplicates: myDuplicates } = getStickerInsights(myStickers)

  const matches = []

  for (const userData of allUsersStickers) {
    const { userId } = userData
    const theirStickers = userData.stickers
    const { owned: theirOwned, missing: theirMissing, duplicates: theirDuplicates } = getStickerInsights(theirStickers)

    // What they can give me (their duplicates ∩ my missing)
    const theyCanGive = [...theirDuplicates].filter(n => myMissing.has(n))
    
    // What I can give them (my duplicates ∩ their missing)
    const iCanGive = [...myDuplicates].filter(n => theirMissing.has(n))

    if (theyCanGive.length > 0 || iCanGive.length > 0) {
      // Score: prefer mutual matches, then total tradeable stickers
      const mutualCount = Math.min(theyCanGive.length, iCanGive.length)
      const totalTradeable = theyCanGive.length + iCanGive.length
      const score = mutualCount * 10 + totalTradeable

      matches.push({
        userId,
        username: userData.username,
        displayName: userData.displayName,
        theyCanGive: theyCanGive.sort((a, b) => a - b),
        iCanGive: iCanGive.sort((a, b) => a - b),
        mutualCount,
        totalTradeable,
        score,
        theirProgress: (theirOwned.size / total) * 100,
        theirDuplicateCount: theirDuplicates.size,
      })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)
  return matches
}

/**
 * Find all users who have a specific sticker as duplicate.
 */
export function findUsersWithSticker(stickerNumber, allUsersStickers) {
  const results = []
  
  for (const [userId, userData] of Object.entries(allUsersStickers)) {
    const qty = userData.stickers[stickerNumber] || 0
    if (qty > 1) {
      results.push({
        userId,
        username: userData.username,
        displayName: userData.displayName,
        quantity: qty - 1,
      })
    }
  }
  
  return results
}

/**
 * Load all users' sticker data for matching
 * (from localStorage in demo mode)
 */
export function loadAllUsersStickers(currentUserId) {
  return loadUserDirectory(currentUserId).filter((entry) => Object.keys(entry.stickers).length > 0)
}
