import { ALBUM_CONFIG } from './stickers-context'

/**
 * Find matching trade partners for a user.
 * A match exists when:
 *   - The other user has duplicates that I'm missing (they can give)
 *   - I have duplicates that the other user is missing (I can give)
 * Best matches have both directions.
 */
export function findMatches(myStickers, allUsersStickers) {
  const total = ALBUM_CONFIG.totalStickers
  
  // Compute my missing and my duplicates
  const myOwned = new Set(Object.keys(myStickers).map(Number))
  const myMissing = new Set()
  const myDuplicates = new Set()
  
  for (let i = 1; i <= total; i++) {
    if (!myOwned.has(i)) myMissing.add(i)
  }
  
  Object.entries(myStickers).forEach(([num, qty]) => {
    if (qty > 1) myDuplicates.add(Number(num))
  })

  const matches = []

  for (const [userId, userData] of Object.entries(allUsersStickers)) {
    const theirStickers = userData.stickers
    const theirOwned = new Set(Object.keys(theirStickers).map(Number))
    const theirMissing = new Set()
    const theirDuplicates = new Set()

    for (let i = 1; i <= total; i++) {
      if (!theirOwned.has(i)) theirMissing.add(i)
    }
    
    Object.entries(theirStickers).forEach(([num, qty]) => {
      if (qty > 1) theirDuplicates.add(Number(num))
    })

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
        contactMethod: userData.contactMethod,
        contactInfo: userData.contactInfo,
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
  const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
  const result = {}
  
  allUsers.forEach(user => {
    if (user.id === currentUserId) return
    
    const stickers = JSON.parse(localStorage.getItem(`svd_stickers_${user.id}`) || '{}')
    if (Object.keys(stickers).length > 0) {
      result[user.id] = {
        stickers,
        username: user.username,
        displayName: user.displayName,
        contactMethod: user.contactMethod,
        contactInfo: user.contactInfo,
      }
    }
  })
  
  return result
}
