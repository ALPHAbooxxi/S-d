import { ALBUM_CONFIG } from './album-config'

function parseStoredStickers(userId) {
  try {
    return JSON.parse(localStorage.getItem(`svd_stickers_${userId}`) || '{}')
  } catch (error) {
    return {}
  }
}

function safeParseUsers() {
  try {
    return JSON.parse(localStorage.getItem('svd_all_users') || '[]')
  } catch {
    return []
  }
}

function buildDirectoryEntry(user, stickers = {}) {
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
}

function clearStaleCachedUsers(validUserIds) {
  const allUsers = safeParseUsers()
  const staleUsers = allUsers.filter((entry) => !validUserIds.has(entry.id))

  staleUsers.forEach((entry) => {
    localStorage.removeItem(`svd_stickers_${entry.id}`)
  })

  localStorage.setItem(
    'svd_all_users',
    JSON.stringify(allUsers.filter((entry) => validUserIds.has(entry.id)))
  )
}

export function cacheDiscoveredUser(user) {
  if (!user?.userId) return

  const allUsers = safeParseUsers()
  const nextUsers = allUsers.filter((entry) => entry.id !== user.userId)

  nextUsers.push({
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email || null,
  })

  localStorage.setItem('svd_all_users', JSON.stringify(nextUsers))
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
  const allUsers = safeParseUsers()

  return allUsers
    .filter((user) => user.id !== currentUserId)
    .map((user) => buildDirectoryEntry(user, parseStoredStickers(user.id)))
    .sort((a, b) =>
      (a.username || '').localeCompare(b.username || '', 'de', { sensitivity: 'base' })
    )
}

export function loadUserProfile(userId) {
  if (!userId) return null

  const allUsers = safeParseUsers()
  const found = allUsers.find((user) => user.id === userId)

  if (!found) return null

  const stickers = parseStoredStickers(found.id)

  return buildDirectoryEntry(found, stickers)
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
  const total = ALBUM_CONFIG.totalStickers

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

export async function syncUserDirectoryFromRemote(supabase, currentUserId) {
  if (!supabase || !currentUserId) return []

  const [{ data: profiles, error: profileError }, { data: stickers, error: stickerError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, email')
      .neq('id', currentUserId)
      .order('username', { ascending: true }),
    supabase
      .from('user_stickers')
      .select('user_id, sticker_number, quantity')
      .neq('user_id', currentUserId),
  ])

  if (profileError) {
    throw profileError
  }

  if (stickerError) {
    throw stickerError
  }

  const nextUsers = (profiles || []).map((entry) => ({
    id: entry.id,
    username: entry.username,
    displayName: entry.display_name || entry.username,
    email: entry.email || null,
  }))

  const validUserIds = new Set(nextUsers.map((entry) => entry.id))
  clearStaleCachedUsers(validUserIds)
  localStorage.setItem('svd_all_users', JSON.stringify(nextUsers))

  const stickersByUser = new Map()

  ;(stickers || []).forEach((entry) => {
    const current = stickersByUser.get(entry.user_id) || {}
    current[entry.sticker_number] = entry.quantity
    stickersByUser.set(entry.user_id, current)
  })

  nextUsers.forEach((user) => {
    localStorage.setItem(
      `svd_stickers_${user.id}`,
      JSON.stringify(stickersByUser.get(user.id) || {})
    )
  })

  return nextUsers.map((user) => buildDirectoryEntry(user, stickersByUser.get(user.id) || {}))
}
